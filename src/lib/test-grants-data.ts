// Test data for grants - this would normally come from the database
export const testGrants = [
  {
    id: "grant_gates_health_2025",
    title: "Maternal Health Innovation Challenge 2025",
    description: "Supporting breakthrough innovations to reduce maternal mortality in Sub-Saharan Africa and South Asia. Focus on scalable, evidence-based interventions that can be implemented at the community level.",
    eligibilityCriteria: "Non-profit organizations, academic institutions, and social enterprises working in maternal health. Must have demonstrated experience in target regions.",
    deadline: new Date("2025-04-15"),
    fundingAmountMin: 100000,
    fundingAmountMax: 750000,
    category: "HEALTHCARE_PUBLIC_HEALTH",
    locationEligibility: ["Sub-Saharan Africa", "South Asia", "Kenya", "Nigeria", "India", "Bangladesh"],
    applicationUrl: "https://www.gatesfoundation.org/maternal-health-challenge",
    applicantType: "NGO, Academic Institution, Social Enterprise",
    fundingType: "GRANT",
    durationMonths: 24,
    requiredDocuments: [
      "Project proposal (max 10 pages)",
      "Budget breakdown",
      "Team CVs",
      "Letters of support from local partners",
      "Evidence of previous work in maternal health"
    ],
    evaluationCriteria: [
      "Innovation and potential for breakthrough impact",
      "Evidence-based approach and methodology",
      "Scalability and sustainability potential",
      "Team expertise and track record",
      "Community engagement and local partnerships"
    ],
    programGoals: [
      "Reduce maternal mortality rates by 25% in target communities",
      "Develop scalable interventions for resource-limited settings",
      "Build local capacity for maternal health care",
      "Generate evidence for policy recommendations"
    ],
    expectedOutcomes: [
      "Improved access to quality maternal health services",
      "Reduced complications during pregnancy and childbirth",
      "Strengthened health systems in target regions",
      "Increased community awareness of maternal health issues"
    ],
    contactEmail: "maternalhealth@gatesfoundation.org",
    status: "ACTIVE",
    funder: {
      id: "funder_gates",
      name: "Gates Foundation",
      logoUrl: "https://www.gatesfoundation.org/-/media/gfo/2how-we-work/2logos/gates-foundation-logo.png",
      type: "PRIVATE_FOUNDATION",
      website: "https://www.gatesfoundation.org",
      contactEmail: "info@gatesfoundation.org"
    }
  },
  {
    id: "grant_mastercard_youth_2025",
    title: "Young Africa Works Initiative",
    description: "Creating economic opportunities for young people in Africa through skills development, entrepreneurship support, and job creation programs. Focus on digital skills and green economy sectors.",
    eligibilityCriteria: "Organizations working with youth aged 18-35 in Africa. Must demonstrate ability to deliver skills training and employment outcomes.",
    deadline: new Date("2025-02-28"),
    fundingAmountMin: 25000,
    fundingAmountMax: 1000000,
    category: "WOMEN_YOUTH_EMPOWERMENT",
    locationEligibility: ["Africa", "Kenya", "Nigeria", "Ghana", "Rwanda", "Uganda", "Tanzania"],
    applicationUrl: "https://mastercardfdn.org/young-africa-works",
    applicantType: "NGO, Training Institution, Social Enterprise",
    fundingType: "GRANT",
    durationMonths: 36,
    requiredDocuments: [
      "Program design document",
      "Budget and financial projections",
      "Partnership agreements",
      "Impact measurement framework",
      "Organizational capacity assessment"
    ],
    evaluationCriteria: [
      "Potential for youth employment outcomes",
      "Innovation in skills development approach",
      "Sustainability and scalability",
      "Partnership strength and local engagement",
      "Alignment with labor market needs"
    ],
    programGoals: [
      "Train 10,000 young people in digital and green skills",
      "Create 5,000 new employment opportunities",
      "Support 1,000 youth-led enterprises",
      "Build partnerships with 100 employers"
    ],
    expectedOutcomes: [
      "Increased youth employment rates",
      "Enhanced digital and entrepreneurial skills",
      "Stronger connections between youth and employers",
      "Sustainable income generation for participants"
    ],
    contactEmail: "youthworks@mastercardfdn.org",
    status: "ACTIVE",
    funder: {
      id: "funder_mastercard",
      name: "Mastercard Foundation",
      logoUrl: "https://mastercardfdn.org/wp-content/uploads/2019/04/MC_Foundation_Logo_Pos_RGB.png",
      type: "PRIVATE_FOUNDATION",
      website: "https://mastercardfdn.org",
      contactEmail: "info@mastercardfdn.org"
    }
  },
  {
    id: "grant_gcf_climate_2025",
    title: "Climate Resilience for Smallholder Farmers",
    description: "Building climate resilience among smallholder farmers through innovative agricultural practices, technology solutions, and climate-smart infrastructure development.",
    eligibilityCriteria: "Agricultural organizations, research institutions, and NGOs with proven experience in climate adaptation and smallholder farmer support.",
    deadline: new Date("2025-04-30"),
    fundingAmountMin: 100000,
    fundingAmountMax: 2000000,
    category: "CLIMATE_ENVIRONMENT",
    locationEligibility: ["Global South", "Sub-Saharan Africa", "South Asia", "Latin America"],
    applicationUrl: "https://www.greenclimate.fund/smallholder-resilience",
    applicantType: "NGO, Research Institution, Agricultural Cooperative",
    fundingType: "GRANT",
    durationMonths: 48,
    requiredDocuments: [
      "Climate vulnerability assessment",
      "Technical implementation plan",
      "Environmental and social safeguards",
      "Farmer engagement strategy",
      "Monitoring and evaluation framework"
    ],
    evaluationCriteria: [
      "Climate impact and adaptation potential",
      "Farmer-centered approach and participation",
      "Technical feasibility and innovation",
      "Environmental and social co-benefits",
      "Long-term sustainability and replication"
    ],
    programGoals: [
      "Increase climate resilience of 50,000 smallholder farmers",
      "Implement climate-smart agricultural practices",
      "Develop early warning systems for climate risks",
      "Build local capacity for climate adaptation"
    ],
    expectedOutcomes: [
      "Improved crop yields despite climate variability",
      "Reduced vulnerability to climate shocks",
      "Enhanced food security for farming communities",
      "Increased adoption of sustainable farming practices"
    ],
    contactEmail: "adaptation@greenclimate.fund",
    status: "ACTIVE",
    funder: {
      id: "funder_gcf",
      name: "Green Climate Fund",
      logoUrl: "https://www.greenclimate.fund/themes/custom/gcf/logo.svg",
      type: "MULTILATERAL",
      website: "https://www.greenclimate.fund",
      contactEmail: "info@greenclimate.fund"
    }
  }
];

// Mock API response for testing
export const mockGrantsResponse = {
  success: true,
  grants: testGrants,
  pagination: {
    page: 1,
    limit: 20,
    total: testGrants.length,
    pages: 1
  }
};