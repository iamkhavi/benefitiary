/**
 * Classification Engine for automatically classifying and tagging grants
 * Implements rule-based and keyword-based classification with confidence scoring
 */

import { ProcessedGrantData, ClassificationResult, ClassificationModel, GrantCategory } from '../types';

interface CategoryKeywords {
  primary: string[];
  secondary: string[];
  exclusions: string[];
}

interface LocationPattern {
  pattern: RegExp;
  type: 'state' | 'country' | 'region' | 'city';
}

export class ClassificationEngine {
  private models: Map<string, ClassificationModel> = new Map();
  private categoryKeywords: Map<GrantCategory, CategoryKeywords> = new Map();
  private locationPatterns: LocationPattern[] = [];
  private organizationTypeKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeCategoryKeywords();
    this.initializeLocationPatterns();
    this.initializeOrganizationTypes();
  }

  /**
   * Main classification method that combines rule-based and keyword-based approaches
   */
  async classifyGrant(grant: ProcessedGrantData): Promise<ClassificationResult> {
    const ruleBasedResult = await this.applyRuleBasedClassification(grant);
    const keywordResult = await this.applyKeywordClassification(grant);
    
    // Combine results with weighted confidence
    const combinedResult = this.combineClassificationResults([ruleBasedResult, keywordResult]);
    
    // Generate tags based on content analysis
    const tags = await this.generateTags(grant);
    
    // Extract location eligibility
    const locationEligibility = this.extractLocationEligibility(grant);
    
    // Combine all tags and limit to 15
    const allTags = [...combinedResult.tags, ...tags].slice(0, 15);
    
    return {
      category: combinedResult.category,
      tags: allTags,
      confidence: combinedResult.confidence,
      reasoning: [
        ...combinedResult.reasoning,
        `Generated ${tags.length} content-based tags`,
        locationEligibility.length > 0 ? `Identified ${locationEligibility.length} location restrictions` : 'No specific location restrictions found'
      ]
    };
  }

  /**
   * Extract keywords from grant text using frequency analysis and domain-specific terms
   */
  private async extractKeywords(text: string): Promise<string[]> {
    if (!text) return [];

    // Clean and normalize text
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into words and filter
    const words = cleanText.split(' ')
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));

    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Extract domain-specific terms and high-frequency words
    const keywords = Array.from(wordFreq.entries())
      .filter(([word, freq]) => freq > 1 || this.isDomainSpecificTerm(word))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * Apply rule-based classification using predefined category patterns
   */
  private async applyRuleBasedClassification(grant: ProcessedGrantData): Promise<ClassificationResult> {
    const text = `${grant.title} ${grant.description}`.toLowerCase();
    const scores = new Map<GrantCategory, number>();
    const reasoning: string[] = [];

    // Score each category based on keyword matches
    for (const [category, keywords] of this.categoryKeywords.entries()) {
      let score = 0;
      let matchedKeywords: string[] = [];

      // Primary keywords (higher weight)
      for (const keyword of keywords.primary) {
        if (text.includes(keyword.toLowerCase())) {
          score += 3;
          matchedKeywords.push(keyword);
        }
      }

      // Secondary keywords (lower weight)
      for (const keyword of keywords.secondary) {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }

      // Apply exclusions (negative weight)
      for (const exclusion of keywords.exclusions) {
        if (text.includes(exclusion.toLowerCase())) {
          score -= 2;
        }
      }

      if (score > 0) {
        scores.set(category, score);
        reasoning.push(`Rule-based: ${category} matched ${matchedKeywords.length} keywords (${matchedKeywords.slice(0, 3).join(', ')})`);
      }
    }

    // Find best category
    const bestCategory = Array.from(scores.entries())
      .sort(([, a], [, b]) => b - a)[0];

    if (!bestCategory) {
      return {
        category: GrantCategory.COMMUNITY_DEVELOPMENT, // Default category
        tags: [],
        confidence: 0.3,
        reasoning: ['No strong category matches found, using default']
      };
    }

    const [category, score] = bestCategory;
    // Improved confidence calculation - normalize by a reasonable baseline rather than max possible
    const baselineScore = 3; // Expect at least one primary keyword match for good confidence
    const confidence = Math.min(score / baselineScore, 1.0);

    return {
      category,
      tags: [],
      confidence,
      reasoning
    };
  }

  /**
   * Apply keyword-based classification using extracted keywords
   */
  private async applyKeywordClassification(grant: ProcessedGrantData): Promise<ClassificationResult> {
    const keywords = await this.extractKeywords(`${grant.title} ${grant.description}`);
    const categoryScores = new Map<GrantCategory, number>();

    // Score categories based on keyword overlap
    for (const [category, categoryKeywords] of this.categoryKeywords.entries()) {
      const allCategoryKeywords = [...categoryKeywords.primary, ...categoryKeywords.secondary];
      const overlap = keywords.filter(keyword => 
        allCategoryKeywords.some(catKeyword => 
          catKeyword.toLowerCase().includes(keyword) || keyword.includes(catKeyword.toLowerCase())
        )
      );
      
      if (overlap.length > 0) {
        categoryScores.set(category, overlap.length / keywords.length);
      }
    }

    const bestMatch = Array.from(categoryScores.entries())
      .sort(([, a], [, b]) => b - a)[0];

    if (!bestMatch) {
      return {
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        tags: keywords.slice(0, 10),
        confidence: 0.2,
        reasoning: ['Keyword-based: no strong category matches found']
      };
    }

    const [category, score] = bestMatch;
    return {
      category,
      tags: keywords.slice(0, 10),
      confidence: score,
      reasoning: [`Keyword-based: ${category} matched ${Math.round(score * 100)}% of extracted keywords`]
    };
  }

  /**
   * Generate tags based on grant content analysis
   */
  private async generateTags(grant: ProcessedGrantData): Promise<string[]> {
    const tags = new Set<string>();
    const text = `${grant.title} ${grant.description}`.toLowerCase();

    // Extract funding amount tags
    if (grant.fundingAmountMin || grant.fundingAmountMax) {
      const amount = grant.fundingAmountMax || grant.fundingAmountMin || 0;
      if (amount >= 1000000) tags.add('large-grant');
      else if (amount >= 100000) tags.add('medium-grant');
      else if (amount > 0) tags.add('small-grant');
    }

    // Extract organization type tags
    for (const [orgType, keywords] of this.organizationTypeKeywords.entries()) {
      if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        tags.add(orgType);
      }
    }

    // Extract deadline urgency tags
    if (grant.deadline) {
      const daysUntilDeadline = Math.ceil((grant.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeadline <= 30) tags.add('urgent-deadline');
      else if (daysUntilDeadline <= 90) tags.add('approaching-deadline');
    }

    // Extract domain-specific tags
    const keywords = await this.extractKeywords(text);
    const domainTags = keywords.filter(keyword => this.isDomainSpecificTerm(keyword));
    domainTags.forEach(tag => tags.add(tag));

    return Array.from(tags).slice(0, 15); // Limit to 15 most relevant tags
  }

  /**
   * Extract location eligibility from grant descriptions
   */
  private extractLocationEligibility(grant: ProcessedGrantData): string[] {
    const text = `${grant.title} ${grant.description} ${grant.eligibilityCriteria}`;
    const locations = new Set<string>();

    for (const pattern of this.locationPatterns) {
      const matches = text.match(pattern.pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.replace(/[^\w\s]/g, '').trim();
          if (cleanMatch.length > 2) {
            locations.add(cleanMatch);
          }
        });
      }
    }

    return Array.from(locations).slice(0, 10);
  }

  /**
   * Combine multiple classification results with weighted confidence
   */
  private combineClassificationResults(results: ClassificationResult[]): ClassificationResult {
    if (results.length === 0) {
      return {
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        tags: [],
        confidence: 0.1,
        reasoning: ['No classification results to combine']
      };
    }

    // Weight rule-based results higher than keyword-based
    const ruleBasedWeight = 0.7;
    const keywordWeight = 0.3;
    
    const ruleBasedResult = results[0]; // First result is rule-based
    const keywordResult = results[1]; // Second result is keyword-based

    // Choose the category from the higher confidence result, but boost rule-based
    const ruleBasedScore = ruleBasedResult.confidence * ruleBasedWeight;
    const keywordScore = keywordResult.confidence * keywordWeight;
    
    const bestResult = ruleBasedScore >= keywordScore ? ruleBasedResult : keywordResult;
    
    // Combine confidence with weighted average, but boost if both agree on category
    let combinedConfidence = ruleBasedScore + keywordScore;
    if (ruleBasedResult.category === keywordResult.category) {
      combinedConfidence *= 1.2; // Boost confidence when both methods agree
    }
    
    // Cap confidence to prevent over-confidence on weak signals
    if (ruleBasedResult.confidence < 0.4 && keywordResult.confidence < 0.4) {
      combinedConfidence = Math.min(combinedConfidence, 0.5);
    }
    
    const allTags = new Set<string>();
    ruleBasedResult.tags.forEach(tag => allTags.add(tag));
    keywordResult.tags.forEach(tag => allTags.add(tag));
    
    const allReasoning = [...ruleBasedResult.reasoning, ...keywordResult.reasoning];

    return {
      category: bestResult.category,
      tags: Array.from(allTags),
      confidence: Math.min(combinedConfidence, 1.0),
      reasoning: allReasoning
    };
  }

  /**
   * Initialize category keywords for classification
   */
  private initializeCategoryKeywords(): void {
    this.categoryKeywords.set(GrantCategory.HEALTHCARE_PUBLIC_HEALTH, {
      primary: ['health', 'medical', 'healthcare', 'disease', 'treatment', 'clinical', 'hospital', 'patient', 'medicine', 'wellness'],
      secondary: ['prevention', 'therapy', 'diagnosis', 'pharmaceutical', 'nursing', 'mental health', 'public health', 'epidemiology'],
      exclusions: ['veterinary', 'animal health']
    });

    this.categoryKeywords.set(GrantCategory.EDUCATION_TRAINING, {
      primary: ['education', 'school', 'student', 'learning', 'teaching', 'curriculum', 'academic', 'university', 'college', 'training'],
      secondary: ['literacy', 'scholarship', 'educational', 'classroom', 'teacher', 'faculty', 'degree', 'certification'],
      exclusions: ['medical education', 'health education']
    });

    this.categoryKeywords.set(GrantCategory.ENVIRONMENT_SUSTAINABILITY, {
      primary: ['environment', 'climate', 'sustainability', 'conservation', 'renewable', 'green', 'ecosystem', 'biodiversity', 'pollution', 'carbon'],
      secondary: ['solar', 'wind', 'recycling', 'waste', 'energy efficiency', 'environmental protection', 'clean energy'],
      exclusions: []
    });

    this.categoryKeywords.set(GrantCategory.SOCIAL_SERVICES, {
      primary: ['social', 'community', 'poverty', 'homeless', 'welfare', 'assistance', 'support', 'services', 'vulnerable', 'disadvantaged'],
      secondary: ['food security', 'housing', 'employment', 'family services', 'elderly', 'disability', 'social work'],
      exclusions: []
    });

    this.categoryKeywords.set(GrantCategory.ARTS_CULTURE, {
      primary: ['arts', 'culture', 'museum', 'theater', 'music', 'dance', 'visual arts', 'creative', 'artistic', 'cultural'],
      secondary: ['performance', 'exhibition', 'gallery', 'heritage', 'history', 'literature', 'film', 'media arts'],
      exclusions: []
    });

    this.categoryKeywords.set(GrantCategory.TECHNOLOGY_INNOVATION, {
      primary: ['technology', 'innovation', 'digital', 'software', 'hardware', 'AI', 'artificial intelligence', 'robotics', 'automation', 'tech'],
      secondary: ['startup', 'entrepreneurship', 'R&D', 'prototype', 'development', 'engineering', 'computer science'],
      exclusions: []
    });

    this.categoryKeywords.set(GrantCategory.RESEARCH_DEVELOPMENT, {
      primary: ['research', 'development', 'study', 'investigation', 'analysis', 'scientific', 'experiment', 'discovery', 'innovation', 'R&D'],
      secondary: ['methodology', 'data', 'findings', 'publication', 'peer review', 'laboratory', 'hypothesis'],
      exclusions: []
    });

    this.categoryKeywords.set(GrantCategory.COMMUNITY_DEVELOPMENT, {
      primary: ['community development', 'neighborhood development', 'grassroots', 'civic engagement', 'municipal development', 'regional development'],
      secondary: ['community', 'development', 'local', 'infrastructure', 'economic development', 'capacity building', 'empowerment', 'engagement', 'rural', 'urban'],
      exclusions: []
    });
  }

  /**
   * Initialize location patterns for eligibility extraction
   */
  private initializeLocationPatterns(): void {
    // US States
    this.locationPatterns.push({
      pattern: /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/gi,
      type: 'state'
    });

    // US State abbreviations
    this.locationPatterns.push({
      pattern: /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g,
      type: 'state'
    });

    // Countries
    this.locationPatterns.push({
      pattern: /\b(United States|USA|US|Canada|Mexico|United Kingdom|UK|Australia|Germany|France|Japan|China|India|Brazil)\b/gi,
      type: 'country'
    });

    // Regions
    this.locationPatterns.push({
      pattern: /\b(Northeast|Southeast|Midwest|Southwest|West Coast|East Coast|Pacific Northwest|New England|Great Lakes|Gulf Coast)\b/gi,
      type: 'region'
    });

    // Major cities
    this.locationPatterns.push({
      pattern: /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|Nashville|Baltimore|Oklahoma City|Portland|Las Vegas|Louisville|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Mesa|Atlanta|Omaha|Colorado Springs|Raleigh|Miami|Oakland|Minneapolis|Tulsa|Cleveland|Wichita|Arlington|Tampa|New Orleans|Honolulu|Anaheim|Santa Ana|St. Louis|Riverside|Corpus Christi|Lexington|Pittsburgh|Anchorage|Stockton|Cincinnati|St. Paul|Toledo|Greensboro|Newark|Plano|Henderson|Lincoln|Buffalo|Jersey City|Chula Vista|Fort Wayne|Orlando|St. Petersburg|Chandler|Laredo|Norfolk|Durham|Madison|Lubbock|Irvine|Winston-Salem|Glendale|Garland|Hialeah|Reno|Chesapeake|Gilbert|Baton Rouge|Irving|Scottsdale|North Las Vegas|Fremont|Boise|Richmond|San Bernardino|Birmingham|Spokane|Rochester|Des Moines|Modesto|Fayetteville|Tacoma|Oxnard|Fontana|Columbus|Montgomery|Moreno Valley|Shreveport|Aurora|Yonkers|Akron|Huntington Beach|Little Rock|Augusta|Amarillo|Glendale|Mobile|Grand Rapids|Salt Lake City|Tallahassee|Huntsville|Grand Prairie|Knoxville|Worcester|Newport News|Brownsville|Overland Park|Santa Clarita|Providence|Garden Grove|Chattanooga|Oceanside|Jackson|Fort Lauderdale|Santa Rosa|Rancho Cucamonga|Port St. Lucie|Tempe|Ontario|Vancouver|Cape Coral|Sioux Falls|Springfield|Peoria|Pembroke Pines|Elk Grove|Salem|Lancaster|Corona|Eugene|Palmdale|Salinas|Springfield|Pasadena|Fort Collins|Hayward|Pomona|Cary|Rockford|Alexandria|Escondido|McKinney|Kansas City|Joliet|Sunnyvale|Torrance|Bridgeport|Lakewood|Hollywood|Paterson|Naperville|Syracuse|Mesquite|Dayton|Savannah|Clarksville|Orange|Pasadena|Fullerton|Killeen|Frisco|Hampton|McAllen|Warren|Bellevue|West Valley City|Columbia|Olathe|Sterling Heights|New Haven|Miramar|Waco|Thousand Oaks|Cedar Rapids|Charleston|Visalia|Topeka|Elizabeth|Gainesville|Thornton|Roseville|Carrollton|Coral Springs|Stamford|Simi Valley|Concord|Hartford|Kent|Lafayette|Midland|Surprise|Denton|Victorville|Evansville|Santa Clara|Abilene|Athens|Vallejo|Allentown|Norman|Beaumont|Independence|Murfreesboro|Ann Arbor|Fargo|Wilmington|Provo|Syracuse|Kansas City|Las Cruces|El Monte|Downey|Inglewood|Pueblo|Broken Arrow|Stockton|Anchorage|St. Petersburg|Louisville|Riverside|Bakersfield|Corpus Christi|Lexington|Anchorage|Stockton|Cincinnati|St. Paul)\b/gi,
      type: 'city'
    });
  }

  /**
   * Initialize organization type keywords
   */
  private initializeOrganizationTypes(): void {
    this.organizationTypeKeywords.set('nonprofit', ['nonprofit', 'non-profit', '501c3', 'charity', 'charitable', 'foundation', 'NGO']);
    this.organizationTypeKeywords.set('academic', ['university', 'college', 'academic', 'research institution', 'school', 'educational']);
    this.organizationTypeKeywords.set('government', ['government', 'municipal', 'state', 'federal', 'public sector', 'agency']);
    this.organizationTypeKeywords.set('small-business', ['small business', 'startup', 'entrepreneur', 'SME', 'minority-owned', 'women-owned']);
    this.organizationTypeKeywords.set('healthcare', ['hospital', 'clinic', 'medical center', 'health system', 'healthcare provider']);
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'within', 'without', 'under', 'over', 'across', 'behind', 'beyond', 'beside', 'beneath', 'inside', 'outside', 'toward', 'upon', 'within', 'without',
      'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
      'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Check if a term is domain-specific and should be included as a tag
   */
  private isDomainSpecificTerm(word: string): boolean {
    const domainTerms = new Set([
      'grant', 'funding', 'research', 'development', 'innovation', 'technology', 'healthcare', 'education', 'environment', 'sustainability', 'community', 'social', 'arts', 'culture', 'science', 'medical', 'clinical', 'academic', 'nonprofit', 'foundation', 'scholarship', 'fellowship', 'program', 'project', 'initiative', 'collaboration', 'partnership', 'capacity', 'infrastructure', 'training', 'workforce', 'economic', 'policy', 'advocacy', 'outreach', 'engagement', 'evaluation', 'assessment', 'implementation', 'dissemination', 'translation', 'commercialization', 'entrepreneurship', 'startup', 'incubator', 'accelerator', 'mentorship', 'networking', 'professional', 'career', 'leadership', 'management', 'governance', 'compliance', 'regulatory', 'ethical', 'diversity', 'inclusion', 'equity', 'accessibility', 'disability', 'minority', 'underrepresented', 'vulnerable', 'disadvantaged', 'rural', 'urban', 'suburban', 'international', 'global', 'national', 'regional', 'local', 'statewide', 'nationwide', 'worldwide'
    ]);
    return domainTerms.has(word.toLowerCase());
  }
}