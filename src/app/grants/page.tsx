import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GrantsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
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
              title: "Health Innovation Grant",
              funder: "Gates Foundation",
              amount: "$50,000 - $250,000",
              deadline: "Dec 15, 2024",
              location: "Global",
              category: "Healthcare",
              match: 95,
              description: "Supporting innovative healthcare solutions for underserved communities worldwide."
            },
            {
              title: "Small Business Development Fund",
              funder: "SBA",
              amount: "$10,000 - $100,000",
              deadline: "Jan 30, 2025",
              location: "United States",
              category: "Business",
              match: 88,
              description: "Funding for small businesses to expand operations and create jobs."
            },
            {
              title: "Education Access Initiative",
              funder: "Ford Foundation",
              amount: "$25,000 - $150,000",
              deadline: "Feb 28, 2025",
              location: "Africa",
              category: "Education",
              match: 82,
              description: "Improving educational access and quality in underserved African communities."
            }
          ].map((grant, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-lg">{grant.title}</CardTitle>
                      <Badge 
                        className={cn(
                          "text-xs",
                          grant.match >= 90 ? "bg-green-100 text-green-800" :
                          grant.match >= 80 ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        )}
                      >
                        {grant.match}% Match
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                  </div>
                  <Badge variant="outline">{grant.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{grant.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {Math.floor(Math.random() * 30) + 1} days left
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button size="sm">
                      Apply Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}