'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [filteredGrants, setFilteredGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Handle grant actions
  const handleViewGrant = (grantId: string) => {
    router.push(`/grants/${grantId}`);
  };

  const handleEditGrant = (grantId: string) => {
    router.push(`/admin/grants/edit/${grantId}`);
  };

  const handleDeleteGrant = async (grantId: string, grantTitle: string) => {
    const confirmed = confirm(`Are you sure you want to delete "${grantTitle}"? This action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/grants/${grantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete grant');
      }

      // Remove the grant from the local state
      const updatedGrants = grants.filter((grant: any) => grant.id !== grantId);
      setGrants(updatedGrants);
      
      console.log(`✅ Grant "${grantTitle}" deleted successfully`);
    } catch (error) {
      console.error('❌ Failed to delete grant:', error);
      alert(`Failed to delete grant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Filter grants based on search and filter criteria
  useEffect(() => {
    let filtered = [...grants];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((grant: any) =>
        grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.funder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((grant: any) => grant.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((grant: any) => grant.category === categoryFilter);
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((grant: any) => grant.source === sourceFilter);
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'deadline' || sortBy === 'createdAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortBy === 'fundingAmountMax') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredGrants(filtered);
  }, [grants, searchTerm, statusFilter, categoryFilter, sourceFilter, sortBy, sortOrder]);

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        {filteredGrants.length > 0 && (
          <div className="text-sm text-gray-600">
            Showing {filteredGrants.length} of {grants.length} grants
          </div>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="statusFilter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryFilter">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="COMMUNITY_DEVELOPMENT">Community Development</SelectItem>
                    <SelectItem value="EDUCATION">Education</SelectItem>
                    <SelectItem value="HEALTH">Health</SelectItem>
                    <SelectItem value="ENVIRONMENT">Environment</SelectItem>
                    <SelectItem value="ARTS_CULTURE">Arts & Culture</SelectItem>
                    <SelectItem value="RESEARCH">Research</SelectItem>
                    <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceFilter">Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="scraped">Scraped</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortBy">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="funder">Funder</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="fundingAmountMax">Funding Amount</SelectItem>
                    <SelectItem value="createdAt">Date Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Order</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Order..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                {filteredGrants.length} grants match your filters
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setSourceFilter('all');
                  setSortBy('createdAt');
                  setSortOrder('desc');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Grants</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGrants.length === 0 && grants.length > 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No grants match your search</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setSourceFilter('all');
                  setSortBy('createdAt');
                  setSortOrder('desc');
                }}
              >
                Clear Search & Filters
              </Button>
            </div>
          ) : grants.length === 0 ? (
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
                  {filteredGrants.map((grant: any) => (
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
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewGrant(grant.id)}
                            title="View Grant Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditGrant(grant.id)}
                            title="Edit Grant"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteGrant(grant.id, grant.title)}
                            title="Delete Grant"
                          >
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