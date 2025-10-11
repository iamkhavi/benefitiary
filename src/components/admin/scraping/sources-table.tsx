'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Play, 
  Pause, 
  Settings, 
  Trash2, 
  RefreshCw,
  ExternalLink,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { EditSourceDialog } from './edit-source-dialog';
import { SourceDetailsDialog } from './source-details-dialog';

interface Source {
  id: string;
  url: string;
  type: string;
  status: string;
  frequency: string;
  lastScrapedAt: string | null;
  category: string | null;
  region: string | null;
  notes: string | null;
  metrics: {
    totalJobs: number;
    successfulJobs: number;
    successRate: number;
    averageDuration: number;
    averageGrantsFound: number;
  };
}

interface ScrapingSourcesTableProps {
  onRefresh: () => void;
}

export function ScrapingSourcesTable({ onRefresh }: ScrapingSourcesTableProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [triggeringJobs, setTriggeringJobs] = useState<Set<string>>(new Set());

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/scraping/sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleTriggerScraping = async (sourceId: string) => {
    try {
      setTriggeringJobs(prev => new Set(prev).add(sourceId));
      const response = await fetch(`/api/admin/scraping/sources/${sourceId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 1 }),
      });

      if (response.ok) {
        const result = await response.json();
        // Show success message or notification
        console.log('Scraping triggered:', result);
        // Refresh the sources to update metrics
        setTimeout(() => {
          fetchSources();
          onRefresh();
        }, 1000);
      }
    } catch (error) {
      console.error('Error triggering scraping:', error);
    } finally {
      setTriggeringJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleToggleStatus = async (source: Source) => {
    try {
      const newStatus = source.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await fetch(`/api/admin/scraping/sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchSources();
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating source status:', error);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to deactivate this source?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scraping/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSources();
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting source:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      FOUNDATION: 'bg-blue-100 text-blue-800',
      GOV: 'bg-purple-100 text-purple-800',
      INTERNATIONAL: 'bg-orange-100 text-orange-800',
      CORPORATE: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading sources...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scraping Sources ({sources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Last Scraped</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate max-w-xs" title={source.url}>
                        {source.url}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(source.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(source.type)}</TableCell>
                  <TableCell>{getStatusBadge(source.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${
                        source.metrics.successRate >= 80 ? 'text-green-600' :
                        source.metrics.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {source.metrics.successRate.toFixed(1)}%
                      </span>
                      {source.metrics.successRate < 60 && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {source.lastScrapedAt ? (
                      <span className="text-sm">
                        {new Date(source.lastScrapedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{source.metrics.averageGrantsFound.toFixed(1)} grants/run</div>
                      <div className="text-muted-foreground">
                        {Math.round(source.metrics.averageDuration / 1000)}s avg
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSource(source)}>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleTriggerScraping(source.id)}
                          disabled={triggeringJobs.has(source.id)}
                        >
                          {triggeringJobs.has(source.id) ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Trigger Scraping
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingSource(source)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(source)}>
                          {source.status === 'ACTIVE' ? (
                            <Pause className="mr-2 h-4 w-4" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          {source.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteSource(source.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedSource && (
        <SourceDetailsDialog
          source={selectedSource}
          open={!!selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}

      {editingSource && (
        <EditSourceDialog
          source={editingSource}
          open={!!editingSource}
          onClose={() => setEditingSource(null)}
          onSaved={() => {
            setEditingSource(null);
            fetchSources();
            onRefresh();
          }}
        />
      )}
    </>
  );
}