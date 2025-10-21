/**
 * Canvas-Aware Maya Hook
 * Includes current canvas content in conversations
 */

import { useState, useCallback } from 'react';

interface MayaMessage {
  role: 'user' | 'assistant';
  content: string;
  extractedContent?: any;
  suggestions?: string[];
}

interface UseMayaWithCanvasOptions {
  grantId?: string; // Optional for now to avoid breaking changes
  userContext?: any;
  onCanvasUpdate?: (content: any) => void;
  getCurrentCanvasContent?: () => string;
}

export function useMayaWithCanvas(options: UseMayaWithCanvasOptions = {}) {
  const [messages, setMessages] = useState<MayaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();

  const sendMessage = useCallback(async (userMessage: string, uploadedDocuments?: Array<any>) => {
    if (!userMessage.trim()) return;

    setIsLoading(true);

    // Get current canvas content if available
    const currentCanvasContent = options.getCurrentCanvasContent?.() || null;

    // Add user message immediately
    const userMsg: MayaMessage = {
      role: 'user',
      content: userMessage
    };
    
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/maya', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage,
          sessionId,
          grantId: options.grantId || 'default',
          userContext: options.userContext,
          history: messages.slice(-10),
          currentCanvasContent,
          uploadedDocuments // NEW: Document processing support
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Maya response failed');
      }

      // Create Maya response message
      const mayaMsg: MayaMessage = {
        role: 'assistant',
        content: data.content,
        extractedContent: data.extractedContent,
        suggestions: data.suggestions
      };

      // Add Maya response
      setMessages(prev => [...prev, mayaMsg]);

      // Update canvas if content was generated
      if (data.extractedContent && options.onCanvasUpdate) {
        options.onCanvasUpdate(data.extractedContent);
      }

      // Store session ID for future requests
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

    } catch (error) {
      console.error('Maya error:', error);
      
      // Add error message
      const errorMsg: MayaMessage = {
        role: 'assistant',
        content: "I'm having trouble right now. Could you try rephrasing your request?",
        suggestions: ['Try a different approach', 'Check your connection', 'Contact support']
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, options.userContext, options.onCanvasUpdate, options.getCurrentCanvasContent]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearConversation
  };
}