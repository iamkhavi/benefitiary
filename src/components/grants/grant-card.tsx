import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Building, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GrantCardProps {
  grant: {
    id: string;
    title: string;
    description?: string;
    deadline?: Date;
    fundingAmountMin?: number;
    fundingAmountMax?: number;
    category: string;
    locationEligibility?: any;
    applicationUrl?: string;
    eligibilityCriteria?: string;
    funder?: {
      name: string;
      logoUrl?: string;
      type: string;
    };
  };
  className?: string;
}

export function GrantCard({ grant, className }: GrantCardProps) {
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

  const isDeadlineSoon = (deadline?: Date) => {
    if (!deadline) return false;
    const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 30 && daysUntilDeadline > 0;
  };

  const isDeadlinePassed = (deadline?: Date) => {
    if (!deadline) return false;
    return deadline.getTime() < Date.now();
  };

  return (
    <Card className={cn("group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          {/* Category Badge */}
          <Badge className={cn("text-xs font-medium", getCategoryColor(grant.category))}>
            {formatCategory(grant.category)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3 mb-3">
          {/* Funder Logo */}
          <Avatar className="h-12 w-12 border-2 border-gray-100 flex-shrink-0">
            <AvatarImage 
              src={grant.funder?.logoUrl} 
              alt={grant.funder?.name || 'Funder'} 
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {grant.funder?.name?.charAt(0) || 'F'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <CardDescription className="flex items-center space-x-2 mb-1">
              <Building className="h-4 w-4" />
              <span className="truncate">{grant.funder?.name || 'Unknown Funder'}</span>
            </CardDescription>
            <Badge variant="outline" className="text-xs">
              {grant.funder?.type?.replace('_', ' ') || 'Foundation'}
            </Badge>
          </div>
        </div>
        
        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {grant.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Description */}
        {grant.description && (
          <p className="text-sm text-gray-600 line-clamp-3 flex-1">
            {grant.description}
          </p>
        )}

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Funding Amount */}
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Funding</p>
              <p className="text-sm font-semibold text-green-700">
                {formatAmount(grant.fundingAmountMin, grant.fundingAmountMax)}
              </p>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center space-x-2">
            <Calendar className={cn(
              "h-4 w-4",
              isDeadlinePassed(grant.deadline) ? "text-red-600" :
              isDeadlineSoon(grant.deadline) ? "text-orange-600" : "text-blue-600"
            )} />
            <div>
              <p className="text-xs text-gray-500">Deadline</p>
              <p className={cn(
                "text-sm font-semibold",
                isDeadlinePassed(grant.deadline) ? "text-red-700" :
                isDeadlineSoon(grant.deadline) ? "text-orange-700" : "text-blue-700"
              )}>
                {grant.deadline ? 
                  grant.deadline.toLocaleDateString() : 
                  'Rolling'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Location & Eligibility */}
        <div className="space-y-2">
          {grant.locationEligibility && Array.isArray(grant.locationEligibility) && grant.locationEligibility.length > 0 && (
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div className="flex flex-wrap gap-1">
                {grant.locationEligibility.slice(0, 3).map((location: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {location}
                  </Badge>
                ))}
                {grant.locationEligibility.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{grant.locationEligibility.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {grant.eligibilityCriteria && (
            <p className="text-xs text-gray-600 line-clamp-2">
              <span className="font-medium">Eligibility:</span> {grant.eligibilityCriteria}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t mt-auto">
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <Link href={`/grants/${grant.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
              
              <Link href={`/grants/${grant.id}/ai-workspace`} className="flex-1">
                <Button size="sm" className="w-full">
                  <Sparkles className="h-4 w-4 mr-1" />
                  AI Help
                </Button>
              </Link>
            </div>

            {grant.applicationUrl && (
              <Link href={grant.applicationUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button variant="ghost" size="sm" className="w-full text-primary">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Apply Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}