/**
 * ContentHasher - Generates consistent hashes for grant content to detect changes
 */

import crypto from 'crypto';
import { ProcessedGrantData, ContentChangeDetection } from '../types';

export class ContentHasher {
  /**
   * Generate a consistent hash for grant content
   * Uses key fields that indicate meaningful changes
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
      category: grant.category,
      locationEligibility: grant.locationEligibility.sort() // Sort for consistency
    };

    // Convert to JSON string and create hash
    const contentString = JSON.stringify(hashableContent);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  /**
   * Compare two hashes and identify what changed
   */
  compareHashes(
    previousHash: string,
    currentHash: string,
    oldGrant?: ProcessedGrantData,
    newGrant?: ProcessedGrantData
  ): ContentChangeDetection {
    const changeDetection: ContentChangeDetection = {
      grantId: '', // Will be set by caller
      previousHash,
      currentHash,
      changedFields: [],
      changeType: 'minor',
      detectedAt: new Date()
    };

    // If hashes are the same, no changes
    if (previousHash === currentHash) {
      return changeDetection;
    }

    // If we have both grant objects, identify specific changed fields
    if (oldGrant && newGrant) {
      changeDetection.changedFields = this.identifyChangedFields(oldGrant, newGrant);
      changeDetection.changeType = this.determineChangeType(changeDetection.changedFields);
    } else {
      // If we don't have the objects, assume major change
      changeDetection.changeType = 'major';
      changeDetection.changedFields = ['unknown'];
    }

    return changeDetection;
  }

  /**
   * Identify which specific fields changed between two grants
   */
  identifyChangedFields(oldGrant: ProcessedGrantData, newGrant: ProcessedGrantData): string[] {
    const changedFields: string[] = [];

    // Check each field for changes
    if (this.normalizeText(oldGrant.title) !== this.normalizeText(newGrant.title)) {
      changedFields.push('title');
    }

    if (this.normalizeText(oldGrant.description) !== this.normalizeText(newGrant.description)) {
      changedFields.push('description');
    }

    if (this.compareDates(oldGrant.deadline, newGrant.deadline)) {
      changedFields.push('deadline');
    }

    if (oldGrant.fundingAmountMin !== newGrant.fundingAmountMin) {
      changedFields.push('fundingAmountMin');
    }

    if (oldGrant.fundingAmountMax !== newGrant.fundingAmountMax) {
      changedFields.push('fundingAmountMax');
    }

    if (this.normalizeText(oldGrant.eligibilityCriteria) !== this.normalizeText(newGrant.eligibilityCriteria)) {
      changedFields.push('eligibilityCriteria');
    }

    if (oldGrant.applicationUrl !== newGrant.applicationUrl) {
      changedFields.push('applicationUrl');
    }

    if (oldGrant.category !== newGrant.category) {
      changedFields.push('category');
    }

    if (!this.arraysEqual(oldGrant.locationEligibility.sort(), newGrant.locationEligibility.sort())) {
      changedFields.push('locationEligibility');
    }

    if (oldGrant.funder.name !== newGrant.funder.name) {
      changedFields.push('funder');
    }

    return changedFields;
  }

  /**
   * Determine the type of change based on which fields changed
   */
  private determineChangeType(changedFields: string[]): 'minor' | 'major' | 'critical' {
    // Critical changes - affect application viability
    const criticalFields = ['deadline', 'fundingAmountMin', 'fundingAmountMax', 'eligibilityCriteria'];
    if (changedFields.some(field => criticalFields.includes(field))) {
      return 'critical';
    }

    // Major changes - significant content updates
    const majorFields = ['title', 'description', 'category', 'applicationUrl'];
    if (changedFields.some(field => majorFields.includes(field))) {
      return 'major';
    }

    // Minor changes - metadata or supplementary information
    return 'minor';
  }

  /**
   * Normalize text for consistent comparison
   */
  private normalizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove special characters for comparison
      .trim();
  }

  /**
   * Compare two dates, handling null/undefined cases
   */
  private compareDates(date1?: Date | null, date2?: Date | null): boolean {
    if (!date1 && !date2) return false; // Both null, no change
    if (!date1 || !date2) return true; // One is null, change detected
    
    return date1.getTime() !== date2.getTime();
  }

  /**
   * Compare two arrays for equality
   */
  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    
    return true;
  }

  /**
   * Generate a quick hash for duplicate detection
   * Uses only title and funder for faster comparison
   */
  generateQuickHash(title: string, funderName: string): string {
    const quickContent = {
      title: this.normalizeText(title),
      funder: this.normalizeText(funderName)
    };

    const contentString = JSON.stringify(quickContent);
    return crypto.createHash('md5').update(contentString).digest('hex');
  }

  /**
   * Generate hash for specific fields only
   */
  generateFieldHash(grant: ProcessedGrantData, fields: string[]): string {
    const fieldContent: Record<string, any> = {};

    fields.forEach(field => {
      switch (field) {
        case 'title':
          fieldContent.title = this.normalizeText(grant.title);
          break;
        case 'description':
          fieldContent.description = this.normalizeText(grant.description);
          break;
        case 'deadline':
          fieldContent.deadline = grant.deadline?.toISOString() || null;
          break;
        case 'fundingAmount':
          fieldContent.fundingAmountMin = grant.fundingAmountMin || null;
          fieldContent.fundingAmountMax = grant.fundingAmountMax || null;
          break;
        case 'eligibility':
          fieldContent.eligibilityCriteria = this.normalizeText(grant.eligibilityCriteria);
          break;
        case 'funder':
          fieldContent.funder = this.normalizeText(grant.funder.name);
          break;
        default:
          // Handle other fields generically
          if (field in grant) {
            fieldContent[field] = (grant as any)[field];
          }
      }
    });

    const contentString = JSON.stringify(fieldContent);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  /**
   * Validate hash format
   */
  isValidHash(hash: string): boolean {
    // SHA-256 hash should be 64 characters of hexadecimal
    return /^[a-f0-9]{64}$/i.test(hash);
  }

  /**
   * Generate hash with timestamp for versioning
   */
  generateVersionedHash(grant: ProcessedGrantData, timestamp: Date): string {
    const baseHash = this.generateHash(grant);
    const versionString = `${baseHash}:${timestamp.toISOString()}`;
    
    return crypto.createHash('sha256').update(versionString).digest('hex');
  }
}