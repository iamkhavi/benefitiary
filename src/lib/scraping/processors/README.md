# Data Processing and Validation Pipeline

This module implements a comprehensive data processing and validation pipeline for grant scraping data, fulfilling requirements 9.1-9.5 from the grant scraping implementation specification.

## Overview

The pipeline consists of two main components:

1. **DataProcessor** - Transforms raw scraped data into structured, normalized format
2. **GrantValidator** - Validates processed data and provides quality scoring

## Features Implemented

### DataProcessor

#### Funding Amount Parsing (Requirement 9.2)
- Supports various currency formats (USD, EUR, GBP, JPY, INR)
- Handles currency conversion with configurable rates
- Parses funding ranges ("$10,000 - $50,000")
- Recognizes "up to" and "minimum" patterns
- Filters out non-currency numbers (e.g., years, quantities)

#### Deadline Parsing (Requirement 9.3)
- Supports multiple date formats:
  - ISO format (YYYY-MM-DD)
  - US format (MM/DD/YYYY)
  - European format (DD/MM/YYYY)
  - Month name formats ("December 31, 2024", "31 December 2024")
- Handles timezone considerations (local time parsing)
- Validates date logic (future dates)

#### Text Normalization (Requirement 9.4)
- Removes HTML tags and artifacts
- Decodes HTML entities (&amp;, &quot;, etc.)
- Normalizes whitespace and line breaks
- Removes excessive punctuation (configurable)
- Cleans bullet points and list markers
- Removes control characters

#### Data Quality Validation (Requirement 9.1, 9.5)
- Validates required fields and data formats
- Generates quality scores (0-100)
- Provides detailed error and warning messages
- Flags data for manual review when quality is poor

### Additional Features

#### Location Eligibility Extraction
- Extracts geographic eligibility from text
- Recognizes countries, states, regions, and cities
- Handles various formats ("US-based", "United States", "American")
- Normalizes location names

#### Grant Categorization
- Automatically categorizes grants into predefined categories
- Uses keyword-based classification
- Supports 8 main categories (Healthcare, Education, Environment, etc.)
- Provides confidence scoring for classifications

#### Funder Data Processing
- Extracts and normalizes funder information
- Determines funder type (Foundation, Government, International, Corporate)
- Extracts website URLs from source URLs
- Validates contact information

#### Content Change Detection
- Generates consistent content hashes for change detection
- Enables duplicate detection and content updates
- Supports incremental data processing

### GrantValidator

#### Field Validation
- Comprehensive validation rules for all data fields
- Type checking (string, number, date, URL, email, array)
- Length validation with configurable limits
- Pattern matching for specific formats
- Custom validation functions for complex logic

#### Business Logic Validation
- Validates funding amount logic (min ≤ max)
- Checks deadline reasonableness (not too far past/future)
- Detects placeholder text and low-quality content
- Validates data consistency and completeness
- Provides actionable suggestions for improvements

#### Quality Scoring
- Calculates quality scores based on multiple factors
- Penalizes errors and warnings with configurable weights
- Provides detailed scoring breakdown
- Supports quality thresholds for automated processing

#### Validation Reporting
- Generates comprehensive validation summaries
- Tracks common errors and warnings across datasets
- Provides statistics for monitoring data quality
- Supports batch validation operations

## Configuration Options

### DataProcessor Options
```typescript
interface ProcessingOptions {
  strictValidation?: boolean;           // Enable strict validation mode
  defaultTimezone?: string;            // Default timezone for date parsing
  currencyConversionRates?: Record<string, number>; // Currency conversion rates
  textNormalizationLevel?: 'basic' | 'aggressive'; // Text cleaning level
}
```

### Validation Rules
- Configurable validation rules for each field
- Customizable error and warning penalties
- Flexible business logic validation
- Extensible validation framework

## Usage Examples

### Basic Processing
```typescript
const processor = new DataProcessor();
const validator = new GrantValidator();

const rawData: RawGrantData = {
  title: 'Healthcare Innovation Grant',
  description: 'Supporting innovative healthcare solutions...',
  deadline: '2025-12-31',
  fundingAmount: '$25,000 - $150,000',
  // ... other fields
};

// Process raw data
const processingResult = await processor.processGrant(rawData);

// Validate processed data
const validationResult = validator.validate(processingResult.data);

if (validationResult.isValid) {
  console.log('Grant data is valid and ready for storage');
} else {
  console.log('Validation errors:', validationResult.errors);
}
```

### Advanced Configuration
```typescript
const processor = new DataProcessor({
  strictValidation: true,
  currencyConversionRates: { EUR: 1.1, GBP: 1.25 },
  textNormalizationLevel: 'aggressive'
});
```

### Batch Validation
```typescript
const results = grants.map(grant => validator.validate(grant));
const summary = validator.getValidationSummary(results);

console.log(`Processed ${summary.totalValidated} grants`);
console.log(`${summary.validCount} valid, ${summary.errorCount} errors`);
console.log(`Average quality score: ${summary.averageQualityScore}`);
```

## Testing

The module includes comprehensive tests:

- **Unit Tests**: 71 tests covering all individual functions
- **Integration Tests**: 9 tests covering complete pipeline workflows
- **Edge Cases**: Handling of malformed data, missing fields, and error conditions
- **Real-world Scenarios**: Tests with actual grant data patterns

### Test Coverage
- DataProcessor: 40 unit tests
- GrantValidator: 31 unit tests  
- Integration: 9 comprehensive workflow tests
- All tests passing with 100% success rate

## Performance Considerations

- Efficient text processing with minimal regex operations
- Configurable processing options to balance speed vs. accuracy
- Batch processing support for large datasets
- Memory-efficient validation with streaming support
- Caching of processed results for duplicate detection

## Error Handling

- Graceful handling of malformed input data
- Detailed error messages with actionable suggestions
- Non-blocking validation (continues processing despite errors)
- Comprehensive logging for debugging and monitoring
- Recovery mechanisms for partial processing failures

## Future Enhancements

- Machine learning-based categorization
- Advanced NLP for better text extraction
- Multi-language support for international grants
- Real-time validation APIs
- Integration with external data sources for validation

## Requirements Fulfilled

✅ **9.1** - Validate required fields and data formats  
✅ **9.2** - Normalize currency formats and handle ranges appropriately  
✅ **9.3** - Parse various date formats and validate deadline logic  
✅ **9.4** - Remove HTML artifacts and normalize whitespace  
✅ **9.5** - Flag grants for manual review with quality scores  

This implementation provides a robust, scalable, and maintainable foundation for processing and validating grant data in the scraping pipeline.