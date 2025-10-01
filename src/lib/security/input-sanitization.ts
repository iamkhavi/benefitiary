import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Input sanitization utilities for security
 */

// HTML sanitization for text inputs
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

// SQL injection prevention - basic string sanitization
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 1000); // Limit length to prevent buffer overflow
}

// Email sanitization
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254); // RFC 5321 limit
}

// Organization name sanitization
export function sanitizeOrganizationName(name: string): string {
  return name
    .replace(/[<>'"&]/g, '') // Remove HTML/XML special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 100);
}

// Country/region sanitization
export function sanitizeLocation(location: string): string {
  return location
    .replace(/[<>'"&]/g, '')
    .replace(/[0-9]/g, '') // Remove numbers from location names
    .trim()
    .slice(0, 50);
}

// Website URL sanitization
export function sanitizeWebsiteUrl(url: string): string {
  return url
    .trim()
    .slice(0, 255) // Reasonable URL length limit
    .replace(/[<>'"]/g, ''); // Remove potentially dangerous characters
}

// Enhanced validation schemas with sanitization
export const sanitizedOrganizationSchema = z.object({
  name: z
    .string()
    .transform(sanitizeOrganizationName)
    .refine((val) => val.length >= 2, "Organization name must be at least 2 characters")
    .refine((val) => val.length <= 100, "Organization name must be less than 100 characters")
    .refine((val) => !/^\s*$/.test(val), "Organization name cannot be empty or whitespace only"),
  orgType: z.enum(['SME', 'Nonprofit', 'Academic', 'Healthcare', 'Other']),
  size: z.enum(['Solo', 'Micro', 'Small', 'Medium', 'Large']),
  position: z.enum(['CEO', 'Founder', 'Program Manager', 'Development Manager', 'Grant Writer', 'Operations Manager', 'Project Coordinator', 'Research Director', 'Finance Manager', 'Other']),
  website: z
    .string()
    .transform(sanitizeWebsiteUrl)
    .refine((val) => !val || val.startsWith('http'), "Website must be a valid URL starting with http:// or https://")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .transform(sanitizeLocation)
    .refine((val) => val.length >= 2, "Please select a valid country")
    .refine((val) => val.length <= 50, "Country name is too long"),
  region: z
    .string()
    .transform(sanitizeLocation)
    .refine((val) => val.length <= 50, "Region name is too long")
    .optional()
    .or(z.literal("")),
});

export const sanitizedRoleSchema = z.object({
  role: z.enum(['seeker', 'writer', 'funder']),
});

export const sanitizedPreferencesSchema = z.object({
  categories: z
    .array(z.enum([
      'HEALTHCARE_PUBLIC_HEALTH',
      'EDUCATION_TRAINING', 
      'AGRICULTURE_FOOD_SECURITY',
      'CLIMATE_ENVIRONMENT',
      'TECHNOLOGY_INNOVATION',
      'WOMEN_YOUTH_EMPOWERMENT',
      'ARTS_CULTURE',
      'COMMUNITY_DEVELOPMENT',
      'HUMAN_RIGHTS_GOVERNANCE',
      'SME_BUSINESS_GROWTH'
    ]))
    .min(1, "Please select at least one category")
    .max(10, "Please select no more than 10 categories")
    .refine((categories) => {
      // Ensure no duplicates
      return new Set(categories).size === categories.length;
    }, "Duplicate categories are not allowed"),
});

// Request body size validation
export function validateRequestSize(body: any, maxSizeKB: number = 10): boolean {
  const bodySize = JSON.stringify(body).length;
  const maxSizeBytes = maxSizeKB * 1024;
  return bodySize <= maxSizeBytes;
}

// IP address validation for rate limiting
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// User agent validation
export function validateUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.length > 500) return false;
  
  // Block known bot patterns that shouldn't access onboarding
  const blockedPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i,
  ];
  
  return !blockedPatterns.some(pattern => pattern.test(userAgent));
}