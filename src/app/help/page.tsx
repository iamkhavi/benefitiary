import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  Target, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut,
  Zap,
  CreditCard,
  MessageSquare,
  ChevronDown,
  Book,
  Video,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const mainMenuItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Grant Explorer", href: "/grants", icon: Search, badge: "New" },
  { title: "Applications", href: "/applications", icon: FileText, count: 12 },
  { title: "Matches", href: "/matches", icon: Target, count: 8 }
];

const featureItems = [
  { title: "AI Assistant", href: "/ai-assistant", icon: Zap, badge: "Pro" },
  { title: "Analytics", href: "/analytics", icon: BarChart3, count: 20 },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Feedback", href: "/feedback", icon: MessageSquare }
];

const generalItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Help Center", href: "/help", icon: HelpCircle },
  { title: "Log out", href: "/logout", icon: LogOut }
];

export default async function HelpPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  const currentPath = "/help";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-gray-900">Benefitiary</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              MAIN MENU
            </h3>
            <nav className="space-y-1">
              {mainMenuItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.count && (
                        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                          {item.count}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="px-3 mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              FEATURES
            </h3>
            <nav className="space-y-1">
              {featureItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.count && (
                        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                          {item.count}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="px-3 mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              GENERAL
            </h3>
            <nav className="space-y-1">
              {generalItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-primary to-orange-600 rounded-lg p-4 text-white">
            <h4 className="font-semibold text-sm mb-1">Upgrade Pro!</h4>
            <p className="text-xs opacity-90 mb-3">
              Unlock unlimited AI with better features.
            </p>
            <Button size="sm" variant="secondary" className="w-full">
              Upgrade
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800">Pro Plan</Badge>
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {session.user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">
                  {session.user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Search */}
            <div className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search for help articles, guides, or FAQs..."
                  className="pl-12 py-3 text-lg"
                />
              </div>
            </div>

            {/* Quick Help */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Book className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Getting Started</h3>
                  <p className="text-sm text-gray-600">Learn the basics of using Benefitiary</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Video className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Video Tutorials</h3>
                  <p className="text-sm text-gray-600">Watch step-by-step video guides</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Live Chat</h3>
                  <p className="text-sm text-gray-600">Get instant help from our support team</p>
                </CardContent>
              </Card>
            </div>

            {/* Popular Articles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Popular Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      "How to find the best grant matches for your organization",
                      "Using AI Assistant to write compelling proposals",
                      "Setting up your organization profile for better matches",
                      "Understanding grant application deadlines and requirements",
                      "Tracking your application status and follow-ups"
                    ].map((article, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <span className="text-sm font-medium">{article}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Live Chat</p>
                      <p className="text-sm text-gray-600">Available 24/7 for Pro users</p>
                    </div>
                    <Button size="sm">Chat Now</Button>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-gray-600">support@benefitiary.com</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Phone className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Phone Support</p>
                      <p className="text-sm text-gray-600">Enterprise customers only</p>
                    </div>
                    <Button size="sm" variant="outline">Call</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      category: "Account & Billing",
                      questions: [
                        "How do I upgrade my plan?",
                        "Can I cancel anytime?",
                        "How to update payment method?",
                        "What's included in Pro plan?"
                      ]
                    },
                    {
                      category: "Grant Discovery",
                      questions: [
                        "How does grant matching work?",
                        "Can I save grants for later?",
                        "How often are new grants added?",
                        "What if I don't see relevant grants?"
                      ]
                    },
                    {
                      category: "AI Assistant",
                      questions: [
                        "How accurate is the AI?",
                        "Can AI write full proposals?",
                        "Is my data secure with AI?",
                        "How to get better AI results?"
                      ]
                    }
                  ].map((category, index) => (
                    <div key={index}>
                      <h4 className="font-semibold text-lg mb-3">{category.category}</h4>
                      <div className="space-y-2">
                        {category.questions.map((question, qIndex) => (
                          <div key={qIndex} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <span className="text-sm">{question}</span>
                            <ChevronRight className="h-3 w-3 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}