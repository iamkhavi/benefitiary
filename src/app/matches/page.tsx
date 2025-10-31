'use client';

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
  Zap,

} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Match {
  id: string;
  title: string;
  funder: string;
  amount: string;
  deadline: string;
  location: string;
  category: string;
  match: number;
  reasons: string[];
  description: string;
  saved: boolean;
  daysLeft: number | null;
}

interface MatchStats {
  perfectMatches: number;
  goodMatches: number;
  savedMatches: number;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    perfectMatches: 0,
    goodMatches: 0,
    savedMatches: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [minMatch, setMinMatch] = useState(70);

  useEffect(() => {
    fetchMatches();
  }, [searchTerm, minMatch]);

  const fetchMatches = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('minMatch', minMatch.toString());
      
      const response = await fetch(`/api/matches?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.matches);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch matches:', data.error);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const handleSaveMatch = async (matchId: string, currentlySaved: boolean) => {
    try {
      const response = await fetch('/api/matches/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grantId: matchId,
          action: currentlySaved ? 'unsave' : 'save'
        }),
      });

      if (response.ok) {
        // Update the local state
        setMatches(matches.map(match => 
          match.id === matchId 
            ? { ...match, saved: !currentlySaved }
            : match
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          savedMatches: currentlySaved ? prev.savedMatches - 1 : prev.savedMatches + 1
        }));
      }
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

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
                <p className="text-2xl font-bold text-green-600">{stats.perfectMatches}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{stats.goodMatches}</p>
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
                <p className="text-2xl font-bold text-blue-600">{stats.savedMatches}</p>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={minMatch}
            onChange={(e) => setMinMatch(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={50}>50%+ Match</option>
            <option value={70}>70%+ Match</option>
            <option value={80}>80%+ Match</option>
            <option value={90}>90%+ Match</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          Showing {matches.length} matches
        </div>
      </div>

      {/* Matches List */}
      {matches.length === 0 ? (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-600 mb-4">
            Complete your profile to get personalized grant recommendations.
          </p>
          <Button>
            <Building2 className="h-4 w-4 mr-2" />
            Complete Profile
          </Button>
        </div>
      ) : (
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
                  <span className={cn(
                    "text-sm",
                    match.daysLeft && match.daysLeft <= 7 
                      ? "text-red-600 font-medium" 
                      : match.daysLeft && match.daysLeft <= 14
                      ? "text-orange-600 font-medium"
                      : "text-gray-500"
                  )}>
                    {match.daysLeft 
                      ? `${match.daysLeft} days left to apply${match.daysLeft <= 7 ? ' ⚠️' : ''}` 
                      : 'No deadline specified'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSaveMatch(match.id, match.saved)}
                  >
                    <Heart className={cn("h-4 w-4 mr-2", match.saved && "fill-current text-red-500")} />
                    {match.saved ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Link href={`/grants/${match.id}/ai-workspace`}>
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
      )}
    </div>
  );
}