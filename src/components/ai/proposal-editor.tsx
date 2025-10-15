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
import { useState, useEffect, useCallback } from 'react';
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
}

interface AIWritingSession {
  isActive: boolean;
  currentSection: string;
  progress: number;
}

export function ProposalEditor({ showCanvas, onClose, grantId }: ProposalEditorProps) {
  const [isAIWriting, setIsAIWriting] = useState<AIWritingSession>({
    isActive: false,
    currentSection: '',
    progress: 0
  });
  const [showAIIndicators, setShowAIIndicators] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
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
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Enter a heading...';
          }
          return 'Start writing your proposal here. The AI will assist you in real-time...';
        },
      }),
    ],
    content: `
      <div style="text-align: center; margin-bottom: 2rem;">
        <h1>Grant Proposal</h1>
        <p style="color: #6B7280; margin: 0.5rem 0;">Collaborative AI-Assisted Document</p>
        <p style="color: #9CA3AF; font-size: 0.875rem;">Application Date: ${new Date().toLocaleDateString()}</p>
      </div>

      <h2>Executive Summary</h2>
      <p>Provide a compelling overview of your project, highlighting the problem you're addressing, your innovative solution, and the expected impact...</p>

      <h2>Project Description</h2>
      <p>Detail your project methodology, approach, and the innovative aspects that set it apart from existing solutions...</p>

      <h2>Budget Overview</h2>
      <p>Present a clear breakdown of your budget, including major cost categories and their justifications...</p>

      <h2>Expected Impact & Outcomes</h2>
      <p>Describe the anticipated results, measurable outcomes, and long-term benefits of your project...</p>

      <h2>Project Timeline</h2>
      <p>Outline key milestones, deliverables, and the overall project schedule...</p>

      <h2>Team & Organizational Capacity</h2>
      <p>Highlight your team's expertise, organizational strengths, and capacity to successfully execute this project...</p>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[800px] p-8',
        style: 'font-family: Georgia, serif; line-height: 1.6; max-width: none;'
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
    },
  });

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
              Collaborative Proposal
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
            {/* Word Count */}
            <Badge variant="outline" className="text-xs">
              {wordCount} words
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

      {/* Editor Canvas - A4 Size */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
        <Card 
          className="mx-auto bg-white shadow-lg border-0 relative"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            maxWidth: '210mm'
          }}
        >
          {/* AI Collaboration Indicators */}
          {showAIIndicators && (
            <div className="absolute top-4 right-4 z-10">
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

          <EditorContent 
            editor={editor} 
            className={cn(
              "tiptap-editor",
              "min-h-[297mm] p-8",
              "focus-within:outline-none"
            )}
          />
        </Card>
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