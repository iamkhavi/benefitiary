"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import { organizationSchema, type OrganizationFormData, countries } from "@/lib/validations/onboarding";

export default function OrganizationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save organization");
        return;
      }

      // Redirect to preferences step
      router.push("/onboarding/preferences");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Organization setup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">
              Organization Setup
            </CardTitle>
          </div>
          <CardDescription>
            Tell us about your organization to get personalized grant matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="Enter organization name"
                  {...register("name")}
                  disabled={isLoading}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgType">Organization Type</Label>
                <Select onValueChange={(value) => setValue("orgType", value as any)}>
                  <SelectTrigger className={errors.orgType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SME">SME / Small Business</SelectItem>
                    <SelectItem value="Nonprofit">Nonprofit / NGO</SelectItem>
                    <SelectItem value="Academic">Academic Institution</SelectItem>
                    <SelectItem value="Healthcare">Healthcare Organization</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.orgType && (
                  <p className="text-sm text-red-600">{errors.orgType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Organization Size</Label>
                <Select onValueChange={(value) => setValue("size", value as any)}>
                  <SelectTrigger className={errors.size ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solo">Solo (1 person)</SelectItem>
                    <SelectItem value="Micro">Micro (2-10 people)</SelectItem>
                    <SelectItem value="Small">Small (11-50 people)</SelectItem>
                    <SelectItem value="Medium">Medium (51-250 people)</SelectItem>
                    <SelectItem value="Large">Large (250+ people)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.size && (
                  <p className="text-sm text-red-600">{errors.size.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Your Position</Label>
                <Select onValueChange={(value) => setValue("position", value as any)}>
                  <SelectTrigger className={errors.position ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CEO">CEO</SelectItem>
                    <SelectItem value="Founder">Founder</SelectItem>
                    <SelectItem value="Program Manager">Program Manager</SelectItem>
                    <SelectItem value="Development Manager">Development Manager</SelectItem>
                    <SelectItem value="Grant Writer">Grant Writer</SelectItem>
                    <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                    <SelectItem value="Project Coordinator">Project Coordinator</SelectItem>
                    <SelectItem value="Research Director">Research Director</SelectItem>
                    <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.position && (
                  <p className="text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  {...register("website")}
                  disabled={isLoading}
                  className={errors.website ? "border-red-500" : ""}
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select onValueChange={(value) => setValue("country", value)}>
                  <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-sm text-red-600">{errors.country.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="region">Region/State (Optional)</Label>
                <Input
                  id="region"
                  placeholder="Enter region or state"
                  {...register("region")}
                  disabled={isLoading}
                  className={errors.region ? "border-red-500" : ""}
                />
                {errors.region && (
                  <p className="text-sm text-red-600">{errors.region.message}</p>
                )}
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isValid}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Preferences
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}