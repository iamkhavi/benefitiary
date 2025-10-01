"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReactNode } from "react";

interface MarketingCTAButtonProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  action?: "signup" | "login";
}

export function MarketingCTAButton({ 
  children, 
  className = "", 
  size = "lg",
  variant = "default",
  action = "signup"
}: MarketingCTAButtonProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.benefitiary.com';
  const targetUrl = action === "login" 
    ? `${appUrl}/auth/login` 
    : `${appUrl}/auth/signup`;

  return (
    <Button size={size} variant={variant} className={className} asChild>
      <Link 
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </Link>
    </Button>
  );
}