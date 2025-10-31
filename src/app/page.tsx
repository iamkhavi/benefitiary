"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Zap,
  Search,
  FileText,
  Target,
  Lightbulb,
  TrendingUp,
  Clock,
  Award,
  MessageSquare,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: string;
  category: 'create' | 'improve' | 'discover' | 'analyze';
  color: string;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    applications: 0,
    matches: 0,
    analytics: 0
  });

  useEffect(() => {
    // Fetch user stats for contextual actions
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/user/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'maya-chat',
      title: 'Ask Maya Anything',
      description: 'Get instant expert advice on grants, proposals, and funding strategy',
      icon: Sparkles,
      action: '/maya',
      category: 'analyze',
      color: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    {
      id: 'find-grants',
      title: 'Find Perfect Grants',
      description: 'Discover grants that match your organization and mission',
      icon: Search,
      action: '/grants',
      category: 'discover',
      color: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    {
      id: 'write-proposal',
      title: 'Write Winning Proposal',
      description: 'Create professional proposals with AI-powered assistance',
      icon: FileText,
      action: '/matches',
      category: 'create',
      color: 'bg-green-100 text-green-700 border-green-200'
    },
    {
      id: 'improve-application',
      title: 'Improve Application',
      description: 'Enhance existing applications with expert feedback',
      icon: TrendingUp,
      action: '/applications',
      category: 'improve',
      color: 'bg-orange-100 text-orange-700 border-orange-200'
    }
  ];

  const recentActivity = [
    {
      type: 'match',
      title: 'New grant matches found',
      description: '3 new opportunities match your profile',
      time: '2 hours ago',
      action: 'View matches',
      icon: Target,
      color: 'text-blue-600'
    },
    {
      type: 'deadline',
      title: 'Application deadline approaching',
      description: 'Health Innovation Grant due in 5 days',
      time: '1 day ago',
      action: 'Continue application',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      type: 'success',
      title: 'Application submitted successfully',
      description: 'Education Access Fund proposal submitted',
      time: '3 days ago',
      action: 'View status',
      icon: CheckCircle,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Home</span>
            <ArrowRight className="h-4 w-4" />
            <span className="text-purple-600 font-medium">Build with Maya</span>
          </nav>
        </div>

        {/* Global Maya Chat Interface */}
        <div className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Maya</h1>
                <p className="text-gray-600">AI Grant Assistant</p>
              </div>
            </div>

            {/* Maya Chat Card */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Thought for a moment... 🤔
                  </h2>
                  <p className="text-gray-700 mb-4">
                    Hello! I'm here to help you build automations with Benefitiary.
                  </p>
                  <p className="text-gray-600 mb-6">
                    What would you like to accomplish? For example:
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Find grants that match my organization's mission</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Help me write a compelling proposal</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Review my application before submission</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Show me my application status and next steps</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-6">
                    Just describe what you want to accomplish and I'll design the simplest solution for you.
                  </p>
                </div>

                {/* Chat Input */}
                <div className="relative">
                  <Input
                    placeholder="Chat with Maya"
                    className="pr-12 py-3 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        // Navigate to Global Maya chat
                        window.location.href = `/maya?q=${encodeURIComponent(searchQuery)}`;
                      }
                    }}
                  />
                  <Button 
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      if (searchQuery.trim()) {
                        window.location.href = `/maya?q=${encodeURIComponent(searchQuery)}`;
                      }
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions - Zapier Style */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.id} 
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 ${action.color} hover:scale-105`}
                onClick={() => window.location.href = action.action}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                      <div className="flex items-center text-sm font-medium">
                        <span>Get started</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Templates - Zapier Style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Popular Templates</h2>
            <Button variant="ghost" className="text-purple-600">
              Browse all templates
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Healthcare Grant Proposal</h3>
                    <p className="text-sm text-gray-500">For medical research and health initiatives</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">Recommended for you</Badge>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Education Program Funding</h3>
                    <p className="text-sm text-gray-500">For educational initiatives and training</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-xs">Most popular</Badge>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Innovation & Technology</h3>
                    <p className="text-sm text-gray-500">For tech startups and innovation projects</p>
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-800 text-xs">High success rate</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section - Activity & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm">View all</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center`}>
                        <activity.icon className={`h-5 w-5 ${activity.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-purple-600">
                      {activity.action}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{stats.applications}</div>
                  <p className="text-sm text-gray-600">Active Applications</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{stats.matches}</div>
                  <p className="text-sm text-gray-600">Grant Matches</p>
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600" onClick={() => window.location.href = '/maya'}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Chat with Maya
                  </Button>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/grants'}>
                    <Search className="h-4 w-4 mr-2" />
                    Find New Grants
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/matches'}>
                    <Target className="h-4 w-4 mr-2" />
                    View Matches
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}