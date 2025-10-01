import { z } from "zod";

// Organization profile validation schema
export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters"),
  orgType: z.enum(['SME', 'Nonprofit', 'Academic', 'Healthcare', 'Other'], {
    required_error: "Please select an organization type",
  }),
  size: z.enum(['Solo', 'Micro', 'Small', 'Medium', 'Large'], {
    required_error: "Please select an organization size",
  }),
  position: z.enum(['CEO', 'Founder', 'Program Manager', 'Development Manager', 'Grant Writer', 'Operations Manager', 'Project Coordinator', 'Research Director', 'Finance Manager', 'Other'], {
    required_error: "Please select your position",
  }),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .min(2, "Please select a country")
    .max(50, "Country name must be less than 50 characters"),
  region: z
    .string()
    .max(50, "Region name must be less than 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

// Everyone is a grant seeker by default

// Preferences validation schema
export const preferencesSchema = z.object({
  categories: z
    .array(z.enum(['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING', 'AGRICULTURE_FOOD_SECURITY', 'CLIMATE_ENVIRONMENT', 'TECHNOLOGY_INNOVATION', 'WOMEN_YOUTH_EMPOWERMENT', 'ARTS_CULTURE', 'COMMUNITY_DEVELOPMENT', 'HUMAN_RIGHTS_GOVERNANCE', 'SME_BUSINESS_GROWTH']))
    .min(1, "Please select at least one category")
    .max(10, "Please select no more than 10 categories"),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

// Grant categories for preferences (matching Prisma enum)
export const grantCategories = [
  {
    id: 'HEALTHCARE_PUBLIC_HEALTH',
    label: 'Healthcare & Public Health',
    description: 'Medical research, public health initiatives, disease prevention',
    icon: 'Heart'
  },
  {
    id: 'EDUCATION_TRAINING',
    label: 'Education & Training',
    description: 'Educational programs, skill development, capacity building',
    icon: 'GraduationCap'
  },
  {
    id: 'AGRICULTURE_FOOD_SECURITY',
    label: 'Agriculture & Food Security',
    description: 'Farming innovation, food systems, nutrition programs',
    icon: 'Wheat'
  },
  {
    id: 'CLIMATE_ENVIRONMENT',
    label: 'Climate & Environment',
    description: 'Environmental protection, climate change, sustainability',
    icon: 'Leaf'
  },
  {
    id: 'TECHNOLOGY_INNOVATION',
    label: 'Technology & Innovation',
    description: 'Tech development, digital transformation, research & development',
    icon: 'Lightbulb'
  },
  {
    id: 'WOMEN_YOUTH_EMPOWERMENT',
    label: 'Women & Youth Empowerment',
    description: 'Gender equality, youth development, empowerment programs',
    icon: 'Users'
  },
  {
    id: 'ARTS_CULTURE',
    label: 'Arts & Culture',
    description: 'Cultural preservation, creative arts, heritage projects',
    icon: 'Palette'
  },
  {
    id: 'COMMUNITY_DEVELOPMENT',
    label: 'Community Development',
    description: 'Local development, infrastructure, community programs',
    icon: 'Building'
  },
  {
    id: 'HUMAN_RIGHTS_GOVERNANCE',
    label: 'Human Rights & Governance',
    description: 'Democracy, human rights, governance, civil society',
    icon: 'Scale'
  },
  {
    id: 'SME_BUSINESS_GROWTH',
    label: 'SME / Business Growth',
    description: 'Small business support, entrepreneurship, economic development',
    icon: 'TrendingUp'
  }
] as const;

// Valid category IDs for validation
export const validCategoryIds = grantCategories.map(cat => cat.id);

// Country list for dropdown
export const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark",
  "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador",
  "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "Norway", "Oman",
  "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];