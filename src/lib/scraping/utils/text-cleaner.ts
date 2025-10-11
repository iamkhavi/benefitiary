/**
 * Text cleaning and normalization utilities for scraped content
 * Provides comprehensive text processing for grant data extraction
 */

export interface TextCleaningOptions {
  removeHtmlEntities?: boolean;
  normalizeWhitespace?: boolean;
  removeBullets?: boolean;
  removeEllipsis?: boolean;
  trimWhitespace?: boolean;
  removeEmptyLines?: boolean;
  maxLength?: number;
}

export class TextCleaner {
  private static readonly DEFAULT_OPTIONS: Required<TextCleaningOptions> = {
    removeHtmlEntities: true,
    normalizeWhitespace: true,
    removeBullets: true,
    removeEllipsis: true,
    trimWhitespace: true,
    removeEmptyLines: true,
    maxLength: 10000
  };

  /**
   * Clean and normalize text content with configurable options
   */
  static cleanText(text: string, options: TextCleaningOptions = {}): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let cleaned = text;

    // Remove HTML artifacts first
    cleaned = this.removeHtmlArtifacts(cleaned);

    // Remove HTML entities
    if (opts.removeHtmlEntities) {
      cleaned = this.removeHtmlEntities(cleaned);
    }

    // Remove bullets and list markers BEFORE normalizing whitespace to preserve line structure
    if (opts.removeBullets) {
      cleaned = this.removeBullets(cleaned);
    }

    // Normalize whitespace
    if (opts.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Remove trailing ellipsis
    if (opts.removeEllipsis) {
      cleaned = this.removeEllipsis(cleaned);
    }

    // Remove empty lines
    if (opts.removeEmptyLines) {
      cleaned = this.removeEmptyLines(cleaned);
    }

    // Trim whitespace
    if (opts.trimWhitespace) {
      cleaned = cleaned.trim();
    }

    // Truncate if too long
    if (opts.maxLength && cleaned.length > opts.maxLength) {
      cleaned = cleaned.substring(0, opts.maxLength).trim() + '...';
    }

    return cleaned;
  }

  /**
   * Remove HTML entities and decode common character references
   */
  private static removeHtmlEntities(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&apos;/g, "'")
      .replace(/&cent;/g, '¢')
      .replace(/&pound;/g, '£')
      .replace(/&yen;/g, '¥')
      .replace(/&euro;/g, '€')
      .replace(/&copy;/g, '©')
      .replace(/&reg;/g, '®')
      .replace(/&trade;/g, '™')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&lsquo;/g, '\u2018')
      .replace(/&rsquo;/g, '\u2019')
      .replace(/&ldquo;/g, '\u201C')
      .replace(/&rdquo;/g, '\u201D')
      // Handle numeric character references
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  /**
   * Normalize whitespace characters and remove excessive spacing
   */
  private static normalizeWhitespace(text: string): string {
    return text
      // Replace various whitespace characters with regular spaces
      .replace(/[\t\n\r\f\v]/g, ' ')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  }

  /**
   * Remove bullet points and list markers from the beginning of text
   */
  private static removeBullets(text: string): string {
    return text
      // Split into lines, process each line, then rejoin
      .split('\n')
      .map(line => line
        // Remove common bullet characters at start of line
        .replace(/^\s*[•·▪▫‣⁃]\s*/, '')
        .replace(/^\s*[-*+]\s*/, '')
        // Remove numbered list markers
        .replace(/^\s*\d+\.\s*/, '')
        .replace(/^\s*\d+\)\s*/, '')
        // Remove lettered list markers
        .replace(/^\s*[a-zA-Z]\.\s*/, '')
        .replace(/^\s*[a-zA-Z]\)\s*/, '')
      )
      .join(' ')
      // Remove HTML bullet entities
      .replace(/&bull;\s*/g, '');
  }

  /**
   * Remove trailing ellipsis and similar truncation indicators
   */
  private static removeEllipsis(text: string): string {
    return text
      .replace(/\s*\.{3,}\s*$/g, '')
      .replace(/\s*…\s*$/g, '')
      .replace(/\s*\[\.{3}\]\s*$/g, '')
      .replace(/\s*\(continued\)\s*$/gi, '')
      .replace(/\s*\(more\)\s*$/gi, '')
      .replace(/\s*read more\s*$/gi, '');
  }

  /**
   * Remove empty lines and excessive line breaks
   */
  private static removeEmptyLines(text: string): string {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // Limit to maximum 2 consecutive line breaks
  }

  /**
   * Extract and clean funding amounts from text
   */
  static extractFundingAmount(text: string): { min?: number; max?: number; currency?: string } | null {
    if (!text) return null;

    const cleaned = text.toLowerCase().replace(/[,\s]/g, '');
    
    // Common currency symbols and codes
    const currencyPattern = /(\$|€|£|¥|usd|eur|gbp|jpy)/i;
    const currency = text.match(currencyPattern)?.[1] || '$';

    // Pattern for ranges like "$100,000 - $500,000" or "$100K to $500K"
    const rangePattern = /([€£¥\$]?[\d,]+(?:\.\d{1,2})?(?:k|m|b)?)\s*(?:[-–—]|to)\s*([€£¥\$]?[\d,]+(?:\.\d{1,2})?(?:k|m|b)?)/i;
    const rangeMatch = text.match(rangePattern);

    if (rangeMatch) {
      const min = this.parseAmount(rangeMatch[1]);
      const max = this.parseAmount(rangeMatch[2]);
      return { min, max, currency };
    }

    // Pattern for single amounts like "$100,000" or "up to $500K"
    const singlePattern = /(?:up\s+to\s+)?([€£¥\$]?[\d,]+(?:\.\d{1,2})?(?:k|m|b)?)/i;
    const singleMatch = text.match(singlePattern);

    if (singleMatch) {
      const amount = this.parseAmount(singleMatch[1]);
      return text.toLowerCase().includes('up to') 
        ? { max: amount, currency }
        : { min: amount, max: amount, currency };
    }

    return null;
  }

  /**
   * Parse amount string to number, handling K, M, B suffixes
   */
  private static parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[\$€£¥,\s]/g, '').toLowerCase();
    const numMatch = cleaned.match(/^([\d.]+)([kmb])?$/);
    
    if (!numMatch) return 0;

    const baseAmount = parseFloat(numMatch[1]);
    const suffix = numMatch[2];

    switch (suffix) {
      case 'k': return baseAmount * 1000;
      case 'm': return baseAmount * 1000000;
      case 'b': return baseAmount * 1000000000;
      default: return baseAmount;
    }
  }

  /**
   * Extract and normalize deadline dates from text
   */
  static extractDeadline(text: string): Date | null {
    if (!text) return null;

    // Common date patterns
    const patterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      // DD/MM/YYYY or DD-MM-YYYY (European format)
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      // YYYY-MM-DD (ISO format)
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      // Month DD, YYYY
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i,
      // DD Month YYYY
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extract location eligibility information from text
   */
  static extractLocationEligibility(text: string): string[] {
    if (!text) return [];

    const locations: string[] = [];
    const lowerText = text.toLowerCase();

    // Common location patterns
    const patterns = [
      // US states (abbreviated and full names)
      /\b(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/gi,
      /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/gi,
      // Countries
      /\b(united states|usa|us|canada|mexico|united kingdom|uk|australia|germany|france|japan|china|india|brazil)\b/gi,
      // Regions
      /\b(north america|south america|europe|asia|africa|oceania|middle east)\b/gi,
      // Special eligibility terms
      /\b(nationwide|international|global|worldwide|domestic|local)\b/gi
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        locations.push(...matches.map(match => match.trim()));
      }
    });

    // Remove duplicates and return
    return [...new Set(locations)];
  }

  /**
   * Calculate text quality score based on various factors
   */
  static calculateQualityScore(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    let score = 0;
    const length = text.length;

    // Length score (optimal range: 100-2000 characters)
    if (length >= 100 && length <= 2000) {
      score += 30;
    } else if (length >= 50 && length < 100) {
      score += 20;
    } else if (length > 2000 && length <= 5000) {
      score += 20;
    } else if (length < 50) {
      score += 10;
    }

    // Sentence structure score
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) score += 20;
    if (sentences.length >= 5) score += 10;

    // Word variety score
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const varietyRatio = uniqueWords.size / words.length;
    if (varietyRatio > 0.7) score += 20;
    else if (varietyRatio > 0.5) score += 15;
    else if (varietyRatio > 0.3) score += 10;

    // Completeness indicators
    if (text.includes('$') || text.includes('funding') || text.includes('grant')) score += 10;
    if (text.match(/\d{4}/)) score += 5; // Likely contains a year/date
    if (text.includes('deadline') || text.includes('due') || text.includes('apply')) score += 5;

    // Penalty for common issues
    if (text.includes('...') || text.includes('read more')) score -= 10;
    if (text.length < 20) score -= 20;
    if (text.match(/[^\w\s.,!?;:()\-'"$%]/g)) score -= 5; // Special characters

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Remove common HTML artifacts that might remain after parsing
   */
  static removeHtmlArtifacts(text: string): string {
    return text
      // Remove script and style content first (before removing tags)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML tags that might have been missed
      .replace(/<[^>]*>/g, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove common web artifacts
      .replace(/\bjavascript:\s*void\(0\)/gi, '')
      .replace(/\bdata-[a-z-]+="[^"]*"/gi, '')
      .replace(/\bclass="[^"]*"/gi, '')
      .replace(/\bid="[^"]*"/gi, '')
      // Remove excessive punctuation
      .replace(/[.]{4,}/g, '...')
      .replace(/[-]{3,}/g, '--')
      .replace(/[=]{3,}/g, '');
  }
}