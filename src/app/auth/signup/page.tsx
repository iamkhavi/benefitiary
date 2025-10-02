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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";
import { Loader2, AlertCircle, Info, ArrowRight } from "lucide-react";
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

      // Redirect to dashboard (onboarding dialog will show automatically)
      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Join Benefitiary
          </CardTitle>
          <CardDescription className="text-gray-600">
            Discover grant opportunities tailored for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {existingUser && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                An account with this email already exists. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600 font-medium ml-1"
                  onClick={handleSignInInstead}
                >
                  Sign in instead →
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                {...register("name")}
                disabled={isLoading}
                className={`transition-all ${errors.name ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                onBlur={handleEmailBlur}
                disabled={isLoading}
                className={`transition-all ${errors.email ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password (min. 8 characters)"
                {...register("password")}
                disabled={isLoading}
                className={`transition-all ${errors.password ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                disabled={isLoading}
                className={`transition-all ${errors.confirmPassword ? "border-red-500 focus:border-red-500" : "focus:border-blue-500"}`}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 transition-all duration-200 shadow-lg hover:shadow-xl" 
              disabled={isLoading || !isValid || !!existingUser}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-4">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                Privacy Policy
              </Link>
            </p>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
            
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth/login">
                Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}