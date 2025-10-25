# Maya Proposal Structure Enhancement

## Overview
Updated Maya's AI capabilities to ensure that initial proposal drafts are always complete, professionally structured documents with proper formatting and comprehensive content.

## Key Changes Made

### 1. Enhanced Document Structure Rules
- **Complete Proposal Detection**: Added `isCompleteProposalRequest()` function to identify when users want full proposals
- **Professional Structure**: Enforced cover page, table of contents, and full content structure
- **Page Organization**: 
  - Page 1: Professional cover page with title, organization, funder, date, funding amount
  - Page 2: Table of Contents with numbered sections and page references
  - Pages 3+: All essential proposal sections with proper formatting

### 2. Improved Budget Section Requirements
- **Mandatory Table Format**: Budget sections must use HTML tables
- **Required Columns**: Categories, amounts, percentages, detailed justifications
- **Professional Styling**: Proper table styling with borders, headers, and alignment
- **Comprehensive Breakdown**: Multiple budget categories with clear justifications

### 3. Enhanced Intent Detection
- **Complete Proposal Keywords**: Detects phrases like "full proposal", "complete proposal", "draft proposal"
- **Empty Canvas Logic**: Assumes complete proposal when canvas is empty and user mentions "proposal"
- **Priority System**: Complete proposal requests get highest priority in intent detection

### 4. Updated Prompt Engineering
- **Dynamic Instructions**: Different instructions based on whether complete proposal is requested
- **Structured Examples**: Added comprehensive examples showing proper document structure
- **Professional Formatting**: Enforced use of page breaks, proper headings, and styling

### 5. Enhanced Examples
- **Budget Example**: Updated to show proper table format with all required columns
- **Complete Proposal Example**: Added example showing cover page, TOC, and section structure
- **Professional Styling**: All examples include proper HTML styling and formatting

## Technical Implementation

### New Functions Added
```typescript
function isCompleteProposalRequest(userMessage: string, currentCanvasContent?: string): boolean
```
- Detects when users want complete proposal documents
- Considers canvas state and user language patterns
- Returns true for comprehensive proposal requests

### Updated Functions
```typescript
function buildMayaPrompt(..., isCompleteProposal?: boolean): string
```
- Added parameter to handle complete proposal requests
- Dynamic instruction generation based on request type
- Enhanced document structure requirements

### Enhanced Detection Logic
```typescript
function detectCanvasIntent(userMessage: string, currentCanvasContent?: string): boolean
```
- Added complete proposal keyword detection
- Prioritizes full document creation over section updates
- Improved accuracy for user intent classification

## Document Structure Requirements

### Cover Page (Page 1)
- Professional title and formatting
- Organization and funder information
- Submission date
- Funding amount request
- Proper styling and layout

### Table of Contents (Page 2)
- Numbered sections with page references
- Professional formatting
- Clear navigation structure
- Consistent styling

### Content Pages (Pages 3+)
- Executive Summary
- Statement of Need
- Project Description
- Methodology and Implementation
- Timeline (table format)
- Budget (comprehensive table)
- Organizational Capacity
- Evaluation Plan
- Sustainability
- Conclusion

### Budget Table Requirements
- **Categories**: Personnel, Direct Costs, Evaluation, Administrative, etc.
- **Amounts**: Properly formatted currency values
- **Percentages**: Clear percentage breakdown
- **Justifications**: Detailed explanations for each category
- **Professional Styling**: Borders, headers, proper alignment

### Timeline Table Requirements
- **Phases**: Clear project phases
- **Duration**: Time periods for each phase
- **Activities**: Key activities and milestones
- **Deliverables**: Expected outcomes and deliverables

## User Experience Improvements

### Automatic Detection
- Maya automatically detects when users want complete proposals
- No need for users to specify document structure requirements
- Intelligent handling of empty vs. existing canvas content

### Professional Output
- All proposals include professional cover pages
- Consistent formatting and styling throughout
- Proper page breaks between major sections
- Professional table formatting for budgets and timelines

### Comprehensive Content
- All essential proposal sections included by default
- Context-aware content generation based on organization and grant details
- Strategic alignment with funder priorities
- Professional language and presentation

## Benefits

1. **Consistency**: All initial proposals follow professional standards
2. **Completeness**: Users get comprehensive documents, not fragments
3. **Professional Presentation**: Cover pages, TOCs, and proper formatting
4. **Time Savings**: No need to manually structure documents
5. **Quality Assurance**: Built-in requirements for essential sections
6. **Funder Alignment**: Content tailored to specific grant requirements

## Usage Examples

### Complete Proposal Requests
- "Create a full proposal for this grant"
- "Draft a complete proposal"
- "Write the entire proposal"
- "Generate a proposal from scratch"

### Automatic Detection
- When canvas is empty and user says "write a proposal"
- When user mentions "proposal" without specifying sections
- When user requests comprehensive grant application content

This enhancement ensures that Maya consistently delivers professional, complete proposal documents that meet industry standards and funder expectations.