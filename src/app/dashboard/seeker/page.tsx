import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  DollarSign, 
  FileText, 
  Target, 
  TrendingUp, 
  ArrowUpRight,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Send,
  Calendar,
  Award,
  Building2
} from 'lucide-react';

export default async function SeekerDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <AppLayout user={{ 
      name: session.user.name || 'Grant Seeker', 
      email: session.user.email 
    }}>
      <div className="p-6 space-y-6">
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
          {/* Total Grant Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-medium">Available Funding</CardTitle>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2,450,000</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-emerald-600 font-medium">+12%</span>
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
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
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
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">68%</div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-emerald-600 font-medium">+5%</span>
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
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Active</Badge>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    $
                  </div>
                  <div>
                    <div className="font-medium text-sm">Health Innovation Grant</div>
                    <div className="text-xs text-gray-500">$50,000</div>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
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
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
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

          {/* Application Overview */}
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
                  <div className="text-2xl font-bold text-emerald-600">$84,849.93</div>
                </div>
                
                {/* Simple chart representation */}
                <div className="h-32 bg-gradient-to-t from-emerald-100 to-emerald-50 rounded-lg flex items-end justify-center p-4">
                  <div className="text-sm text-emerald-700 font-medium">
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
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-sm font-medium">Grant Application Submitted</div>
                      <div className="text-xs text-gray-500">Wed, 12 Jun 2026</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">$50,000</div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Success</Badge>
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
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Success</Badge>
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
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Success</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}