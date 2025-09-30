/**
 * Utility to detect organization information from email addresses
 * This will be used during OAuth signup to pre-populate organization data
 */

interface OrganizationInfo {
  name: string;
  type: 'nonprofit' | 'healthcare' | 'public_health' | 'sme' | 'other';
  isWorkEmail: boolean;
  domain: string;
}

// Common work email domains that indicate business/organization emails
const WORK_EMAIL_DOMAINS = new Set([
  // Generic business domains
  'company.com', 'corp.com', 'inc.com', 'ltd.com', 'llc.com',
  // Healthcare domains
  'hospital.org', 'clinic.org', 'health.org', 'medical.org',
  // Nonprofit domains
  'ngo.org', 'nonprofit.org', 'foundation.org', 'charity.org',
  // Government domains
  'gov', 'gov.uk', 'gov.au', 'gov.ca', 'state.gov',
  // Education domains (often nonprofits)
  'edu', 'ac.uk', 'edu.au', 'university.edu',
]);

// Common personal email providers
const PERSONAL_EMAIL_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
  'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
  'yandex.com', 'zoho.com'
]);

// Healthcare-related domain patterns
const HEALTHCARE_PATTERNS = [
  /hospital/i, /clinic/i, /health/i, /medical/i, /pharma/i,
  /medicine/i, /care/i, /wellness/i, /therapy/i
];

// Nonprofit-related domain patterns
const NONPROFIT_PATTERNS = [
  /foundation/i, /charity/i, /nonprofit/i, /ngo/i, /org$/i,
  /relief/i, /aid/i, /support/i, /community/i
];

// Government/public health patterns
const PUBLIC_HEALTH_PATTERNS = [
  /gov/i, /public/i, /municipal/i, /county/i, /state/i,
  /federal/i, /department/i, /ministry/i
];

/**
 * Extracts organization information from an email address
 */
export function detectOrganizationFromEmail(email: string): OrganizationInfo {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return {
      name: 'Personal Account',
      type: 'other',
      isWorkEmail: false,
      domain: ''
    };
  }

  const isPersonalEmail = PERSONAL_EMAIL_PROVIDERS.has(domain);
  const isKnownWorkDomain = WORK_EMAIL_DOMAINS.has(domain);
  
  // If it's a personal email provider, create a generic organization
  if (isPersonalEmail) {
    return {
      name: `${email.split('@')[0]}'s Organization`,
      type: 'other',
      isWorkEmail: false,
      domain
    };
  }

  // Extract organization name from domain
  const organizationName = formatDomainAsOrganizationName(domain);
  
  // Determine organization type based on domain patterns
  // Check in order of specificity: public health first, then healthcare, then nonprofit
  let organizationType: OrganizationInfo['type'] = 'sme'; // Default to SME
  
  if (PUBLIC_HEALTH_PATTERNS.some(pattern => pattern.test(domain))) {
    organizationType = 'public_health';
  } else if (NONPROFIT_PATTERNS.some(pattern => pattern.test(domain))) {
    organizationType = 'nonprofit';
  } else if (HEALTHCARE_PATTERNS.some(pattern => pattern.test(domain))) {
    organizationType = 'healthcare';
  }

  return {
    name: organizationName,
    type: organizationType,
    isWorkEmail: true,
    domain
  };
}

/**
 * Formats a domain name into a readable organization name
 */
function formatDomainAsOrganizationName(domain: string): string {
  // Remove common TLDs and subdomains
  let name = domain
    .replace(/\.(com|org|net|edu|gov|co\.uk|ac\.uk)$/i, '')
    .replace(/^www\./, '');
  
  // Split by dots and take the main part
  const parts = name.split('.');
  name = parts[0];
  
  // Convert to title case and handle common abbreviations
  name = name
    .split(/[-_]/)
    .map(word => {
      // Handle common abbreviations
      const upperWord = word.toUpperCase();
      if (['LLC', 'INC', 'LTD', 'CORP', 'NGO', 'NHS'].includes(upperWord)) {
        return upperWord;
      }
      // Regular title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return name;
}

/**
 * Gets suggested organization size based on domain patterns
 */
export function suggestOrganizationSize(domain: string): 'startup' | 'small_business' | 'medium_business' | 'large_enterprise' | 'ngo' {
  // This is a basic heuristic - in a real app you might use a company database API
  if (NONPROFIT_PATTERNS.some(pattern => pattern.test(domain))) {
    return 'ngo';
  }
  
  // Default to small business for work emails, startup for personal
  return PERSONAL_EMAIL_PROVIDERS.has(domain) ? 'startup' : 'small_business';
}

/**
 * Extracts country from email domain (basic implementation)
 */
export function suggestCountryFromDomain(domain: string): string {
  const countryTlds: Record<string, string> = {
    'co.uk': 'United Kingdom',
    'ac.uk': 'United Kingdom', 
    'gov.uk': 'United Kingdom',
    'com.au': 'Australia',
    'edu.au': 'Australia',
    'gov.au': 'Australia',
    'ca': 'Canada',
    'gov.ca': 'Canada',
    'de': 'Germany',
    'fr': 'France',
    'nl': 'Netherlands',
    'se': 'Sweden',
    'no': 'Norway',
    'dk': 'Denmark',
    'fi': 'Finland',
  };
  
  for (const [tld, country] of Object.entries(countryTlds)) {
    if (domain.endsWith(tld)) {
      return country;
    }
  }
  
  return 'United States'; // Default
}