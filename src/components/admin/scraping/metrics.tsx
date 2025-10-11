'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  AlertTriangle,
  Clock,
  Database,
  Activity
} from 'lucide-react';

interface TopPerformingSource {
  id: string;
  url: string;
  type: string;
  total_jobs: number;
  successful_jobs: number;
  avg_grants_found: number;
  avg_duration: number;
}

interface RecentError {
  id: string;
  startedAt: string;
  source: {
    url: string;
    type: string;
  };
}

interface ScrapingMetricsProps {
  timeRange: string;
  topPerformingSources: TopPerformingSource[];
  recentErrors: RecentError[];
}

export function ScrapingMetrics({ 
  timeRange, 
  topPerformingSources, 
  recentErrors 
}: ScrapingMetricsProps) {
  const formatDuration = (duration: number) => {
    const seconds = Math.round(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  };

  const getTypeColor = (type: string) => {
    const colors = {
      FOUNDATION: 'bg-blue-100 text-blue-800',
      GOV: 'bg-purple-100 text-purple-800',
      INTERNATIONAL: 'bg-orange-100 text-orange-800',
      CORPORATE: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Top Performing Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Top Performing Sources ({timeRange})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformingSources.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No performance data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topPerformingSources.map((source, index) => {
                const successRate = getSuccessRate(
                  Number(source.successful_jobs), 
                  Number(source.total_jobs)
                );
                
                return (
                  <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium truncate max-w-xs" title={source.url}>
                          {source.url}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getTypeColor(source.type)}>
                            {source.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {source.total_jobs} jobs
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            successRate >= 80 ? 'text-green-600' :
                            successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {successRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">Success</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {Number(source.avg_grants_found).toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Grants</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {formatDuration(Number(source.avg_duration))}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Time</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Success Rate</span>
                <span className="font-medium">
                  {topPerformingSources.length > 0 ? (
                    `${Math.round(
                      topPerformingSources.reduce((acc, source) => 
                        acc + getSuccessRate(Number(source.successful_jobs), Number(source.total_jobs)), 0
                      ) / topPerformingSources.length
                    )}%`
                  ) : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Processing Time</span>
                <span className="font-medium">
                  {topPerformingSources.length > 0 ? (
                    formatDuration(
                      topPerformingSources.reduce((acc, source) => 
                        acc + Number(source.avg_duration), 0
                      ) / topPerformingSources.length
                    )
                  ) : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Active Sources</span>
                <span className="font-medium">{topPerformingSources.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recent Errors</span>
                <span className={`font-medium ${
                  recentErrors.length > 5 ? 'text-red-600' :
                  recentErrors.length > 2 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {recentErrors.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentErrors.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-green-600 mb-2">✓</div>
                <p className="text-sm text-muted-foreground">No recent errors</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentErrors.slice(0, 5).map((error) => (
                  <div key={error.id} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-800 truncate">
                        {error.source.url}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getTypeColor(error.source.type)} variant="outline">
                          {error.source.type}
                        </Badge>
                        <span className="text-xs text-red-600">
                          {new Date(error.startedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentErrors.length > 5 && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-muted-foreground">
                      +{recentErrors.length - 5} more errors
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Performance Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformingSources.some(source => 
              getSuccessRate(Number(source.successful_jobs), Number(source.total_jobs)) < 60
            ) && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-yellow-800">
                    Low Success Rate Detected
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Some sources have success rates below 60%. Consider reviewing their configurations or temporarily disabling them.
                  </div>
                </div>
              </div>
            )}
            
            {topPerformingSources.some(source => Number(source.avg_duration) > 300000) && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-800">
                    Long Processing Times
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    Some sources are taking longer than 5 minutes to process. Consider optimizing their scraping logic.
                  </div>
                </div>
              </div>
            )}
            
            {recentErrors.length === 0 && topPerformingSources.length > 0 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Activity className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-green-800">
                    System Running Smoothly
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    All sources are performing well with no recent errors. Great job!
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}