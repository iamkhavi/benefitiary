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
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import React, { useState, useEffect, useRef } from 'react';
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
  Table as TableIcon,
  Eye,
  Edit,
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

// Preview Mode Component - Shows properly paginated document with overflow handling
const PreviewMode = React.forwardRef<HTMLDivElement, { content: string }>(({ content }, ref) => {
  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }

    // Split content by explicit page breaks - trust AI's page structure
    let sections = content.split(/<(?:hr[^>]*class="page-break"[^>]*>|div[^>]*class="page-break"[^>]*>.*?<\/div>)/);
    sections = sections.filter(section => section.trim() !== '');
    
    if (sections.length === 0) {
      // If no page breaks, treat as single page
      setPages([content]);
    } else {
      // Use AI-generated page structure as-is
      setPages(sections);
    }
  }, [content]);



  if (!content || content.trim() === '' || content === '<p></p>') {
    return (
      <div className="mx-auto" style={{ width: '210mm' }}>
        <div 
          className="bg-white shadow-lg border"
          style={{
            width: '210mm',
            height: '297mm',
            padding: '25mm 20mm',
            fontFamily: 'Times New Roman, serif',
            fontSize: '12pt',
            lineHeight: '1.6'
          }}
        >
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4" />
              <p>Document preview will appear here</p>
              <p className="text-sm">Switch to Edit mode to start writing</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="mx-auto space-y-8" style={{ width: '210mm' }}>
      {pages.map((pageContent, index) => (
        <div 
          key={index}
          className="bg-white shadow-lg border preview-page"
          style={{
            width: '210mm',
            height: '297mm',
            padding: '25mm 20mm',
            fontFamily: 'Times New Roman, serif',
            fontSize: '12pt',
            lineHeight: '1.6',
            position: 'relative',
            pageBreakAfter: 'always'
          }}
        >
          {/* Page Content */}
          <div 
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: pageContent }}
            style={{ height: '247mm', overflow: 'hidden' }}
          />
          
          {/* Page Number */}
          <div 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500"
            style={{ fontSize: '10pt' }}
          >
            Page {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
});

PreviewMode.displayName = 'PreviewMode';

export function ProposalEditor({ showCanvas, onClose, grantId, extractedContent, onContentUpdate }: ProposalEditorProps) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'proposal-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
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
      const html = editor.getHTML();
      const words = text.split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(words);
      setPageCount(Math.max(1, Math.ceil(words / 250))); // ~250 words per page
      setDocumentContent(html);
      
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

  // Handle AI-inserted content and auto-switch to preview
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

      // Auto-switch to preview mode after AI content insertion
      setTimeout(() => {
        setIsPreviewMode(true);
      }, 500);

      console.log('AI content inserted successfully, switching to preview mode');
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
      // Use modern browser APIs to create clean PDF without headers/footers
      if ('showSaveFilePicker' in window) {
        // Modern approach using File System Access API
        await generateCleanPDF();
      } else {
        // Fallback: Create optimized print window
        createCleanPrintWindow();
      }
    } catch (error) {
      console.error('PDF export error:', error);
      // Fallback to simple print
      createCleanPrintWindow();
    }
  };

  const generateCleanPDF = async () => {
    // Create a clean document for PDF generation
    const content = editor?.getHTML() || '';
    
    // Create blob with clean HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { 
              size: A4; 
              margin: 25mm 20mm;
              @top-left { content: ""; }
              @top-center { content: ""; }
              @top-right { content: ""; }
              @bottom-left { content: ""; }
              @bottom-center { content: counter(page); }
              @bottom-right { content: ""; }
            }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 12pt; 
              line-height: 1.6;
              margin: 0;
              padding: 0;
            }
            h1, h2, h3 { page-break-after: avoid; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 1rem 0;
              page-break-inside: avoid;
            }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;

    // Trigger download as HTML (user can save as PDF)
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grant-proposal.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show brief instruction
    alert('HTML file downloaded. Open it in your browser and use Ctrl+P → Save as PDF for clean output.');
  };

  const createCleanPrintWindow = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Set empty title to minimize header content
      printWindow.document.write(`
        <html>
          <head>
            <title></title>
            <style>
              @page { 
                size: A4; 
                margin: 25mm 20mm;
                @bottom-center { content: counter(page); }
              }
              body { 
                font-family: 'Times New Roman', serif; 
                font-size: 12pt; 
                line-height: 1.6;
                margin: 0;
                padding: 0;
              }
              h1, h2, h3 { page-break-after: avoid; }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 1rem 0;
                page-break-inside: avoid;
              }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .page-break { page-break-before: always; }
              
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${editor?.getHTML()}</body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }, 500);
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

            <Button 
              variant={isPreviewMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {isPreviewMode ? 'Edit' : 'Preview'}
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

        {/* Simple Formatting Toolbar - Only show in edit mode */}
        {!isPreviewMode && (
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
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertContent('<hr class="page-break" style="page-break-before: always; border: none; margin: 2rem 0;" />').run()}
          >
            Page Break
          </Button>
          </div>
        )}
      </div>

      {/* Canvas Area - Edit or Preview Mode */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        {isPreviewMode ? (
          <PreviewMode content={documentContent} ref={previewRef} />
        ) : (
          <div 
            ref={editorContainerRef}
            className="mx-auto"
          >
            <div 
              className="bg-white shadow-lg proposal-pages"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '25mm 20mm',
                fontFamily: 'Times New Roman, serif',
                fontSize: '12pt',
                lineHeight: '1.6',
                pageBreakInside: 'avoid'
              }}
            >
              <EditorContent 
                editor={editor} 
                className="focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Professional Document Styles */}
      <style jsx global>{`
        /* Table Styles for Proposals */
        .proposal-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 11pt;
          page-break-inside: avoid; /* Prevent tables from breaking across pages */
        }
        
        .proposal-table th,
        .proposal-table td {
          border: 1px solid #333;
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }
        
        .proposal-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        /* Ensure tables don't break in preview mode */
        @media screen {
          .proposal-table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        
        /* Page Break Styles */
        .page-break {
          page-break-before: always;
          border: none;
          margin: 2rem 0;
          height: 1px;
          background: transparent;
        }
        
        @media screen {
          .page-break {
            border-top: 2px dashed #ccc;
            position: relative;
          }
          
          .page-break::after {
            content: 'Page Break';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 8px;
            font-size: 10px;
            color: #666;
          }
        }
        
        /* Professional Document Formatting */
        .proposal-pages h1 {
          font-size: 18pt;
          font-weight: bold;
          margin: 2rem 0 1rem 0;
          page-break-after: avoid;
        }
        
        .proposal-pages h2 {
          font-size: 16pt;
          font-weight: bold;
          margin: 1.5rem 0 0.75rem 0;
          page-break-after: avoid;
        }
        
        .proposal-pages h3 {
          font-size: 14pt;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
          page-break-after: avoid;
        }
        
        .proposal-pages p {
          margin: 0.5rem 0;
          text-align: justify;
        }
        
        .proposal-pages ul,
        .proposal-pages ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .proposal-pages li {
          margin: 0.25rem 0;
        }
        
        /* Preview Mode Styles */
        .preview-page {
          break-after: page;
        }
        
        .preview-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 11pt;
        }
        
        .preview-content table th,
        .preview-content table td {
          border: 1px solid #333;
          padding: 8px 12px;
          text-align: left;
          vertical-align: top;
        }
        
        .preview-content table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .preview-content h1 {
          font-size: 18pt;
          font-weight: bold;
          margin: 2rem 0 1rem 0;
          page-break-after: avoid;
        }
        
        .preview-content h2 {
          font-size: 16pt;
          font-weight: bold;
          margin: 1.5rem 0 0.75rem 0;
          page-break-after: avoid;
        }
        
        .preview-content h3 {
          font-size: 14pt;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
          page-break-after: avoid;
        }
        
        .preview-content p {
          margin: 0.5rem 0;
          text-align: justify;
        }
        
        .preview-content ul,
        .preview-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .preview-content li {
          margin: 0.25rem 0;
        }

        /* Print Styles */
        @media print {
          .proposal-pages, .preview-page {
            box-shadow: none !important;
            margin: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
            border: none;
            margin: 0;
            height: 0;
          }
          
          @page {
            size: A4;
            margin: 25mm 20mm;
          }
        }
      `}</style>
    </div>
  );
}