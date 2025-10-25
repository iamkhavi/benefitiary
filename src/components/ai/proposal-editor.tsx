'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';

import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Highlighter,
  X,
  FileDown,

} from 'lucide-react';
import DOMPurify from 'dompurify';

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

// Simple Page Break Extension
const PageBreak = Extension.create({
  name: 'pageBreak',
  
  addCommands() {
    return {
      insertPageBreak: () => ({ commands }: { commands: any }) => {
        return commands.insertContent('<hr class="page-break" style="page-break-before: always; border: none; margin: 2rem 0;" />')
      },
    } as any
  }
})

export function ProposalEditor({ showCanvas, onClose, grantId, extractedContent, onContentUpdate }: ProposalEditorProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3] }),
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,

      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      Link.configure({ openOnClick: false }),
      PageBreak,
      Placeholder.configure({
        placeholder: 'Start writing your proposal...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(words);
      setPageCount(Math.max(1, Math.ceil(words / 250))); // ~250 words per page
      
      onContentUpdate?.();
    },
  });

  // Auto-save functionality
  useEffect(() => {
    if (!editor) return;

    const saveInterval = setInterval(() => {
      const content = editor.getHTML();
      localStorage.setItem(`proposal-${grantId || 'draft'}`, content);
      setLastSaved(new Date());
    }, 30000);

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

  // Handle AI-inserted content (Clean implementation following guide)
  useEffect(() => {
    if (!editor || !extractedContent) return;

    const { content: rawHtml, section, editingIntent } = extractedContent;

    try {
      // Sanitize HTML first (following guide)
      const safeHtml = DOMPurify.sanitize(rawHtml, { 
        ADD_TAGS: ['hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'], 
        ADD_ATTR: ['class', 'style'] 
      });

      // Handle different editing intents
      if (editingIntent?.intent === 'rewrite' && section === 'complete_proposal') {
        // Complete document rewrite
        editor.chain().focus().selectAll().deleteSelection().insertContent(safeHtml).run();
      } else {
        // Append content (simple and reliable)
        editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent(safeHtml).run();
      }

      console.log('AI content inserted successfully');
      onContentUpdate?.();

    } catch (err) {
      console.error('Content insertion failed:', err);
      // Fallback: insert as plain text
      editor.chain().focus().insertContent(`<p>AI Content Error - Section: ${section}</p>`).run();
    }
  }, [extractedContent, editor, onContentUpdate]);

  const saveDraft = () => {
    if (!editor) return;
    const content = editor.getHTML();
    localStorage.setItem(`proposal-${grantId || 'draft'}`, content);
    setLastSaved(new Date());
  };

  const exportToPDF = async () => {
    if (!editor) return;
    
    try {
      // Simple PDF export using browser print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Grant Proposal</title>
              <style>
                @page { size: A4; margin: 25mm 20mm; }
                body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
                h1, h2, h3 { page-break-after: avoid; }
                table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .page-break { page-break-before: always; }
              </style>
            </head>
            <body>${editor.getHTML()}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Clean Toolbar */}
      <div className="px-6 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Document Canvas
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {wordCount} words
            </Badge>
            <Badge variant="outline" className="text-xs">
              {pageCount} page{pageCount !== 1 ? 's' : ''}
            </Badge>

            {lastSaved && (
              <Badge variant="outline" className="text-xs text-green-600">
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            )}

            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>

            <Button size="sm" onClick={saveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>

            {showCanvas && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Simple Formatting Toolbar */}
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
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertContent('<hr class="page-break" style="page-break-before: always; border: none; margin: 2rem 0;" />').run()}
          >
            Page Break
          </Button>
        </div>
      </div>

      {/* Clean A4 Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        <div 
          ref={editorContainerRef}
          className="mx-auto bg-white shadow-lg"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '25mm 20mm',
            fontFamily: 'Times New Roman, serif',
            fontSize: '12pt',
            lineHeight: '1.6'
          }}
        >
          <EditorContent 
            editor={editor} 
            className="focus:outline-none prose prose-sm max-w-none"
          />
        </div>
      </div>
    </div>
  );
}