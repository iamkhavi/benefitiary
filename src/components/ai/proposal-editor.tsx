'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Save, 
  FileText, 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon,
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Highlighter,
  X,
  Bot,
  User,
  Sparkles,
  Eye,
  EyeOff,
  FileDown
} from 'lucide-react';
import { downloadProposalPDF } from '@/lib/pdf-export';
import { cn } from '@/lib/utils';

interface ProposalEditorProps {
  showCanvas: boolean;
  onClose: () => void;
  grantId?: string;
  extractedContent?: {
    section: string;
    title: string;
    content: string;
    editingIntent?: {
      intent: 'rewrite' | 'append' | 'modify' | 'new';
      target?: string;
    };
  } | null;
  onContentUpdate?: () => void;
}

interface AIWritingSession {
  isActive: boolean;
  currentSection: string;
  progress: number;
}

// Custom Page Break Extension with Auto-pagination
const PageBreak = Extension.create({
  name: 'pageBreak',
  
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          pageBreak: {
            default: null,
            parseHTML: element => element.style.pageBreakBefore || null,
            renderHTML: attributes => {
              if (!attributes.pageBreak) return {}
              return { style: `page-break-before: ${attributes.pageBreak}` }
            },
          },
        },
      },
    ]
  },
  
  addCommands() {
    return {
      insertPageBreak: () => ({ commands }: { commands: any }) => {
        return commands.insertContent('<div class="page-break" style="page-break-before: always; height: 1px; margin: 0; padding: 0;"></div>')
      },
    } as any
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoPagination'),
        view: () => ({
          update: (view: any) => {
            // Auto-pagination logic will be handled by CSS and the container
            setTimeout(() => {
              const pages = document.querySelectorAll('.a4-page');
              pages.forEach((page, index) => {
                const pageNumber = page.querySelector('.page-number');
                if (pageNumber) {
                  pageNumber.textContent = `Page ${index + 1}`;
                }
              });
            }, 100);
          }
        })
      })
    ]
  }
})

export function ProposalEditor({ showCanvas, onClose, grantId, extractedContent, onContentUpdate }: ProposalEditorProps) {
  const [isAIWriting, setIsAIWriting] = useState<AIWritingSession>({
    isActive: false,
    currentSection: '',
    progress: 0
  });
  const [showAIIndicators, setShowAIIndicators] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [collaborators] = useState([
    { id: 'ai', name: 'AI Assistant', color: '#8B5CF6', isActive: true },
    { id: 'user', name: 'You', color: '#3B82F6', isActive: true }
  ]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        bold: false,
        italic: false,
        link: false,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Bold,
      Italic,
      Underline,
      BulletList.configure({
        HTMLAttributes: {
          class: 'tiptap-bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'tiptap-ordered-list',
        },
      }),
      ListItem,
      Blockquote.configure({
        HTMLAttributes: {
          class: 'tiptap-blockquote',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
      }),
      PageBreak,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Enter a heading...';
          }
          return 'Start writing your document here...';
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'a4-document-content focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
      
      // Update pagination after content changes
      setTimeout(() => {
        updatePagination();
      }, 100);
    },
  });

  // Pagination logic
  const updatePagination = useCallback(() => {
    if (!editorContainerRef.current || !editor) return;

    const container = editorContainerRef.current;
    const content = container.querySelector('.a4-document-content .ProseMirror');
    if (!content) return;

    // A4 dimensions in pixels (at 96 DPI)
    const A4_HEIGHT_MM = 297;
    const A4_WIDTH_MM = 210;
    const MARGIN_TOP_MM = 25;
    const MARGIN_BOTTOM_MM = 30;
    const MARGIN_LEFT_MM = 20;
    const MARGIN_RIGHT_MM = 20;
    
    const MM_TO_PX = 96 / 25.4; // Convert mm to px at 96 DPI
    
    const PAGE_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX;
    const CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - (MARGIN_TOP_MM + MARGIN_BOTTOM_MM) * MM_TO_PX;
    
    // Get actual content height
    const contentHeight = content.scrollHeight;
    const calculatedPages = Math.max(1, Math.ceil(contentHeight / CONTENT_HEIGHT_PX));
    
    if (calculatedPages !== pageCount) {
      setPageCount(calculatedPages);
    }
  }, [pageCount, editor]);

  // Simulate AI writing in real-time
  const simulateAIWriting = useCallback(async (section: string, content: string) => {
    if (!editor) return;

    setIsAIWriting({ isActive: true, currentSection: section, progress: 0 });

    // Find the section heading
    const doc = editor.state.doc;
    let sectionPos = -1;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.toLowerCase().includes(section.toLowerCase())) {
        sectionPos = pos;
        return false;
      }
    });

    if (sectionPos === -1) return;

    // Find the paragraph after the heading
    let targetPos = sectionPos + doc.nodeAt(sectionPos)!.nodeSize;
    
    // Simulate typing character by character
    const words = content.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (!isAIWriting.isActive) break;
      
      const progress = (i / words.length) * 100;
      setIsAIWriting(prev => ({ ...prev, progress }));
      
      // Add word with space
      const wordToAdd = (i === 0 ? '' : ' ') + words[i];
      
      editor.chain()
        .focus()
        .setTextSelection(targetPos)
        .insertContent(wordToAdd)
        .run();
      
      targetPos += wordToAdd.length;
      
      // Random delay to simulate human-like typing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    }

    setIsAIWriting({ isActive: false, currentSection: '', progress: 0 });
  }, [editor, isAIWriting.isActive]);

  // Auto-save functionality
  useEffect(() => {
    if (!editor) return;

    const saveInterval = setInterval(() => {
      const content = editor.getHTML();
      localStorage.setItem(`proposal-${grantId || 'draft'}`, content);
      setLastSaved(new Date());
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [editor, grantId]);

  // Load saved content
  useEffect(() => {
    if (!editor) return;

    const savedContent = localStorage.getItem(`proposal-${grantId || 'draft'}`);
    if (savedContent) {
      editor.commands.setContent(savedContent);
    }
  }, [editor, grantId]);

  // Update pagination when editor is ready
  useEffect(() => {
    if (!editor) return;
    
    const timer = setTimeout(() => {
      updatePagination();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [editor, updatePagination]);

  // Handle extracted content from Maya
  useEffect(() => {
    if (!editor || !extractedContent) return;

    const insertExtractedContent = () => {
      const { section: sectionName, title, content, editingIntent } = extractedContent;
      
      // Find the section heading in the document
      const doc = editor.state.doc;
      let sectionPos = -1;
      let targetPos = -1;
      
      doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && 
            node.textContent.toLowerCase().includes(sectionName.toLowerCase())) {
          sectionPos = pos;
          // Find the paragraph after this heading
          const nextPos = pos + node.nodeSize;
          const nextNode = doc.nodeAt(nextPos);
          if (nextNode && nextNode.type.name === 'paragraph') {
            targetPos = nextPos;
          }
          return false;
        }
      });
      
      // Handle different editing intents
      if (editingIntent?.intent === 'rewrite') {
        // Clear entire document and insert new content
        editor.chain()
          .focus()
          .selectAll()
          .deleteSelection()
          .insertContent(`<h1 style="text-align: center; margin-bottom: 2rem;">${title}</h1><div>${content}</div>`)
          .run();
      } else if (editingIntent?.intent === 'modify') {
        // Find and replace specific section
        const doc = editor.state.doc;
        let sectionFound = false;
        
        doc.descendants((node, pos) => {
          if (node.type.name === 'heading' && 
              node.textContent.toLowerCase().includes(sectionName.toLowerCase())) {
            // Find the end of this section (next heading or end of document)
            let endPos = doc.content.size;
            doc.descendants((nextNode, nextPos) => {
              if (nextPos > pos && nextNode.type.name === 'heading' && 
                  nextNode.attrs.level <= node.attrs.level) {
                endPos = nextPos;
                return false;
              }
            });
            
            // Replace the section content
            editor.chain()
              .focus()
              .setTextSelection({ from: pos, to: endPos })
              .insertContent(`<h2 style="margin-top: 2rem; margin-bottom: 1rem; font-weight: bold;">${title}</h2><div>${content}</div>`)
              .run();
            
            sectionFound = true;
            return false;
          }
        });
        
        if (!sectionFound) {
          // Section not found, append at end
          editor.chain()
            .focus()
            .setTextSelection(doc.content.size)
            .insertContent(`<h2 style="margin-top: 2rem; margin-bottom: 1rem; font-weight: bold;">${title}</h2><div>${content}</div>`)
            .run();
        }
      } else {
        // Default: append at end (for 'new' and 'append' intents)
        editor.chain()
          .focus()
          .setTextSelection(doc.content.size)
          .insertContent(`<h2 style="margin-top: 2rem; margin-bottom: 1rem; font-weight: bold;">${title}</h2><div>${content}</div>`)
          .run();
      }

      // Trigger AI writing animation
      simulateAIWriting(sectionName, '');
      
      // Clear the extracted content
      if (onContentUpdate) {
        onContentUpdate();
      }
    };

    insertExtractedContent();
  }, [editor, extractedContent, onContentUpdate]);

  const handleAIAssist = async (section: string) => {
    if (!grantId) {
      // Fallback to sample content if no grantId
      const sampleContent = {
        'executive': 'This innovative project addresses critical challenges through a comprehensive approach that combines cutting-edge methodology with proven implementation strategies...',
        'project': 'Our methodology employs a multi-phase approach designed to achieve sustainable impact through evidence-based interventions...',
        'budget': 'The total project budget is strategically allocated across personnel, direct costs, and evaluation components...',
        'impact': 'Expected outcomes include measurable improvements in target metrics, enhanced capacity building, and sustainable systemic change...',
        'timeline': 'The project timeline spans multiple phases with clear milestones and deliverables at each stage...',
        'team': 'Our multidisciplinary team combines extensive experience and proven expertise in the relevant domain areas...'
      };
      
      const content = sampleContent[section as keyof typeof sampleContent] || 'AI-generated content for this section...';
      await simulateAIWriting(section, content);
      return;
    }

    try {
      setIsAIWriting({ isActive: true, currentSection: section, progress: 0 });

      const response = await fetch('/api/ai/proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grantId: grantId,
          section: section,
          action: 'ai_assist'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI assistance');
      }

      const data = await response.json();
      
      if (data.success && data.content) {
        await simulateAIWriting(section, data.content);
      } else {
        throw new Error('Invalid response from AI service');
      }

    } catch (error) {
      console.error('AI Assist Error:', error);
      
      // Fallback to sample content
      const fallbackContent = `I apologize, but I'm having trouble connecting to the AI service. Here's a general framework for the ${section} section that you can customize:

[This section would typically include specific guidance for ${section} based on your grant requirements and organizational context. Please try the AI assist feature again, or contact support if the issue persists.]`;
      
      await simulateAIWriting(section, fallbackContent);
    }
  };

  const saveDraft = () => {
    if (!editor) return;
    
    const content = editor.getHTML();
    localStorage.setItem(`proposal-${grantId || 'draft'}`, content);
    setLastSaved(new Date());
    
    // In production, also save to API
    console.log('Saving to API...', content);
  };

  const exportToPDF = async () => {
    if (!editor) return;
    
    try {
      const content = editor.getHTML();
      
      // Get grant and organization info for PDF metadata
      const grantResponse = await fetch(`/api/grants/${grantId}`);
      const grantData = await grantResponse.json();
      
      const title = `Grant Proposal - ${grantData.grant?.title || 'Untitled'}`;
      const organizationName = 'Your Organization'; // This should come from user context
      const grantTitle = grantData.grant?.title || 'Grant Opportunity';
      const funderName = grantData.grant?.funder?.name || 'Funding Organization';
      
      await downloadProposalPDF(title, organizationName, grantTitle, funderName, content);
      
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collaborative editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Document Canvas
            </h3>
            
            {/* Collaborators */}
            <div className="flex items-center space-x-2">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: collaborator.color }}
                  />
                  <span className="text-xs text-gray-600">{collaborator.name}</span>
                  {collaborator.isActive && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Word Count & Page Count */}
            <Badge variant="outline" className="text-xs">
              {wordCount} words
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </Badge>
            
            {/* Last Saved */}
            {lastSaved && (
              <Badge variant="outline" className="text-xs text-green-600">
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            )}

            {/* AI Indicators Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIIndicators(!showAIIndicators)}
            >
              {showAIIndicators ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            {showCanvas && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            
            <Button size="sm" onClick={saveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center space-x-1 mt-3 pt-3 border-t">
          <Button
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant={editor.isActive('underline') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <Button
            variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          
          <Button
            variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <Button
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <Button
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* AI Assist Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAssist('executive')}
            disabled={isAIWriting.isActive}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Bot className="h-4 w-4 mr-1" />
            AI Assist
          </Button>
        </div>

        {/* AI Writing Indicator */}
        {isAIWriting.isActive && (
          <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="text-sm text-purple-700">
                  AI is writing: {isAIWriting.currentSection}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${isAIWriting.progress}%` }}
                  />
                </div>
                <span className="text-xs text-purple-600">
                  {Math.round(isAIWriting.progress)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Canvas - A4 Size with Pagination */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
        <div className="mx-auto" style={{ width: '210mm', maxWidth: '210mm' }} ref={editorContainerRef}>
          
          {/* AI Collaboration Indicators */}
          {showAIIndicators && (
            <div className="fixed top-20 right-8 z-50">
              <div className="flex flex-col space-y-2">
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Collaborative
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  <User className="h-3 w-3 mr-1" />
                  Live Editing
                </Badge>
              </div>
            </div>
          )}

          {/* Empty State Placeholder */}
          {(!editor?.getText() || editor.getText().trim() === '') && (
            <div className="a4-page-container">
              <Card 
                className="a4-page bg-white shadow-lg border-0 relative"
                style={{ 
                  width: '210mm', 
                  height: '297mm',
                  maxWidth: '210mm',
                  marginBottom: '0.5rem'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Your Document Will Appear Here
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        Ask Maya to generate content, or start typing to create your proposal, report, or any document you need for your funding application.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                        Try asking Maya:
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>"Draft an executive summary"</div>
                        <div>"Create a project timeline"</div>
                        <div>"Write a budget overview"</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Page Number for Empty State */}
                <div className="page-number absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <span className="text-xs text-gray-500">Page 1</span>
                </div>
              </Card>
            </div>
          )}

          {/* Paginated Editor Content */}
          {editor?.getText() && editor.getText().trim() !== '' && (
            <div className="paginated-document-container">
              <div className="a4-document-wrapper">
                <EditorContent 
                  editor={editor} 
                  className="a4-document-content focus-within:outline-none"
                />
                
                {/* Page overlays for visual page breaks */}
                <div className="page-overlays">
                  {Array.from({ length: pageCount }, (_, index) => (
                    <div 
                      key={index}
                      className="page-overlay"
                      style={{
                        position: 'absolute',
                        top: `${index * 297 * (96/25.4) + index * (0.5 * 16)}px`, // A4 height + 0.5rem gap
                        left: 0,
                        width: '210mm',
                        height: '297mm',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        pointerEvents: 'none',
                        zIndex: -1
                      }}
                    >
                      {/* Page Number */}
                      <div 
                        className="page-number"
                        style={{
                          position: 'absolute',
                          bottom: '15mm',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '10pt',
                          color: '#666',
                          fontFamily: 'Times New Roman, serif',
                          pointerEvents: 'none'
                        }}
                      >
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Global Styles for A4 Document */}
          <style jsx global>{`
            .a4-document-wrapper {
              position: relative;
              width: 210mm;
              max-width: 210mm;
            }
            
            .a4-document-content {
              position: relative;
              z-index: 1;
              font-family: 'Times New Roman', serif !important;
              font-size: 12pt !important;
              line-height: 1.6 !important;
              color: #000 !important;
              width: 210mm !important;
              max-width: 210mm !important;
              background: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .a4-document-content .ProseMirror {
              outline: none !important;
              padding: 25mm 20mm 30mm 20mm !important;
              margin: 0 !important;
              width: 210mm !important;
              max-width: 210mm !important;
              min-height: 297mm !important;
              background: white;
              position: relative;
              
              /* CSS-based pagination */
              column-fill: auto;
              orphans: 2;
              widows: 2;
            }
            
            /* Page break simulation using CSS */
            .a4-document-content .ProseMirror::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 100%;
              background-image: repeating-linear-gradient(
                transparent,
                transparent calc(297mm - 1px),
                #e5e7eb calc(297mm - 1px),
                #e5e7eb calc(297mm + 0.5rem - 1px),
                transparent calc(297mm + 0.5rem)
              );
              pointer-events: none;
              z-index: -1;
            }
            
            .a4-document-content h1 {
              font-size: 16pt !important;
              font-weight: bold !important;
              margin: 0 0 18pt 0 !important;
              text-align: center !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            
            .a4-document-content h2 {
              font-size: 14pt !important;
              font-weight: bold !important;
              margin: 24pt 0 12pt 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              border-bottom: none !important;
            }
            
            .a4-document-content h3 {
              font-size: 13pt !important;
              font-weight: bold !important;
              margin: 18pt 0 8pt 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            
            .a4-document-content p {
              margin: 0 0 12pt 0 !important;
              text-align: justify !important;
              orphans: 2 !important;
              widows: 2 !important;
              font-size: 12pt !important;
              line-height: 1.6 !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            
            .a4-document-content ul, .a4-document-content ol {
              margin: 12pt 0 !important;
              padding-left: 24pt !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            
            .a4-document-content li {
              margin-bottom: 6pt !important;
              font-size: 12pt !important;
              line-height: 1.6 !important;
            }
            
            .a4-document-content strong {
              font-weight: bold !important;
            }
            
            .a4-document-content em {
              font-style: italic !important;
            }
            
            .a4-document-content blockquote {
              margin: 12pt 0 !important;
              padding-left: 12pt !important;
              border-left: 3pt solid #ccc !important;
              font-style: italic !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            
            /* Manual page break handling */
            .a4-document-content .page-break {
              page-break-before: always !important;
              break-before: page !important;
              height: 1px !important;
              margin: 0 !important;
              padding: 0 !important;
              visibility: hidden !important;
            }
            
            /* Page overlays */
            .page-overlays {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              pointer-events: none;
              z-index: -1;
            }
            
            .page-overlay {
              border-radius: 4px;
            }
            
            /* Print styles */
            @media print {
              .a4-document-wrapper {
                width: 100% !important;
                max-width: none !important;
              }
              
              .a4-document-content {
                box-shadow: none !important;
                width: 100% !important;
                max-width: none !important;
              }
              
              .a4-document-content .ProseMirror {
                width: 100% !important;
                max-width: none !important;
                padding: 25mm 20mm 30mm 20mm !important;
                min-height: auto !important;
              }
              
              .a4-document-content .ProseMirror::before {
                display: none !important;
              }
              
              .page-overlays {
                display: none !important;
              }
              
              .a4-document-content h1, 
              .a4-document-content h2, 
              .a4-document-content h3 {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              
              .a4-document-content p {
                orphans: 2 !important;
                widows: 2 !important;
                page-break-inside: avoid !important;
                break-inside: avoid-page !important;
              }
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
              .a4-document-wrapper {
                width: 100% !important;
                max-width: 100% !important;
              }
              
              .a4-document-content {
                width: 100% !important;
                max-width: 100% !important;
              }
              
              .a4-document-content .ProseMirror {
                width: 100% !important;
                max-width: 100% !important;
                padding: 20px !important;
                min-height: 400px !important;
              }
              
              .a4-document-content .ProseMirror::before {
                display: none !important;
              }
              
              .page-overlays {
                display: none !important;
              }
            }
          `}</style>
        </div>
      </div>

      {/* Quick AI Actions */}
      <div className="px-6 py-3 border-t bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Quick AI Assist:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAIAssist('executive')}
              disabled={isAIWriting.isActive}
            >
              Executive Summary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAIAssist('budget')}
              disabled={isAIWriting.isActive}
            >
              Budget
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAIAssist('impact')}
              disabled={isAIWriting.isActive}
            >
              Impact
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            Press / for AI commands • Ctrl+S to save
          </div>
        </div>
      </div>
    </div>
  );
}