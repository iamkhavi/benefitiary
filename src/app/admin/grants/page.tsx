'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter,
  Database,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export default function AdminGrantsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (isPending) return;
      
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }

      try {
        // Fetch user role
        const roleResponse = await fetch(`/api/user/role?userId=${session.user.id}`);
        if (!roleResponse.ok) {
          router.push('/');
          return;
        }

        const roleData = await roleResponse.json();
        setUserRole(roleData.role);

        if (roleData.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        // Fetch grants data
        const grantsResponse = await fetch('/api/admin/grants');
        if (grantsResponse.ok) {
          const grantsData = await grantsResponse.json();
          setGrants(grantsData.grants || []);
        }

      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [session, isPending, router]);

  if (isPending || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'ADMIN') {
    return null; // Will redirect in useEffect
  }

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
        <div className="flex items-center space-x-3">
          <Link href="/admin/grants/ai-extract">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Zap className="h-4 w-4 mr-2" />
              AI Extract Grant
            </Button>
          </Link>
          <Link href="/admin/grants/add">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </Link>
          <Link href="/admin/scraping">
            <Button variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Scraping Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Grants</p>
                <p className="text-2xl font-bold text-gray-900">{grants.length}</p>
                <p className="text-xs text-gray-500">In database</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Grants</p>
                <p className="text-2xl font-bold text-green-600">{grants.filter((g: any) => g.status === 'active').length}</p>
                <p className="text-xs text-gray-500">Currently open</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Funding</p>
                <p className="text-2xl font-bold text-primary">$0</p>
                <p className="text-xs text-gray-500">Available funding</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scraped Grants</p>
                <p className="text-2xl font-bold text-purple-600">{grants.filter((g: any) => g.source === 'scraped').length}</p>
                <p className="text-xs text-gray-500">From scrapers</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
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
            Filter
          </Button>
        </div>
      </div>

      {/* Grants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Grants</CardTitle>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No grants found</h3>
              <p className="text-gray-500 mb-6">
                Get started by adding your first grant manually or running the scrapers.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <Link href="/admin/grants/ai-extract">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Zap className="h-4 w-4 mr-2" />
                    AI Extract Grant
                  </Button>
                </Link>
                <Link href="/admin/grants/add">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manually
                  </Button>
                </Link>
                <Link href="/admin/scraping">
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Run Scrapers
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Grant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Funder</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Deadline</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((grant: any) => (
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
                        <p className="text-sm text-gray-900">
                          ${grant.fundingAmountMin?.toLocaleString()} - ${grant.fundingAmountMax?.toLocaleString()}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">
                          {grant.deadline ? new Date(grant.deadline).toLocaleDateString() : 'No deadline'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className="bg-green-100 text-green-800">
                          {grant.status || 'Active'}
                        </Badge>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scraper Status */}
      <Card>
        <CardHeader>
          <CardTitle>Scraper Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <h4 className="font-medium text-yellow-800">Scrapers Not Running</h4>
                <p className="text-sm text-yellow-600">
                  The grant scrapers haven't been scheduled yet. Database shows {grants.length} grants.
                </p>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Next Steps:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Implement scraper orchestrator (Task 9 in grant-scraping-implementation)</li>
                <li>Set up Gates Foundation scraper (Task 10)</li>
                <li>Configure Grants.gov API scraper (Task 11)</li>
                <li>Schedule automated scraping jobs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}