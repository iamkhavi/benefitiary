'use client';

import { useState, useEffect } from 'react';
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
  Users,
  XCircle
} from 'lucide-react';
import { ScrapingSourcesTable } from '@/components/admin/scraping/sources-table';
import { ScrapingJobsTable } from '@/components/admin/scraping/jobs-table';
import { ScrapingMetrics } from '@/components/admin/scraping/metrics';
import { AddSourceDialog } from '@/components/admin/scraping/add-source-dialog';

interface DashboardData {
  realTimeMetrics: {
    activeSources: number;
    totalJobs: number;
    successfulJobs: number;
    successRate: number;
    averageDuration: number;
    grantsScraped: number;
    newGrants: number;
    updatedGrants: number;
  };
  recentActivity: {
    jobs: any[];
    errors: any[];
  };
  topPerformingSources: any[];
  timeRange: string;
  generatedAt: string;
}

export default function ScrapingAdminPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/admin/scraping/dashboard?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.realTimeMetrics;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scraping Administration</h1>
          <p className="text-muted-foreground">
            Monitor and manage grant scraping sources and jobs
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSources}</div>
              <p className="text-xs text-muted-foreground">
                Sources currently enabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.successfulJobs} of {metrics.totalJobs} jobs successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grants Scraped</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.grantsScraped}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.newGrants} new, {metrics.updatedGrants} updated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.averageDuration / 1000)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Average job completion time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Scraping Sources</h2>
            <AddSourceDialog onSourceAdded={handleRefresh} />
          </div>
          <ScrapingSourcesTable onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Scraping Jobs</h2>
          </div>
          <ScrapingJobsTable />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Metrics</h2>
          </div>
          <ScrapingMetrics 
            timeRange={timeRange}
            topPerformingSources={dashboardData?.topPerformingSources || []}
            recentErrors={dashboardData?.recentActivity.errors || []}
          />
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {job.status === 'SUCCESS' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {job.status === 'FAILED' && <XCircle className="h-4 w-4 text-red-500" />}
                      {job.status === 'RUNNING' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                      {job.status === 'PENDING' && <Clock className="h-4 w-4 text-yellow-500" />}
                      <div>
                        <p className="text-sm font-medium">{job.source?.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      job.status === 'SUCCESS' ? 'default' :
                      job.status === 'FAILED' ? 'destructive' :
                      job.status === 'RUNNING' ? 'secondary' : 'outline'
                    }>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent errors</p>
                ) : (
                  dashboardData.recentActivity.errors.map((error) => (
                    <div key={error.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-800">{error.source?.url}</p>
                          <p className="text-xs text-red-600 mt-1">
                            {new Date(error.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}