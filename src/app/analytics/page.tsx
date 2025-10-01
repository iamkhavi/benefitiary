import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Award,
  Users,
  Clock,
  CheckCircle
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

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  const currentPath = "/analytics";

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
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <Badge className="bg-blue-100 text-blue-800">20 Reports</Badge>
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
          <div className="max-w-7xl mx-auto">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">68%</p>
                      <div className="flex items-center text-xs text-green-600 mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +12% from last month
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Funding</p>
                      <p className="text-2xl font-bold text-primary">$2.4M</p>
                      <div className="flex items-center text-xs text-primary mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +24% from last month
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Response Time</p>
                      <p className="text-2xl font-bold text-blue-600">18 days</p>
                      <div className="flex items-center text-xs text-green-600 mt-1">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        -3 days improvement
                      </div>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Applications</p>
                      <p className="text-2xl font-bold text-yellow-600">12</p>
                      <div className="flex items-center text-xs text-yellow-600 mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +2 this week
                      </div>
                    </div>
                    <FileText className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Application Success Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-r from-primary/10 to-orange-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-primary mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Chart visualization would go here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Funding by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Healthcare</span>
                        <span>$1.2M (50%)</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Education</span>
                        <span>$720K (30%)</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Technology</span>
                        <span>$480K (20%)</span>
                      </div>
                      <Progress value={20} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performing Grants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Health Innovation Grant", amount: "$250K", success: "Approved" },
                      { name: "Education Access Fund", amount: "$150K", success: "Approved" },
                      { name: "Tech Startup Grant", amount: "$100K", success: "Under Review" }
                    ].map((grant, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{grant.name}</p>
                          <p className="text-xs text-gray-600">{grant.amount}</p>
                        </div>
                        <Badge 
                          className={cn(
                            "text-xs",
                            grant.success === "Approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {grant.success}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { stage: "Draft", count: 5, color: "bg-gray-200" },
                      { stage: "Submitted", count: 8, color: "bg-blue-200" },
                      { stage: "Under Review", count: 4, color: "bg-yellow-200" },
                      { stage: "Approved", count: 7, color: "bg-green-200" }
                    ].map((stage, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                          <span className="text-sm font-medium">{stage.stage}</span>
                        </div>
                        <span className="text-sm text-gray-600">{stage.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Applications Submitted</span>
                        <span>8/10</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Funding Target</span>
                        <span>$2.4M/$3M</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Success Rate</span>
                        <span>68%/70%</span>
                      </div>
                      <Progress value={97} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}