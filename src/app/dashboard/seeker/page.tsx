import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign,
  TrendingUp,
  Send,
  Award,
  Building2
} from 'lucide-react';

export default function SeekerDashboard() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                Welcome back Steve Khavi
              </h2>
              <p className="text-sm text-gray-600">
                Monitor and control what happens with your grants today for funding success.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Wed, Oct 1, 2025</span>
              <Button size="sm" variant="outline">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Funding</p>
                  <p className="text-2xl font-bold text-gray-900">$2,450,000</p>
                  <p className="text-xs text-gray-500">+12% from last month</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-xs text-gray-500">-2% from last month</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">68%</p>
                  <p className="text-xs text-gray-500">+5% from last month</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Grant Portfolio */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">My Grant Portfolio</CardTitle>
                <Button variant="ghost" size="sm">+ Add New</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Health Innovation Grant",
                    amount: "$50,000",
                    status: "Active",
                    color: "bg-green-100 text-green-800"
                  },
                  {
                    title: "Education Access Fund",
                    amount: "$25,000",
                    status: "Active", 
                    color: "bg-green-100 text-green-800"
                  },
                  {
                    title: "Community Development",
                    amount: "$30,000",
                    status: "Inactive",
                    color: "bg-gray-100 text-gray-800"
                  }
                ].map((grant, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-sm">{grant.title}</p>
                        <p className="text-xs text-gray-600">{grant.amount}</p>
                      </div>
                    </div>
                    <Badge className={grant.color}>{grant.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overview Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Overview</CardTitle>
                <span className="text-sm text-gray-500">This Year</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-primary mb-2">$84,849.93</div>
                <div className="h-32 bg-gradient-to-r from-primary/10 to-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-sm text-gray-600">Grant Success Trend ↗</p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="font-medium">Jan</div>
                    <div className="text-gray-500">$12k</div>
                  </div>
                  <div>
                    <div className="font-medium">Apr</div>
                    <div className="text-gray-500">$25k</div>
                  </div>
                  <div>
                    <div className="font-medium">Jul</div>
                    <div className="text-gray-500">$18k</div>
                  </div>
                  <div>
                    <div className="font-medium">Dec</div>
                    <div className="text-gray-500">$30k</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Funding Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Funding Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Program Expansion</span>
                    </div>
                    <span className="text-sm text-gray-600">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">$18,500/$25,000</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Emergency Fund</span>
                    </div>
                    <span className="text-sm text-gray-600">55%</span>
                  </div>
                  <Progress value={55} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">$8,250/$15,000</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm">Filter</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    title: "Grant Application Submitted",
                    description: "Health Innovation Grant - $50,000",
                    time: "Wed, 10 Jan 2025",
                    amount: "$50,000",
                    status: "Success"
                  },
                  {
                    title: "Proposal Review",
                    description: "Education Access Fund - $25,000", 
                    time: "Thu, 11 Jan 2025",
                    amount: "$25,000",
                    status: "Success"
                  },
                  {
                    title: "Deadline Reminder",
                    description: "Community Development Grant",
                    time: "Tue, 09 Jan 2025",
                    amount: "$100,000",
                    status: "Reminder"
                  }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'Success' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.amount}</p>
                      <Badge 
                        className={`text-xs ${
                          activity.status === 'Success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}