import { requireAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Activity,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ScrapingControls } from '@/components/admin/scraping-controls';

export default async function ScrapingAdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/auth/login');
  }

  // Fetch real scraping data
  const [sources, jobs, grants] = await Promise.all([
    prisma.scrapedSource.findMany({
      orderBy: { createdAt: 'desc' }
    }).catch(() => []),
    prisma.scrapeJob.findMany({
      include: {
        source: true
      },
      orderBy: { startedAt: 'desc' },
      take: 10
    }).catch(() => []),
    prisma.grant.count().catch(() => 0)
  ]);

  const metrics = {
    totalSources: sources.length,
    activeSources: sources.filter(s => s.status === 'ACTIVE').length,
    totalJobs: jobs.length,
    successfulJobs: jobs.filter(j => j.status === 'SUCCESS').length,
    totalGrants: grants,
    lastScrapedAt: sources.reduce((latest, source) => {
      if (!source.lastScrapedAt) return latest;
      return !latest || source.lastScrapedAt > latest ? source.lastScrapedAt : latest;
    }, null as Date | null)
  };

  const handleRefresh = () => {
    // This will be handled by the client component
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Scraping Management</h1>
          </div>
          <Badge className="bg-red-100 text-red-800">Admin Only</Badge>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSources}</div>
            <p className="text-xs text-muted-foreground">
              of {metrics.totalSources} total sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalGrants}</div>
            <p className="text-xs text-muted-foreground">
              Grants in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successfulJobs}</div>
            <p className="text-xs text-muted-foreground">
              of {metrics.totalJobs} total jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Scraped</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.lastScrapedAt ? 
                new Date(metrics.lastScrapedAt).toLocaleDateString() : 
                'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent scraping
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scraping Controls */}
      <ScrapingControls sources={sources} onRefresh={handleRefresh} />

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scraping Jobs</CardTitle>
            <CardDescription>
              Latest {jobs.length} scraping job results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{job.source?.category || 'Unknown Source'}</h4>
                      <Badge variant={job.status === 'SUCCESS' ? 'default' : job.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                      {job.finishedAt && (
                        <span>Duration: {Math.round((new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)}s</span>
                      )}
                      {job.totalFound && (
                        <span>Found: {job.totalFound} grants</span>
                      )}
                    </div>
                    {job.log && (
                      <p className="text-xs text-red-600 mt-1">Error: {job.log}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}