/**
 * DeduplicationEngine - Handles grant deduplication logic at database level
 * with conflict resolution and intelligent merging
 */

import { PrismaClient, Grant } from '@prisma/client';
import { ProcessedGrantData, ScrapedSourceType } from '../types';
import { ContentHasher } from './content-hasher';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  action: 'insert' | 'update' | 'skip';
  existingGrantId?: string;
  confidence: number;
  reason: string;
  conflictFields?: string[];
}

export interface DuplicateMatch {
  grantId: string;
  matchType: 'exact' | 'title' | 'content' | 'fuzzy';
  confidence: number;
  matchedFields: string[];
}

export interface MergeStrategy {
  field: string;
  strategy: 'keep_existing' | 'use_new' | 'merge' | 'prefer_authoritative';
  priority?: number;
}

export class DeduplicationEngine {
  private prisma: PrismaClient;
  private contentHasher: ContentHasher;
  private mergeStrategies!: Map<string, MergeStrategy>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.contentHasher = new ContentHasher();
    this.initializeMergeStrategies();
  }

  /**
   * Initialize default merge strategies for different fields
   */
  private initializeMergeStrategies(): void {
    this.mergeStrategies = new Map([
      ['title', { field: 'title', strategy: 'prefer_authoritative', priority: 1 }],
      ['description', { field: 'description', strategy: 'use_new', priority: 2 }],
      ['deadline', { field: 'deadline', strategy: 'use_new', priority: 1 }],
      ['fundingAmountMin', { field: 'fundingAmountMin', strategy: 'use_new', priority: 1 }],
      ['fundingAmountMax', { field: 'fundingAmountMax', strategy: 'use_new', priority: 1 }],
      ['eligibilityCriteria', { field: 'eligibilityCriteria', strategy: 'merge', priority: 2 }],
      ['applicationUrl', { field: 'applicationUrl', strategy: 'prefer_authoritative', priority: 1 }],
      ['category', { field: 'category', strategy: 'keep_existing', priority: 3 }],
      ['locationEligibility', { field: 'locationEligibility', strategy: 'merge', priority: 2 }]
    ]);
  }

  /**
   * Check for duplicates and determine appropriate action
   */
  async checkForDuplicates(
    grant: ProcessedGrantData,
    tx?: any
  ): Promise<DuplicateCheckResult> {
    const client = tx || this.prisma;

    // Step 1: Check for exact content hash match
    const exactMatch = await this.findExactMatch(grant, client);
    if (exactMatch) {
      return {
        isDuplicate: true,
        action: 'skip',
        existingGrantId: exactMatch.grantId,
        confidence: 1.0,
        reason: 'Exact content hash match found'
      };
    }

    // Step 2: Check for title and funder match
    const titleMatch = await this.findTitleMatch(grant, client);
    if (titleMatch) {
      // Determine if we should update or skip based on content differences
      const shouldUpdate = await this.shouldUpdateExistingGrant(
        titleMatch.grantId,
        grant,
        client
      );

      return {
        isDuplicate: true,
        action: shouldUpdate ? 'update' : 'skip',
        existingGrantId: titleMatch.grantId,
        confidence: titleMatch.confidence,
        reason: shouldUpdate 
          ? 'Title match found with content differences - updating'
          : 'Title match found with minimal differences - skipping'
      };
    }

    // Step 3: Check for fuzzy matches (similar titles, same funder)
    const fuzzyMatch = await this.findFuzzyMatch(grant, client);
    if (fuzzyMatch && fuzzyMatch.confidence > 0.8) {
      return {
        isDuplicate: true,
        action: 'skip', // High confidence fuzzy matches are likely duplicates
        existingGrantId: fuzzyMatch.grantId,
        confidence: fuzzyMatch.confidence,
        reason: `High confidence fuzzy match (${fuzzyMatch.confidence.toFixed(2)})`
      };
    }

    // Step 4: No duplicates found
    return {
      isDuplicate: false,
      action: 'insert',
      confidence: 0.0,
      reason: 'No duplicates found'
    };
  }

  /**
   * Find exact content hash matches
   */
  private async findExactMatch(
    grant: ProcessedGrantData,
    client: any
  ): Promise<DuplicateMatch | null> {
    const contentHash = this.contentHasher.generateHash(grant);

    const existingGrant = await client.grant.findFirst({
      where: {
        contentHash: contentHash,
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    if (existingGrant) {
      return {
        grantId: existingGrant.id,
        matchType: 'exact',
        confidence: 1.0,
        matchedFields: ['contentHash']
      };
    }

    return null;
  }

  /**
   * Find grants with matching title and funder
   */
  private async findTitleMatch(
    grant: ProcessedGrantData,
    client: any
  ): Promise<DuplicateMatch | null> {
    // Normalize title for comparison
    const normalizedTitle = this.normalizeTitle(grant.title);

    const existingGrants = await client.grant.findMany({
      where: {
        title: {
          contains: normalizedTitle,
          mode: 'insensitive'
        },
        status: 'ACTIVE',
        funder: {
          name: {
            contains: grant.funder.name,
            mode: 'insensitive'
          }
        }
      },
      select: {
        id: true,
        title: true,
        funder: { select: { name: true } }
      },
      take: 5 // Limit to prevent performance issues
    });

    // Calculate similarity scores
    for (const existingGrant of existingGrants) {
      const titleSimilarity = this.calculateTitleSimilarity(
        grant.title,
        existingGrant.title
      );

      const funderSimilarity = this.calculateFunderSimilarity(
        grant.funder.name,
        existingGrant.funder?.name || ''
      );

      const overallConfidence = (titleSimilarity * 0.7) + (funderSimilarity * 0.3);

      if (overallConfidence > 0.85) {
        return {
          grantId: existingGrant.id,
          matchType: 'title',
          confidence: overallConfidence,
          matchedFields: ['title', 'funder']
        };
      }
    }

    return null;
  }

  /**
   * Find fuzzy matches using various similarity algorithms
   */
  private async findFuzzyMatch(
    grant: ProcessedGrantData,
    client: any
  ): Promise<DuplicateMatch | null> {
    // Use database full-text search for initial filtering
    const candidates = await client.grant.findMany({
      where: {
        OR: [
          {
            title: {
              search: this.extractKeywords(grant.title).join(' | ')
            }
          },
          {
            description: {
              search: this.extractKeywords(grant.description).join(' | ')
            }
          }
        ],
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        fundingAmountMin: true,
        fundingAmountMax: true,
        funder: { select: { name: true } }
      },
      take: 10
    });

    let bestMatch: DuplicateMatch | null = null;
    let highestConfidence = 0;

    for (const candidate of candidates) {
      const confidence = this.calculateOverallSimilarity(grant, candidate);

      if (confidence > highestConfidence && confidence > 0.6) {
        highestConfidence = confidence;
        bestMatch = {
          grantId: candidate.id,
          matchType: 'fuzzy',
          confidence,
          matchedFields: this.identifyMatchedFields(grant, candidate)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Determine if an existing grant should be updated with new data
   */
  private async shouldUpdateExistingGrant(
    existingGrantId: string,
    newGrant: ProcessedGrantData,
    client: any
  ): Promise<boolean> {
    const existingGrant = await client.grant.findUnique({
      where: { id: existingGrantId },
      include: { funder: true }
    });

    if (!existingGrant) return false;

    // Convert existing grant to ProcessedGrantData format for comparison
    const existingProcessedGrant: ProcessedGrantData = {
      title: existingGrant.title,
      description: existingGrant.description || '',
      deadline: existingGrant.deadline,
      fundingAmountMin: existingGrant.fundingAmountMin ? Number(existingGrant.fundingAmountMin) : undefined,
      fundingAmountMax: existingGrant.fundingAmountMax ? Number(existingGrant.fundingAmountMax) : undefined,
      eligibilityCriteria: existingGrant.eligibilityCriteria || '',
      applicationUrl: existingGrant.applicationUrl,
      category: existingGrant.category as any,
      locationEligibility: Array.isArray(existingGrant.locationEligibility) 
        ? existingGrant.locationEligibility as string[]
        : [],
      confidenceScore: Number(existingGrant.confidenceScore) || 0,
      contentHash: existingGrant.contentHash || '',
      funder: {
        name: existingGrant.funder?.name || '',
        website: existingGrant.funder?.website,
        contactEmail: existingGrant.funder?.contactEmail,
        type: ScrapedSourceType.FOUNDATION // Default type
      }
    };

    // Check if there are meaningful differences
    const changedFields = this.contentHasher.identifyChangedFields(
      existingProcessedGrant,
      newGrant
    );

    // Update if there are critical or major changes
    const criticalFields = ['deadline', 'fundingAmountMin', 'fundingAmountMax', 'eligibilityCriteria'];
    const majorFields = ['description', 'applicationUrl'];

    const hasCriticalChanges = changedFields.some(field => criticalFields.includes(field));
    const hasMajorChanges = changedFields.some(field => majorFields.includes(field));

    return hasCriticalChanges || hasMajorChanges;
  }

  /**
   * Calculate title similarity using Levenshtein distance
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const normalized1 = this.normalizeTitle(title1);
    const normalized2 = this.normalizeTitle(title2);

    if (normalized1 === normalized2) return 1.0;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    return 1 - (distance / maxLength);
  }

  /**
   * Calculate funder name similarity
   */
  private calculateFunderSimilarity(funder1: string, funder2: string): number {
    const normalized1 = funder1.toLowerCase().trim();
    const normalized2 = funder2.toLowerCase().trim();

    if (normalized1 === normalized2) return 1.0;

    // Check for substring matches (common for foundation names)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return 0.9;
    }

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    return 1 - (distance / maxLength);
  }

  /**
   * Calculate overall similarity between two grants
   */
  private calculateOverallSimilarity(
    grant1: ProcessedGrantData,
    grant2: any
  ): number {
    const titleSim = this.calculateTitleSimilarity(grant1.title, grant2.title);
    const funderSim = this.calculateFunderSimilarity(
      grant1.funder.name,
      grant2.funder?.name || ''
    );

    // Check deadline similarity (within 7 days)
    let deadlineSim = 0;
    if (grant1.deadline && grant2.deadline) {
      const daysDiff = Math.abs(
        (grant1.deadline.getTime() - new Date(grant2.deadline).getTime()) / (1000 * 60 * 60 * 24)
      );
      deadlineSim = daysDiff <= 7 ? 1.0 : Math.max(0, 1 - (daysDiff / 30));
    }

    // Check funding amount similarity
    let fundingSim = 0;
    if (grant1.fundingAmountMin && grant2.fundingAmountMin) {
      const amount1 = grant1.fundingAmountMin;
      const amount2 = Number(grant2.fundingAmountMin);
      const diff = Math.abs(amount1 - amount2);
      const avg = (amount1 + amount2) / 2;
      fundingSim = Math.max(0, 1 - (diff / avg));
    }

    // Weighted average
    const weights = {
      title: 0.4,
      funder: 0.3,
      deadline: 0.2,
      funding: 0.1
    };

    return (
      titleSim * weights.title +
      funderSim * weights.funder +
      deadlineSim * weights.deadline +
      fundingSim * weights.funding
    );
  }

  /**
   * Identify which fields matched between two grants
   */
  private identifyMatchedFields(grant1: ProcessedGrantData, grant2: any): string[] {
    const matchedFields: string[] = [];

    if (this.calculateTitleSimilarity(grant1.title, grant2.title) > 0.8) {
      matchedFields.push('title');
    }

    if (this.calculateFunderSimilarity(grant1.funder.name, grant2.funder?.name || '') > 0.8) {
      matchedFields.push('funder');
    }

    if (grant1.deadline && grant2.deadline) {
      const daysDiff = Math.abs(
        (grant1.deadline.getTime() - new Date(grant2.deadline).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 7) {
        matchedFields.push('deadline');
      }
    }

    return matchedFields;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract keywords from text for search
   */
  private extractKeywords(text: string): string[] {
    if (!text) return [];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
      'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run'
    ]);

    return stopWords.has(word);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

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

  /**
   * Get duplicate statistics for monitoring
   */
  async getDuplicateStatistics(days: number = 30): Promise<{
    totalDuplicatesFound: number;
    duplicatesByType: Record<string, number>;
    duplicatesByConfidence: Record<string, number>;
    topDuplicateFunders: Array<{ funder: string; count: number }>;
  }> {
    // This would require additional tracking tables in a production system
    // For now, return mock data structure
    return {
      totalDuplicatesFound: 0,
      duplicatesByType: {
        exact: 0,
        title: 0,
        fuzzy: 0
      },
      duplicatesByConfidence: {
        high: 0,
        medium: 0,
        low: 0
      },
      topDuplicateFunders: []
    };
  }

  /**
   * Manually mark grants as duplicates
   */
  async markAsDuplicate(
    originalGrantId: string,
    duplicateGrantId: string,
    reason: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Mark the duplicate as inactive
      await tx.grant.update({
        where: { id: duplicateGrantId },
        data: {
          status: 'DUPLICATE',
          updatedAt: new Date()
        }
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'grant_duplicate',
          entityId: originalGrantId,
          metadata: {
            duplicateGrantId,
            reason,
            manuallyMarked: true,
            timestamp: new Date().toISOString()
          }
        }
      });
    });
  }
}