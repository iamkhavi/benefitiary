/**
 * Validator class for comprehensive grant data validation
 * Implements validation rules and quality scoring
 */

import { ProcessedGrantData, ValidationRule, ValidationResult, ValidationError, ValidationWarning } from '../types';

export class GrantValidator {
  private readonly validationRules: ValidationRule[] = [
    {
      field: 'title',
      required: true,
      type: 'string',
      minLength: 5,
      maxLength: 200
    },
    {
      field: 'description',
      required: true,
      type: 'string',
      minLength: 20,
      maxLength: 5000
    },
    {
      field: 'deadline',
      required: false,
      type: 'date',
      customValidator: (value: Date) => {
        if (!value) return true;
        return value > new Date(); // Deadline should be in the future
      }
    },
    {
      field: 'fundingAmountMin',
      required: false,
      type: 'number',
      customValidator: (value: number) => {
        if (value === undefined || value === null) return true;
        return value >= 0; // Funding amount should be non-negative
      }
    },
    {
      field: 'fundingAmountMax',
      required: false,
      type: 'number',
      customValidator: (value: number) => {
        if (value === undefined || value === null) return true;
        return value >= 0; // Funding amount should be non-negative
      }
    },
    {
      field: 'applicationUrl',
      required: false,
      type: 'url'
    },
    {
      field: 'eligibilityCriteria',
      required: false,
      type: 'string',
      maxLength: 2000
    },
    {
      field: 'funder.name',
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100
    },
    {
      field: 'funder.website',
      required: false,
      type: 'url'
    },
    {
      field: 'locationEligibility',
      required: false,
      type: 'array',
      customValidator: (value: string[]) => {
        if (!Array.isArray(value)) return false;
        return value.every(location => typeof location === 'string' && location.length > 0);
      }
    },
    {
      field: 'confidenceScore',
      required: true,
      type: 'number',
      customValidator: (value: number) => value >= 0 && value <= 100
    },
    {
      field: 'contentHash',
      required: true,
      type: 'string',
      minLength: 1
    }
  ];

  /**
   * Validate processed grant data
   */
  validate(data: ProcessedGrantData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let qualityScore = 100;

    // Validate each field according to rules
    for (const rule of this.validationRules) {
      const fieldValue = this.getNestedValue(data, rule.field);
      const fieldValidation = this.validateField(fieldValue, rule);

      if (fieldValidation.error) {
        errors.push(fieldValidation.error);
        qualityScore -= this.getErrorPenalty(rule.field);
      }

      if (fieldValidation.warning) {
        warnings.push(fieldValidation.warning);
        qualityScore -= this.getWarningPenalty(rule.field);
      }
    }

    // Additional business logic validations
    const businessValidation = this.validateBusinessLogic(data, errors, warnings);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);
    qualityScore -= businessValidation.qualityPenalty;

    // Ensure quality score doesn't go below 0
    qualityScore = Math.max(0, qualityScore);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore
    };
  }

  /**
   * Validate individual field according to rule
   */
  private validateField(value: any, rule: ValidationRule): { error?: ValidationError; warning?: ValidationWarning } {
    // Check if required field is missing
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        error: {
          field: rule.field,
          message: `${rule.field} is required`,
          severity: 'error'
        }
      };
    }

    // Skip validation if field is not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return {};
    }

    // Type validation
    const typeValidation = this.validateType(value, rule.type, rule.field);
    if (typeValidation.error) {
      return typeValidation;
    }

    // Length validation for strings
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return {
          error: {
            field: rule.field,
            message: `${rule.field} must be at least ${rule.minLength} characters long`,
            severity: 'error'
          }
        };
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          warning: {
            field: rule.field,
            message: `${rule.field} is longer than recommended (${rule.maxLength} characters)`,
            suggestion: 'Consider shortening the content'
          }
        };
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return {
          error: {
            field: rule.field,
            message: `${rule.field} does not match required pattern`,
            severity: 'error'
          }
        };
      }
    }

    // Custom validation
    if (rule.customValidator && !rule.customValidator(value)) {
      return {
        error: {
          field: rule.field,
          message: `${rule.field} failed custom validation`,
          severity: 'error'
        }
      };
    }

    return {};
  }

  /**
   * Validate data type
   */
  private validateType(value: any, expectedType: string, fieldName: string): { error?: ValidationError; warning?: ValidationWarning } {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a string`,
              severity: 'error'
            }
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a valid number`,
              severity: 'error'
            }
          };
        }
        break;

      case 'date':
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a valid date`,
              severity: 'error'
            }
          };
        }
        break;

      case 'url':
        if (typeof value !== 'string') {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a string URL`,
              severity: 'error'
            }
          };
        }
        try {
          new URL(value);
        } catch {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a valid URL`,
              severity: 'error'
            }
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string') {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a string email`,
              severity: 'error'
            }
          };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be a valid email address`,
              severity: 'error'
            }
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            error: {
              field: fieldName,
              message: `${fieldName} must be an array`,
              severity: 'error'
            }
          };
        }
        break;
    }

    return {};
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessLogic(data: ProcessedGrantData, existingErrors: ValidationError[] = [], existingWarnings: ValidationWarning[] = []): { errors: ValidationError[]; warnings: ValidationWarning[]; qualityPenalty: number } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let qualityPenalty = 0;

    // Validate funding amount logic
    if (data.fundingAmountMin !== undefined && data.fundingAmountMax !== undefined) {
      if (data.fundingAmountMin > data.fundingAmountMax) {
        errors.push({
          field: 'fundingAmount',
          message: 'Minimum funding amount cannot be greater than maximum',
          severity: 'error'
        });
        qualityPenalty += 15;
      }

      // Warn about very large funding ranges
      const range = data.fundingAmountMax - data.fundingAmountMin;
      if (range > data.fundingAmountMin * 10) {
        warnings.push({
          field: 'fundingAmount',
          message: 'Funding amount range is very large, may indicate parsing error',
          suggestion: 'Review the original funding amount text'
        });
        qualityPenalty += 5;
      }
    }

    // Validate deadline logic
    if (data.deadline && data.deadline instanceof Date) {
      const now = new Date();
      const daysUntilDeadline = Math.ceil((data.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline < 0) {
        warnings.push({
          field: 'deadline',
          message: 'Deadline is in the past',
          suggestion: 'Verify if this grant is still active'
        });
        qualityPenalty += 10;
      } else if (daysUntilDeadline < 7) {
        warnings.push({
          field: 'deadline',
          message: 'Deadline is very soon (less than 7 days)',
          suggestion: 'Prioritize this grant for user notifications'
        });
      } else if (daysUntilDeadline > 365) {
        warnings.push({
          field: 'deadline',
          message: 'Deadline is more than a year away',
          suggestion: 'Verify the deadline date is correct'
        });
        qualityPenalty += 5;
      }
    }

    // Validate description quality
    if (data.description) {
      const wordCount = data.description.split(/\s+/).length;
      if (wordCount < 10) {
        warnings.push({
          field: 'description',
          message: 'Description is very short',
          suggestion: 'Consider extracting more detailed information'
        });
        qualityPenalty += 10;
      }

      // Check for common placeholder text
      const placeholderPatterns = [
        /lorem ipsum/i,
        /placeholder/i,
        /coming soon/i,
        /to be determined/i,
        /tbd/i
      ];

      for (const pattern of placeholderPatterns) {
        if (pattern.test(data.description)) {
          warnings.push({
            field: 'description',
            message: 'Description appears to contain placeholder text',
            suggestion: 'Verify this is actual grant content'
          });
          qualityPenalty += 15;
          break;
        }
      }
    }

    // Validate location eligibility
    if (data.locationEligibility.length === 0) {
      warnings.push({
        field: 'locationEligibility',
        message: 'No location eligibility information found',
        suggestion: 'Review eligibility criteria for location restrictions'
      });
      qualityPenalty += 5;
    }

    // Validate confidence score consistency
    const totalErrors = existingErrors.length + errors.length;
    const totalWarnings = existingWarnings.length + warnings.length;
    if (data.confidenceScore > 90 && (totalErrors > 0 || totalWarnings > 2)) {
      warnings.push({
        field: 'confidenceScore',
        message: 'High confidence score despite validation issues',
        suggestion: 'Review confidence calculation logic'
      });
    }

    // Validate funder information completeness
    if (!data.funder.website && !data.funder.contactEmail) {
      warnings.push({
        field: 'funder',
        message: 'No contact information available for funder',
        suggestion: 'Try to extract contact details from source'
      });
      qualityPenalty += 5;
    }

    return { errors, warnings, qualityPenalty };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get quality penalty for validation errors
   */
  private getErrorPenalty(field: string): number {
    const penalties: Record<string, number> = {
      'title': 30,
      'description': 20,
      'deadline': 15,
      'fundingAmountMin': 10,
      'fundingAmountMax': 10,
      'funder.name': 25,
      'applicationUrl': 5,
      'eligibilityCriteria': 10,
      'confidenceScore': 5,
      'contentHash': 5
    };

    return penalties[field] || 10;
  }

  /**
   * Get quality penalty for validation warnings
   */
  private getWarningPenalty(field: string): number {
    const penalties: Record<string, number> = {
      'title': 5,
      'description': 5,
      'deadline': 3,
      'fundingAmountMin': 3,
      'fundingAmountMax': 3,
      'funder.name': 5,
      'applicationUrl': 2,
      'eligibilityCriteria': 3,
      'confidenceScore': 2,
      'contentHash': 2
    };

    return penalties[field] || 2;
  }

  /**
   * Get validation summary for reporting
   */
  getValidationSummary(results: ValidationResult[]): {
    totalValidated: number;
    validCount: number;
    errorCount: number;
    warningCount: number;
    averageQualityScore: number;
    commonErrors: Array<{ error: string; count: number }>;
    commonWarnings: Array<{ warning: string; count: number }>;
  } {
    const totalValidated = results.length;
    const validCount = results.filter(r => r.isValid).length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageQualityScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / totalValidated;

    // Count common errors
    const errorCounts = new Map<string, number>();
    results.forEach(result => {
      result.errors.forEach(error => {
        const key = `${error.field}: ${error.message}`;
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      });
    });

    // Count common warnings
    const warningCounts = new Map<string, number>();
    results.forEach(result => {
      result.warnings.forEach(warning => {
        const key = `${warning.field}: ${warning.message}`;
        warningCounts.set(key, (warningCounts.get(key) || 0) + 1);
      });
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const commonWarnings = Array.from(warningCounts.entries())
      .map(([warning, count]) => ({ warning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalValidated,
      validCount,
      errorCount,
      warningCount,
      averageQualityScore,
      commonErrors,
      commonWarnings
    };
  }
}