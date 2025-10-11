/**
 * Database integration module exports
 * Provides efficient batch operations, transaction management, and audit logging
 */

export { DatabaseWriter } from './database-writer';
export { ContentHasher } from './content-hasher';
export { AuditLogger } from './audit-logger';
export { DeduplicationEngine } from './deduplication-engine';

export type {
  DatabaseWriterConfig,
  BatchOperationResult,
  GrantUpdate
} from './database-writer';

// ContentChangeDetection is already exported from the main types module

export type {
  AuditLogEntry
} from './audit-logger';

export type {
  DuplicateCheckResult,
  DuplicateMatch,
  MergeStrategy
} from './deduplication-engine';