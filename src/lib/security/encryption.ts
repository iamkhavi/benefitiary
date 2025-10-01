import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

/**
 * Data encryption utilities for sensitive user information
 */

const scryptAsync = promisify(scrypt);
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Get encryption key from environment or generate one
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

// Derive key from password/secret
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

// Encrypt sensitive data
export async function encryptSensitiveData(data: string): Promise<string> {
  try {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = await deriveKey(ENCRYPTION_KEY, salt);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt sensitive data
export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  try {
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = await deriveKey(ENCRYPTION_KEY, salt);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Hash sensitive data for comparison (one-way)
export function hashSensitiveData(data: string): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(data + (process.env.HASH_SALT || 'default-salt'))
    .digest('hex');
}

// Encrypt organization data before storing
export async function encryptOrganizationData(orgData: {
  name: string;
  website?: string;
  country: string;
  region?: string;
}): Promise<{
  name: string;
  website?: string;
  country: string;
  region?: string;
}> {
  return {
    name: await encryptSensitiveData(orgData.name),
    website: orgData.website ? await encryptSensitiveData(orgData.website) : undefined,
    country: orgData.country, // Country can remain unencrypted for filtering
    region: orgData.region ? await encryptSensitiveData(orgData.region) : undefined,
  };
}

// Decrypt organization data after retrieval
export async function decryptOrganizationData(encryptedOrgData: {
  name: string;
  website?: string;
  country: string;
  region?: string;
}): Promise<{
  name: string;
  website?: string;
  country: string;
  region?: string;
}> {
  return {
    name: await decryptSensitiveData(encryptedOrgData.name),
    website: encryptedOrgData.website ? await decryptSensitiveData(encryptedOrgData.website) : undefined,
    country: encryptedOrgData.country,
    region: encryptedOrgData.region ? await decryptSensitiveData(encryptedOrgData.region) : undefined,
  };
}

// Secure data masking for logs
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveFields = ['password', 'email', 'name', 'region', 'token', 'secret'];
  const masked = { ...data };
  
  for (const [key, value] of Object.entries(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = value.charAt(0) + '*'.repeat(Math.max(0, value.length - 2)) + (value.length > 1 ? value.charAt(value.length - 1) : '');
      } else {
        masked[key] = '[MASKED]';
      }
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    }
  }
  
  return masked;
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// Validate data integrity
export function createDataIntegrityHash(data: any): string {
  const crypto = require('crypto');
  const dataString = JSON.stringify(data);
  return crypto
    .createHash('sha256')
    .update(dataString + (process.env.INTEGRITY_SECRET || 'default-integrity-secret'))
    .digest('hex');
}

export function verifyDataIntegrity(data: any, expectedHash: string): boolean {
  const actualHash = createDataIntegrityHash(data);
  return actualHash === expectedHash;
}