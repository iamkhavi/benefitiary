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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RefreshCw,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { JobDetailsDialog } from './job-details-dialog';

interface Job {
  id: string;
  sourceId: string;
  status: string;
  totalFound: number | null;
  totalInserted: number | null;
  totalUpdated: number | null;
  totalSkipped: number | null;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  source: {
    id: string;
    url: string;
    type: string;
    status: string;
  };
}

interface JobsResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalJobs: number;
    totalGrantsFound: number;
    totalGrantsInserted: number;
    totalGrantsUpdated: number;
    totalGrantsSkipped: number;
    totalDuration: number;
    averageDuration: number;
    averageGrantsFound: number;
    statusBreakdown: Record<string, number>;
  };
}

export function ScrapingJobsTable() {
  const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    sourceId: '',
    page: 1,
  });

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.sourceId) params.append('sourceId', filters.sourceId);
      params.append('page', filters.page.toString());
      
      const response = await fetch(`/api/admin/scraping/jobs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setJobsData(data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scraping/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'RUNNING':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading jobs...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Summary Cards */}
        {jobsData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobsData.summary.totalJobs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Grants Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobsData.summary.totalGrantsFound}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {jobsData.summary.averageGrantsFound.toFixed(1)} per job
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Grants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {jobsData.summary.totalGrantsInserted}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(jobsData.summary.averageDuration / 1000)}s
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <Select value={filters.status} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, status: value, page: 1 }))
          }>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchJobs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Scraping Jobs ({jobsData?.pagination.total || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsData?.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium truncate max-w-xs" title={job.source.url}>
                          {job.source.url}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {job.source.type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(job.startedAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDuration(job.duration)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.status === 'SUCCESS' && (
                        <div className="text-sm">
                          <div className="text-green-600">
                            +{job.totalInserted || 0} new
                          </div>
                          <div className="text-blue-600">
                            ~{job.totalUpdated || 0} updated
                          </div>
                          <div className="text-muted-foreground">
                            {job.totalFound || 0} total found
                          </div>
                        </div>
                      )}
                      {job.status === 'FAILED' && (
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Error</span>
                        </div>
                      )}
                      {(job.status === 'RUNNING' || job.status === 'PENDING') && (
                        <div className="text-sm text-muted-foreground">
                          In progress...
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(job.status === 'RUNNING' || job.status === 'PENDING') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelJob(job.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {jobsData?.pagination && jobsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((jobsData.pagination.page - 1) * jobsData.pagination.limit) + 1} to{' '}
                  {Math.min(jobsData.pagination.page * jobsData.pagination.limit, jobsData.pagination.total)} of{' '}
                  {jobsData.pagination.total} jobs
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={jobsData.pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {jobsData.pagination.page} of {jobsData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={jobsData.pagination.page >= jobsData.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          open={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </>
  );
}