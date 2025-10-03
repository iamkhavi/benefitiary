"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, Target } from "lucide-react";
import { preferencesSchema, type PreferencesFormData, grantCategories } from "@/lib/validations/onboarding";

export default function PreferencesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const router = useRouter();

  const {
    handleSubmit,
    formState: { isValid },
    setValue,
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    mode: "onChange",
    defaultValues: {
      categories: []
    }
  });

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newCategories;
    if (checked) {
      newCategories = [...selectedCategories, categoryId];
    } else {
      newCategories = selectedCategories.filter(id => id !== categoryId);
    }
    setSelectedCategories(newCategories);
    setValue("categories", newCategories as any);
  };

  const onSubmit = async (data: PreferencesFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save preferences");
        return;
      }

      // Redirect to main app after completing onboarding
      router.push("/");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Preferences setup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">
              Grant Preferences
            </CardTitle>
          </div>
          <CardDescription>
            Select the grant categories that match your organization's focus areas
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grantCategories.map((category) => (
                <div
                  key={category.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedCategories.includes(category.id)
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleCategoryChange(category.id, !selectedCategories.includes(category.id))}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => handleCategoryChange(category.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-gray-900 mb-1">
                        {category.label}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedCategories.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{selectedCategories.length}</strong> categories selected. 
                  You can always update these preferences later in your settings.
                </p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || selectedCategories.length === 0}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}