# Requirements Document

## Introduction

The User Onboarding Wizard is a foundational feature that guides new users through account creation, organization setup, role selection, and preference configuration. This feature creates the first impression of Benefitiary and ensures users are properly configured to receive relevant grant opportunities based on their organization type, size, location, and interests. The wizard integrates with BetterAuth for authentication and DodoPayments for subscription management, while maintaining a modern, clean UI consistent with the platform's design standards.

## Requirements

### Requirement 1

**User Story:** As a new visitor to Benefitiary, I want to see an attractive landing page that clearly explains the platform's value proposition, so that I understand how it can help my organization find grants.

#### Acceptance Criteria

1. WHEN a user visits the landing page THEN the system SHALL display a modern, clean interface using TailwindCSS and shadcn/ui components
2. WHEN a user views the landing page THEN the system SHALL present clear value propositions for SMEs, nonprofits, and healthcare organizations
3. WHEN a user views the landing page THEN the system SHALL display prominent sign-up and login buttons
4. WHEN a user views the landing page THEN the system SHALL use Inter or Source Sans fonts and Lucide React icons for consistency
5. WHEN a user views the landing page THEN the system SHALL avoid blue-heavy gradients and maintain clean, modern aesthetics

### Requirement 2

**User Story:** As a new user, I want to create an account securely and efficiently, so that I can access the platform's grant discovery features.

#### Acceptance Criteria

1. WHEN a user clicks sign-up THEN the system SHALL present BetterAuth authentication components
2. WHEN a user completes registration THEN the system SHALL create a user record with email, password hash, and default role
3. WHEN a user registers THEN the system SHALL automatically create a DodoPayments customer record
4. WHEN a user completes authentication THEN the system SHALL redirect them to the onboarding wizard
5. WHEN a user provides invalid credentials THEN the system SHALL display clear error messages

### Requirement 3

**User Story:** As a new user, I want to provide my organization's profile information, so that the platform can match me with relevant grant opportunities.

#### Acceptance Criteria

1. WHEN a user reaches Step 1 of onboarding THEN the system SHALL display organization profile form fields
2. WHEN a user selects organization type THEN the system SHALL provide options: SME, Nonprofit/NGO, Academic, Healthcare, Other
3. WHEN a user selects organization size THEN the system SHALL provide options: Solo, Micro, Small, Medium, Large
4. WHEN a user selects location THEN the system SHALL provide country dropdown and optional region field
5. WHEN a user completes Step 1 THEN the system SHALL validate all required fields before proceeding
6. WHEN a user submits organization profile THEN the system SHALL store data in the organizations table

### Requirement 4

**User Story:** As a new user, I want to select my role on the platform, so that I receive a customized experience based on how I plan to use Benefitiary.

#### Acceptance Criteria

1. WHEN a user reaches Step 2 of onboarding THEN the system SHALL display role selection options
2. WHEN a user views role options THEN the system SHALL present Seeker, Writer, and Funder with clear descriptions
3. WHEN a user selects Seeker THEN the system SHALL explain this role finds grants for their organization
4. WHEN a user selects Writer THEN the system SHALL explain this role offers proposal writing services
5. WHEN a user selects Funder THEN the system SHALL explain this role posts grant opportunities
6. WHEN a user selects a role THEN the system SHALL update the user record with the chosen role

### Requirement 5

**User Story:** As a new user, I want to specify my grant category preferences, so that the platform can prioritize showing me the most relevant opportunities.

#### Acceptance Criteria

1. WHEN a user reaches Step 3 of onboarding THEN the system SHALL display grant category multi-select options
2. WHEN a user views categories THEN the system SHALL present: Healthcare & Public Health, Education & Training, Agriculture & Food Security, Climate & Environment, Technology & Innovation, Women & Youth Empowerment, Arts & Culture, Community Development, Human Rights & Governance, SME / Business Growth
3. WHEN a user selects categories THEN the system SHALL allow multiple selections
4. WHEN a user completes category selection THEN the system SHALL store preferences in user_preferences table
5. WHEN a user submits preferences THEN the system SHALL validate at least one category is selected

### Requirement 6

**User Story:** As a user who completes onboarding, I want to be directed to a role-appropriate dashboard, so that I can immediately start using the platform's features.

#### Acceptance Criteria

1. WHEN a user completes all onboarding steps THEN the system SHALL redirect based on their selected role
2. WHEN a Seeker completes onboarding THEN the system SHALL redirect to the seeker dashboard showing matched grants
3. WHEN a Writer completes onboarding THEN the system SHALL redirect to the writer dashboard showing potential clients
4. WHEN a Funder completes onboarding THEN the system SHALL redirect to the funder dashboard for managing grant postings
5. WHEN redirection occurs THEN the system SHALL display a welcome message appropriate to the user's role

### Requirement 7

**User Story:** As a user progressing through onboarding, I want to see my progress and be able to navigate between steps, so that I have control over the process and understand how much remains.

#### Acceptance Criteria

1. WHEN a user is in the onboarding wizard THEN the system SHALL display a progress indicator showing current step and total steps
2. WHEN a user is on Step 2 or 3 THEN the system SHALL provide a back button to return to previous steps
3. WHEN a user navigates back THEN the system SHALL preserve previously entered data
4. WHEN a user is on any step THEN the system SHALL clearly indicate which step they are currently on
5. WHEN a user attempts to skip required fields THEN the system SHALL prevent progression and highlight missing information

### Requirement 8

**User Story:** As a user with accessibility needs, I want the onboarding process to be fully accessible, so that I can complete registration regardless of my abilities.

#### Acceptance Criteria

1. WHEN a user navigates with keyboard THEN the system SHALL support full keyboard navigation through all onboarding steps
2. WHEN a user uses screen readers THEN the system SHALL provide appropriate ARIA labels and descriptions
3. WHEN a user has visual impairments THEN the system SHALL maintain sufficient color contrast ratios
4. WHEN a user requires larger text THEN the system SHALL support browser zoom up to 200% without breaking layout
5. WHEN form validation occurs THEN the system SHALL announce errors to screen readers