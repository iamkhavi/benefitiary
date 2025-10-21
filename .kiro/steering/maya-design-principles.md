# Maya Design Principles - CRITICAL ARCHITECTURAL RULES

## NEVER FORGET THESE PRINCIPLES

### 1. **DEVELOPER TESTING ≠ USER EXPERIENCE**
- When developers report bugs ("canvas is empty", "not working"), this is SYSTEM FAILURE, not user behavior
- NEVER design features around developer frustrations or testing scenarios
- Developer complaints indicate broken functionality that needs FIXING, not accommodating

### 2. **REAL GRANT SEEKER BEHAVIOR**
- Grant seekers come to Beneficiary to GET FUNDING for their projects
- They want RESULTS: proposals that win grants, strategic advice, professional help
- They are NOT testing systems - they have real deadlines and real needs
- They speak naturally, not in technical prompts

### 3. **ARCHITECTURAL INTEGRITY**
- Design systems for REAL USER GOALS, not edge cases
- Fix broken functionality, don't work around it
- Intent detection must serve GRANT SEEKERS, not accommodate system bugs
- If canvas is empty when it shouldn't be, FIX THE CANVAS, don't detect "frustration"

### 4. **GRANT SEEKER GOALS ON BENEFICIARY**
- **Primary Goal**: Get funding for their cause/organization
- **Secondary Goals**: 
  - Find relevant grants
  - Understand what funders want
  - Create winning proposals quickly
  - Get expert guidance
  - Save time and increase success rates

### 5. **MAYA'S ROLE**
- Maya is a GRANT CONSULTANT, not a chatbot
- She helps users WIN GRANTS, not just generate content
- She provides STRATEGIC VALUE through expertise and efficiency
- She understands GRANT WRITING DOMAIN, not just general conversation

### 6. **INTENT DETECTION PRINCIPLES**
- Detect what GRANT SEEKERS actually want to accomplish
- Focus on GRANT-SPECIFIC intents, not general conversation patterns
- Understand the GRANT WRITING WORKFLOW and user journey
- Respond based on WHERE USERS ARE in their grant application process

## REAL USER SCENARIOS TO DESIGN FOR

### New Grant Seeker
- "I found this grant, can you help me apply?"
- "What do I need to include in my proposal?"
- "How do I get started with this application?"

### Experienced Grant Seeker  
- "Write me a proposal for this NIH grant"
- "Can you improve my executive summary?"
- "What's the best strategy for this funder?"

### Time-Pressed Grant Seeker
- "I need a proposal by Friday"
- "Help me write this quickly"
- "Generate everything I need for submission"

### Strategic Grant Seeker
- "What do you think about my approach?"
- "Should I emphasize the research or the community impact?"
- "How do I position this for maximum impact?"

## NEVER DESIGN FOR THESE (Developer Testing Scenarios)
- ❌ "Canvas is empty" (system bug, not user intent)
- ❌ "Nothing is working" (system failure, not user behavior)  
- ❌ "Where is my content" (broken functionality, not user need)

## REMEMBER
When developers report system issues, the response is:
1. **ACKNOWLEDGE** the bug
2. **FIX** the underlying system
3. **TEST** with real user scenarios
4. **NEVER** design features around the bug

This is ARCHITECTURAL INTEGRITY - design for users, fix bugs separately.