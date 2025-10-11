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
  Building2,
  Clock,
  Heart,
  Star,
  TrendingUp,
  MapPin,
  Award,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function MatchesPage() {
  const matches = [
    {
      title: "Health Innovation Grant",
      funder: "Gates Foundation",
      amount: "$50,000 - $250,000",
      deadline: "Dec 15, 2024",
      location: "Global",
      category: "Healthcare",
      match: 95,
      reasons: ["Healthcare focus", "Global eligibility", "SME friendly", "Innovation emphasis"],
      description: "Supporting innovative healthcare solutions for underserved communities worldwide.",
      saved: false
    },
    {
      title: "Digital Health Accelerator",
      funder: "WHO Innovation Hub",
      amount: "$25,000 - $100,000",
      deadline: "Jan 20, 2025",
      location: "Africa, Asia",
      category: "Healthcare",
      match: 92,
      reasons: ["Digital health focus", "Regional match", "Accelerator program", "Tech innovation"],
      description: "Accelerating digital health solutions in emerging markets.",
      saved: true
    },
    {
      title: "Small Business Development Fund",
      funder: "SBA",
      amount: "$10,000 - $100,000",
      deadline: "Jan 30, 2025",
      location: "United States",
      category: "Business",
      match: 88,
      reasons: ["SME focus", "Business development", "Funding range match", "Growth stage"],
      description: "Funding for small businesses to expand operations and create jobs.",
      saved: false
    },
    {
      title: "Community Health Initiative",
      funder: "Local Health Foundation",
      amount: "$15,000 - $75,000",
      deadline: "Feb 15, 2025",
      location: "Regional",
      category: "Public Health",
      match: 85,
      reasons: ["Community focus", "Health sector", "Local presence", "Impact driven"],
      description: "Supporting community-based health programs and initiatives.",
      saved: true
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Grant Matches</h1>
          <Badge className="bg-purple-100 text-purple-800">8 New</Badge>
        </div>
      </div>

      {/* Match Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Perfect Matches</p>
                <p className="text-2xl font-bold text-green-600">3</p>
                <p className="text-xs text-gray-500">90%+ compatibility</p>
              </div>
              <Star className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Good Matches</p>
                <p className="text-2xl font-bold text-yellow-600">5</p>
                <p className="text-xs text-gray-500">70-89% compatibility</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saved Matches</p>
                <p className="text-2xl font-bold text-blue-600">12</p>
                <p className="text-xs text-gray-500">For later review</p>
              </div>
              <Heart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search matches..."
              className="pl-10 w-80"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter by Match %
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Showing 8 matches
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-6">
        {matches.map((match, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-lg">{match.title}</CardTitle>
                    <Badge 
                      className={cn(
                        "text-xs font-semibold",
                        match.match >= 90 ? "bg-green-100 text-green-800 border-green-200" :
                        match.match >= 80 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                        "bg-gray-100 text-gray-800 border-gray-200"
                      )}
                    >
                      {match.match}% Match
                    </Badge>
                    {match.saved && (
                      <Badge variant="outline" className="text-xs">
                        <Heart className="h-3 w-3 mr-1 fill-current" />
                        Saved
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <Building2 className="h-4 w-4" />
                      <span>{match.funder}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{match.amount}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{match.deadline}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{match.location}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{match.description}</p>
                  
                  {/* Match Reasons */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Why this matches:</p>
                    <div className="flex flex-wrap gap-2">
                      {match.reasons.map((reason, reasonIndex) => (
                        <Badge key={reasonIndex} variant="outline" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Match Score Breakdown */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Compatibility Score</span>
                      <span className="font-medium text-gray-900">{match.match}%</span>
                    </div>
                    <Progress value={match.match} className="h-2" />
                  </div>
                </div>
                <Badge variant="outline" className="ml-4">{match.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {Math.floor(Math.random() * 30) + 1} days left to apply
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    {match.saved ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Link href={`/grants/grant_${index + 1}/ai-workspace`}>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <Zap className="h-4 w-4 mr-2" />
                      AI Workspace
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}