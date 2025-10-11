/**
 * Integration example demonstrating content change detection and duplicate prevention
 * This file shows how to use the deduplicator in a real scraping workflow
 */

import { Deduplicator, ContentHasher } from '../processors/deduplicator';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType, ContentChangeDetection } from '../types';

export class GrantScrapingWorkflow {
  private deduplicator: Deduplicator;
  private contentHasher: ContentHasher;

  constructor() {
    this.deduplicator = new Deduplicator();
    this.contentHasher = new ContentHasher();
  }

  /**
   * Process newly scraped grants with duplicate detection and change tracking
   */
  async processScrapedGrants(
    newGrants: ProcessedGrantData[],
    existingGrants: ProcessedGrantData[]
  ): Promise<{
    toInsert: ProcessedGrantData[];
    toUpdate: ProcessedGrantData[];
    changes: ContentChangeDetection[];
    duplicatesRemoved: number;
  }> {
    console.log(`Processing ${newGrants.length} newly scraped grants...`);

    // Step 1: Remove duplicates within the new grants
    const uniqueNewGrants = await this.deduplicator.detectDuplicates(newGrants);
    const duplicatesRemoved = newGrants.length - uniqueNewGrants.length;

    // Step 2: Find matches with existing grants
    const matches = await this.deduplicator.findDuplicateMatches(uniqueNewGrants, existingGrants);
    
    const toInsert: ProcessedGrantData[] = [];
    const toUpdate: ProcessedGrantData[] = [];
    const changes: ContentChangeDetection[] = [];

    // Step 3: Process each new grant
    for (const newGrant of uniqueNewGrants) {
      const match = matches.find(m => m.newGrant === newGrant);
      
      if (match) {
        // Found a matching existing grant - check for changes
        const existingGrant = match.existingGrant;
        const newHash = this.contentHasher.generateHash(newGrant);
        const existingHash = existingGrant.contentHash;

        const changeDetection = await this.deduplicator.compareHashes(
          existingGrant.contentHash, // Using contentHash as grant ID for this example
          existingHash,
          newHash,
          existingGrant,
          newGrant
        );

        if (changeDetection) {
          // Content has changed - merge and update
          const mergedGrant = await this.deduplicator.mergeGrantData(existingGrant, newGrant);
          toUpdate.push(mergedGrant);
          changes.push(changeDetection);
          
          console.log(`Grant "${newGrant.title}" has ${changeDetection.changeType} changes:`, changeDetection.changedFields);
        } else {
          console.log(`Grant "${newGrant.title}" is unchanged`);
        }
      } else {
        // No match found - this is a new grant
        newGrant.contentHash = this.contentHasher.generateHash(newGrant);
        toInsert.push(newGrant);
        console.log(`New grant found: "${newGrant.title}"`);
      }
    }

    return {
      toInsert,
      toUpdate,
      changes,
      duplicatesRemoved
    };
  }

  /**
   * Example usage with mock data
   */
  async demonstrateWorkflow(): Promise<void> {
    console.log('=== Grant Scraping Workflow Demonstration ===\n');

    // Simulate existing grants in database
    const existingGrants: ProcessedGrantData[] = [
      {
        title: 'Medical Research Grant',
        description: 'Funding for medical research projects',
        deadline: new Date('2024-12-31'),
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Open to universities',
        funder: {
          name: 'Gates Foundation',
          type: ScrapedSourceType.FOUNDATION
        },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: ['US'],
        confidenceScore: 0.9,
        contentHash: 'existing-hash-1'
      }
    ];

    // Simulate newly scraped grants
    const newGrants: ProcessedGrantData[] = [
      // Duplicate within new grants
      {
        title: 'Education Grant',
        description: 'Support for educational initiatives',
        deadline: new Date('2025-01-15'),
        fundingAmountMax: 50000,
        eligibilityCriteria: 'Open to schools',
        funder: {
          name: 'Ford Foundation',
          type: ScrapedSourceType.FOUNDATION
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['US', 'CA'],
        confidenceScore: 0.8,
        contentHash: 'temp-hash'
      },
      // Exact duplicate of above
      {
        title: 'Education Grant',
        description: 'Support for educational initiatives',
        deadline: new Date('2025-01-15'),
        fundingAmountMax: 50000,
        eligibilityCriteria: 'Open to schools',
        funder: {
          name: 'Ford Foundation',
          type: ScrapedSourceType.FOUNDATION
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['US', 'CA'],
        confidenceScore: 0.8,
        contentHash: 'temp-hash'
      },
      // Updated version of existing grant
      {
        title: 'Medical Research Grant',
        description: 'Enhanced funding for medical research projects with new focus areas',
        deadline: new Date('2025-01-31'), // Extended deadline
        fundingAmountMax: 150000, // Increased funding
        eligibilityCriteria: 'Open to universities and research institutions',
        funder: {
          name: 'Gates Foundation',
          type: ScrapedSourceType.FOUNDATION
        },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: ['US', 'CA'], // Expanded eligibility
        confidenceScore: 0.95,
        contentHash: 'temp-hash'
      }
    ];

    // Process the grants
    const result = await this.processScrapedGrants(newGrants, existingGrants);

    // Display results
    console.log('\n=== Processing Results ===');
    console.log(`Duplicates removed: ${result.duplicatesRemoved}`);
    console.log(`New grants to insert: ${result.toInsert.length}`);
    console.log(`Existing grants to update: ${result.toUpdate.length}`);
    console.log(`Content changes detected: ${result.changes.length}`);

    if (result.changes.length > 0) {
      console.log('\n=== Content Changes ===');
      for (const change of result.changes) {
        console.log(`Grant ID: ${change.grantId}`);
        console.log(`Change Type: ${change.changeType}`);
        console.log(`Changed Fields: ${change.changedFields.join(', ')}`);
        console.log(`Detected At: ${change.detectedAt.toISOString()}`);
        console.log('---');
      }
    }

    if (result.toInsert.length > 0) {
      console.log('\n=== New Grants ===');
      for (const grant of result.toInsert) {
        console.log(`- ${grant.title} (${grant.funder.name})`);
      }
    }

    if (result.toUpdate.length > 0) {
      console.log('\n=== Updated Grants ===');
      for (const grant of result.toUpdate) {
        console.log(`- ${grant.title} (${grant.funder.name})`);
        console.log(`  Funding: $${grant.fundingAmountMax?.toLocaleString()}`);
        console.log(`  Deadline: ${grant.deadline?.toDateString()}`);
      }
    }
  }
}

// Example usage
if (require.main === module) {
  const workflow = new GrantScrapingWorkflow();
  workflow.demonstrateWorkflow().catch(console.error);
}