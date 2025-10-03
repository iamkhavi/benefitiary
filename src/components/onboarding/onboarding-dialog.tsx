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
    id: "Nonprofit",
    title: "Nonprofit",
    description: "501(c)(3) and other tax-exempt organizations",
    icon: Users,
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    id: "Business",
    title: "Business",
    description: "For-profit companies, startups, and enterprises",
    icon: Building2,
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    id: "Government",
    title: "Government",
    description: "Federal, state, local agencies and municipalities",
    icon: Briefcase,
    gradient: "from-slate-500 to-gray-600"
  },
  {
    id: "Academic",
    title: "Academic Institution",
    description: "Universities, colleges, schools, and research centers",
    icon: GraduationCap,
    gradient: "from-purple-500 to-violet-600"
  },
  {
    id: "Grant Consultancy",
    title: "Grant Consultancy",
    description: "Agencies, freelancers, and grant writing services",
    icon: Target,
    gradient: "from-orange-500 to-amber-600"
  },
  {
    id: "Other",
    title: "Other",
    description: "Specify your organization type",
    icon: Sparkles,
    gradient: "from-pink-500 to-rose-600"
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
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 gap-0 border-0 shadow-2xl bg-white rounded-3xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-8 py-8 border-b bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Welcome to Benefitiary
                  </h2>
                  <p className="text-gray-600 text-lg">Find perfect funding opportunities with AI-powered matching in minutes, not months</p>
                </div>
              </div>
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-white/80 backdrop-blur-sm">
                Step {step} of {totalSteps}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/50" />
            </div>
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
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      What type of organization are you?
                    </h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      Different organization types are eligible for different funding sources. This helps us show the only relevant opportunities and understand your nonprofit status.
                    </p>
                  </div>

                  <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-sm font-semibold">?</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Why This Matters</h4>
                        <p className="text-blue-800 text-sm leading-relaxed">
                          Different organization types are eligible for different funding sources. This helps us show the only relevant opportunities and understand your nonprofit status.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {organizationTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.orgType === type.id;
                      
                      return (
                        <motion.div
                          key={type.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative p-8 rounded-2xl border cursor-pointer transition-all duration-300 group
                            ${isSelected 
                              ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-100' 
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
                            }
                          `}
                          onClick={() => setFormData(prev => ({ ...prev, orgType: type.id }))}
                        >
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-6 right-6"
                            >
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            </motion.div>
                          )}
                          
                          <div className="space-y-4">
                            <div className={`
                              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
                              ${isSelected 
                                ? `bg-gradient-to-br ${type.gradient}` 
                                : 'bg-gray-100 group-hover:bg-gray-200'
                              }
                            `}>
                              <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-xl font-semibold text-gray-900">{type.title}</h4>
                              <p className="text-gray-600 leading-relaxed">{type.description}</p>
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
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      Tell us about your organization
                    </h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      This helps us personalize your grant recommendations and match you with the most relevant opportunities
                    </p>
                  </div>

                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-base font-semibold text-gray-800">
                            Organization Name
                          </Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter your organization name"
                            className="h-12 text-base border-white/50 bg-white/80 backdrop-blur-sm focus:bg-white focus:border-blue-300 rounded-xl"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-semibold text-gray-800">Organization Size</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { value: "Solo", label: "Solo (1 person)" },
                              { value: "Micro", label: "Micro (2-10 people)" },
                              { value: "Small", label: "Small (11-50 people)" },
                              { value: "Medium", label: "Medium (51-250 people)" },
                              { value: "Large", label: "Large (250+ people)" }
                            ].map((size) => (
                              <motion.label 
                                key={size.value} 
                                className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-200"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <input
                                  type="radio"
                                  name="size"
                                  value={size.value}
                                  checked={formData.size === size.value}
                                  onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                                  className="w-5 h-5 text-blue-600 border-2 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="text-gray-700 font-medium">{size.label}</span>
                              </motion.label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="position" className="text-base font-semibold text-gray-800">
                            Your Position
                          </Label>
                          <select
                            id="position"
                            value={formData.position}
                            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                            className="h-12 w-full px-4 text-base border-white/50 bg-white/80 backdrop-blur-sm focus:bg-white focus:border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select your position</option>
                            <option value="CEO">CEO</option>
                            <option value="Founder">Founder</option>
                            <option value="Program Manager">Program Manager</option>
                            <option value="Development Manager">Development Manager</option>
                            <option value="Grant Writer">Grant Writer</option>
                            <option value="Operations Manager">Operations Manager</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="country" className="text-base font-semibold text-gray-800">
                            Country
                          </Label>
                          <select
                            id="country"
                            value={formData.country}
                            onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                            className="h-12 w-full px-4 text-base border-white/50 bg-white/80 backdrop-blur-sm focus:bg-white focus:border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select your country</option>
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Germany">Germany</option>
                            <option value="France">France</option>
                            <option value="Australia">Australia</option>
                            <option value="Netherlands">Netherlands</option>
                            <option value="Sweden">Sweden</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
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
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      What areas are you interested in?
                    </h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                      Select the grant categories that match your focus areas. We'll use this to find the most relevant opportunities for you.
                    </p>
                  </div>

                  <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {grantCategories.map((category) => {
                        const isSelected = formData.categories.includes(category.id);
                        
                        return (
                          <motion.div
                            key={category.id}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`
                              relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group
                              ${isSelected 
                                ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-100' 
                                : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                              }
                            `}
                            onClick={() => toggleCategory(category.id)}
                          >
                            {isSelected && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-4 right-4"
                              >
                                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              </motion.div>
                            )}
                            
                            <div className="flex items-center space-x-4">
                              <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300
                                ${isSelected 
                                  ? 'bg-white shadow-sm' 
                                  : 'bg-gray-100 group-hover:bg-gray-200'
                                }
                              `}>
                                {category.emoji}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-base leading-tight">{category.label}</h4>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {formData.categories.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-emerald-800 font-medium">
                            <strong>{formData.categories.length}</strong> categories selected. 
                            You can always update these later in your settings.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-8 border-t bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-white/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>

              <div className="flex items-center space-x-4">
                {step < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      (step === 1 && !formData.orgType) ||
                      (step === 2 && (!formData.name || !formData.size || !formData.position || !formData.country))
                    }
                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={formData.categories.length === 0 || isLoading}
                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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