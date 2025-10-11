'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

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
}

interface SourceDetails extends Source {
  metrics: {
    totalJobs: number;
    totalGrantsFound: number;
    totalGrantsInserted: number;
    totalGrantsUpdated: number;
    totalGrantsSkipped: number;
    averageDuration: number;
    averageGrantsFound: number;
    statusBreakdown: Record<string, number>;
    recentPerformance: Array<{
      startedAt: string;
      status: string;
      totalFound: number;
      duration: number;
    }>;
  };
  scrapeJobs: Array<{
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    totalFound: number | null;
    totalInserted: number | null;
    duration: number | null;
  }>;
}

interface SourceDetailsDialogProps {
  source: Source;
  open: boolean;
  onClose: () => void;
}

export function SourceDetailsDialog({ source, open, onClose }: SourceDetailsDialogProps) {
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSourceDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/scraping/sources/${source.id}`);
      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      }
    } catch (error) {
      console.error('Error fetching source details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && source.id) {
      fetchSourceDetails();
    }
  }, [open, source.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A';
    const seconds = Math.round(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Source Details</span>
          </DialogTitle>
          <DialogDescription>
            Detailed performance metrics and job history for this scraping source
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading details...
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Source Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">URL</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{details.url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(details.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="text-sm">{details.type}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="text-sm">{details.status}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                    <div className="text-sm">{details.frequency}</div>
                  </div>
                  {details.category && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <div className="text-sm">{details.category}</div>
                    </div>
                  )}
                  {details.region && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Region</label>
                      <div className="text-sm">{details.region}</div>
                    </div>
                  )}
                </div>
                {details.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <div className="text-sm">{details.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{details.metrics.totalJobs}</div>
                  <div className="text-xs text-muted-foreground">
                    Success: {details.metrics.statusBreakdown.SUCCESS || 0} | 
                    Failed: {details.metrics.statusBreakdown.FAILED || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Grants Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{details.metrics.totalGrantsFound}</div>
                  <div className="text-xs text-muted-foreground">
                    Avg: {details.metrics.averageGrantsFound.toFixed(1)} per job
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(details.metrics.averageDuration / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Average processing time
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grant Processing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {details.metrics.totalGrantsInserted}
                    </div>
                    <div className="text-sm text-muted-foreground">New Grants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {details.metrics.totalGrantsUpdated}
                    </div>
                    <div className="text-sm text-muted-foreground">Updated Grants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {details.metrics.totalGrantsSkipped}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped Grants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {details.metrics.totalGrantsFound}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Found</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for detailed data */}
            <Tabs defaultValue="recent-jobs" className="space-y-4">
              <TabsList>
                <TabsTrigger value="recent-jobs">Recent Jobs</TabsTrigger>
                <TabsTrigger value="performance">Performance Trend</TabsTrigger>
              </TabsList>

              <TabsContent value="recent-jobs">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Scraping Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Started</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Grants Found</TableHead>
                          <TableHead>New/Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.scrapeJobs.slice(0, 10).map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="text-sm">
                              {new Date(job.startedAt).toLocaleString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDuration(job.duration)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {job.totalFound || 0}
                            </TableCell>
                            <TableCell className="text-sm">
                              {job.status === 'SUCCESS' ? (
                                <span className="text-green-600">
                                  +{job.totalInserted || 0}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {details.metrics.recentPerformance.map((perf, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {perf.status === 'SUCCESS' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {perf.status === 'FAILED' && <XCircle className="h-4 w-4 text-red-500" />}
                            {perf.status === 'RUNNING' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(perf.startedAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDuration(perf.duration)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{perf.totalFound} grants</div>
                            <div className="text-xs text-muted-foreground">{perf.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load source details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}