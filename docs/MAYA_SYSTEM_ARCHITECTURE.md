# Maya System Architecture - Grant Consultant AI

## Current System (Clean & Focused)

Maya is now a focused grant consultant system designed specifically for grant seekers who want to win funding.

### Core Files (Active)

#### 1. **`maya-orchestrator.ts`** - Main Entry Point
- Coordinates the entire Maya system
- Handles initialization, conversation management, and response coordination
- Integrates intent detection with response generation
- Manages conversation history and context

#### 2. **`grant-seeker-intent-detector.ts`** - Intent Detection
- Detects real grant seeker intentions based on actual user behavior
- Categories: strategic_consultation, content_generation, process_guidance, review_feedback, information_request
- Understands grant writing workflow and user journey stages
- Focuses on grant domain-specific intents

#### 3. **`grant-consultant-response-generator.ts`** - Response Generation
- Generates responses that help grant seekers win funding
- Provides strategic advice, creates proposal content, offers process guidance
- Integrates with document canvas for content generation
- Maintains grant consultant expertise and tone

#### 4. **`index.ts`** - Clean Exports
- Exports only the current, focused system
- Provides backward compatibility
- Clear entry point for Maya functionality

### Supporting Files

#### 5. **`.kiro/steering/maya-design-principles.md`** - Design Rules
- Critical architectural principles
- Prevents designing around developer testing scenarios
- Ensures focus on real grant seeker needs

### Removed Files (Cleaned Up)

❌ **`comprehensive-intent-detector.ts`** - Removed (over-engineered, wrong focus)
❌ **`contextual-response-generator.ts`** - Removed (built around wrong intents)
❌ **`content-extraction-rules.ts`** - Removed (designed around system bugs)
❌ **`maya-agent.ts`** - Removed (replaced by orchestrator)
❌ **`response-generator.ts`** - Removed (outdated approach)
❌ **`CONTENT_EXTRACTION_GUIDE.md`** - Removed (wrong assumptions)

## System Flow

```
User Message → Grant Seeker Intent Detection → Grant Consultant Response → Canvas Integration
     ↓                    ↓                           ↓                        ↓
Real grant seeker    Grant-specific intents    Expert consultation    Professional content
seeking funding      based on actual needs     or content generation  ready for submission
```

## Key Principles

### ✅ What Maya Does
- **Understands grant seekers** pursuing real funding opportunities
- **Provides strategic consultation** about funder priorities and positioning
- **Generates professional content** for document canvas when requested
- **Offers process guidance** for grant writing workflow
- **Maintains grant consultant expertise** with 15+ years experience persona

### ❌ What Maya Doesn't Do
- Accommodate developer testing scenarios in user experience design
- Design around system bugs or broken functionality
- Provide generic chatbot responses
- Confuse consultation with content generation

## Real User Examples

### Strategic Consultation
```
User: "What do you think are the funders need as deliverables"
Intent: strategic_consultation → funder_strategy
Response: Expert analysis of Pfizer's priorities and strategic positioning advice
Canvas: No change (consultation only)
```

### Content Generation
```
User: "help me write the proposal"
Intent: content_generation → complete_proposal
Response: Explanation of generated content + guidance
Canvas: Complete professional proposal appears
```

### Process Guidance
```
User: "How do I write a good budget section?"
Intent: process_guidance → how_to_guidance
Response: Educational explanation with examples and best practices
Canvas: No change (guidance only)
```

## Technical Integration

- **API Routes**: Updated to use MayaOrchestrator
- **Proposal Editor**: Integrates with extractedContent for canvas display
- **Database**: Saves conversation with intent metadata
- **Error Handling**: Intelligent fallbacks focused on grant seeker needs

## Success Metrics

- **Intent Accuracy**: >90% correct classification of grant seeker needs
- **User Satisfaction**: Grant seekers get what they expect (advice vs content)
- **Conversion Rate**: Users successfully complete and submit proposals
- **Time to Value**: Reduced time from idea to submission-ready proposal

This clean, focused system serves the single goal: **Help grant seekers win funding**.