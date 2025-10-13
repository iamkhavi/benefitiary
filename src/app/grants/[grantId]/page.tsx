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
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
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
            <Button className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>AI Workspace</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grant Information */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Funder Logo */}
              <Avatar className="h-16 w-16 border-2 border-gray-100">
                <AvatarImage 
                  src={grant.funder?.logoUrl} 
                  alt={grant.funder?.name || 'Funder'} 
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {grant.funder?.name?.charAt(0) || 'F'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl leading-tight mb-2">
                  {grant.title}
                </CardTitle>
                <CardDescription className="flex items-center space-x-3 text-base">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span className="font-medium">{grant.funder?.name || 'Unknown Funder'}</span>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {grant.funder?.type?.replace('_', ' ') || 'Foundation'}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            
            {/* Category Badge */}
            <Badge className={cn("text-sm font-medium px-3 py-1", getCategoryColor(grant.category))}>
              {formatCategory(grant.category)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Funding Amount */}
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Funding Amount</p>
                <p className="text-xl font-bold text-green-700">
                  {formatAmount(grant.fundingAmountMin, grant.fundingAmountMax)}
                </p>
              </div>
            </div>

            {/* Deadline */}
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border",
              isDeadlinePassed(grant.deadline) ? "bg-red-50 border-red-200" :
              isDeadlineSoon(grant.deadline) ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"
            )}>
              <Calendar className={cn(
                "h-8 w-8",
                isDeadlinePassed(grant.deadline) ? "text-red-600" :
                isDeadlineSoon(grant.deadline) ? "text-orange-600" : "text-blue-600"
              )} />
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isDeadlinePassed(grant.deadline) ? "text-red-600" :
                  isDeadlineSoon(grant.deadline) ? "text-orange-600" : "text-blue-600"
                )}>
                  Application Deadline
                </p>
                <p className={cn(
                  "text-xl font-bold",
                  isDeadlinePassed(grant.deadline) ? "text-red-700" :
                  isDeadlineSoon(grant.deadline) ? "text-orange-700" : "text-blue-700"
                )}>
                  {grant.deadline ? 
                    new Date(grant.deadline).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 
                    'Rolling Deadline'
                  }
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Project Duration</p>
                <p className="text-xl font-bold text-purple-700">
                  {grant.durationMonths ? `${grant.durationMonths} months` : 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {grant.description && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Grant Description</span>
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{grant.description}</p>
              </div>
            </div>
          )}

          {/* Eligibility Criteria */}
          {grant.eligibilityCriteria && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Eligibility Criteria</span>
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{grant.eligibilityCriteria}</p>
              </div>
            </div>
          )}

          {/* Location Eligibility */}
          {grant.locationEligibility && grant.locationEligibility.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Geographic Eligibility</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {grant.locationEligibility.map((location, index) => (
                  <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                    {location}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Program Goals */}
          {grant.programGoals && grant.programGoals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Program Goals</span>
              </h3>
              <ul className="space-y-2">
                {grant.programGoals.map((goal, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expected Outcomes */}
          {grant.expectedOutcomes && grant.expectedOutcomes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Expected Outcomes</span>
              </h3>
              <ul className="space-y-2">
                {grant.expectedOutcomes.map((outcome, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Documents */}
          {grant.requiredDocuments && grant.requiredDocuments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Required Documents</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {grant.requiredDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation Criteria */}
          {grant.evaluationCriteria && grant.evaluationCriteria.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Evaluation Criteria</span>
              </h3>
              <ul className="space-y-2">
                {grant.evaluationCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grant.funder?.website && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Funder Website</p>
                  <a 
                    href={grant.funder.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center space-x-1"
                  >
                    <span>{grant.funder.website}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
              {(grant.contactEmail || grant.funder?.contactEmail) && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact Email</p>
                  <p className="text-gray-900">{grant.contactEmail || grant.funder?.contactEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex space-x-3">
              <Link href={`/grants/${grant.id}/ai-workspace`}>
                <Button className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Workspace</span>
                </Button>
              </Link>
              
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
            </div>

            {grant.applicationUrl && (
              <a 
                href={grant.applicationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="lg" className="flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5" />
                  <span>More Information</span>
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}