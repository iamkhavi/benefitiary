'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ScrapingControlsProps {
  sources: any[];
  onRefresh: () => void;
}

export function ScrapingControls({ sources, onRefresh }: ScrapingControlsProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggeringSource, setTriggeringSource] = useState<string | null>(null);

  const triggerAllSources = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/admin/scraping/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerAll: true })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Started ${result.jobIds.length} scraping jobs`);
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to trigger scraping');
      }
    } catch (error) {
      toast.error('Failed to trigger scraping');
      console.error('Trigger error:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  const triggerSource = async (sourceId: string) => {
    setTriggeringSource(sourceId);
    try {
      const response = await fetch('/api/admin/scraping/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Scraping job started');
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to trigger scraping');
      }
    } catch (error) {
      toast.error('Failed to trigger scraping');
      console.error('Trigger error:', error);
    } finally {
      setTriggeringSource(null);
    }
  };

  const getStatusBadge = (status: string, lastScrapedAt?: Date | null, failCount?: number) => {
    if (failCount && failCount > 0) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Error ({failCount})
      </Badge>;
    }
    
    if (status === 'ACTIVE') {
      if (lastScrapedAt) {
        const hoursSinceLastScrape = (Date.now() - new Date(lastScrapedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastScrape < 24) {
          return <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>;
        }
      }
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Scraping Controls
            <Button 
              onClick={triggerAllSources}
              disabled={isTriggering}
              className="flex items-center gap-2"
            >
              {isTriggering ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isTriggering ? 'Starting...' : 'Trigger All Sources'}
            </Button>
          </CardTitle>
          <CardDescription>
            Manage and monitor grant scraping from various sources
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sources List */}
      <Card>
        <CardHeader>
          <CardTitle>Scraping Sources</CardTitle>
          <CardDescription>
            {sources.length} sources configured • {sources.filter(s => s.status === 'ACTIVE').length} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{source.category || 'Unknown Category'}</h4>
                    {getStatusBadge(source.status, source.lastScrapedAt, source.failCount)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{source.url}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Frequency: {source.frequency}</span>
                    {source.lastScrapedAt && (
                      <span>Last scraped: {new Date(source.lastScrapedAt).toLocaleDateString()}</span>
                    )}
                    {source.successRate && (
                      <span>Success rate: {Math.round(source.successRate)}%</span>
                    )}
                  </div>
                  {source.lastError && (
                    <p className="text-xs text-red-600 mt-1">Error: {source.lastError}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerSource(source.id)}
                  disabled={triggeringSource === source.id || source.status !== 'ACTIVE'}
                  className="flex items-center gap-2"
                >
                  {triggeringSource === source.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {triggeringSource === source.id ? 'Starting...' : 'Trigger'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}