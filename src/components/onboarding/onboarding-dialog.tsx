"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

const organizationTypes = [
  {
    id: "SME",
    title: "Small Business",
    description: "For-profit companies, startups, and enterprises",
    icon: Building2,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    iconColor: "text-blue-600"
  },
  {
    id: "Nonprofit",
    title: "Nonprofit",
    description: "501(c)(3) and other tax-exempt organizations",
    icon: Users,
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    iconColor: "text-green-600"
  },
  {
    id: "Academic",
    title: "Academic Institution",
    description: "Universities, colleges, schools, and research centers",
    icon: GraduationCap,
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    iconColor: "text-purple-600"
  },
  {
    id: "Healthcare",
    title: "Healthcare Organization",
    description: "Hospitals, clinics, and health service providers",
    icon: Heart,
    color: "bg-red-50 border-red-200 hover:bg-red-100",
    iconColor: "text-red-600"
  },
  {
    id: "Government",
    title: "Government",
    description: "Federal, state, local agencies and municipalities",
    icon: Briefcase,
    color: "bg-gray-50 border-gray-200 hover:bg-gray-100",
    iconColor: "text-gray-600"
  },
  {
    id: "Other",
    title: "Other",
    description: "Specify your organization type",
    icon: Target,
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    iconColor: "text-orange-600"
  }
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
    name: "",
    orgType: "",
    size: "",
    position: "",
    country: "",
    categories: [] as string[]
  });

  const router = useRouter();
  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

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
          name: formData.name,
          orgType: formData.orgType,
          size: formData.size,
          position: formData.position,
          country: formData.country
        }),
      });

      if (!orgResponse.ok) throw new Error("Failed to save organization");

      // Save preferences
      const prefResponse = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: formData.categories
        }),
      });

      if (!prefResponse.ok) throw new Error("Failed to save preferences");

      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-8 py-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Welcome to Benefitiary</h2>
                  <p className="text-gray-600">Let's set up your grant discovery profile</p>
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
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      What type of organization are you?
                    </h3>
                    <p className="text-gray-600">
                      Different organization types are eligible for different funding sources
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
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
                              ? 'border-blue-500 bg-blue-50 shadow-lg' 
                              : type.color
                            }
                          `}
                          onClick={() => setFormData(prev => ({ ...prev, orgType: type.id }))}
                        >
                          {isSelected && (
                            <div className="absolute top-4 right-4">
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          
                          <div className="flex items-start space-x-4">
                            <div className={`
                              w-12 h-12 rounded-lg flex items-center justify-center
                              ${isSelected ? 'bg-blue-100' : 'bg-white'}
                            `}>
                              <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : type.iconColor}`} />
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

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Tell us about your organization
                    </h3>
                    <p className="text-gray-600">
                      This helps us personalize your grant recommendations
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                          Organization Name
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your organization name"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Organization Size</Label>
                        <div className="mt-2 space-y-2">
                          {["Solo", "Micro (2-10)", "Small (11-50)", "Medium (51-250)", "Large (250+)"].map((size) => (
                            <label key={size} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="size"
                                value={size.split(" ")[0]}
                                checked={formData.size === size.split(" ")[0]}
                                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">{size}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="position" className="text-sm font-medium text-gray-700">
                          Your Position
                        </Label>
                        <select
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select your position</option>
                          <option value="CEO">CEO</option>
                          <option value="Founder">Founder</option>
                          <option value="Program Manager">Program Manager</option>
                          <option value="Development Manager">Development Manager</option>
                          <option value="Grant Writer">Grant Writer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                          Country
                        </Label>
                        <select
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select your country</option>
                          <option value="United States">United States</option>
                          <option value="Canada">Canada</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Germany">Germany</option>
                          <option value="France">France</option>
                          <option value="Australia">Australia</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      What areas are you interested in?
                    </h3>
                    <p className="text-gray-600">
                      Select the grant categories that match your focus areas
                    </p>
                  </div>

                  <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {grantCategories.map((category) => {
                        const isSelected = formData.categories.includes(category.id);
                        
                        return (
                          <motion.div
                            key={category.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                            onClick={() => toggleCategory(category.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{category.emoji}</span>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{category.label}</h4>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {formData.categories.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>{formData.categories.length}</strong> categories selected. 
                          You can always update these later in your settings.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t bg-gray-50">
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
                      (step === 1 && !formData.orgType) ||
                      (step === 2 && (!formData.name || !formData.size || !formData.position || !formData.country))
                    }
                    className="flex items-center space-x-2"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={formData.categories.length === 0 || isLoading}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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