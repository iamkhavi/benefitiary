import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';

interface UnifiedMayaRequest {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: {
    page?: string;
    grantId?: string;
    currentContent?: string;
  };
}

interface UnifiedMayaResponse {
  intent: 'chat_advice' | 'canvas_write' | 'hybrid' | 'navigation';
  content: string;
  suggestions: string[];
  extractedContent?: {
    section: string;
    title: string;
    content: string;
    editingIntent: {
      intent: 'append' | 'rewrite' | 'modify';
    };
  };
  actions?: Array<{
    type: 'navigate' | 'open' | 'search' | 'create';
    target: string;
    label: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userMessage, conversationHistory, context }: UnifiedMayaRequest = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if this requires the full Maya capabilities (proposal writing, etc.)
    const needsFullMaya = requiresFullMayaCapabilities(userMessage, context);
    
    if (needsFullMaya && context?.grantId) {
      // Forward to the full Maya API with context
      return forwardToFullMaya(userMessage, conversationHistory || [], context, user);
    }

    // Handle with unified Maya logic
    const response = await processUnifiedMayaRequest(userMessage, conversationHistory, context, user);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unified Maya API Error:', error);
    return NextResponse.json({
      intent: 'chat_advice',
      content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      suggestions: ['Try again', 'Go to dashboard', 'Find grants', 'View applications']
    });
  }
}

// Check if request needs full Maya capabilities
function requiresFullMayaCapabilities(userMessage: string, context?: any): boolean {
  const message = userMessage.toLowerCase();
  
  const fullMayaKeywords = [
    'write', 'create', 'generate', 'draft', 'proposal', 'budget', 'timeline',
    'rewrite', 'improve', 'enhance', 'edit', 'modify', 'review my proposal',
    'analyze this grant', 'help me write', 'create a proposal'
  ];
  
  return fullMayaKeywords.some(keyword => message.includes(keyword));
}

// Forward to full Maya API when needed
async function forwardToFullMaya(
  userMessage: string, 
  history: any[], 
  context: any, 
  user: any
) {
  try {
    const mayaResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/maya`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        grantId: context.grantId,
        history: history || [],
        currentCanvasContent: context.currentContent,
        userContext: { userId: user.id }
      }),
    });

    if (mayaResponse.ok) {
      const data = await mayaResponse.json();
      return NextResponse.json({
        intent: data.intent || 'hybrid',
        content: data.content,
        suggestions: data.suggestions || [],
        extractedContent: data.extractedContent,
        actions: data.actions
      });
    }
  } catch (error) {
    console.error('Error forwarding to full Maya:', error);
  }

  // Fallback response
  return NextResponse.json({
    intent: 'chat_advice',
    content: "I can help you with that! For detailed proposal writing and grant analysis, let me connect you to the right workspace.",
    suggestions: ['Open grant workspace', 'Find grants first', 'Get general advice'],
    actions: [{
      type: 'navigate',
      target: `/grants/${context.grantId}/ai-workspace`,
      label: 'Open AI Workspace'
    }]
  });
}

async function processUnifiedMayaRequest(
  userMessage: string, 
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  context: any = {},
  user: any
): Promise<UnifiedMayaResponse> {
  const message = userMessage.toLowerCase();

  // Navigation intents
  if (message.includes('application') || message.includes('my apps')) {
    return {
      intent: 'navigation',
      content: "I can help you with your applications! You currently have applications in progress. Would you like me to show you their status, help you continue working on them, or create a new application?",
      suggestions: [
        "Show my applications",
        "Continue draft application", 
        "Create new application",
        "Check application status"
      ],
      actions: [{
        type: 'navigate',
        target: '/applications',
        label: 'View Applications'
      }]
    };
  }

  if (message.includes('grant') && (message.includes('find') || message.includes('search') || message.includes('match'))) {
    return {
      intent: 'navigation',
      content: "I'll help you find grants that match your organization! I can show you personalized matches based on your profile, or help you search through our entire grant database. What type of grants are you looking for?",
      suggestions: [
        "Show my grant matches",
        "Search all grants",
        "Healthcare grants",
        "Education grants"
      ],
      actions: [
        {
          type: 'navigate',
          target: '/matches',
          label: 'View Matches'
        },
        {
          type: 'navigate', 
          target: '/grants',
          label: 'Browse All Grants'
        }
      ]
    };
  }

  if (message.includes('proposal') || message.includes('write') || message.includes('create')) {
    return {
      intent: 'hybrid',
      content: "I can absolutely help you create winning proposals! I have full access to professional templates and can provide expert guidance throughout the writing process. Would you like to start with a specific grant or explore templates first?",
      suggestions: [
        "Start new proposal",
        "View proposal templates",
        "Continue existing proposal",
        "Get writing tips"
      ],
      actions: [{
        type: 'navigate',
        target: '/matches',
        label: 'Choose Grant & Start Writing'
      }]
    };
  }

  if (message.includes('profile') || message.includes('setting') || message.includes('account')) {
    return {
      intent: 'navigation',
      content: "I can help you manage your account and profile settings. You can update your organization details, grant preferences, notification settings, and more. What would you like to update?",
      suggestions: [
        "Update organization info",
        "Change grant preferences", 
        "Notification settings",
        "Account security"
      ],
      actions: [{
        type: 'navigate',
        target: '/settings',
        label: 'Open Settings'
      }]
    };
  }

  if (message.includes('how') && (message.includes('work') || message.includes('use') || message.includes('platform'))) {
    return {
      intent: 'chat_advice',
      content: "I'd be happy to explain how Benefitiary works! Our platform helps you find grants, write winning proposals, and manage your applications. Here's what you can do:\n\n• **Find Grants**: We match you with relevant opportunities\n• **Write Proposals**: AI-assisted proposal writing with templates\n• **Track Applications**: Monitor your submission status\n• **Get Expert Advice**: I'm here to help with strategy and guidance",
      suggestions: [
        "Show me grant matches",
        "Help me write a proposal",
        "Explain matching algorithm", 
        "Tour the platform"
      ]
    };
  }

  if (message.includes('status') || message.includes('progress')) {
    return {
      intent: 'chat_advice',
      content: "Let me give you a quick overview of your current progress:\n\n• You have applications in various stages\n• New grant matches are available for you\n• Your profile is set up and active\n\nWould you like me to show you specific details about any of these areas?",
      suggestions: [
        "Show application status",
        "View new matches",
        "Check profile completeness",
        "See recent activity"
      ]
    };
  }

  // Default helpful response
  return {
    intent: 'chat_advice',
    content: "I'm Maya, your AI grant assistant! I can help you with everything from finding grants to writing winning proposals. I have the same capabilities whether we're chatting here or working on specific grants. What would you like to accomplish?",
    suggestions: [
      "Find grants for my organization",
      "Help me write a proposal", 
      "Show my applications",
      "Explain how matching works"
    ]
  };
}