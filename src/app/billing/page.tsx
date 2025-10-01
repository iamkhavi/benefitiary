import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ChevronDown,
  Check,
  Crown,
  Download
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

export default async function BillingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  const currentPath = "/billing";

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
              <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
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
          <div className="max-w-4xl mx-auto">
            {/* Current Plan */}
            <Card className="mb-8 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>Pro Plan</CardTitle>
                      <p className="text-sm text-gray-600">Your current subscription</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Cost</p>
                    <p className="text-2xl font-bold text-gray-900">$29/month</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Billing Date</p>
                    <p className="text-lg font-semibold text-gray-900">Jan 15, 2025</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="text-lg font-semibold text-gray-900">•••• 4242</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-6">
                  <Button variant="outline">Manage Subscription</Button>
                  <Button variant="outline">Update Payment</Button>
                  <Button variant="outline">Download Invoice</Button>
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">AI Messages</p>
                    <p className="text-2xl font-bold text-primary">247</p>
                    <p className="text-xs text-gray-500">Unlimited on Pro</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Proposals Generated</p>
                    <p className="text-2xl font-bold text-primary">12</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Analytics Reports</p>
                    <p className="text-2xl font-bold text-primary">20</p>
                    <p className="text-xs text-gray-500">Advanced insights</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing History */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { date: "Dec 15, 2024", amount: "$29.00", status: "Paid", invoice: "INV-001" },
                    { date: "Nov 15, 2024", amount: "$29.00", status: "Paid", invoice: "INV-002" },
                    { date: "Oct 15, 2024", amount: "$29.00", status: "Paid", invoice: "INV-003" }
                  ].map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{payment.date}</p>
                          <p className="text-sm text-gray-600">{payment.invoice}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold">{payment.amount}</span>
                        <Badge className="bg-green-100 text-green-800">{payment.status}</Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plan Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <p className="text-sm text-gray-600">Upgrade or downgrade your subscription</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Free Plan */}
                  <div className="border rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-2">Free</h3>
                    <p className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal text-gray-600">/month</span></p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        5 AI messages/month
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Basic grant search
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        3 applications
                      </li>
                    </ul>
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  </div>

                  {/* Pro Plan */}
                  <div className="border-2 border-primary rounded-lg p-6 relative">
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-white">
                      Current
                    </Badge>
                    <h3 className="font-semibold text-lg mb-2">Pro</h3>
                    <p className="text-3xl font-bold mb-4">$29<span className="text-sm font-normal text-gray-600">/month</span></p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Unlimited AI messages
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Advanced analytics
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Unlimited applications
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Priority support
                      </li>
                    </ul>
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="border rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-2">Enterprise</h3>
                    <p className="text-3xl font-bold mb-4">$99<span className="text-sm font-normal text-gray-600">/month</span></p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Everything in Pro
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Team collaboration
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Custom integrations
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                        Dedicated support
                      </li>
                    </ul>
                    <Button variant="outline" className="w-full">
                      Upgrade
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}