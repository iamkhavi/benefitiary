# Design Document

## Overview

The User Onboarding Wizard is a multi-step progressive web application that guides users from initial landing page visit through account creation, organization setup, role selection, and preference configuration. Built with Next.js 14 App Router and React Server Components, it integrates BetterAuth for authentication and DodoPayments for customer creation, while maintaining a consistent modern UI using TailwindCSS and shadcn/ui components.

## Architecture

### High-Level Flow
```
Landing Page → Auth (Sign Up/Login) → Step 1: Organization → Step 2: Role → Step 3: Preferences → Role-Based Dashboard
```

### Component Structure
```
app/
├── page.tsx (Landing Page)
├── auth/
│   ├── signup/page.tsx
│   └── login/page.tsx
├── onboarding/
│   ├── layout.tsx (Progress indicator wrapper)
│   ├── organization/page.tsx (Step 1)
│   ├── role/page.tsx (Step 2)
│   └── preferences/page.tsx (Step 3)
└── dashboard/
    ├── seeker/page.tsx
    ├── writer/page.tsx
    └── funder/page.tsx
```

### State Management
- **Server Components**: For initial page loads and data fetching
- **Client Components**: For interactive forms and progress tracking
- **React Query**: For API calls and caching user data during onboarding
- **Local Storage**: For preserving form data between steps (fallback)

## Components and Interfaces

### Core Components

#### LandingPage Component
```typescript
interface LandingPageProps {
  features: FeatureHighlight[];
  testimonials: Testimonial[];
}

interface FeatureHighlight {
  title: string;
  description: string;
  icon: LucideIcon;
  targetAudience: 'sme' | 'nonprofit' | 'healthcare';
}
```

#### OnboardingLayout Component
```typescript
interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
}

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}
```

#### OrganizationProfileForm Component
```typescript
interface OrganizationFormData {
  name: string;
  orgType: 'SME' | 'Nonprofit' | 'Academic' | 'Healthcare' | 'Other';
  size: 'Solo' | 'Micro' | 'Small' | 'Medium' | 'Large';
  country: string;
  region?: string;
}

interface OrganizationProfileFormProps {
  onSubmit: (data: OrganizationFormData) => Promise<void>;
  initialData?: Partial<OrganizationFormData>;
  isLoading: boolean;
}
```

#### RoleSelectionForm Component
```typescript
interface RoleOption {
  value: 'seeker' | 'writer' | 'funder';
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

interface RoleSelectionFormProps {
  onSubmit: (role: string) => Promise<void>;
  selectedRole?: string;
  isLoading: boolean;
}
```

#### PreferencesForm Component
```typescript
interface GrantCategory {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface PreferencesFormProps {
  categories: GrantCategory[];
  onSubmit: (selectedCategories: string[]) => Promise<void>;
  selectedCategories: string[];
  isLoading: boolean;
}
```

### API Interfaces

#### Authentication API
```typescript
// Using BetterAuth client
interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

interface SignUpResponse {
  user: User;
  session: Session;
  redirectTo: string;
}
```

#### Onboarding API
```typescript
// POST /api/onboarding/organization
interface CreateOrganizationRequest {
  name: string;
  orgType: string;
  size: string;
  country: string;
  region?: string;
}

// PATCH /api/users/role
interface UpdateUserRoleRequest {
  role: 'seeker' | 'writer' | 'funder';
}

// POST /api/users/preferences
interface CreatePreferencesRequest {
  categories: string[];
}
```

## Data Models

### Database Schema Integration

#### Users Table Extensions
```sql
-- Extends existing users table from BetterAuth
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN onboarding_step INTEGER DEFAULT 0;
```

#### Organizations Table
```sql
-- Maps to existing schema from steering file
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT CHECK (industry IN ('nonprofit','healthcare','public_health','sme','other')) NOT NULL,
    size TEXT CHECK (size IN ('startup','small_business','medium_business','large_enterprise','ngo')) NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### User Preferences Table
```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    categories TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Form Validation Schema (Zod)
```typescript
const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  orgType: z.enum(['SME', 'Nonprofit', 'Academic', 'Healthcare', 'Other']),
  size: z.enum(['Solo', 'Micro', 'Small', 'Medium', 'Large']),
  country: z.string().min(2, "Please select a country"),
  region: z.string().optional()
});

const roleSchema = z.object({
  role: z.enum(['seeker', 'writer', 'funder'])
});

const preferencesSchema = z.object({
  categories: z.array(z.string()).min(1, "Please select at least one category")
});
```

## Error Handling

### Client-Side Error Handling
- **Form Validation**: Real-time validation with Zod schemas
- **Network Errors**: Retry mechanisms with exponential backoff
- **Session Errors**: Automatic redirect to login if session expires
- **Progress Loss**: Auto-save form data to localStorage every 30 seconds

### Server-Side Error Handling
```typescript
// API route error responses
interface APIError {
  error: string;
  code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'DATABASE_ERROR' | 'EXTERNAL_API_ERROR';
  details?: Record<string, string>;
}

// Error boundary for onboarding flow
class OnboardingErrorBoundary extends React.Component {
  // Handles React errors and provides fallback UI
  // Logs errors to monitoring service
  // Provides "Start Over" option
}
```

### BetterAuth Integration Error Handling
- **Registration Conflicts**: Handle duplicate email gracefully
- **DodoPayments Failures**: Retry customer creation, fallback to manual setup
- **Session Management**: Handle concurrent sessions and device switching

## Testing Strategy

### Unit Testing
- **Component Testing**: React Testing Library for all form components
- **Validation Testing**: Comprehensive Zod schema validation tests
- **API Testing**: Mock API responses for all onboarding endpoints
- **Utility Testing**: Form data persistence and progress tracking

### Integration Testing
- **Authentication Flow**: End-to-end BetterAuth integration
- **Database Operations**: Test organization and preference creation
- **DodoPayments Integration**: Test customer creation workflow
- **Multi-Step Flow**: Test complete onboarding journey

### End-to-End Testing
- **Happy Path**: Complete onboarding for each role type
- **Error Scenarios**: Network failures, validation errors, session expiry
- **Accessibility Testing**: Keyboard navigation, screen reader compatibility
- **Cross-Browser Testing**: Chrome, Firefox, Safari, Edge

### Performance Testing
- **Page Load Times**: Target <2s for each onboarding step
- **Form Responsiveness**: <100ms for validation feedback
- **Image Optimization**: Lazy loading for non-critical assets
- **Bundle Size**: Monitor JavaScript bundle size impact

## UI/UX Design Specifications

### Design System Integration
- **Colors**: Use shadcn/ui default palette, avoid blue-heavy gradients
- **Typography**: Inter font family, consistent heading hierarchy
- **Spacing**: 8px grid system using Tailwind spacing classes
- **Components**: shadcn/ui Button, Input, Select, Checkbox, Progress components

### Responsive Design
- **Mobile First**: Design for 375px minimum width
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Targets**: Minimum 44px for interactive elements
- **Form Layout**: Single column on mobile, optimized spacing on desktop

### Accessibility Features
- **ARIA Labels**: Comprehensive labeling for form controls
- **Focus Management**: Logical tab order, visible focus indicators
- **Color Contrast**: WCAG AA compliance (4.5:1 ratio minimum)
- **Screen Reader**: Semantic HTML, proper heading structure
- **Keyboard Navigation**: Full functionality without mouse

### Animation and Transitions
- **Page Transitions**: Smooth slide animations between steps
- **Loading States**: Skeleton loaders for form submissions
- **Progress Feedback**: Animated progress bar updates
- **Micro-interactions**: Hover states, button press feedback

## Security Considerations

### Data Protection
- **Input Sanitization**: Server-side validation and sanitization
- **CSRF Protection**: Built-in Next.js CSRF protection
- **Rate Limiting**: Prevent abuse of registration endpoints
- **Data Encryption**: Sensitive data encrypted at rest

### Authentication Security
- **Password Requirements**: Minimum 8 characters, complexity rules
- **Session Management**: Secure session tokens, proper expiration
- **Account Verification**: Email verification before full access
- **Brute Force Protection**: Account lockout after failed attempts

### Privacy Compliance
- **Data Minimization**: Collect only necessary information
- **Consent Management**: Clear privacy policy acceptance
- **Data Retention**: Defined retention periods for user data
- **Right to Deletion**: Support for account deletion requests