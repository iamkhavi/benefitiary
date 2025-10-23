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

// Professional Document Structure Components
interface DocumentStructure {
  coverPage: {
    title: string;
    organizationName: string;
    grantTitle: string;
    funderName: string;
    submissionDate: string;
  };
  tableOfContents: Array<{
    title: string;
    page: number;
    level: number;
  }>;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    pageStart: number;
  }>;
}

// Cover Page Component
function CoverPage({ coverData }: { coverData: DocumentStructure['coverPage'] }) {
  return (
    <div className="a4-page cover-page" style={{
      width: '210mm',
      height: '297mm',
      backgroundColor: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      position: 'relative',
      pageBreakAfter: 'always',
      marginBottom: '8mm'
    }}>
      <div style={{
        padding: '40mm 30mm',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: 'Times New Roman, serif'
      }}>
        {/* Main Title */}
        <h1 style={{
          fontSize: '24pt',
          fontWeight: 'bold',
          marginBottom: '30mm',
          lineHeight: '1.2',
          color: '#1f2937'
        }}>
          {coverData.title}
        </h1>

        {/* Grant Information */}
        <div style={{ fontSize: '14pt', lineHeight: '1.8', marginBottom: '40mm' }}>
          <p style={{ marginBottom: '10mm' }}>
            <strong>Grant Opportunity:</strong><br />
            {coverData.grantTitle}
          </p>
          <p style={{ marginBottom: '10mm' }}>
            <strong>Funding Organization:</strong><br />
            {coverData.funderName}
          </p>
          <p style={{ marginBottom: '10mm' }}>
            <strong>Submitted by:</strong><br />
            {coverData.organizationName}
          </p>
        </div>

        {/* Submission Date */}
        <div style={{
          position: 'absolute',
          bottom: '30mm',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12pt'
        }}>
          <p>Submission Date: {coverData.submissionDate}</p>
        </div>
      </div>
    </div>
  );
}

// Table of Contents Component
function TableOfContents({ tocData }: { tocData: DocumentStructure['tableOfContents'] }) {
  return (
    <div className="a4-page toc-page" style={{
      width: '210mm',
      height: '297mm',
      backgroundColor: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      position: 'relative',
      pageBreakAfter: 'always',
      marginBottom: '8mm'
    }}>
      <div style={{
        padding: '25mm 20mm',
        fontFamily: 'Times New Roman, serif'
      }}>
        <h2 style={{
          fontSize: '18pt',
          fontWeight: 'bold',
          marginBottom: '20mm',
          textAlign: 'center'
        }}>
          Table of Contents
        </h2>

        <div style={{ fontSize: '12pt', lineHeight: '1.6' }}>
          {tocData.map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5mm',
              paddingLeft: `${item.level * 10}mm`
            }}>
              <span>{item.title}</span>
              <span style={{ 
                borderBottom: '1px dotted #666',
                flexGrow: 1,
                marginLeft: '5mm',
                marginRight: '5mm'
              }}></span>
              <span>{item.page}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Professional Paginated Document Component
function PaginatedDocument({ 
  editor, 
  documentStructure 
}: { 
  editor: any;
  documentStructure?: DocumentStructure;
}) {
  const [pages, setPages] = useState<Array<{ type: 'cover' | 'toc' | 'content'; content: string; pageNumber: number }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePagination = () => {
      const content = editor.getHTML();
      const newPages: Array<{ type: 'cover' | 'toc' | 'content'; content: string; pageNumber: number }> = [];
      
      // If we have document structure, add cover and TOC
      if (documentStructure) {
        newPages.push({ type: 'cover', content: '', pageNumber: 1 });
        newPages.push({ type: 'toc', content: '', pageNumber: 2 });
      }

      if (content && content.trim() !== '') {
        // Split content into pages based on A4 dimensions
        const contentPages = splitContentIntoPages(content);
        contentPages.forEach((pageContent, index) => {
          newPages.push({
            type: 'content',
            content: pageContent,
            pageNumber: newPages.length + 1
          });
        });
      }
      
      setPages(newPages);
    };

    const updateHandler = () => {
      setTimeout(updatePagination, 100);
    };

    editor.on('update', updateHandler);
    updatePagination();

    return () => {
      editor.off('update', updateHandler);
    };
  }, [editor, documentStructure]);

  // Split content into A4-sized pages
  const splitContentIntoPages = (htmlContent: string): string[] => {
    if (!htmlContent || htmlContent.trim() === '') return [];
    
    // For now, return single page - TODO: implement proper content splitting
    return [htmlContent];
  };

  if (pages.length === 0) return null;

  return (
    <div className="paginated-document">
      {pages.map((page, pageIndex) => {
        if (page.type === 'cover' && documentStructure) {
          return (
            <CoverPage 
              key={`cover-${pageIndex}`}
              coverData={documentStructure.coverPage}
            />
          );
        }
        
        if (page.type === 'toc' && documentStructure) {
          return (
            <TableOfContents 
              key={`toc-${pageIndex}`}
              tocData={documentStructure.tableOfContents}
            />
          );
        }

        return (
          <div key={pageIndex} className="a4-page-wrapper" style={{ marginBottom: '8mm' }}>
            <div
              className="a4-page"
              style={{
                width: '210mm',
                height: '297mm',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                pageBreakAfter: 'always'
              }}
            >
              {/* Content Area */}
              <div
                className="page-content-area"
                style={{
                  padding: '25mm 20mm 25mm 20mm',
                  height: '247mm',
                  overflow: 'hidden',
                  fontFamily: 'Times New Roman, serif',
                  fontSize: '12pt',
                  lineHeight: '1.6'
                }}
              >
                {page.type === 'content' && pageIndex === (documentStructure ? 2 : 0) ? (
                  // First content page gets the live editor
                  <EditorContent
                    editor={editor}
                    className="a4-document-content focus-within:outline-none"
                  />
                ) : (
                  // Other pages show static content
                  <div 
                    className="a4-document-content"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                  />
                )}
              </div>

              {/* Page Footer with Number */}
              <div
                className="page-footer"
                style={{
                  position: 'absolute',
                  bottom: '10mm',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10pt',
                  color: '#6b7280',
                  fontFamily: 'Times New Roman, serif'
                }}
              >
                <span>Page {page.pageNumber}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [documentStructure, setDocumentStructure] = useState<DocumentStructure | undefined>(undefined);
  const [grantData, setGrantData] = useState<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [collaborators] = useState([
    { id: 'ai', name: 'AI Assistant', color: '#8B5CF6', isActive: true },
    { id: 'user', name: 'You', color: '#3B82F6', isActive: true }
  ]);

  // Load grant data for document structure
  useEffect(() => {
    if (!grantId) return;

    const loadGrantData = async () => {
      try {
        const response = await fetch(`/api/grants/${grantId}`);
        if (response.ok) {
          const data = await response.json();
          setGrantData(data.grant);
        }
      } catch (error) {
        console.error('Failed to load grant data:', error);
      }
    };

    loadGrantData();
  }, [grantId]);

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
      updateWordCount();
    },
  });

  // Simple word count update - no complex pagination needed
  const updateWordCount = useCallback(() => {
    if (!editor) return;
    
    const text = editor.getText();
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
  }, [editor]);

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

  // Update word count when editor is ready
  useEffect(() => {
    if (!editor) return;

    const timer = setTimeout(() => {
      updateWordCount();
    }, 500);

    return () => clearTimeout(timer);
  }, [editor, updateWordCount]);

  // Create document structure for complete proposals
  const createDocumentStructure = (content: string): DocumentStructure => {
    const organizationName = 'Your Organization'; // TODO: Get from user context
    const grantTitle = grantData?.title || 'Grant Opportunity';
    const funderName = grantData?.funder?.name || 'Funding Organization';
    
    // Extract sections from content for TOC
    const sections = extractSectionsFromContent(content);
    
    return {
      coverPage: {
        title: `Grant Proposal: ${grantTitle}`,
        organizationName,
        grantTitle,
        funderName,
        submissionDate: new Date().toLocaleDateString()
      },
      tableOfContents: sections.map((section, index) => ({
        title: section.title,
        page: index + 3, // Cover=1, TOC=2, Content starts at 3
        level: section.level
      })),
      sections: sections.map((section, index) => ({
        id: section.id,
        title: section.title,
        content: section.content,
        pageStart: index + 3
      }))
    };
  };

  // Extract sections from HTML content for TOC generation
  const extractSectionsFromContent = (htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    return Array.from(headings).map((heading, index) => ({
      id: `section-${index}`,
      title: heading.textContent || `Section ${index + 1}`,
      level: parseInt(heading.tagName.charAt(1)),
      content: '' // Content extraction would be more complex
    }));
  };

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
        if (editingIntent.target === 'document' || !editingIntent.target || sectionName === 'complete_proposal') {
          // Complete document rewrite - create full document structure
          editor.chain()
            .focus()
            .selectAll()
            .deleteSelection()
            .insertContent(content)
            .run();
          
          // Create document structure for complete proposals
          if (sectionName === 'complete_proposal' || title.toLowerCase().includes('complete') || title.toLowerCase().includes('proposal')) {
            const structure = createDocumentStructure(content);
            setDocumentStructure(structure);
          }
        } else {
          // Rewrite specific section
          let sectionFound = false;
          doc.descendants((node, pos) => {
            if (node.type.name === 'heading' &&
              node.textContent.toLowerCase().includes(sectionName.toLowerCase())) {
              // Find the end of this section
              let endPos = doc.content.size;
              doc.descendants((nextNode, nextPos) => {
                if (nextPos > pos && nextNode.type.name === 'heading' &&
                  nextNode.attrs.level <= node.attrs.level) {
                  endPos = nextPos;
                  return false;
                }
              });

              // Replace the entire section
              editor.chain()
                .focus()
                .setTextSelection({ from: pos, to: endPos })
                .insertContent(content)
                .run();

              sectionFound = true;
              return false;
            }
          });

          if (!sectionFound) {
            // Section not found, append new section
            editor.chain()
              .focus()
              .setTextSelection(doc.content.size)
              .insertContent(`<h2>${title}</h2>${content}`)
              .run();
          }
        }
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
      } else if (editingIntent?.intent === 'append' || editingIntent?.intent === 'new') {
        // Append at end for explicit append or new content
        editor.chain()
          .focus()
          .setTextSelection(doc.content.size)
          .insertContent(`<h2 style="margin-top: 2rem; margin-bottom: 1rem; font-weight: bold;">${title}</h2><div>${content}</div>`)
          .run();
      } else {
        // If no editing intent specified, check if document is empty
        const isEmpty = !editor.getText() || editor.getText().trim() === '';

        if (isEmpty) {
          // Empty document - insert content directly
          editor.chain()
            .focus()
            .insertContent(content)
            .run();
        } else {
          // Non-empty document with no clear intent - append at end
          editor.chain()
            .focus()
            .setTextSelection(doc.content.size)
            .insertContent(`<h2 style="margin-top: 2rem; margin-bottom: 1rem; font-weight: bold;">${title}</h2><div>${content}</div>`)
            .run();
        }
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
              Document
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

          {/* Professional Document Pages */}
          <PaginatedDocument 
            editor={editor} 
            documentStructure={documentStructure}
          />

          {/* Empty State - No Pages Shown */}
          {(!editor?.getText() || editor.getText().trim() === '') && !documentStructure && (
            <div className="empty-canvas-state flex items-center justify-center" style={{ minHeight: '400px' }}>
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready to Create Your Professional Proposal
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Ask Maya to "draft a complete proposal" and a professional document with cover page, table of contents, and structured sections will appear here.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                    Try saying:
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>"Draft a complete grant proposal"</div>
                    <div>"Create a full proposal document"</div>
                    <div>"Generate the entire proposal"</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Structure Indicator */}
          {documentStructure && (
            <div className="fixed top-32 right-8 z-50">
              <Badge className="bg-green-100 text-green-800 text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Professional Structure
              </Badge>
            </div>
          )}

          {/* Professional A4 Document with CSS Pagination */}
          {editor?.getText() && editor.getText().trim() !== '' && (
            <div className="document-container">
              <div className="a4-document-wrapper">
                <EditorContent
                  editor={editor}
                  className="a4-document-content focus-within:outline-none"
                />
              </div>
            </div>
          )}

          {/* Global Styles for Professional A4 Document */}
          <style jsx global>{`
            .a4-document-wrapper {
              width: 210mm;
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
              padding: 25mm 20mm;
              min-height: 297mm;
              page-break-after: always;
            }
            
            .a4-document-content {
              font-family: 'Times New Roman', serif !important;
              font-size: 12pt !important;
              line-height: 1.6 !important;
              color: #000000 !important;
              width: 100% !important;
              height: auto !important;
            }

            .a4-document-content h1 {
              font-size: 18pt !important;
              font-weight: bold !important;
              margin: 24pt 0 12pt 0 !important;
              page-break-after: avoid !important;
            }

            .a4-document-content h2 {
              font-size: 16pt !important;
              font-weight: bold !important;
              margin: 18pt 0 10pt 0 !important;
              page-break-after: avoid !important;
            }

            .a4-document-content h3 {
              font-size: 14pt !important;
              font-weight: bold !important;
              margin: 14pt 0 8pt 0 !important;
              page-break-after: avoid !important;
            }

            .a4-document-content p {
              margin: 0 0 12pt 0 !important;
              text-align: justify !important;
              orphans: 2 !important;
              widows: 2 !important;
            }

            .a4-document-content ul, .a4-document-content ol {
              margin: 12pt 0 12pt 24pt !important;
              padding: 0 !important;
            }

            .a4-document-content li {
              margin: 6pt 0 !important;
              page-break-inside: avoid !important;
            }

            .a4-document-content strong {
              font-weight: bold !important;
            }

            .a4-document-content em {
              font-style: italic !important;
            }

            /* CSS-based pagination for proper A4 pages */
            @page {
              size: A4;
              margin: 25mm 20mm;
            }

            /* Print-ready styles */
            @media print {
              .a4-document-wrapper {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                min-height: auto !important;
                page-break-after: auto !important;
              }
              
              .a4-document-content {
                page-break-inside: avoid !important;
              }

              .a4-document-content h1,
              .a4-document-content h2,
              .a4-document-content h3 {
                page-break-after: avoid !important;
              }

              .a4-document-content p {
                orphans: 2 !important;
                widows: 2 !important;
              }
            }

            /* Automatic page breaks for long content */
            .a4-document-content {
              page-break-inside: auto !important;
            }

            .a4-document-content > div[style*="page-break-before: always"] {
              page-break-before: always !important;
            }

            /* Ensure content doesn't overflow pages */
            .page-content-area {
              overflow: hidden !important;
            }

            /* Professional table styles if needed */
            .a4-document-content table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin: 12pt 0 !important;
              page-break-inside: avoid !important;
            }

            .a4-document-content th, .a4-document-content td {
              border: 1pt solid #000000 !important;
              padding: 6pt !important;
              text-align: left !important;
            }

            .a4-document-content th {
              background-color: #f5f5f5 !important;
              font-weight: bold !important;
            }.6 !important;
              color: #000 !important;
              width: 210mm !important;
              max-width: 210mm !important;
              background: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .a4-document-content .ProseMirror {
              outline: none !important;
              /* No padding here - handled by parent container */
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              /* Minimum height for content */
              min-height: 247mm !important;
              background: white;
              position: relative;
              
              /* Professional document formatting */
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
            
            /* Standard professional document typography */
            .a4-document-content h1 {
              font-size: 18pt !important;
              font-weight: bold !important;
              margin: 0 0 24pt 0 !important;
              text-align: center !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              text-transform: uppercase !important;
              letter-spacing: 1pt !important;
            }
            
            .a4-document-content h2 {
              font-size: 14pt !important;
              font-weight: bold !important;
              margin: 24pt 0 12pt 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              border-bottom: none !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5pt !important;
            }
            
            .a4-document-content h3 {
              font-size: 12pt !important;
              font-weight: bold !important;
              margin: 18pt 0 6pt 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            
            .a4-document-content p {
              margin: 0 0 12pt 0 !important;
              text-align: justify !important;
              text-indent: 0 !important;
              orphans: 2 !important;
              widows: 2 !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            
            /* First paragraph after headings should not be indented */
            .a4-document-content h1 + p,
            .a4-document-content h2 + p,
            .a4-document-content h3 + p {
              text-indent: 0 !important;
            }
            
            .a4-document-content ul, .a4-document-content ol {
              margin: 12pt 0 !important;
              padding-left: 36pt !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            
            .a4-document-content li {
              margin-bottom: 6pt !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
              text-align: justify !important;
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
            
            /* Print styles - Standard A4 formatting */
            @media print {
              .paginated-document-container {
                width: 100% !important;
                max-width: none !important;
              }
              
              .a4-page-wrapper {
                margin-bottom: 0 !important;
                page-break-after: always !important;
              }
              
              .a4-page-wrapper:last-child {
                page-break-after: auto !important;
              }
              
              .a4-page {
                width: 100% !important;
                height: 100vh !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              
              .page-header, .page-footer {
                border: none !important;
              }
              
              .page-content-area {
                position: static !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                bottom: auto !important;
                overflow: visible !important;
                padding: 25mm 20mm !important;
              }
              
              .a4-document-content .ProseMirror {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: none !important;
                min-height: auto !important;
                background: none !important;
                background-image: none !important;
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
              
              .a4-document-content ul, 
              .a4-document-content ol {
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