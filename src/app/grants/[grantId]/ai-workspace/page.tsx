'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Zap
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

export default function AIWorkspacePage({ params }: { params: { grantId: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [grantData, setGrantData] = useState<any>(null);
  const [loadingGrant, setLoadingGrant] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No automatic welcome message - let user initiate conversation

  // Load grant data
  useEffect(() => {
    async function fetchGrant() {
      try {
        const response = await fetch(`/api/grants/${params.grantId}`);
        if (response.ok) {
          const data = await response.json();
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
      } catch (error) {
        console.error('Failed to load grant:', error);
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
      }
    }

    fetchGrant();
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
      sessionId: null // Will be managed by the API
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
      // Call the real AI API
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

      const data = await response.json();
      
      const aiResponse: Message = {
        id: data.sessionId + '_' + Date.now(),
        sender: 'ai',
        content: data.response,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, aiResponse]);
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
    }
  };

  const handleQuickAction = (_actionId: string, prompt: string) => {
    handleSendMessage(prompt);
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
            sessionId: null
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          const analysisMessage: Message = {
            id: data.sessionId + '_analysis',
            sender: 'ai',
            content: data.response,
            timestamp: new Date(),
            type: 'text'
          };
          
          setMessages(prev => [...prev, analysisMessage]);
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

  if (loadingGrant || !grantData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Workspace...</p>
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
          />
        </div>

        {/* Chat Area - Moved to Right */}
        <div className="w-full md:w-96 lg:w-80 xl:w-96 flex flex-col bg-white">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex space-x-3",
                  message.sender === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={cn(
                    "max-w-2xl rounded-lg px-4 py-3",
                    message.sender === 'user'
                      ? "bg-primary text-white"
                      : message.type === 'system'
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-white border border-gray-200"
                  )}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.sender === 'ai' && (
                      <div className="flex items-center space-x-1">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-gray-500">AI</span>
                      </div>
                    )}
                  </div>
                </div>

                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-purple-100 text-purple-600">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me about eligibility, requirements, or get help with your proposal..."
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}