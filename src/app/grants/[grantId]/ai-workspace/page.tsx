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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      content: `Welcome to your AI Workspace for the **Maternal Health Innovation Challenge 2025**! 

I'm your dedicated grant assistant and I have full context of:
✅ Grant requirements and eligibility criteria
✅ Your organization profile (HealthCare Kenya)
✅ Application deadlines and requirements

**Quick Analysis:**
- **Match Score**: 95% - Excellent alignment!
- **Key Strengths**: Healthcare focus, Kenya location, innovation emphasis
- **Potential Gap**: Need to verify 3+ years maternal health experience

How can I help you with your application today?`,
      timestamp: new Date(Date.now() - 300000),
      type: 'text'
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock grant data - in real app, this would come from API
  const grantData = {
    id: params.grantId,
    title: "Maternal Health Innovation Challenge 2025",
    funder: "Gates Foundation",
    amount: "$100,000 - $750,000",
    deadline: "Apr 15, 2025",
    location: "Sub-Saharan Africa, South Asia",
    category: "Healthcare",
    match: 95,
    description: "Supporting breakthrough innovations to reduce maternal mortality in Sub-Saharan Africa and South Asia.",
    eligibility: [
      "Registered nonprofits or social enterprises",
      "3+ years experience in maternal health",
      "Partnerships with local health systems",
      "Measurable impact metrics"
    ],
    requiredDocs: [
      "Concept Note (5 pages max)",
      "Budget breakdown",
      "Impact metrics and evidence",
      "Partnership letters"
    ]
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

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: messageToSend,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: generateAIResponse(messageToSend),
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleQuickAction = (_actionId: string, prompt: string) => {
    handleSendMessage(prompt);
  };

  const generateAIResponse = (userInput: string): string => {
    const responses = [
      `Based on your question about "${userInput}", here's what I found in the grant requirements:

**Eligibility Check**: Your organization appears to meet most criteria. However, I need clarification on your maternal health experience duration.

**Recommendation**: 
1. Prepare a detailed portfolio of your maternal health work
2. Highlight any partnerships with local health facilities
3. Quantify your impact metrics (lives saved, mothers helped, etc.)

Would you like me to help draft a specific section of your proposal?`,
      
      `Great question! Let me analyze this against the Gates Foundation's priorities:

**Key Alignment Points**:
- ✅ Innovation focus matches your tech approach
- ✅ Geographic eligibility (Kenya is included)
- ✅ Target demographic alignment

**Next Steps**:
1. Review the concept note template
2. Prepare your budget breakdown
3. Gather partnership letters

I can help you with any of these. What would you like to work on first?`,
      
      `I've reviewed the grant requirements for this specific question. Here's my assessment:

**Strengths to Highlight**:
- Your community-based approach
- Local partnerships and trust
- Measurable health outcomes

**Areas to Address**:
- Scale potential and sustainability
- Technology integration strategy
- Long-term impact measurement

Would you like me to help you structure a response that addresses these points?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
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

I'm analyzing this document and will incorporate it into our conversation context. You can now ask me questions about this file or reference it in your proposal development.`,
        timestamp: new Date(),
        type: 'system'
      };
      
      setMessages(prev => [...prev, systemMessage]);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

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
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((line, index) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <p key={index} className="font-semibold mb-2">
                            {line.replace(/\*\*/g, '')}
                          </p>
                        );
                      }
                      if (line.startsWith('✅') || line.startsWith('❌') || line.startsWith('📎')) {
                        return (
                          <p key={index} className="mb-1">
                            {line}
                          </p>
                        );
                      }
                      if (line.trim() === '') {
                        return <br key={index} />;
                      }
                      return (
                        <p key={index} className="mb-2">
                          {line}
                        </p>
                      );
                    })}
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