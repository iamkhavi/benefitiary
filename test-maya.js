/**
 * Maya Test Script - Verify the xAI wrapper works
 */

const XAI_API_KEY = process.env.XAI_API_KEY || 'your-xai-key-here';

async function testMaya() {
  console.log('🧪 Testing Maya xAI Wrapper...\n');

  const testCases = [
    {
      name: 'Strategic Advice Request',
      message: 'What do you think are the funders need as deliverables for this healthcare grant?',
      expectedIntent: 'chat_advice'
    },
    {
      name: 'Content Generation Request',
      message: 'help me write the proposal',
      expectedIntent: 'canvas_write'
    },
    {
      name: 'Budget Help',
      message: 'Budget feels off, can you help?',
      expectedIntent: 'canvas_write'
    },
    {
      name: 'General Question',
      message: 'How do I impress funders with my proposal?',
      expectedIntent: 'chat_advice'
    }
  ];

  const userContext = {
    orgName: 'Techwiz',
    orgType: 'NGO',
    grantTitle: 'Pfizer Research Grant Request for Proposals',
    funderName: 'Pfizer Investment Co., Ltd.',
    fundingAmount: '$35,000',
    deadline: '10/15/2025'
  };

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    
    try {
      const response = await fetch('http://localhost:3000/api/maya', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // You'll need proper auth
        },
        body: JSON.stringify({
          userMessage: testCase.message,
          userContext: userContext,
          history: []
        })
      });

      if (!response.ok) {
        console.log(`❌ API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      console.log(`✅ Intent: ${data.intent} (expected: ${testCase.expectedIntent})`);
      console.log(`💬 Response: ${data.content.substring(0, 100)}...`);
      
      if (data.extractedContent) {
        console.log(`📄 Canvas Content: ${data.extractedContent.section} - ${data.extractedContent.title}`);
      }
      
      if (data.suggestions) {
        console.log(`💡 Suggestions: ${data.suggestions.join(', ')}`);
      }
      
      console.log('---\n');

    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
}

// Direct xAI API test (without Next.js)
async function testXAIDirectly() {
  console.log('🔧 Testing xAI API directly...\n');

  const systemPrompt = `You are Maya, a grant consultant. Respond with JSON only:
{
  "intent": "chat_advice" | "canvas_write",
  "content": "your response",
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'help me write a proposal' }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.log(`❌ xAI API Error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    console.log('✅ xAI Response:');
    console.log(content);
    
    try {
      const parsed = JSON.parse(content);
      console.log('✅ JSON Parse Success:', parsed);
    } catch (e) {
      console.log('❌ JSON Parse Failed');
    }

  } catch (error) {
    console.log(`❌ xAI Direct Test Error: ${error.message}`);
  }
}

// Run tests
if (require.main === module) {
  console.log('Maya xAI Wrapper Test Suite\n');
  
  // Test xAI directly first
  testXAIDirectly().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Then test the full API
    return testMaya();
  }).then(() => {
    console.log('🎉 Testing complete!');
  }).catch(error => {
    console.error('💥 Test suite failed:', error);
  });
}

module.exports = { testMaya, testXAIDirectly };