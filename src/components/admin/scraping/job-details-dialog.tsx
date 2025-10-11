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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  FileText
} from 'lucide-react';

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

interface JobDetails extends Job {
  parsedLog: {
    message?: string;
    error?: string;
    stack?: string;
    errors?: Array<{
      type: string;
      message: string;
      url?: string;
      timestamp: string;
    }>;
    metadata?: Record<string, any>;
  } | null;
}

interface JobDetailsDialogProps {
  job: Job;
  open: boolean;
  onClose: () => void;
}

export function JobDetailsDialog({ job, open, onClose }: JobDetailsDialogProps) {
  const [details, setDetails] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/scraping/jobs/${job.id}`);
      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && job.id) {
      fetchJobDetails();
    }
  }, [open, job.id]);

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Job Details</span>
          </DialogTitle>
          <DialogDescription>
            Detailed information and logs for this scraping job
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading job details...
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Job Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Job Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Job ID</label>
                    <div className="text-sm font-mono">{details.id}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">{getStatusBadge(details.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Started</label>
                    <div className="text-sm">{new Date(details.startedAt).toLocaleString()}</div>
                  </div>
                  {details.finishedAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Finished</label>
                      <div className="text-sm">{new Date(details.finishedAt).toLocaleString()}</div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <div className="text-sm">{formatDuration(details.duration)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Source Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">URL</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm truncate">{details.source.url}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(details.source.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="text-sm">{details.source.type}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Source Status</label>
                    <div className="text-sm">{details.source.status}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Summary */}
            {details.status === 'SUCCESS' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Results Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{details.totalFound || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {details.totalInserted || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">New Grants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {details.totalUpdated || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Updated Grants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {details.totalSkipped || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Skipped Grants</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Logs and Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Logs and Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full rounded-md border p-4">
                  {details.parsedLog ? (
                    <div className="space-y-4">
                      {details.parsedLog.message && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Message</h4>
                          <p className="text-sm text-muted-foreground">
                            {details.parsedLog.message}
                          </p>
                        </div>
                      )}

                      {details.parsedLog.error && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-red-600">Error</h4>
                          <p className="text-sm text-red-600 font-mono">
                            {details.parsedLog.error}
                          </p>
                        </div>
                      )}

                      {details.parsedLog.errors && details.parsedLog.errors.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-red-600">
                            Errors ({details.parsedLog.errors.length})
                          </h4>
                          <div className="space-y-2">
                            {details.parsedLog.errors.map((error, index) => (
                              <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
                                <div className="text-sm font-medium text-red-800">
                                  {error.type}: {error.message}
                                </div>
                                {error.url && (
                                  <div className="text-xs text-red-600 mt-1">
                                    URL: {error.url}
                                  </div>
                                )}
                                <div className="text-xs text-red-500 mt-1">
                                  {new Date(error.timestamp).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {details.parsedLog.metadata && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Metadata</h4>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(details.parsedLog.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {details.parsedLog.stack && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-red-600">Stack Trace</h4>
                          <pre className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded overflow-x-auto">
                            {details.parsedLog.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No logs available for this job</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load job details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}