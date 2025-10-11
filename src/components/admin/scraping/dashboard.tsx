'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Play, 
  RefreshCw,
  Settings,
  TrendingUp,
  Globe,
  Building,
  Shield,
  Eye
} from 'lucide-react';

interface DashboardProps {
  data: {
    sources: any[];
    jobs: any[];
    metrics: {
      totalSources: number;
      activeSources: number;
      totalJobs: number;
      successfulJobs: number;
      totalGrants: number;
      lastScrapedAt: Date | null;
    };
  };
}

export function ScrapingDashboard({ data }: DashboardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger page refresh
    window.location.reload();
  };

  const handleRunScraping = async () => {
    try {
      const response = await fetch('/api/admin/scraping/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceIds: 'all' }),
      });

      if (response.ok) {
        alert('Scraping jobs started! Check the jobs tab for progress.');
        handleRefresh();
      } else {
        alert('Failed to start scraping jobs');
      }
    } catch (error) {
      console.error('Error starting scraping:', error);
      alert('Error starting scraping jobs');
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'GOV': return Shield;
      case 'FOUNDATION': return Building;
      case 'NGO': return Globe;
      default: return Database;
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'RUNNING': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scraping Dashboard</h1>
          <p className="text-gray-600">Monitor and manage grant scraping operations</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleRunScraping}>
            <Play className="h-4 w-4 mr-2" />
            Run Scraping
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sources</p>
                <p className="text-2xl font-bold text-gray-900">{data.metrics.totalSources}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sources</p>
                <p className="text-2xl font-bold text-gray-900">{data.metrics.activeSources}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{data.metrics.totalJobs}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Grants</p>
                <p className="text-2xl font-bold text-gray-900">{data.metrics.totalGrants}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sources">Sources ({data.sources.length})</TabsTrigger>
          <TabsTrigger value="jobs">Recent Jobs ({data.jobs.length})</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Sources</CardTitle>
              <CardDescription>
                Manage and monitor all configured scraping sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Source</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Frequency</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Last Scraped</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources.map((source) => {
                      const TypeIcon = getSourceTypeIcon(source.type);
                      return (
                        <tr key={source.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <TypeIcon className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">{source.category || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">{source.url}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline">{source.type}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={source.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {source.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">{source.frequency}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">
                              {source.lastScrapedAt 
                                ? new Date(source.lastScrapedAt).toLocaleDateString()
                                : 'Never'
                              }
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scraping Jobs</CardTitle>
              <CardDescription>
                Monitor the status and progress of scraping operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Job ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Source</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Results</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Duration</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                          No scraping jobs found. Click "Run Scraping" to start.
                        </td>
                      </tr>
                    ) : (
                      data.jobs.map((job) => (
                        <tr key={job.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm">{job.id.slice(-8)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm">{job.source?.category || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={getJobStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-600">
                              {job.totalFound ? `${job.totalFound} found` : '-'}
                              {job.totalInserted ? `, ${job.totalInserted} new` : ''}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">
                              {job.duration ? `${job.duration}s` : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">
                              {job.startedAt 
                                ? new Date(job.startedAt).toLocaleString()
                                : 'Not started'
                              }
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Real-time monitoring of scraping system health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Scraping System</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Database Connection</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Next Scheduled Run</span>
                  </div>
                  <span className="text-sm text-yellow-800">
                    {data.metrics.lastScrapedAt 
                      ? 'Based on source frequencies'
                      : 'Waiting for first run'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}