import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Database,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default async function AdminGrantsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  // TODO: Add proper admin role check once auth types are updated

  // Mock data - replace with actual database query
  const grants = [
    {
      id: '1',
      title: 'Health Innovation Grant',
      funder: 'Gates Foundation',
      amount: '$50,000 - $250,000',
      deadline: '2024-12-15',
      status: 'active',
      source: 'scraped',
      category: 'Healthcare',
      views: 245,
      applications: 12,
      createdAt: '2024-11-01',
      lastUpdated: '2024-12-01'
    },
    {
      id: '2',
      title: 'Small Business Development Fund',
      funder: 'SBA',
      amount: '$10,000 - $100,000',
      deadline: '2025-01-30',
      status: 'active',
      source: 'manual',
      category: 'Business',
      views: 189,
      applications: 8,
      createdAt: '2024-11-15',
      lastUpdated: '2024-11-15'
    },
    {
      id: '3',
      title: 'Education Access Initiative',
      funder: 'Ford Foundation',
      amount: '$25,000 - $150,000',
      deadline: '2024-11-30',
      status: 'expired',
      source: 'scraped',
      category: 'Education',
      views: 156,
      applications: 5,
      createdAt: '2024-10-01',
      lastUpdated: '2024-11-30'
    },
    {
      id: '4',
      title: 'Climate Action Grant',
      funder: 'Environmental Foundation',
      amount: '$75,000 - $300,000',
      deadline: '2025-03-15',
      status: 'pending_review',
      source: 'scraped',
      category: 'Environment',
      views: 98,
      applications: 3,
      createdAt: '2024-12-05',
      lastUpdated: '2024-12-05'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'expired': return { color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'pending_review': return { color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'draft': return { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
      default: return { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'scraped': return 'bg-blue-100 text-blue-800';
      case 'manual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">Grant Management</h1>
          </div>
          <Badge className="bg-red-100 text-red-800">Admin Only</Badge>
        </div>
        <Link href="/admin/grants/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Grant
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Grants</p>
                <p className="text-2xl font-bold text-gray-900">{grants.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Grants</p>
                <p className="text-2xl font-bold text-gray-900">{grants.filter(g => g.status === 'active').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scraped Grants</p>
                <p className="text-2xl font-bold text-gray-900">{grants.filter(g => g.source === 'scraped').length}</p>
              </div>
              <Eye className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Manual Grants</p>
                <p className="text-2xl font-bold text-gray-900">{grants.filter(g => g.source === 'manual').length}</p>
              </div>
              <Plus className="h-8 w-8 text-purple-600" />
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
              placeholder="Search grants..."
              className="pl-10 w-80"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter by Status
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter by Source
          </Button>
        </div>
      </div>

      {/* Grants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Grants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Grant</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Funder</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Deadline</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Applications</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => {
                  const statusBadge = getStatusBadge(grant.status);
                  const StatusIcon = statusBadge.icon;
                  
                  return (
                    <tr key={grant.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{grant.title}</p>
                          <p className="text-sm text-gray-500">{grant.category}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">{grant.funder}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">{grant.amount}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">{grant.deadline}</p>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={cn("text-xs flex items-center space-x-1", statusBadge.color)}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{grant.status.replace('_', ' ')}</span>
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={cn("text-xs", getSourceBadge(grant.source))}>
                          {grant.source}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{grant.applications} applications</p>
                          <p className="text-gray-500">{grant.views} views</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}