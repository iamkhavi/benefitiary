"use client";

import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface SmartCTAButtonProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function SmartCTAButton({ 
  children, 
  className = "", 
  size = "lg",
  variant = "default"
}: SmartCTAButtonProps) {
  const { data: session, isPending } = useSession();

  // Show loading state while checking session
  if (isPending) {
    return (
      <Button 
        size={size} 
        variant={variant}
        className={className}
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // If user is logged in, take them to dashboard
  // The dashboard will handle redirecting to onboarding if needed
  if (session?.user) {
    return (
      <Button size={size} variant={variant} className={className} asChild>
        <Link href="/dashboard">
          {children}
        </Link>
      </Button>
    );
  }

  // User is not logged in, take them to signup
  return (
    <Button size={size} variant={variant} className={className} asChild>
      <Link href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.benefitiary.com'}/auth/signup`}>
        {children}
      </Link>
    </Button>
  );
}