import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  FileText, 
  Filter,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Edit,
  Eye,
  MoreHorizontal,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApplicationsPage() {
  const applications = [
    {
      title: "Health Innovation Grant",
      funder: "Gates Foundation",
      amount: "$150,000",
      status: "draft",
      progress: 65,
      deadline: "Dec 15, 2024",
      lastUpdated: "2 hours ago"
    },
    {
      title: "Small Business Development Fund",
      funder: "SBA",
      amount: "$75,000",
      status: "submitted",
      progress: 100,
      deadline: "Jan 30, 2025",
      lastUpdated: "1 day ago"
    },
    {
      title: "Education Access Initiative",
      funder: "Ford Foundation",
      amount: "$100,000",
      status: "review",
      progress: 100,
      deadline: "Feb 28, 2025",
      lastUpdated: "3 days ago"
    },
    {
      title: "Community Development Grant",
      funder: "Local Foundation",
      amount: "$25,000",
      status: "approved",
      progress: 100,
      deadline: "Mar 15, 2025",
      lastUpdated: "1 week ago"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <Badge className="bg-blue-100 text-blue-800">12 Active</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">75%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search applications..."
              className="pl-10 w-80"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((app, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{app.title}</h3>
                    <Badge 
                      className={cn(
                        "text-xs",
                        app.status === 'approved' ? "bg-green-100 text-green-800" :
                        app.status === 'submitted' ? "bg-blue-100 text-blue-800" :
                        app.status === 'review' ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      )}
                    >
                      {app.status === 'draft' ? 'Draft' :
                       app.status === 'submitted' ? 'Submitted' :
                       app.status === 'review' ? 'Under Review' :
                       'Approved'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <Building2 className="h-4 w-4" />
                      <span>{app.funder}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{app.amount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {app.deadline}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Updated {app.lastUpdated}</span>
                    </div>
                  </div>
                  {app.status === 'draft' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900 font-medium">{app.progress}%</span>
                      </div>
                      <Progress value={app.progress} className="h-2" />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-6">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {app.status === 'draft' && (
                    <Button size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Continue
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}