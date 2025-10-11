/**
 * Deduplicator for detecting and handling duplicate grants
 * Implements content change detection and duplicate prevention
 */

import crypto from 'crypto';
import { ProcessedGrantData, ContentChangeDetection } from '../types';

export interface DuplicateMatch {
  existingGrant: ProcessedGrantData;
  newGrant: ProcessedGrantData;
  matchScore: number;
  matchReasons: string[];
}

export interface GrantComparison {
  titleSimilarity: number;
  funderMatch: boolean;
  deadlineMatch: boolean;
  amountSimilarity: number;
  overallScore: number;
}

export class ContentHasher {
  /**
   * Generate a consistent hash of grant content for change detection
   */
  generateHash(grant: ProcessedGrantData): string {
    // Create a normalized representation of the grant for hashing
    const hashableContent = {
      title: this.normalizeText(grant.title),
      description: this.normalizeText(grant.description),
      deadline: grant.deadline?.toISOString() || null,
      fundingAmountMin: grant.fundingAmountMin || null,
      fundingAmountMax: grant.fundingAmountMax || null,
      eligibilityCriteria: this.normalizeText(grant.eligibilityCriteria),
      applicationUrl: grant.applicationUrl || null,
      funderName: this.normalizeText(grant.funder.name),
      category: grant.category,
      locationEligibility: grant.locationEligibility.sort() // Sort for consistency
    };

    const contentString = JSON.stringify(hashableContent);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  /**
   * Generate a hash for duplicate detection (less sensitive to minor changes)
   */
  generateDuplicateHash(grant: ProcessedGrantData): string {
    const duplicateContent = {
      title: this.normalizeForDuplicateDetection(grant.title),
      funderName: this.normalizeForDuplicateDetection(grant.funder.name),
      deadline: grant.deadline?.toDateString() || null, // Less precise for duplicate detection
      fundingRange: this.normalizeFundingRange(grant.fundingAmountMin, grant.fundingAmountMax)
    };

    const contentString = JSON.stringify(duplicateContent);
    return crypto.createHash('md5').update(contentString).digest('hex');
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ''); // Remove punctuation for consistency
  }

  private normalizeForDuplicateDetection(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by|inc|llc|corp|foundation|fund|trust|institute|organization|org)\b/g, '') // Remove common words and org suffixes
      .replace(/\s+/g, ' ') // Clean up extra spaces after removal
      .trim();
  }

  private normalizeFundingRange(min?: number, max?: number): string {
    if (!min && !max) return 'unknown';
    if (min && max) return `${Math.floor(min / 1000)}k-${Math.floor(max / 1000)}k`;
    if (min) return `${Math.floor(min / 1000)}k+`;
    if (max) return `up-to-${Math.floor(max / 1000)}k`;
    return 'unknown';
  }
}

export class Deduplicator {
  private contentHasher: ContentHasher;

  constructor() {
    this.contentHasher = new ContentHasher();
  }

  /**
   * Detect and remove duplicates from a list of grants
   */
  async detectDuplicates(grants: ProcessedGrantData[]): Promise<ProcessedGrantData[]> {
    const uniqueGrants: ProcessedGrantData[] = [];
    const duplicateHashes = new Set<string>();

    for (const grant of grants) {
      const duplicateHash = this.contentHasher.generateDuplicateHash(grant);
      
      if (!duplicateHashes.has(duplicateHash)) {
        duplicateHashes.add(duplicateHash);
        uniqueGrants.push(grant);
      }
    }

    console.log(`Removed ${grants.length - uniqueGrants.length} duplicates from ${grants.length} grants`);
    return uniqueGrants;
  }

  /**
   * Find potential duplicates by comparing with existing grants
   */
  async findDuplicateMatches(
    newGrants: ProcessedGrantData[], 
    existingGrants: ProcessedGrantData[]
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    for (const newGrant of newGrants) {
      for (const existingGrant of existingGrants) {
        const comparison = this.compareGrants(newGrant, existingGrant);
        
        if (comparison.overallScore >= 0.8) { // 80% similarity threshold
          matches.push({
            existingGrant,
            newGrant,
            matchScore: comparison.overallScore,
            matchReasons: this.getMatchReasons(comparison)
          });
        }
      }
    }

    return matches;
  }

  /**
   * Compare two grants for similarity
   */
  private compareGrants(grant1: ProcessedGrantData, grant2: ProcessedGrantData): GrantComparison {
    const titleSimilarity = this.calculateStringSimilarity(grant1.title, grant2.title);
    const funderMatch = this.normalizeFunderName(grant1.funder.name) === this.normalizeFunderName(grant2.funder.name);
    const deadlineMatch = this.compareDates(grant1.deadline, grant2.deadline);
    const amountSimilarity = this.compareFundingAmounts(grant1, grant2);

    // Calculate weighted overall score
    const overallScore = (
      titleSimilarity * 0.4 +
      (funderMatch ? 1 : 0) * 0.3 +
      (deadlineMatch ? 1 : 0) * 0.2 +
      amountSimilarity * 0.1
    );

    return {
      titleSimilarity,
      funderMatch,
      deadlineMatch,
      amountSimilarity,
      overallScore
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeFunderName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(foundation|fund|trust|institute|organization|org|inc|llc|corp)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private compareDates(date1?: Date, date2?: Date): boolean {
    if (!date1 || !date2) return false;
    
    // Consider dates within 7 days as matching (accounts for minor deadline adjustments)
    const diffInDays = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 7;
  }

  private compareFundingAmounts(grant1: ProcessedGrantData, grant2: ProcessedGrantData): number {
    const amount1 = grant1.fundingAmountMax || grant1.fundingAmountMin || 0;
    const amount2 = grant2.fundingAmountMax || grant2.fundingAmountMin || 0;

    if (amount1 === 0 && amount2 === 0) return 1;
    if (amount1 === 0 || amount2 === 0) return 0;

    const ratio = Math.min(amount1, amount2) / Math.max(amount1, amount2);
    return ratio;
  }

  private getMatchReasons(comparison: GrantComparison): string[] {
    const reasons: string[] = [];

    if (comparison.titleSimilarity >= 0.8) {
      reasons.push(`High title similarity (${Math.round(comparison.titleSimilarity * 100)}%)`);
    }
    if (comparison.funderMatch) {
      reasons.push('Same funder');
    }
    if (comparison.deadlineMatch) {
      reasons.push('Similar deadline');
    }
    if (comparison.amountSimilarity >= 0.8) {
      reasons.push(`Similar funding amount (${Math.round(comparison.amountSimilarity * 100)}%)`);
    }

    return reasons;
  }

  /**
   * Generate content hash for change detection
   */
  async generateContentHash(grant: ProcessedGrantData): Promise<string> {
    return this.contentHasher.generateHash(grant);
  }

  /**
   * Compare hashes to detect content changes
   */
  async compareHashes(
    grantId: string,
    previousHash: string, 
    currentHash: string,
    oldGrant?: ProcessedGrantData,
    newGrant?: ProcessedGrantData
  ): Promise<ContentChangeDetection | null> {
    if (previousHash === currentHash) {
      return null; // No changes detected
    }

    const changedFields = oldGrant && newGrant 
      ? await this.identifyChangedFields(oldGrant, newGrant)
      : [];

    const changeType = this.determineChangeType(changedFields);

    return {
      grantId,
      previousHash,
      currentHash,
      changedFields,
      changeType,
      detectedAt: new Date()
    };
  }

  /**
   * Identify which fields have changed between two grants
   */
  async identifyChangedFields(oldGrant: ProcessedGrantData, newGrant: ProcessedGrantData): Promise<string[]> {
    const changedFields: string[] = [];

    // Compare each field
    if (oldGrant.title !== newGrant.title) changedFields.push('title');
    if (oldGrant.description !== newGrant.description) changedFields.push('description');
    if (oldGrant.deadline?.getTime() !== newGrant.deadline?.getTime()) changedFields.push('deadline');
    if (oldGrant.fundingAmountMin !== newGrant.fundingAmountMin) changedFields.push('fundingAmountMin');
    if (oldGrant.fundingAmountMax !== newGrant.fundingAmountMax) changedFields.push('fundingAmountMax');
    if (oldGrant.eligibilityCriteria !== newGrant.eligibilityCriteria) changedFields.push('eligibilityCriteria');
    if (oldGrant.applicationUrl !== newGrant.applicationUrl) changedFields.push('applicationUrl');
    if (oldGrant.funder.name !== newGrant.funder.name) changedFields.push('funder');
    if (oldGrant.category !== newGrant.category) changedFields.push('category');
    
    // Compare arrays
    if (JSON.stringify(oldGrant.locationEligibility.sort()) !== JSON.stringify(newGrant.locationEligibility.sort())) {
      changedFields.push('locationEligibility');
    }

    return changedFields;
  }

  private determineChangeType(changedFields: string[]): 'minor' | 'major' | 'critical' {
    const criticalFields = ['deadline', 'fundingAmountMin', 'fundingAmountMax', 'applicationUrl'];
    const majorFields = ['title', 'eligibilityCriteria', 'category', 'funder'];

    if (changedFields.some(field => criticalFields.includes(field))) {
      return 'critical';
    }
    if (changedFields.some(field => majorFields.includes(field))) {
      return 'major';
    }
    return 'minor';
  }

  /**
   * Intelligently merge duplicate grants from multiple sources
   */
  async mergeGrantData(existingGrant: ProcessedGrantData, newGrant: ProcessedGrantData): Promise<ProcessedGrantData> {
    // Prioritize more complete and recent data
    const merged: ProcessedGrantData = {
      ...existingGrant,
      // Use the most complete title (longer usually means more descriptive)
      title: newGrant.title.length > existingGrant.title.length ? newGrant.title : existingGrant.title,
      
      // Use the most complete description
      description: newGrant.description.length > existingGrant.description.length 
        ? newGrant.description 
        : existingGrant.description,
      
      // Use the most recent deadline if different
      deadline: this.selectBestDeadline(existingGrant.deadline, newGrant.deadline),
      
      // Use the highest funding amounts (more generous interpretation)
      fundingAmountMin: Math.max(existingGrant.fundingAmountMin || 0, newGrant.fundingAmountMin || 0) || undefined,
      fundingAmountMax: Math.max(existingGrant.fundingAmountMax || 0, newGrant.fundingAmountMax || 0) || undefined,
      
      // Merge eligibility criteria
      eligibilityCriteria: this.mergeEligibilityCriteria(existingGrant.eligibilityCriteria, newGrant.eligibilityCriteria),
      
      // Prefer application URL from more authoritative source
      applicationUrl: this.selectBestApplicationUrl(existingGrant.applicationUrl, newGrant.applicationUrl, existingGrant.funder, newGrant.funder),
      
      // Keep funder with more complete information
      funder: this.mergeFunderData(existingGrant.funder, newGrant.funder),
      
      // Use higher confidence category
      category: existingGrant.confidenceScore >= newGrant.confidenceScore ? existingGrant.category : newGrant.category,
      
      // Merge location eligibility
      locationEligibility: [...new Set([...existingGrant.locationEligibility, ...newGrant.locationEligibility])],
      
      // Use higher confidence score
      confidenceScore: Math.max(existingGrant.confidenceScore, newGrant.confidenceScore),
      
      // Generate new content hash for merged data (will be set after merge is complete)
      contentHash: 'temp-hash'
    };

    // Generate the correct content hash for the merged data
    merged.contentHash = this.contentHasher.generateHash(merged);

    return merged;
  }

  private selectBestDeadline(existing?: Date, new_?: Date): Date | undefined {
    if (!existing && !new_) return undefined;
    if (!existing) return new_;
    if (!new_) return existing;
    
    // Prefer the later deadline (more time to apply)
    return existing > new_ ? existing : new_;
  }

  private mergeEligibilityCriteria(existing: string, new_: string): string {
    if (existing.length >= new_.length) return existing;
    return new_;
  }

  private selectBestApplicationUrl(
    existingUrl?: string, 
    newUrl?: string, 
    existingFunder?: any, 
    newFunder?: any
  ): string | undefined {
    if (!existingUrl && !newUrl) return undefined;
    if (!existingUrl) return newUrl;
    if (!newUrl) return existingUrl;
    
    // Prefer URLs from government sources
    if (existingFunder?.type === 'GOV' && newFunder?.type !== 'GOV') return existingUrl;
    if (newFunder?.type === 'GOV' && existingFunder?.type !== 'GOV') return newUrl;
    
    // Prefer shorter URLs (usually more direct)
    return existingUrl.length <= newUrl.length ? existingUrl : newUrl;
  }

  private mergeFunderData(existing: any, new_: any): any {
    return {
      name: existing.name.length >= new_.name.length ? existing.name : new_.name,
      website: existing.website || new_.website,
      contactEmail: existing.contactEmail || new_.contactEmail,
      type: existing.type
    };
  }
}