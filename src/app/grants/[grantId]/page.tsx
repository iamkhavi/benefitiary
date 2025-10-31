'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Building, 
  ExternalLink,
  Sparkles,
  Clock,
  FileText,
  CheckCircle,
  Users,
  Target,
  Award,
  ArrowLeft,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Grant {
  id: string;
  title: string;
  description?: string;
  eligibilityCriteria?: string;
  deadline?: string;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  category: string;
  locationEligibility?: string[];
  applicationUrl?: string;
  applicantType?: string;
  fundingType?: string;
  durationMonths?: number;
  requiredDocuments?: string[];
  evaluationCriteria?: string[];
  programGoals?: string[];
  expectedOutcomes?: string[];
  contactEmail?: string;
  status: string;
  rawContent?: string;
  contentSource?: string;
  originalFileName?: string;
  updatedAt?: string;
  funder?: {
    id: string;
    name: string;
    logoUrl?: string;
    type: string;
    website?: string;
    contactEmail?: string;
  };
}

export default function GrantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    async function fetchGrant() {
      try {
        const response = await fetch(`/api/grants/${params.grantId}`);
        if (!response.ok) {
          throw new Error('Grant not found');
        }
        const data = await response.json();
        setGrant(data.grant);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grant');
      } finally {
        setLoading(false);
      }
    }

    if (params.grantId) {
      fetchGrant();
    }
  }, [params.grantId]);

  const formatAmount = (min?: number, max?: number) => {
    if (!min && !max) return 'Amount not specified';
    
    const formatNumber = (num: number) => {
      if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
      return `$${num.toLocaleString()}`;
    };

    if (min && max && min !== max) {
      return `${formatNumber(min)} - ${formatNumber(max)}`;
    }
    return formatNumber(min || max || 0);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'HEALTHCARE_PUBLIC_HEALTH': 'bg-red-100 text-red-800',
      'EDUCATION_TRAINING': 'bg-blue-100 text-blue-800',
      'AGRICULTURE_FOOD_SECURITY': 'bg-green-100 text-green-800',
      'CLIMATE_ENVIRONMENT': 'bg-emerald-100 text-emerald-800',
      'TECHNOLOGY_INNOVATION': 'bg-purple-100 text-purple-800',
      'WOMEN_YOUTH_EMPOWERMENT': 'bg-pink-100 text-pink-800',
      'ARTS_CULTURE': 'bg-orange-100 text-orange-800',
      'COMMUNITY_DEVELOPMENT': 'bg-indigo-100 text-indigo-800',
      'HUMAN_RIGHTS_GOVERNANCE': 'bg-yellow-100 text-yellow-800',
      'SME_BUSINESS_GROWTH': 'bg-teal-100 text-teal-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const isDeadlineSoon = (deadline?: string) => {
    if (!deadline) return false;
    const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 30 && daysUntilDeadline > 0;
  };

  const isDeadlinePassed = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  };

  const formatUrl = (url: string) => {
    if (!url) return '';
    // If it already has a protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If it starts with www. or looks like a domain, add https://
    if (url.startsWith('www.') || url.includes('.')) {
      return `https://${url}`;
    }
    // Otherwise, assume it needs https://
    return `https://${url}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Grant not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Grants</span>
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={() => setIsSaved(!isSaved)}
                className="flex items-center space-x-2"
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                <span>{isSaved ? 'Saved' : 'Save Grant'}</span>
              </Button>
              
              <Link href={`/grants/${grant.id}/ai-workspace`}>
                <Button className="flex items-center space-x-2 bg-primary hover:bg-primary/90">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Workspace</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Grant Title and Basic Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar className="h-12 w-12 border border-gray-200">
                    <AvatarImage 
                      src={grant.funder?.logoUrl} 
                      alt={grant.funder?.name || 'Funder'} 
                    />
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
                      {grant.funder?.name?.charAt(0) || 'F'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {grant.title}
                    </h1>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{grant.funder?.name || 'Unknown Funder'}</span>
                      </div>
                      <span>•</span>
                      <span>Last updated: {new Date(grant.updatedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <Badge className={cn("text-sm font-medium px-3 py-1", getCategoryColor(grant.category))}>
                  {formatCategory(grant.category)}
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                {grant.applicationUrl && (
                  <a 
                    href={formatUrl(grant.applicationUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4" />
                      <span>View Application</span>
                    </Button>
                  </a>
                )}
                
                <Link href={`/grants/${grant.id}/ai-workspace`}>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Workspace</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Tabbed Content */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
                    Grant details
                  </button>
                  <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700">
                    Funder details
                  </button>
                </nav>
              </div>

              <div className="p-6 space-y-8">

                {/* Overview Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Overview</h3>
                  {grant.description && (
                    <div className="text-gray-700 leading-relaxed">
                      {grant.description}
                    </div>
                  )}
                  
                  {grant.rawContent && (
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                        <span>View complete grant information</span>
                        <span className="ml-2 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {grant.rawContent}
                        </div>
                        {grant.originalFileName && (
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <Badge variant="outline" className="text-xs">
                              Source: {grant.originalFileName}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>

                {/* Eligibility Section */}
                {grant.eligibilityCriteria && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Eligibility</h3>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        You can learn more about this opportunity by visiting the funder's website.
                      </p>
                      <div className="text-gray-700 leading-relaxed">
                        {grant.eligibilityCriteria.split('\n').map((line, index) => (
                          <div key={index} className="flex items-start space-x-2 mb-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{line.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ineligibility Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Ineligibility</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>This grant does not make grants directly to individuals.</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Geographic restrictions may apply.</span>
                    </div>
                    {grant.locationEligibility && grant.locationEligibility.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-900 mb-2">Geographic Eligibility:</p>
                        <div className="flex flex-wrap gap-2">
                          {grant.locationEligibility.map((location, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {location}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Information Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Information</h3>
              
              <div className="space-y-4">
                {/* Funder */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Funder</dt>
                  <dd className="text-sm text-gray-900">{grant.funder?.name || 'Unknown Funder'}</dd>
                </div>

                {/* Grant Amount */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Grant Amount</dt>
                  <dd className="text-sm text-gray-900 font-semibold">
                    {formatAmount(grant.fundingAmountMin, grant.fundingAmountMax)}
                  </dd>
                </div>

                {/* Deadline */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Deadline</dt>
                  <dd className={cn(
                    "text-sm font-medium",
                    isDeadlinePassed(grant.deadline) ? "text-red-600" :
                    isDeadlineSoon(grant.deadline) ? "text-orange-600" : "text-gray-900"
                  )}>
                    {grant.deadline ? 
                      new Date(grant.deadline).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 
                      'Rolling deadline'
                    }
                  </dd>
                </div>

                {/* Focus Areas */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Focus areas</dt>
                  <dd className="text-sm text-gray-900">{formatCategory(grant.category)}</dd>
                </div>

                {/* Applicant Type */}
                {grant.applicantType && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Applicant type</dt>
                    <dd className="text-sm text-gray-900">{grant.applicantType}</dd>
                  </div>
                )}

                {/* Funding Type */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Funding type</dt>
                  <dd className="text-sm text-gray-900">{grant.fundingType || 'Grant'}</dd>
                </div>

                {/* Location of Project */}
                {grant.locationEligibility && grant.locationEligibility.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Location of project</dt>
                    <dd className="text-sm text-gray-900">
                      {grant.locationEligibility.slice(0, 2).join(', ')}
                      {grant.locationEligibility.length > 2 && ` +${grant.locationEligibility.length - 2} more`}
                    </dd>
                  </div>
                )}

                {/* Duration */}
                {grant.durationMonths && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Project duration</dt>
                    <dd className="text-sm text-gray-900">{grant.durationMonths} months</dd>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {grant.applicationUrl && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a 
                    href={formatUrl(grant.applicationUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button className="w-full flex items-center justify-center space-x-2">
                      <ExternalLink className="h-4 w-4" />
                      <span>View website</span>
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Additional Information Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
              
              {/* Program Goals */}
              {grant.programGoals && grant.programGoals.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Program Goals</h4>
                  <ul className="space-y-1">
                    {grant.programGoals.map((goal, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Documents */}
              {grant.requiredDocuments && grant.requiredDocuments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Required Documents</h4>
                  <ul className="space-y-1">
                    {grant.requiredDocuments.map((doc, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                        <FileText className="h-3 w-3 text-gray-400 mt-1 flex-shrink-0" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact Information */}
              {(grant.contactEmail || grant.funder?.contactEmail || grant.funder?.website) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    {grant.funder?.website && (
                      <div>
                        <p className="text-xs text-gray-500">Website</p>
                        <a 
                          href={formatUrl(grant.funder.website)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <span>{grant.funder.website}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {(grant.contactEmail || grant.funder?.contactEmail) && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{grant.contactEmail || grant.funder?.contactEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}