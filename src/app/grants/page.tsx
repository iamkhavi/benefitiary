import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Bot,
  Heart,
  Star,
  Award,
  FileText,
  Zap,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function GrantsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grant Explorer</h1>
              <p className="text-gray-600 mt-1">Discover funding opportunities tailored to your organization</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered Matching
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Grants</p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Perfect Matches</p>
                  <p className="text-2xl font-bold text-green-600">23</p>
                </div>
                <Star className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saved Grants</p>
                  <p className="text-2xl font-bold text-purple-600">12</p>
                </div>
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Sessions</p>
                  <p className="text-2xl font-bold text-orange-600">8</p>
                </div>
                <Bot className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search grants, funders, or applications..."
                  className="pl-10 w-96"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                Match Score: 80%+
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Showing 1,247 grants
            </div>
          </div>
        </div>

        {/* Grant Cards */}
        <div className="grid gap-6">
          {[
            {
              id: "grant_gates_health_2025",
              title: "Maternal Health Innovation Challenge 2025",
              funder: "Gates Foundation",
              amount: "$100,000 - $750,000",
              deadline: "Apr 15, 2025",
              location: "Sub-Saharan Africa, South Asia",
              category: "Healthcare",
              match: 95,
              description: "Supporting breakthrough innovations to reduce maternal mortality in Sub-Saharan Africa and South Asia. Focus on scalable, evidence-based interventions.",
              tags: ["maternal-health", "innovation", "africa", "south-asia"],
              aiSessionActive: true,
              saved: false,
              featured: true
            },
            {
              id: "grant_mastercard_youth_2025",
              title: "Young Africa Works Initiative",
              funder: "Mastercard Foundation",
              amount: "$25,000 - $1,000,000",
              deadline: "Feb 28, 2025",
              location: "Africa",
              category: "Youth Employment",
              match: 92,
              description: "Creating economic opportunities for young people in Africa through skills development, entrepreneurship support, and job creation programs.",
              tags: ["youth-employment", "skills-development", "entrepreneurship", "africa"],
              aiSessionActive: false,
              saved: true,
              featured: true
            },
            {
              id: "grant_gcf_climate_2025",
              title: "Climate Resilience for Smallholder Farmers",
              funder: "Green Climate Fund",
              amount: "$100,000 - $2,000,000",
              deadline: "Apr 30, 2025",
              location: "Global South",
              category: "Climate",
              match: 88,
              description: "Building climate resilience among smallholder farmers through innovative agricultural practices and technology solutions.",
              tags: ["climate-change", "agriculture", "smallholder-farmers", "resilience"],
              aiSessionActive: false,
              saved: false,
              featured: false
            },
            {
              id: "grant_ford_rights_2025",
              title: "Human Rights Defenders Support Fund",
              funder: "Ford Foundation",
              amount: "$10,000 - $200,000",
              deadline: "Jun 01, 2025",
              location: "Global",
              category: "Human Rights",
              match: 82,
              description: "Strengthening the capacity and security of human rights defenders working in challenging environments worldwide.",
              tags: ["human-rights", "civil-society", "defenders", "security"],
              aiSessionActive: true,
              saved: false,
              featured: false
            }
          ].map((grant, index) => (
            <Card key={index} className={cn(
              "hover:shadow-lg transition-all duration-200 border-l-4",
              grant.featured ? "border-l-yellow-400 bg-gradient-to-r from-yellow-50 to-white" : "border-l-primary",
              grant.match >= 90 ? "ring-2 ring-green-100" : ""
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-lg">{grant.title}</CardTitle>
                      {grant.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      <Badge 
                        className={cn(
                          "text-xs font-semibold",
                          grant.match >= 90 ? "bg-green-100 text-green-800 border-green-200" :
                          grant.match >= 80 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                          "bg-gray-100 text-gray-800 border-gray-200"
                        )}
                      >
                        {grant.match}% Match
                      </Badge>
                      {grant.saved && (
                        <Badge variant="outline" className="text-xs">
                          <Heart className="h-3 w-3 mr-1 fill-current text-red-500" />
                          Saved
                        </Badge>
                      )}
                      {grant.aiSessionActive && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          <Bot className="h-3 w-3 mr-1" />
                          AI Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4" />
                        <span>{grant.funder}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{grant.amount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{grant.deadline}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{grant.location}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{grant.description}</p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {grant.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Match Score Breakdown */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Compatibility Score</span>
                        <span className="font-medium text-gray-900">{grant.match}%</span>
                      </div>
                      <Progress value={grant.match} className="h-2" />
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-4">{grant.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {Math.floor(Math.random() * 90) + 10} days left to apply
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Heart className="h-4 w-4 mr-2" />
                      {grant.saved ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Link href={`/grants/${grant.id}/ai-workspace`}>
                      <Button size="sm" className={cn(
                        "relative",
                        grant.aiSessionActive ? "bg-purple-600 hover:bg-purple-700" : ""
                      )}>
                        <Bot className="h-4 w-4 mr-2" />
                        {grant.aiSessionActive ? 'Continue AI Chat' : 'AI Workspace'}
                        {grant.aiSessionActive && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <Button variant="outline" size="lg">
            Load More Grants
          </Button>
        </div>
      </div>
    </div>
  );
}