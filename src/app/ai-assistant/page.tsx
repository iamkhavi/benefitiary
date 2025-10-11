'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send,
  Bot,
  Sparkles,
  FileDown,
  Copy,
  Lightbulb,
  FileText,
  Search,
  Target,
  BarChart3
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';

export default function AIAssistantPage() {
  const { data: session } = useSession();

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <Badge className="bg-purple-100 text-purple-800">Pro</Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate Proposal
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Review Application
              </Button>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Find Grants
              </Button>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Improve Writing
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-6 mb-6">
            {/* Welcome Message */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-gray-900">
                    Hi {session?.user?.name}! I'm your AI grant assistant. I can help you:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>• Write compelling grant proposals</li>
                    <li>• Find matching grant opportunities</li>
                    <li>• Review and improve your applications</li>
                    <li>• Answer questions about funding requirements</li>
                  </ul>
                  <p className="mt-3 text-gray-900">
                    What would you like to work on today?
                  </p>
                </div>
              </div>
            </div>

            {/* Sample Conversation */}
            <div className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {session?.user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-primary text-white rounded-lg p-4">
                  <p>I need help writing a proposal for a health innovation grant. Can you help me get started?</p>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-gray-900 mb-3">
                    I'd be happy to help you write a health innovation grant proposal! Let me create a structured outline for you:
                  </p>
                  <div className="bg-white rounded-lg p-4 border">
                    <h4 className="font-semibold text-gray-900 mb-2">Grant Proposal Structure</h4>
                    <ol className="space-y-2 text-sm text-gray-700">
                      <li><strong>1. Executive Summary</strong> - Brief overview of your innovation</li>
                      <li><strong>2. Problem Statement</strong> - Health challenge you're addressing</li>
                      <li><strong>3. Solution Overview</strong> - Your innovative approach</li>
                      <li><strong>4. Implementation Plan</strong> - How you'll execute the project</li>
                      <li><strong>5. Impact & Outcomes</strong> - Expected results and metrics</li>
                      <li><strong>6. Budget & Timeline</strong> - Resource requirements</li>
                      <li><strong>7. Team & Qualifications</strong> - Your expertise</li>
                    </ol>
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Outline
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileDown className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  placeholder="Ask me anything about grants, proposals, or funding opportunities..."
                  className="min-h-[60px] resize-none"
                />
              </div>
              <Button size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Shift + Enter for new line</span>
              <span>Pro Plan: Unlimited messages</span>
            </div>
          </div>
        </div>

        {/* Sidebar - AI Tools */}
        <div className="w-80 ml-6">
          <h3 className="font-semibold text-gray-900 mb-4">AI Tools</h3>
          
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Proposal Generator</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3">
                  Generate complete grant proposals based on your requirements
                </p>
                <Button size="sm" className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Generator
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Grant Matcher</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3">
                  Find grants that match your organization and project
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Find Matches
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Writing Assistant</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3">
                  Improve grammar, tone, and clarity of your proposals
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Review Text
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Budget Helper</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-3">
                  Create detailed budgets and financial projections
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Build Budget
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-orange-100 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">Usage This Month</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Messages</span>
                <span className="font-medium">247 / ∞</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Proposals Generated</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Documents Reviewed</span>
                <span className="font-medium">8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
