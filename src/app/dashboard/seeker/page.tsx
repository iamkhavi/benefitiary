import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Bell,
  Mail,
  ChevronDown,
  FileDown,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Send,
  Calendar,
  Award,
  Building2
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

export default async function SeekerDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  const currentPath = "/dashboard";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-gray-900">Benefitiary</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6">
          {/* Main Menu */}
          <div className="px-6 mb-8">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Main Menu
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
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {item.count && (
                      <span className="text-xs text-gray-500">{item.count}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Features */}
          <div className="px-6 mb-8">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Features
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
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {item.count && (
                      <span className="text-xs text-gray-500">{item.count}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* General */}
          <div className="px-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              General
            </h3>
            <nav className="space-y-1">
              {generalItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Upgrade Card */}
        <div className="p-6 border-t border-gray-200">
          <div className="bg-primary rounded-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Upgrade Pro!</span>
            </div>
            <p className="text-xs text-primary-foreground/80 mb-3">
              Higher productivity with better grant matching
            </p>
            <Button 
              size="sm" 
              className="w-full bg-white text-primary hover:bg-gray-50"
            >
              Upgrade
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          {/* Search */}
          <div className="flex items-center space-x-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search grants, funders, or applications..."
                className="pl-10 bg-gray-50 border-0 focus:bg-white"
              />
            </div>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                3
              </Badge>
            </Button>

            <Button variant="ghost" size="sm" className="relative">
              <Mail className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                2
              </Badge>
            </Button>

            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {session.user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back {session.user.name || 'Grant Seeker'}
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitor and control what happens with your grants today for funding success.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
                <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                  Export
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Available Funding */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-medium">Available Funding</CardTitle>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$2,450,000</div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-primary font-medium">+12%</span>
                    <span className="text-gray-500">from last month</span>
                  </div>
                </CardContent>
              </Card>

              {/* Applications */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-red-600 font-medium">-3%</span>
                    <span className="text-gray-500">from last month</span>
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-green-600" />
                    </div>
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">68%</div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-primary font-medium">+5%</span>
                    <span className="text-gray-500">from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grant Portfolio */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="w-5 h-5" />
                      <span>My Grant Portfolio</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 p-0 h-auto">
                      + Add New
                    </Button>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                        $
                      </div>
                      <div>
                        <div className="font-medium text-sm">Health Innovation Grant</div>
                        <div className="text-xs text-gray-500">$50,000</div>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        E
                      </div>
                      <div>
                        <div className="font-medium text-sm">Education Access Fund</div>
                        <div className="text-xs text-gray-500">€25,000</div>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        C
                      </div>
                      <div>
                        <div className="font-medium text-sm">Community Development</div>
                        <div className="text-xs text-gray-500">₦2,500,000</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Overview Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Overview</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">This Year</Badge>
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">$84,849.93</div>
                    </div>
                    
                    {/* Chart representation */}
                    <div className="h-32 bg-gradient-to-t from-primary/20 to-primary/5 rounded-lg flex items-end justify-center p-4">
                      <div className="text-sm text-primary font-medium">
                        Grant Success Trend ↗
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center text-xs text-gray-500">
                      <div>Jan</div>
                      <div>Apr</div>
                      <div>Jul</div>
                      <div>Dec</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funding Goals */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>My Funding Goals</span>
                  </CardTitle>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Program Expansion</div>
                        <div className="text-xs text-gray-500">$15,600/$25,000</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">62%</div>
                    </div>
                  </div>
                  <Progress value={62} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Award className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Emergency Fund</div>
                        <div className="text-xs text-gray-500">$8,200/$15,000</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">55%</div>
                    </div>
                  </div>
                  <Progress value={55} className="h-2" />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Filter
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-sm font-medium">Grant Application Submitted</div>
                          <div className="text-xs text-gray-500">Wed, 12 Jun 2026</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">$50,000</div>
                        <Badge className="bg-primary/10 text-primary text-xs">Success</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Send className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium">Proposal Review</div>
                          <div className="text-xs text-gray-500">Tue, 11 Jun 2026</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">$25,000</div>
                        <Badge className="bg-primary/10 text-primary text-xs">Success</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <div>
                          <div className="text-sm font-medium">Deadline Reminder</div>
                          <div className="text-xs text-gray-500">Sun, 09 Jun 2026</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">$100,000</div>
                        <Badge className="bg-primary/10 text-primary text-xs">Success</Badge>
                      </div>
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