'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { 
  Bot,
  User,
  Send,
  Paperclip,
  Download,
  FileText,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  X,
  Zap,
  ArrowUp,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { QuickActions } from '@/components/ai/quick-actions';
import { GrantSummary } from '@/components/grants/grant-summary';
import { ProposalEditor } from '@/components/ai/proposal-editor';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  metadata?: any;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

// Maya's response is now fully dynamic from OpenAI - no hardcoded summaries needed

// Component for rendering formatted message content
function MessageContent({ content }: { content: string }) {
  // Parse and format Maya's structured responses
  const formatContent = (text: string) => {
    // Split by lines for processing
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines but add spacing
      if (line.trim() === '') {
        elements.push(<div key={`space-${currentIndex++}`} className="h-2" />);
        continue;
      }

      // Headers (lines starting with **)
      if (line.match(/^\*\*(.+)\*\*$/)) {
        const headerText = line.replace(/^\*\*(.+)\*\*$/, '$1');
        elements.push(
          <h4 key={`header-${currentIndex++}`} className="font-semibold text-gray-900 mb-2 mt-3 first:mt-0">
            {headerText}
          </h4>
        );
        continue;
      }

      // Bullet points (lines starting with • or -)
      if (line.match(/^[•\-]\s/)) {
        const bulletText = line.replace(/^[•\-]\s/, '');
        elements.push(
          <div key={`bullet-${currentIndex++}`} className="flex items-start space-x-2 mb-1">
            <span className="text-purple-600 mt-1">•</span>
            <span className="flex-1">{formatInlineText(bulletText)}</span>
          </div>
        );
        continue;
      }

      // Numbered lists (lines starting with numbers)
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          const [, number, text] = match;
          elements.push(
            <div key={`numbered-${currentIndex++}`} className="flex items-start space-x-2 mb-1">
              <span className="text-purple-600 font-medium min-w-[1.5rem]">{number}.</span>
              <span className="flex-1">{formatInlineText(text)}</span>
            </div>
          );
          continue;
        }
      }

      // Regular paragraphs
      elements.push(
        <p key={`para-${currentIndex++}`} className="mb-2 last:mb-0">
          {formatInlineText(line)}
        </p>
      );
    }

    return elements;
  };

  // Format inline text with bold, italic, etc.
  const formatInlineText = (text: string) => {
    // Handle progress indicators (Document is X% complete)
    if (text.includes('% complete')) {
      const match = text.match(/(\d+)% complete/);
      if (match) {
        const percentage = parseInt(match[1]);
        return (
          <div className="flex items-center space-x-2">
            <span>{text.replace(/\d+% complete/, '')}</span>
            <div className="flex-1 max-w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-purple-600">{percentage}%</span>
          </div>
        );
      }
    }

    // Handle bold text (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.match(/^\*\*[^*]+\*\*$/)) {
        const boldText = part.replace(/^\*\*([^*]+)\*\*$/, '$1');
        return <strong key={index} className="font-semibold text-gray-900">{boldText}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-1">
      {formatContent(content)}
    </div>
  );
}

export default function AIWorkspacePage({ params }: { params: { grantId: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [grantData, setGrantData] = useState<any>(null);
  const [loadingGrant, setLoadingGrant] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canvasContent, setCanvasContent] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversation history on component mount

  // Load grant data and conversation history
  useEffect(() => {
    async function fetchGrantAndMessages() {
      try {
        // Load grant data
        const grantResponse = await fetch(`/api/grants/${params.grantId}`);
        if (grantResponse.ok) {
          const data = await grantResponse.json();
          setGrantData({
            id: data.grant.id,
            title: data.grant.title,
            funder: data.grant.funder?.name || 'Unknown Funder',
            amount: formatAmount(data.grant.fundingAmountMin, data.grant.fundingAmountMax),
            deadline: data.grant.deadline ? new Date(data.grant.deadline).toLocaleDateString() : 'Rolling',
            location: Array.isArray(data.grant.locationEligibility) 
              ? data.grant.locationEligibility.join(', ') 
              : data.grant.locationEligibility || 'Not specified',
            category: data.grant.category?.replace(/_/g, ' ') || 'General',
            match: Math.floor(Math.random() * 20) + 80, // Mock match score for now
            description: data.grant.description || 'No description available',
            eligibility: data.grant.eligibilityCriteria 
              ? data.grant.eligibilityCriteria.split('\n').filter(Boolean)
              : ['Eligibility criteria not specified'],
            requiredDocs: Array.isArray(data.grant.requiredDocuments)
              ? data.grant.requiredDocuments
              : data.grant.requiredDocuments 
                ? data.grant.requiredDocuments.split(',').map((doc: string) => doc.trim())
                : ['Required documents not specified']
          });
        }

        // Load conversation history
        const messagesResponse = await fetch(`/api/ai/messages/${params.grantId}`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          if (messagesData.session && messagesData.messages) {
            setSessionId(messagesData.session.id);
            const loadedMessages: Message[] = messagesData.messages.map((msg: any) => ({
              id: msg.id,
              sender: msg.sender === 'USER' ? 'user' : 'ai',
              content: msg.content,
              timestamp: new Date(msg.createdAt),
              type: msg.messageType === 'FILE' ? 'file' : msg.messageType === 'SYSTEM' ? 'system' : 'text',
              metadata: msg.metadata
            }));
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error('Failed to load grant and messages:', error);
        // Keep mock data as fallback
        setGrantData({
          id: params.grantId,
          title: "Grant Information",
          funder: "Loading...",
          amount: "Amount not available",
          deadline: "Deadline not available",
          location: "Location not specified",
          category: "General",
          match: 0,
          description: "Grant information is currently unavailable.",
          eligibility: ["Unable to load eligibility criteria"],
          requiredDocs: ["Unable to load required documents"]
        });
      } finally {
        setLoadingGrant(false);
        setLoadingMessages(false);
      }
    }

    fetchGrantAndMessages();
  }, [params.grantId]);

  const formatAmount = (min?: number, max?: number) => {
    if (!min && !max) return 'Amount not specified';
    
    const formatNumber = (num: number) => {
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
      return `$${num.toLocaleString()}`;
    };

    if (min && max && min !== max) {
      return `${formatNumber(min)} - ${formatNumber(max)}`;
    }
    return formatNumber(min || max || 0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage;
    if (!messageToSend.trim()) return;

    // Check if this is a clarifying question request
    let requestBody: any = {
      grantId: params.grantId,
      sessionId: sessionId, // Use existing session ID
      stream: true // Enable streaming
    };

    if (messageToSend.startsWith('CLARIFY:')) {
      const topic = messageToSend.replace('CLARIFY:', '');
      requestBody.action = 'clarify';
      requestBody.topic = topic;
      requestBody.message = `Get clarifying questions about ${topic}`;
    } else {
      requestBody.message = messageToSend;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: messageToSend.startsWith('CLARIFY:') ? `Asked for guidance about ${messageToSend.replace('CLARIFY:', '')}` : messageToSend,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call the streaming AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Handle streaming response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        await handleStreamingResponse(response);
      } else {
        // Fallback to regular JSON response
        const data = await response.json();
        handleRegularResponse(data);
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      
      // Simple error message
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        sender: 'ai',
        content: 'An error occurred, please try again later.',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    setIsStreaming(true);
    let streamingMessage: Message | null = null;
    let metadata: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'metadata') {
                // Store metadata and update session
                metadata = data;
                if (data.sessionId && data.sessionId !== sessionId) {
                  setSessionId(data.sessionId);
                }

                // Create initial streaming message
                streamingMessage = {
                  id: data.messageId || (data.sessionId + '_' + Date.now()),
                  sender: 'ai',
                  content: '',
                  timestamp: new Date(),
                  type: 'text'
                };

                setStreamingMessageId(streamingMessage.id);
                setMessages(prev => [...prev, streamingMessage!]);
              } else if (data.type === 'content' && streamingMessage) {
                // Update streaming message content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === streamingMessage!.id 
                      ? { ...msg, content: msg.content + data.chunk }
                      : msg
                  )
                );
              } else if (data.type === 'complete' && metadata) {
                // Handle completion and canvas integration
                if (metadata.contentType === 'proposal_section' && metadata.extractedContent) {
                  // Show canvas if not already visible
                  if (!showCanvas) {
                    setShowCanvas(true);
                  }

                  // Send content to canvas
                  handleCanvasUpdate(metadata.extractedContent);

                  // Use Maya's dynamic response directly
                  const summaryContent = data.response;

                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === streamingMessage!.id 
                        ? { 
                            ...msg, 
                            content: summaryContent,
                            metadata: { 
                              isCanvasUpdate: true,
                              section: metadata.extractedContent.section 
                            }
                          }
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleRegularResponse = (data: any) => {
    // Update session ID if it's new
    if (data.sessionId && data.sessionId !== sessionId) {
      setSessionId(data.sessionId);
    }

    // Handle canvas integration for proposal content
    if (data.contentType === 'proposal_section' && data.extractedContent) {
      // Show canvas if not already visible
      if (!showCanvas) {
        setShowCanvas(true);
      }

      // Send content to canvas
      handleCanvasUpdate(data.extractedContent);

      // Show Maya's dynamic response directly
      const summaryMessage: Message = {
        id: data.messageId || (data.sessionId + '_' + Date.now()),
        sender: 'ai',
        content: data.response,
        timestamp: new Date(),
        type: 'text',
        metadata: { 
          isCanvasUpdate: true,
          section: data.extractedContent.section 
        }
      };
      
      setMessages(prev => [...prev, summaryMessage]);
    } else {
      // Regular chat message
      const aiResponse: Message = {
        id: data.messageId || (data.sessionId + '_' + Date.now()),
        sender: 'ai',
        content: data.response,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }
  };

  const handleQuickAction = (_actionId: string, prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleCanvasUpdate = (extractedContent: any) => {
    setCanvasContent(extractedContent);
  };

  // Removed mock AI response function - using real Maya API

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      };
      
      setUploadedFiles(prev => [...prev, uploadedFile]);
      
      // Add system message about file upload
      const systemMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        content: `📎 **File uploaded**: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)

Maya is analyzing this document...`,
        timestamp: new Date(),
        type: 'system'
      };
      
      setMessages(prev => [...prev, systemMessage]);

      try {
        // Read file content
        const fileContent = await readFileContent(file);
        
        // Send to Maya for analysis
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grantId: params.grantId,
            action: 'analyze_file',
            fileData: {
              fileName: file.name,
              content: fileContent,
              fileType: file.type
            },
            sessionId: sessionId,
            stream: true // Enable streaming for file analysis too
          }),
        });

        if (response.ok) {
          // Handle streaming response for file analysis
          if (response.headers.get('content-type')?.includes('text/event-stream')) {
            await handleStreamingResponse(response);
          } else {
            // Fallback to regular JSON response
            const data = await response.json();
            handleRegularResponse(data);
          }
        } else {
          throw new Error('Failed to analyze file');
        }
      } catch (error) {
        console.error('File analysis error:', error);
        
        const errorMessage: Message = {
          id: Date.now().toString() + '_error',
          sender: 'ai',
          content: 'An error occurred while analyzing the file, please try again later.',
          timestamp: new Date(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  // Helper function to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Limit content size to avoid API limits
        const maxLength = 10000;
        resolve(content.length > maxLength ? content.substring(0, maxLength) + '...[truncated]' : content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  if (loadingGrant || loadingMessages || !grantData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loadingGrant ? 'Loading AI Workspace...' : 'Loading conversation history...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/grants">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Grants
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <Bot className="h-5 w-5 mr-2 text-purple-600" />
                AI Workspace
              </h1>
              <p className="text-sm text-gray-600">{grantData.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex md:hidden space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="px-2"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCanvas(!showCanvas)}
                className="px-2 hidden lg:inline-flex"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <Badge className="bg-green-100 text-green-800 hidden sm:inline-flex">
              <Sparkles className="h-3 w-3 mr-1" />
              {grantData.match}% Match
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex">
              <MessageSquare className="h-3 w-3 mr-1" />
              {messages.length} Messages
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Grant Info Sidebar */}
        <div className={cn(
          "w-72 lg:w-80 bg-white border-r border-gray-200 overflow-y-auto",
          "md:block",
          showSidebar ? "block absolute inset-y-0 left-0 z-50 md:relative" : "hidden"
        )}>
          <div className="p-4 space-y-4">
            {showSidebar && (
              <div className="flex justify-between items-center md:hidden mb-4">
                <h3 className="font-semibold">Grant Info</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <GrantSummary grant={grantData} />
            
            <QuickActions onActionClick={handleQuickAction} />

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Uploaded Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Proposal Canvas */}
        <div className={cn(
          "flex-1 bg-white border-r border-gray-200 overflow-hidden",
          "lg:block",
          showCanvas ? "block absolute inset-0 z-40 lg:relative" : "hidden"
        )}>
          <ProposalEditor 
            showCanvas={showCanvas} 
            onClose={() => setShowCanvas(false)}
            grantId={params.grantId}
            extractedContent={canvasContent}
            onContentUpdate={() => setCanvasContent(null)}
          />
        </div>

        {/* Chat Area - Moved to Right */}
        <div className="w-full md:w-96 lg:w-80 xl:w-96 flex flex-col bg-white">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !isLoading ? (
              /* Maya Default State */
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                {/* Maya Avatar SVG */}
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    👋 Hi! I'm Maya, your AI funding consultant
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
                    I'm here to help you navigate grant opportunities, write compelling proposals, and maximize your funding success.
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="space-y-3 w-full max-w-xs">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSendMessage("Tell me about this grant opportunity")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Tell me about this grant</div>
                        <div className="text-xs text-gray-500">Overview and key details</div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSendMessage("Am I eligible for this grant?")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Am I eligible?</div>
                        <div className="text-xs text-gray-500">Eligibility analysis</div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSendMessage("Help me get started with my application")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Bot className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Help me get started</div>
                        <div className="text-xs text-gray-500">Step-by-step guidance</div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSendMessage("Draft an executive summary for my proposal")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Download className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Draft executive summary</div>
                        <div className="text-xs text-gray-500">Jump into proposal writing</div>
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Subtle hint */}
                <p className="text-xs text-gray-400 mt-6">
                  Or just type your question below
                </p>
              </div>
            ) : (
              /* Regular Messages */
              <>
                {messages.map((message) => (
              <div key={message.id} className="mb-6">
                {message.sender === 'ai' ? (
                  /* Maya Response - Kiro Style */
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-purple-100 text-purple-600">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">Maya</span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed">
                        <MessageContent content={message.content} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* User Message - Clean Style */
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-end space-x-2 mb-2">
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="font-medium text-gray-900">You</span>
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed text-right">
                        {message.content}
                      </div>
                    </div>
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
                ))}
              </>
            )}
            
            {(isLoading || isStreaming) && (
              <div className="mb-6">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-gray-900">Maya</span>
                      <span className="text-xs text-gray-500">
                        {isStreaming ? 'typing...' : 'thinking...'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <PromptInput
              value={inputMessage}
              onValueChange={setInputMessage}
              isLoading={isLoading || isStreaming}
              onSubmit={handleSendMessage}
              className="w-full [&_textarea]:text-gray-900 [&_textarea]:caret-gray-900"
            >
              {/* Show uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    >
                      <Paperclip className="size-4" />
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="hover:bg-secondary/50 rounded-full p-1"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <PromptInputTextarea 
                placeholder="Ask me about eligibility, requirements, or get help with your proposal..." 
              />

              <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
                <PromptInputAction tooltip="Attach files">
                  <label
                    htmlFor="file-upload"
                    className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      ref={fileInputRef}
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    <Paperclip className="text-primary size-5" />
                  </label>
                </PromptInputAction>

                <PromptInputAction
                  tooltip={isLoading || isStreaming ? "Stop generation" : "Send message"}
                >
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading || isStreaming}
                  >
                    {isLoading || isStreaming ? (
                      <Square className="size-5 fill-current" />
                    ) : (
                      <ArrowUp className="size-5" />
                    )}
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}