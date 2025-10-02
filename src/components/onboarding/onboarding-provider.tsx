"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingDialog } from "./onboarding-dialog";

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch("/api/user/onboarding-status");
      const data = await response.json();
      
      if (response.ok && data.needsOnboarding) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Refresh the page to update the user session
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {children}
      <OnboardingDialog 
        isOpen={showOnboarding} 
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}