/**
 * Canvas-Aware Maya Chat Component
 * Maya knows about current canvas content and user edits
 */

'use client';

import { useState, useRef } from 'react';
import { useMayaWithCanvas } from '@/hooks/useMayaWithCanvas';
import { MayaFileUpload } from './maya-file-upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Sparkles, Eye, Paperclip } from 'lucide-react';

interface CanvasAwareMayaChatProps {
  grantId: string; // Required for comprehensive context
  userContext?: any; // Optional context overrides
  editor?: any; // Tiptap editor instance
  className?: string;
}

export function CanvasAwareMayaChat({ grantId, userContext, editor, className }: CanvasAwareMayaChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [showCanvasPreview, setShowCanvasPreview] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<Array<any>>([]);

  // Get current canvas content function
  const getCurrentCanvasContent = () => {
    if (!editor) return '';
    return editor.getHTML(); // Get current HTML from Tiptap
  };

  // Handle canvas updates
  const handleCanvasUpdate = (content: any) => {
    if (!editor) return;
    
    if (content.editingIntent?.intent === 'rewrite') {
      // Replace all content
      editor.commands.setContent(content.content);
    } else if (content.editingIntent?.intent === 'append') {
      // Append to existing content
      const currentContent = editor.getHTML();
      editor.commands.setContent(currentContent + content.content);
    }
  };

  const { messages, isLoading, sendMessage } = useMayaWithCanvas({
    grantId, // Required for comprehensive context loading
    userContext, // Optional overrides
    getCurrentCanvasContent, // Maya now knows about canvas edits!
    onCanvasUpdate: handleCanvasUpdate
  });

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage;
    setInputMessage('');
    
    // Include pending documents if any
    await sendMessage(message, pendingDocuments.length > 0 ? pendingDocuments : undefined);
    
    // Clear pending documents after sending
    if (pendingDocuments.length > 0) {
      setPendingDocuments([]);
    }
  };

  const handleDocumentAnalyzed = (documents: Array<any>) => {
    setPendingDocuments(documents);
    
    // Auto-send analysis request
    const analysisMessage = `I uploaded ${documents.length} document(s): ${documents.map(d => d.fileName).join(', ')}. Please analyze them and tell me how I can use them strategically.`;
    sendMessage(analysisMessage, documents);
    
    // Hide upload panel
    setShowFileUpload(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentCanvasContent = getCurrentCanvasContent();

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Canvas Awareness Indicator */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Maya</h3>
              <p className="text-xs text-gray-600">Canvas-Aware Grant Consultant</p>
            </div>
            {isLoading && (
              <div className="flex items-center space-x-1 text-purple-600">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-xs">Analyzing canvas...</span>
              </div>
            )}
          </div>

          {/* Canvas Status */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${
              currentCanvasContent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <Eye className="w-3 h-3" />
              <span>{currentCanvasContent ? 'Canvas Active' : 'Canvas Empty'}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCanvasPreview(!showCanvasPreview)}
              className="text-xs"
            >
              {showCanvasPreview ? 'Hide' : 'Show'} Canvas
            </Button>
          </div>
        </div>

        {/* Canvas Preview */}
        {showCanvasPreview && currentCanvasContent && (
          <div className="mt-3 p-3 bg-white border rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Current Canvas Content (Maya can see this):</p>
            <div 
              className="text-xs text-gray-600 max-h-32 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: currentCanvasContent.substring(0, 500) + '...' }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">Hi! I'm Canvas-Aware Maya</h4>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              I can see what's on your canvas and work with your existing content. 
              Try: "improve the budget section" or "add more detail to the timeline"
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-500' 
                  : 'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Content */}
              <Card className={`p-3 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border-gray-200'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Canvas Update Indicator */}
                {message.extractedContent && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                    ✅ {message.extractedContent.editingIntent?.intent === 'rewrite' ? 'Replaced' : 'Updated'} "{message.extractedContent.title}" on canvas
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500 font-medium">Try these:</p>
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(suggestion)}
                        className="block w-full text-left text-xs p-2 bg-gray-50 hover:bg-gray-100 rounded border text-gray-700 transition-colors"
                        disabled={isLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* File Upload Panel */}
      {showFileUpload && (
        <div className="p-4 border-t bg-gray-50">
          <MayaFileUpload 
            onDocumentAnalyzed={handleDocumentAnalyzed}
            className="mb-4"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFileUpload(false)}
            className="w-full"
          >
            Cancel Upload
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        {pendingDocuments.length > 0 && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            📎 {pendingDocuments.length} document(s) ready for analysis: {pendingDocuments.map(d => d.fileName).join(', ')}
          </div>
        )}
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={isLoading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pendingDocuments.length > 0
              ? "Ask Maya to analyze your uploaded documents..."
              : currentCanvasContent 
                ? "Ask Maya to improve existing content or add new sections..."
                : "Ask Maya to create proposal content or provide advice..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend}
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {userContext?.orgName} • {userContext?.grantTitle}
          </span>
          <span>
            Canvas: {currentCanvasContent ? `${Math.round(currentCanvasContent.length / 1000)}k chars` : 'Empty'}
          </span>
        </div>
      </div>
    </div>
  );
}