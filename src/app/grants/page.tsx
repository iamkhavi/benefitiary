'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GrantCard } from '@/components/grants/grant-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter,
  Bot,
  Heart,
  Star,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Grant {
  id: string;
  title: string;
  description?: string;
  deadline?: Date;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  category: string;
  locationEligibility?: any;
  applicationUrl?: string;
  eligibilityCriteria?: string;
  funder?: {
    name: string;
    logoUrl?: string;
    type: string;
  };
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchGrants() {
      try {
        const response = await fetch('/api/grants');
        if (!response.ok) {
          throw new Error('Failed to fetch grants');
        }
        const data = await response.json();
        setGrants(data.grants || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grants');
      } finally {
        setLoading(false);
      }
    }

    fetchGrants();
  }, []);

  const filteredGrants = grants.filter(grant =>
    grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grant.funder?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grant.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-gray-600">Loading grants...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grant Explorer</h1>
              <p className="text-gray-600 mt-1">Discover funding opportunities tailored to your organization</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered Matching
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Grants</p>
                  <p className="text-2xl font-bold">{grants.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Perfect Matches</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.floor(grants.length * 0.15)}
                  </p>
                </div>
                <Star className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saved Grants</p>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                </div>
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Sessions</p>
                  <p className="text-2xl font-bold text-orange-600">0</p>
                </div>
                <Bot className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search grants, funders, or applications..."
                  className="pl-10 w-96"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredGrants.length} of {grants.length} grants
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Grant Cards */}
        {filteredGrants.length === 0 && !loading ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No grants match your search' : 'No grants available'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or clearing filters.' 
                : 'Grants will appear here once they are added to the system.'
              }
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGrants.map((grant) => (
              <GrantCard 
                key={grant.id} 
                grant={{
                  ...grant,
                  deadline: grant.deadline ? new Date(grant.deadline) : undefined
                }} 
                className="h-full" // Ensure cards have equal height
              />
            ))}
          </div>
        )}

        {/* Load More - Future Enhancement */}
        {filteredGrants.length > 0 && (
          <div className="mt-8 text-center">
            <Button variant="outline" size="lg" disabled>
              Load More Grants
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Pagination coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}