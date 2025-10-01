import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MarketingCTAButton } from "@/components/ui/smart-cta-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Footer } from "@/components/layout/footer"
import { Logo, LogoIcon } from "@/components/ui/logo"
import { BenefitiaryNavbar } from "@/components/layout/benefitiary-navbar"
import { GrantMatchingWidget, AIWritingWidget } from "@/components/ui/hero-widgets"
import { VerticalTestimonials } from "@/components/ui/vertical-testimonials"
import { 
  Heart, 
  Users, 
  Building2, 
  Search, 
  FileText, 
  Target, 
  Clock, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Globe,
  Award,
  Sparkles,
  BarChart3,
  Brain,
  Rocket,
  Star,
  Play,
  ChevronRight
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <BenefitiaryNavbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative pt-20 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left order-1 lg:order-1">
                {/* Badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4 sm:mb-6">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Since 2024
                </div>
                
                {/* Main Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                  Grant Discovery and
                  <br className="hidden sm:block" />
                  <span className="sm:block">Application Helps</span>
                  <br className="hidden sm:block" />
                  <span className="text-primary">Craft the Best Proposals</span>
                </h1>
                
                {/* Subtitle */}
                <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Elevate your funding success from Good to Great with AI-powered matching 
                  from top grant databases. We focus on discovery and application services 
                  ensuring your proposals are polished and compelling.
                </p>
                
                {/* CTA Button */}
                <div className="mb-6 sm:mb-8">
                  <MarketingCTAButton 
                    size="lg" 
                    action="signup"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                  >
                    Start Now
                  </MarketingCTAButton>
                </div>

                {/* Delivery Info */}
                <p className="text-sm text-gray-500 mb-6 sm:mb-8">
                  24/48 hours delivery
                </p>

                {/* Trust Indicators */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-6 lg:space-x-8">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">4.9</span>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">GrantHub</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">4.9</span>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">FundingDB</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content - Interactive Widgets */}
              <div className="relative flex justify-center order-2 lg:order-2">
                {/* Main Widget Container */}
                <div className="relative w-full max-w-md lg:max-w-none">
                  {/* Grant Matching Widget - Main focus */}
                  <div className="relative z-20">
                    <GrantMatchingWidget />
                  </div>

                  {/* AI Writing Widget - Hidden on mobile, positioned below and slightly offset on desktop */}
                  <div className="hidden lg:block relative z-10 -mt-6 ml-12">
                    <AIWritingWidget />
                  </div>

                  {/* Floating Badge - Top left - Adjusted for mobile */}
                  <div className="absolute -top-3 sm:-top-6 -left-4 sm:-left-8 bg-primary text-primary-foreground rounded-full p-2 sm:p-3 shadow-lg z-40">
                    <div className="text-center">
                      <div className="text-xs font-medium">More</div>
                      <div className="text-xs">than just</div>
                      <div className="text-xs font-bold">matching</div>
                      <div className="flex justify-center mt-1">
                        <Star className="w-2 h-2 text-white fill-current" />
                        <Star className="w-2 h-2 text-white fill-current" />
                        <Star className="w-2 h-2 text-white fill-current" />
                        <Star className="w-2 h-2 text-white fill-current" />
                        <Star className="w-2 h-2 text-white fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Security Badge - Bottom left - Adjusted for mobile */}
                  <div className="absolute bottom-4 sm:bottom-8 -left-6 sm:-left-12 bg-white rounded-lg p-2 shadow-lg border z-30">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="w-3 h-3 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900">100% SECURE</div>
                        <div className="text-xs text-gray-600">Enterprise Grade</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Packed with five powerful features
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Everything you need to discover, apply for, and win grants in one comprehensive platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Discovery</h3>
                <p className="text-gray-600 text-sm">
                  AI-powered matching connects you with grants that perfectly fit your organization's profile and needs
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Matching</h3>
                <p className="text-gray-600 text-sm">
                  Get curated opportunities based on your organization type, size, location, and funding history
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Proposal Assistant</h3>
                <p className="text-gray-600 text-sm">
                  AI-powered tools and expert writers help you craft compelling proposals that win funding
                </p>
              </div>

              {/* Feature 4 */}
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Deadline Tracking</h3>
                <p className="text-gray-600 text-sm">
                  Never miss an opportunity with automated reminders and comprehensive application tracking
                </p>
              </div>

              {/* Feature 5 */}
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Database</h3>
                <p className="text-gray-600 text-sm">
                  Access 10,000+ verified grants from trusted government agencies and foundations
                </p>
              </div>

              {/* Feature 6 */}
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Analytics</h3>
                <p className="text-gray-600 text-sm">
                  Track your application performance and optimize your strategy with detailed insights
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Loved by people all over the universe
              </h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4 sm:px-0">
                See what our customers are saying about their experience with Benefitiary
              </p>
            </div>
            
            <VerticalTestimonials />
          </div>
        </section>

      {/* Feature Highlights */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to find and win grants
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our platform streamlines the entire grant discovery and application process, 
              saving you time and increasing your success rate.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Smart Grant Discovery</h3>
              <p className="text-muted-foreground">
                AI-powered matching connects you with grants that fit your organization's 
                profile, location, and funding needs.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Personalized Recommendations</h3>
              <p className="text-muted-foreground">
                Get curated grant opportunities based on your organization type, 
                size, industry, and geographic location.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Proposal Assistance</h3>
              <p className="text-muted-foreground">
                Connect with expert grant writers or use AI-powered tools to 
                craft compelling proposals that win funding.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Deadline Tracking</h3>
              <p className="text-muted-foreground">
                Never miss an opportunity with automated deadline reminders 
                and application status tracking.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Verified Opportunities</h3>
              <p className="text-muted-foreground">
                All grants are verified and regularly updated from trusted sources 
                including government agencies and foundations.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Fast Setup</h3>
              <p className="text-muted-foreground">
                Get started in minutes with our guided onboarding process 
                and start receiving grant matches immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to strategy and join the waitlist?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of organizations already using Benefitiary to discover and secure funding opportunities.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <MarketingCTAButton 
                size="lg" 
                action="signup"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-base font-medium rounded-lg"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </MarketingCTAButton>
              <Button variant="outline" size="lg" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 text-base font-medium rounded-lg" asChild>
                <Link href="#demo">
                  Learn More
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-gray-400">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}