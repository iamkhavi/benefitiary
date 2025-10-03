"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { authClient } from "@/lib/auth-client";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { signUpSchema, type SignUpFormData } from "@/lib/validations/auth";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState<any>(null);
  
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError: setFormError,
    watch,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
  });

  const emailValue = watch("email");

  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes("@")) return;
    
    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (data.exists) {
        setExistingUser(data.user);
      } else {
        setExistingUser(null);
      }
    } catch (error) {
      console.error("Email check error:", error);
    }
  };

  const handleEmailBlur = () => {
    if (emailValue) {
      checkEmailExists(emailValue);
    }
  };

  const handleSignInInstead = () => {
    router.push(`/auth/login?email=${encodeURIComponent(emailValue)}`);
  };

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError("");

    try {
      // Double-check email before signup
      await checkEmailExists(data.email);
      
      if (existingUser) {
        setError("This email is already registered. Please sign in instead.");
        return;
      }

      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        if (result.error.message?.includes("email")) {
          setFormError("email", { 
            type: "manual", 
            message: "This email is already registered" 
          });
        } else {
          setError(result.error.message || "Signup failed");
        }
        return;
      }

      // Redirect to main app (onboarding dialog will show automatically)
      router.push("/");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create your account
          </CardTitle>
          <CardDescription className="text-center">
            Sign up for your Benefitiary account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingUser && (
            <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              An account with this email already exists.{" "}
              <button 
                type="button"
                onClick={handleSignInInstead}
                className="font-medium text-blue-600 hover:text-blue-500 underline"
              >
                Sign in instead
              </button>
            </div>
          )}

          <OAuthButtons 
            mode="signup" 
            onSuccess={() => router.push("/")}
            onError={setError}
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                {...register("name")}
                disabled={isLoading}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                onBlur={handleEmailBlur}
                disabled={isLoading}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
                disabled={isLoading}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                disabled={isLoading}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isValid || !!existingUser}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link 
                href="/auth/login" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}