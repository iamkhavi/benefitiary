'use client';

import { UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { grantCategories, type PreferencesFormData } from '@/lib/validations/onboarding';

interface PreferencesFormProps {
  onSubmit: (data: PreferencesFormData) => Promise<void>;
  selectedCategories: string[];
  isLoading: boolean;
  form: UseFormReturn<PreferencesFormData>;
}

export function PreferencesForm({ onSubmit, selectedCategories, isLoading, form }: PreferencesFormProps) {
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>
        <FormField
          control={form.control}
          name="categories"
          render={() => (
            <FormItem>
              <FormLabel 
                className="text-base font-semibold"
                id="categories-label"
              >
                Select Grant Categories (Choose at least one)
              </FormLabel>
              <fieldset 
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4"
                aria-labelledby="categories-label"
                aria-describedby="categories-help"
                role="group"
              >
                <legend className="sr-only">Grant category preferences</legend>
                <div id="categories-help" className="sr-only">
                  Select one or more grant categories that match your organization's interests and needs. You can change these preferences later in your settings.
                </div>
                {grantCategories.map((category, index) => {
                  const IconComponent = LucideIcons[category.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
                  const isSelected = selectedCategories.includes(category.id);
                  
                  return (
                    <FormField
                      key={category.id}
                      control={form.control}
                      name="categories"
                      render={({ field }) => {
                        return (
                          <FormItem key={category.id}>
                            <Card 
                              className={`cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                                isSelected 
                                  ? 'ring-2 ring-primary bg-primary/5' 
                                  : 'hover:bg-muted/50'
                              }`}
                              role="option"
                              aria-selected={isSelected}
                              tabIndex={-1}
                            >
                              <CardContent className="p-3 sm:p-4">
                                <FormControl>
                                  <div className="flex items-start space-x-2 sm:space-x-3">
                                    <Checkbox
                                      id={`category-${category.id}`}
                                      checked={field.value?.includes(category.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, category.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== category.id
                                              )
                                            );
                                      }}
                                      aria-describedby={`category-${category.id}-description`}
                                      className="mt-0.5 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start sm:items-center space-x-2 mb-1 sm:mb-2">
                                        {IconComponent && (
                                          <IconComponent 
                                            className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5 sm:mt-0" 
                                            aria-hidden="true"
                                          />
                                        )}
                                        <FormLabel 
                                          className="text-sm font-medium leading-tight sm:leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          htmlFor={`category-${category.id}`}
                                        >
                                          {category.label}
                                        </FormLabel>
                                      </div>
                                      <p 
                                        className="text-xs text-muted-foreground leading-relaxed"
                                        id={`category-${category.id}-description`}
                                      >
                                        {category.description}
                                      </p>
                                    </div>
                                  </div>
                                </FormControl>
                              </CardContent>
                            </Card>
                          </FormItem>
                        );
                      }}
                    />
                  );
                })}
              </fieldset>
              <FormMessage role="alert" aria-live="polite" />
            </FormItem>
          )}
        />

        <nav 
          className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6"
          role="navigation"
          aria-label="Form navigation"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[44px]"
            aria-label="Go back to role selection"
          >
            Back
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || selectedCategories.length === 0}
            className="w-full sm:flex-1 min-h-[44px]"
            aria-label={isLoading ? "Processing your preferences" : "Complete onboarding setup"}
          >
            {isLoading && (
              <Loader2 
                className="mr-2 h-4 w-4 animate-spin" 
                data-testid="loading-spinner"
                aria-hidden="true"
              />
            )}
            <span aria-live="polite">
              {isLoading ? "Processing..." : "Complete Setup"}
            </span>
          </Button>
        </nav>
      </form>
    </Form>
  );
}