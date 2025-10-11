import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Users,
  Clock,
  FileText,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <Badge className="bg-blue-100 text-blue-800">20 Reports</Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
  );
}