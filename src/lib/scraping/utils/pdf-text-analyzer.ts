/**
 * Advanced text analysis utilities for PDF processing
 * Provides sophisticated pattern matching and content extraction
 */

export interface TextPattern {
  name: string;
  pattern: RegExp;
  confidence: number;
  extractor: (match: RegExpMatchArray, fullText: string) => string | null;
}

export interface AnalysisResult {
  field: string;
  value: string;
  confidence: number;
  source: string; // Which pattern matched
}

export class PDFTextAnalyzer {
  private titlePatterns: TextPattern[] = [
    {
      name: 'grant_title_header',
      pattern: /^([A-Z\s]{10,100})\s*$/m,
      confidence: 0.9,
      extractor: (match) => match[1].trim()
    },
    {
      name: 'rfp_title',
      pattern: /(?:request for proposals?|rfp)[:\s]*([^\n]{10,100})/i,
      confidence: 0.85,
      extractor: (match) => match[1].trim()
    },
    {
      name: 'grant_program_title',
      pattern: /(?:grant program|funding opportunity)[:\s]*([^\n]{10,100})/i,
      confidence: 0.8,
      extractor: (match) => match[1].trim()
    },
    {
      name: 'opportunity_title',
      pattern: /(?:opportunity|program)[:\s]*([^\n]{10,100})/i,
      confidence: 0.7,
      extractor: (match) => match[1].trim()
    }
  ];

  private deadlinePatterns: TextPattern[] = [
    {
      name: 'explicit_deadline',
      pattern: /(?:deadline|due date|application due|submit by)[:\s]*([^\n]{5,50})/i,
      confidence: 0.95,
      extractor: (match) => this.cleanDateString(match[1])
    },
    {
      name: 'proposals_due',
      pattern: /(?:proposals?|applications?)\s+(?:are\s+)?due[:\s]*([^\n]{5,50})/i,
      confidence: 0.9,
      extractor: (match) => this.cleanDateString(match[1])
    },
    {
      name: 'submission_deadline',
      pattern: /(?:submission|submit)[:\s]*([^\n]*?)(?:by|before|on)\s+([^\n]{5,50})/i,
      confidence: 0.85,
      extractor: (match) => this.cleanDateString(match[2])
    },
    {
      name: 'date_pattern',
      pattern: /(\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i,
      confidence: 0.7,
      extractor: (match) => this.cleanDateString(match[1])
    },
    {
      name: 'numeric_date',
      pattern: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/,
      confidence: 0.8,
      extractor: (match) => this.cleanDateString(match[1])
    }
  ];

  private fundingPatterns: TextPattern[] = [
    {
      name: 'funding_range',
      pattern: /(?:funding|award|grant)[:\s]*\$?([\d,]+)(?:\.\d{2})?\s*(?:to|-)\s*\$?([\d,]+)(?:\.\d{2})?/i,
      confidence: 0.95,
      extractor: (match) => `$${match[1]} - $${match[2]}`
    },
    {
      name: 'up_to_amount',
      pattern: /(?:up to|maximum of|not to exceed)\s*\$?([\d,]+)(?:\.\d{2})?/i,
      confidence: 0.9,
      extractor: (match) => `$${match[1]}`
    },
    {
      name: 'award_amount',
      pattern: /(?:award|grant)\s+amount[:\s]*\$?([\d,]+)(?:\.\d{2})?/i,
      confidence: 0.85,
      extractor: (match) => `$${match[1]}`
    },
    {
      name: 'funding_available',
      pattern: /(?:funding|budget)\s+available[:\s]*\$?([\d,]+)(?:\.\d{2})?/i,
      confidence: 0.8,
      extractor: (match) => `$${match[1]}`
    },
    {
      name: 'dollar_amount',
      pattern: /\$\s?([\d,]+)(?:\.\d{2})?(?:\s+(?:per|each|total))?/,
      confidence: 0.6,
      extractor: (match) => `$${match[1]}`
    }
  ];

  private eligibilityPatterns: TextPattern[] = [
    {
      name: 'eligibility_section',
      pattern: /(?:eligibility|eligible)[:\s]+((?:[^\n]+\n?){1,10}?)(?:\n\n|[A-Z]{3,})/i,
      confidence: 0.9,
      extractor: (match) => this.cleanEligibilityText(match[1])
    },
    {
      name: 'requirements_section',
      pattern: /(?:requirements|criteria)[:\s]+((?:[^\n]+\n?){1,10}?)(?:\n\n|[A-Z]{3,})/i,
      confidence: 0.85,
      extractor: (match) => this.cleanEligibilityText(match[1])
    },
    {
      name: 'applicant_must',
      pattern: /(?:applicants?|organizations?)\s+must[:\s]+((?:[^\n]+\n?){1,5})/i,
      confidence: 0.8,
      extractor: (match) => this.cleanEligibilityText(match[1])
    },
    {
      name: 'nonprofit_requirement',
      pattern: /(501\(c\)\(3\)[^\n]*)/i,
      confidence: 0.95,
      extractor: (match) => match[1].trim()
    }
  ];

  private descriptionPatterns: TextPattern[] = [
    {
      name: 'program_overview',
      pattern: /(?:program overview|overview|description)[:\s]+((?:[^\n]+\n?){2,15}?)(?:\n\n|[A-Z]{3,})/i,
      confidence: 0.9,
      extractor: (match) => this.cleanDescriptionText(match[1])
    },
    {
      name: 'program_description',
      pattern: /(?:program description|description)[:\s]+((?:[^\n]+\n?){2,15}?)(?:\n\n|[A-Z]{3,})/i,
      confidence: 0.85,
      extractor: (match) => this.cleanDescriptionText(match[1])
    },
    {
      name: 'summary_section',
      pattern: /(?:summary|purpose)[:\s]+((?:[^\n]+\n?){2,10}?)(?:\n\n|[A-Z]{3,})/i,
      confidence: 0.8,
      extractor: (match) => this.cleanDescriptionText(match[1])
    }
  ];

  private urlPatterns: TextPattern[] = [
    {
      name: 'application_portal',
      pattern: /(https?:\/\/[^\s]+(?:apply|application|portal|submit)[^\s]*)/i,
      confidence: 0.95,
      extractor: (match) => match[1]
    },
    {
      name: 'grant_website',
      pattern: /(https?:\/\/[^\s]+(?:grant|funding)[^\s]*)/i,
      confidence: 0.8,
      extractor: (match) => match[1]
    },
    {
      name: 'general_url',
      pattern: /(https?:\/\/[^\s]+)/,
      confidence: 0.6,
      extractor: (match) => match[1]
    }
  ];

  analyzeTitle(text: string): AnalysisResult[] {
    return this.analyzeWithPatterns(text, this.titlePatterns, 'title');
  }

  analyzeDeadline(text: string): AnalysisResult[] {
    return this.analyzeWithPatterns(text, this.deadlinePatterns, 'deadline');
  }

  analyzeFunding(text: string): AnalysisResult[] {
    return this.analyzeWithPatterns(text, this.fundingPatterns, 'funding');
  }

  analyzeEligibility(text: string): AnalysisResult[] {
    return this.analyzeWithPatterns(text, this.eligibilityPatterns, 'eligibility');
  }

  analyzeDescription(text: string): AnalysisResult[] {
    return this.analyzeWithPatterns(text, this.descriptionPatterns, 'description');
  }

  analyzeUrls(text: string): AnalysisResult[] {
    return this.analyzeWithPatterns(text, this.urlPatterns, 'url');
  }

  analyzeAll(text: string): Record<string, AnalysisResult[]> {
    return {
      title: this.analyzeTitle(text),
      deadline: this.analyzeDeadline(text),
      funding: this.analyzeFunding(text),
      eligibility: this.analyzeEligibility(text),
      description: this.analyzeDescription(text),
      urls: this.analyzeUrls(text)
    };
  }

  getBestMatch(results: AnalysisResult[]): AnalysisResult | null {
    if (results.length === 0) return null;
    
    // Sort by confidence and return the best match
    return results.sort((a, b) => b.confidence - a.confidence)[0];
  }

  private analyzeWithPatterns(
    text: string, 
    patterns: TextPattern[], 
    field: string
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    for (const pattern of patterns) {
      const matches = text.matchAll(new RegExp(pattern.pattern.source, pattern.pattern.flags + 'g'));
      
      for (const match of matches) {
        const value = pattern.extractor(match, text);
        if (value && value.trim()) {
          results.push({
            field,
            value: value.trim(),
            confidence: pattern.confidence,
            source: pattern.name
          });
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueResults = this.removeDuplicates(results);
    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }

  private removeDuplicates(results: AnalysisResult[]): AnalysisResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.field}:${result.value.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private cleanDateString(dateStr: string): string {
    return dateStr
      .replace(/[^\w\s,\/\-]/g, '') // Remove special chars except date separators
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanEligibilityText(text: string): string {
    return text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[•\-\*]\s*/g, '') // Remove bullet points
      .trim()
      .substring(0, 500); // Limit length
  }

  private cleanDescriptionText(text: string): string {
    return text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Advanced analysis methods
  detectGrantType(text: string): string[] {
    const types: string[] = [];
    const lowerText = text.toLowerCase();

    const typeKeywords = {
      'research': ['research', 'study', 'investigation', 'scientific'],
      'education': ['education', 'school', 'student', 'learning', 'academic'],
      'health': ['health', 'medical', 'healthcare', 'clinical', 'patient'],
      'community': ['community', 'social', 'neighborhood', 'local'],
      'environment': ['environment', 'climate', 'sustainability', 'green'],
      'arts': ['arts', 'culture', 'creative', 'artistic', 'cultural'],
      'technology': ['technology', 'innovation', 'digital', 'tech', 'software']
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        types.push(type);
      }
    }

    return types;
  }

  extractContactInfo(text: string): { emails: string[]; phones: string[]; websites: string[] } {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const websitePattern = /(?:www\.|https?:\/\/)[^\s]+/g;

    return {
      emails: Array.from(text.matchAll(emailPattern)).map(m => m[0]),
      phones: Array.from(text.matchAll(phonePattern)).map(m => m[0]),
      websites: Array.from(text.matchAll(websitePattern)).map(m => m[0])
    };
  }

  calculateTextQuality(text: string): number {
    if (!text || text.length < 10) return 0;

    let score = 0.5; // Base score

    // Length factor (optimal around 500-2000 characters)
    const length = text.length;
    if (length >= 100 && length <= 3000) {
      score += 0.2;
    }

    // Word count factor
    const words = text.split(/\s+/).length;
    if (words >= 20 && words <= 500) {
      score += 0.1;
    }

    // Sentence structure
    const sentences = text.split(/[.!?]+/).length;
    if (sentences >= 3 && sentences <= 50) {
      score += 0.1;
    }

    // Grant-specific keywords
    const grantKeywords = [
      'grant', 'funding', 'award', 'application', 'deadline', 
      'eligibility', 'proposal', 'budget', 'project'
    ];
    const keywordCount = grantKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    score += Math.min(keywordCount * 0.05, 0.2);

    // Penalize excessive special characters or formatting artifacts
    const specialCharRatio = (text.match(/[^\w\s.,!?;:()\-]/g) || []).length / text.length;
    if (specialCharRatio > 0.1) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
    // Simple key phrase extraction based on frequency and grant relevance
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 
      'did', 'she', 'use', 'way', 'will', 'with', 'this', 'that', 'have', 
      'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time',
      'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many',
      'over', 'such', 'take', 'than', 'them', 'well', 'were'
    ]);

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (!stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Boost grant-related terms
    const grantTerms = [
      'grant', 'funding', 'award', 'research', 'project', 'program', 
      'application', 'proposal', 'deadline', 'eligibility', 'budget'
    ];
    
    grantTerms.forEach(term => {
      if (wordFreq.has(term)) {
        wordFreq.set(term, wordFreq.get(term)! * 2);
      }
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([word]) => word);
  }
}