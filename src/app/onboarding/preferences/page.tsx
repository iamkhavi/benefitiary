'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { preferencesSchema, type PreferencesFormData } from '@/lib/validations/onboarding';
import { PreferencesForm } from '@/components/onboarding/preferences-form';

export default function PreferencesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      categories: [],
    },
  });

  const onSubmit = async (data: PreferencesFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/onboarding/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      // Redirect to app subdomain dashboard
      window.location.href = 'https://app.benefitiary.com/';
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-xl sm:text-2xl">Grant Preferences</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Select the grant categories that interest you most. This helps us show you the most relevant opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {error && (
            <div className="mb-4 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <PreferencesForm
            onSubmit={onSubmit}
            selectedCategories={form.watch('categories')}
            isLoading={isLoading}
            form={form}
          />
        </CardContent>
      </Card>
    </div>
  );
}