"use client";

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight,
  Sparkles,
  FileText,
  Search,
  Target,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Users,
  Send,
  User,
  Bot,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: Array<{
    type: 'navigate' | 'open' | 'search' | 'create';
    target: string;
    label: string;
  }>;
}

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    
    // Show chat interface and breadcrumb
    setShowChat(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages([userMessage]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    try {
      // Call Global Maya API
      const response = await fetch('/api/maya/global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: currentQuery,
          conversationHistory: []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          suggestions: data.suggestions,
          actions: data.actions
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message?: string) => {
    const messageText = message || query.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      // Call Global Maya API
      const response = await fetch('/api/maya/global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: messageText,
          conversationHistory: messages
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          suggestions: data.suggestions,
          actions: data.actions
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Sparkles,
      title: 'Maya',
      description: 'AI-powered grant assistant',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      icon: FileText,
      title: 'Proposal',
      description: 'Write winning proposals',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      icon: Search,
      title: 'Grants',
      description: 'Find matching opportunities',
      color: 'bg-green-100 text-green-700'
    },
    {
      icon: Target,
      title: 'Matches',
      description: 'View grant matches',
      color: 'bg-orange-100 text-orange-700'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Track your progress',
      color: 'bg-indigo-100 text-indigo-700'
    }
  ];

  const popularTemplates = [
    {
      icon: FileText,
      title: 'Healthcare Grant Proposal',
      description: 'For medical research and health initiatives',
      badge: 'Recommended for you',
      badgeColor: 'bg-green-100 text-green-800'
    },
    {
      icon: Lightbulb,
      title: 'Innovation & Technology',
      description: 'For tech startups and innovation projects',
      badge: 'Most popular',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      icon: Users,
      title: 'Community Development',
      description: 'For social impact and community programs',
      badge: 'High success rate',
      badgeColor: 'bg-purple-100 text-purple-800'
    }
  ];

  // If chat is active, show chat interface
  if (showChat) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header with Breadcrumb (like Zapier) */}
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
              <span>Home</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-purple-600 font-medium">Build with Maya</span>
            </nav>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Maya</h1>
                <p className="text-gray-600">AI Grant Assistant</p>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <Card className="mb-6">
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-blue-600' 
                          : 'bg-gradient-to-r from-purple-600 to-blue-600'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className={`rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        {message.suggestions && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs bg-white hover:bg-gray-50"
                                onClick={() => handleSendMessage(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                        {message.actions && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.actions.map((action, index) => (
                              <Button
                                key={index}
                                size="sm"
                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => window.location.href = action.target}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">Maya is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      placeholder="Ask Maya anything about grants, proposals, or funding opportunities..."
                      className="w-full min-h-[60px] resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !query.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>Press Shift + Enter for new line</span>
                  <span>Powered by Maya AI</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-200"
                  onClick={() => handleSendMessage("Show me grants that match my organization")}
                >
                  <Search className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Find Grants</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-200"
                  onClick={() => handleSendMessage("Show me my current applications")}
                >
                  <FileText className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">My Applications</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-200"
                  onClick={() => handleSendMessage("Show me my grant matches")}
                >
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Grant Matches</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-purple-50 hover:border-purple-200"
                  onClick={() => setShowChat(false)}
                >
                  <ArrowRight className="h-5 w-5 text-purple-600 rotate-180" />
                  <span className="text-sm font-medium">Back to Home</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default landing page (like Zapier first screenshot)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Main Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            What would you like to accomplish?
          </h1>
          <p className="text-gray-600 mb-8">
            Describe what you want to do and Maya will help you get started
          </p>

          {/* Main AI Input */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Input
                placeholder="Enter an idea or app name to get started"
                className="w-full py-4 px-6 text-lg border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 pr-16"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              />
              <Button 
                size="sm"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700"
                onClick={handleSubmit}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-purple-50 px-4 py-2"
              onClick={() => setQuery("Find grants for healthcare innovation")}
            >
              <Target className="h-3 w-3 mr-2" />
              Find grants
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-blue-50 px-4 py-2"
              onClick={() => setQuery("Write a proposal for education funding")}
            >
              <FileText className="h-3 w-3 mr-2" />
              Write proposal
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-green-50 px-4 py-2"
              onClick={() => setQuery("Review my application before submission")}
            >
              <TrendingUp className="h-3 w-3 mr-2" />
              Review application
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-orange-50 px-4 py-2"
              onClick={() => setQuery("Track my application status")}
            >
              <BarChart3 className="h-3 w-3 mr-2" />
              Track progress
            </Badge>
          </div>
        </div>

        {/* Start from scratch section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Start from scratch
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                onClick={() => {
                  if (action.title === 'Maya') {
                    setQuery("Help me get started with Maya");
                    handleSubmit();
                  } else if (action.title === 'Grants') {
                    window.location.href = '/grants';
                  } else if (action.title === 'Matches') {
                    window.location.href = '/matches';
                  } else if (action.title === 'Analytics') {
                    window.location.href = '/analytics';
                  } else {
                    setQuery(`Help me with ${action.title.toLowerCase()}`);
                  }
                }}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mx-auto mb-3`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular templates */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Popular templates</h2>
            <Button variant="ghost" className="text-purple-600 hover:text-purple-700">
              Browse all templates
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularTemplates.map((template, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setQuery(`Use ${template.title} template`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <template.icon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1">{template.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <Badge className={`text-xs ${template.badgeColor}`}>
                        {template.badge}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}