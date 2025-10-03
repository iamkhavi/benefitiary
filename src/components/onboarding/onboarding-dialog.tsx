"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  GraduationCap, 
  Heart, 
  Briefcase,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractOrganizationFromEmail, COUNTRIES } from "@/lib/utils/email-utils";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

const organizationTypes = [
  {
    id: "BUSINESS",
    title: "Business",
    description: "SMEs, startups, and for-profit enterprises",
    icon: Building2
  },
  {
    id: "NONPROFIT",
    title: "Non-Profit",
    description: "NGOs, charities, and other non-profit organizations",
    icon: Users
  },
  {
    id: "GOVERNMENT",
    title: "Government",
    description: "Federal, state, local agencies and municipalities",
    icon: Briefcase
  },
  {
    id: "SOCIAL_ENTERPRISE",
    title: "Social Enterprise",
    description: "Mission-driven businesses with social impact",
    icon: Heart
  },
  {
    id: "RESEARCH_ACADEMIC",
    title: "Research/Academic Institute",
    description: "Universities, colleges, and research centers",
    icon: GraduationCap
  },
  {
    id: "OTHER",
    title: "Other",
    description: "Other organization types",
    icon: Sparkles
  }
];

const industries = [
  { id: "HEALTHCARE", label: "Healthcare", emoji: "🏥" },
  { id: "PUBLIC_HEALTH", label: "Public Health", emoji: "🩺" },
  { id: "EDUCATION", label: "Education", emoji: "📚" },
  { id: "AGRICULTURE", label: "Agriculture", emoji: "🌾" },
  { id: "ENVIRONMENT", label: "Environment", emoji: "🌍" },
  { id: "TECHNOLOGY", label: "Technology", emoji: "💻" },
  { id: "CLIMATE", label: "Climate", emoji: "🌡️" },
  { id: "SUPPLY_CHAIN", label: "Supply Chain", emoji: "🚚" },
  { id: "HUMANITARIAN", label: "Humanitarian", emoji: "🤝" },
  { id: "GENDER", label: "Gender", emoji: "⚖️" }
];

const organizationSizes = [
  { id: "SOLO_1", label: "Solo (1 person)" },
  { id: "MICRO_2_10", label: "Micro (2-10 people)" },
  { id: "SMALL_11_50", label: "Small (11-50 people)" },
  { id: "MEDIUM_51_250", label: "Medium (51-250 people)" },
  { id: "LARGE_250_PLUS", label: "Large (250+ people)" }
];

const fundingNeeds = [
  { id: "CAPACITY_BUILDING", label: "Capacity Building" },
  { id: "RESEARCH", label: "Research" },
  { id: "PROJECT_IMPLEMENTATION", label: "Project Implementation" },
  { id: "EQUIPMENT", label: "Equipment" },
  { id: "TRAINING", label: "Training" }
];

const grantSizeRanges = [
  { id: "UNDER_10K", label: "Under $10,000", min: 0, max: 10000 },
  { id: "10K_25K", label: "$10,000 - $25,000", min: 10000, max: 25000 },
  { id: "25K_50K", label: "$25,000 - $50,000", min: 25000, max: 50000 },
  { id: "50K_100K", label: "$50,000 - $100,000", min: 50000, max: 100000 },
  { id: "100K_250K", label: "$100,000 - $250,000", min: 100000, max: 250000 },
  { id: "250K_500K", label: "$250,000 - $500,000", min: 250000, max: 500000 },
  { id: "500K_1M", label: "$500,000 - $1,000,000", min: 500000, max: 1000000 },
  { id: "OVER_1M", label: "Over $1,000,000", min: 1000000, max: null }
];

const grantCategories = [
  { id: "HEALTHCARE_PUBLIC_HEALTH", label: "Healthcare & Public Health", emoji: "🏥" },
  { id: "EDUCATION_TRAINING", label: "Education & Training", emoji: "📚" },
  { id: "AGRICULTURE_FOOD_SECURITY", label: "Agriculture & Food Security", emoji: "🌾" },
  { id: "CLIMATE_ENVIRONMENT", label: "Climate & Environment", emoji: "🌍" },
  { id: "TECHNOLOGY_INNOVATION", label: "Technology & Innovation", emoji: "💡" },
  { id: "WOMEN_YOUTH_EMPOWERMENT", label: "Women & Youth Empowerment", emoji: "👥" },
  { id: "ARTS_CULTURE", label: "Arts & Culture", emoji: "🎨" },
  { id: "COMMUNITY_DEVELOPMENT", label: "Community Development", emoji: "🏘️" },
  { id: "HUMAN_RIGHTS_GOVERNANCE", label: "Human Rights & Governance", emoji: "⚖️" },
  { id: "SME_BUSINESS_GROWTH", label: "SME / Business Growth", emoji: "📈" }
];

export function OnboardingDialog({ isOpen, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: "",
    website: "",
    orgType: "",
    orgSize: "",
    industries: [] as string[],
    country: "",
    grantSizeRange: "",
    fundingNeeds: [] as string[]
  });

  const router = useRouter();
  const { data: session } = useSession();
  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Initialize organization name from email when component mounts
  useEffect(() => {
    if (session?.user?.email && !formData.organizationName) {
      const orgInfo = extractOrganizationFromEmail(session.user.email);
      if (orgInfo.isWorkEmail) {
        setFormData(prev => ({
          ...prev,
          organizationName: orgInfo.name,
          website: orgInfo.website
        }));
      }
    }
  }, [session?.user?.email, formData.organizationName]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Save organization data
      const orgResponse = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.organizationName,
          website: formData.website,
          orgType: formData.orgType,
          orgSize: formData.orgSize,
          industries: formData.industries,
          country: formData.country,
          grantSizeRange: formData.grantSizeRange || null,
          fundingNeeds: formData.fundingNeeds
        }),
      });

      if (!orgResponse.ok) throw new Error("Failed to save organization");

      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIndustry = (industryId: string) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.includes(industryId)
        ? prev.industries.filter(id => id !== industryId)
        : [...prev.industries, industryId]
    }));
  };

  const toggleFundingNeed = (needId: string) => {
    setFormData(prev => ({
      ...prev,
      fundingNeeds: prev.fundingNeeds.includes(needId)
        ? prev.fundingNeeds.filter(id => id !== needId)
        : [...prev.fundingNeeds, needId]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-6 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Welcome to Benefitiary
                  </h2>
                  <p className="text-gray-600">Set up your grant discovery profile</p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                Step {step} of {totalSteps}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Organization Name */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Organization Details
                    </h3>
                    <p className="text-gray-600">
                      Confirm or edit your organization information
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        value={formData.organizationName}
                        onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                        placeholder="Enter your organization name"
                        className="text-base"
                      />
                      <p className="text-sm text-gray-500">
                        {session?.user?.email && extractOrganizationFromEmail(session.user.email).isWorkEmail 
                          ? "We detected this from your work email. You can edit it if needed."
                          : "Enter your organization's full name"
                        }
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website (Optional)</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                        className="text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base"
                      >
                        <option value="">Select your country</option>
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Organization Size *</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {organizationSizes.map((size) => (
                          <label 
                            key={size.id}
                            className={`
                              flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                              ${formData.orgSize === size.id
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name="orgSize"
                              value={size.id}
                              checked={formData.orgSize === size.id}
                              onChange={(e) => setFormData(prev => ({ ...prev, orgSize: e.target.value }))}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm text-gray-900">{size.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Organization Type */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Organization Type
                    </h3>
                    <p className="text-gray-600">
                      Select the type that best describes your organization
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {organizationTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.orgType === type.id;
                      
                      return (
                        <motion.div
                          key={type.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                            ${isSelected 
                              ? 'border-primary bg-primary/5 shadow-lg' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
                          `}
                          onClick={() => setFormData(prev => ({ ...prev, orgType: type.id }))}
                        >
                          {isSelected && (
                            <div className="absolute top-4 right-4">
                              <CheckCircle className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          
                          <div className="flex items-start space-x-4">
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center
                              ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}
                            `}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{type.title}</h4>
                              <p className="text-sm text-gray-600">{type.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Industry/Sector */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Industry/Sector
                    </h3>
                    <p className="text-gray-600">
                      Select the industries your organization focuses on (multiple selection allowed)
                    </p>
                  </div>

                  <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {industries.map((industry) => {
                        const isSelected = formData.industries.includes(industry.id);
                        
                        return (
                          <motion.div
                            key={industry.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                            onClick={() => toggleIndustry(industry.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{industry.emoji}</span>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{industry.label}</h4>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {formData.industries.length > 0 && (
                      <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>{formData.industries.length}</strong> industries selected.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Grant Preferences (Optional) */}
              {step === 4 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Grant Preferences
                    </h3>
                    <p className="text-gray-600">
                      Help us find the most relevant grants for you (optional)
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-8">
                    {/* Grant Size Range */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Grant Size Range (USD)</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {grantSizeRanges.map((range) => {
                          const isSelected = formData.grantSizeRange === range.id;
                          
                          return (
                            <label 
                              key={range.id}
                              className={`
                                flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                                ${isSelected 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name="grantSizeRange"
                                value={range.id}
                                checked={isSelected}
                                onChange={(e) => setFormData(prev => ({ ...prev, grantSizeRange: e.target.value }))}
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-sm text-gray-900">{range.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Funding Needs */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Funding Needs (select all that apply)</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {fundingNeeds.map((need) => {
                          const isSelected = formData.fundingNeeds.includes(need.id);
                          
                          return (
                            <label 
                              key={need.id}
                              className={`
                                flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                                ${isSelected 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFundingNeed(need.id)}
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-sm text-gray-900">{need.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>

              <div className="flex items-center space-x-2">
                {step < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      (step === 1 && (!formData.organizationName || !formData.country || !formData.orgSize)) ||
                      (step === 2 && !formData.orgType) ||
                      (step === 3 && formData.industries.length === 0)
                    }
                    className="flex items-center space-x-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Setting up...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup</span>
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}