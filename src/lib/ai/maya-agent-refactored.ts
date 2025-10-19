/**
 * Maya Agent - Refactored for clarity and maintainability
 */

import { prisma } from '@/lib/prisma';
import { ChatContext, MayaResponse, UserContext, GrantContext } from './types';
import { IntentDetector, UserIntent } from './intent-detector';
import { ResponseGenerator } from './response-generator';
import { ProposalGenerator } from './proposal-generator';
import { LLMFactory } from './llm-factory';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export class MayaAgent {
    private llm: BaseChatModel;
    private context: ChatContext | null = null;
    private userContext: any = null;
    private grantContext: any = null;

    private intentDetector: IntentDetector;
    private responseGenerator: ResponseGenerator;
    private proposalGenerator: ProposalGenerator;

    constructor() {
        // Use xAI as primary provider with higher token limits
        this.llm = LLMFactory.createLLM({
            provider: 'xai',
            model: 'grok-beta',
            temperature: 0.7,
            maxTokens: 8000, // Much higher than OpenAI's 4000
        });

        this.intentDetector = new IntentDetector();
        this.responseGenerator = new ResponseGenerator(this.llm);
        this.proposalGenerator = new ProposalGenerator(this.llm);
    }

    /**
     * Initialize Maya with user and grant context
     */
    async initialize(userId: string, grantId: string, sessionId?: string): Promise<void> {
        const [user, grant] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                include: { organization: true }
            }),
            prisma.grant.findUnique({
                where: { id: grantId },
                include: { funder: true }
            })
        ]);

        if (!user || !grant) {
            throw new Error('User or grant not found');
        }

        // Load conversation history
        let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        if (sessionId) {
            const session = await prisma.aIGrantSession.findUnique({
                where: { id: sessionId },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        take: 20
                    }
                }
            });

            if (session) {
                messages = session.messages.map(msg => ({
                    role: msg.sender === 'USER' ? 'user' as const : 'assistant' as const,
                    content: msg.content
                }));
            }
        }

        this.context = { userId, grantId, sessionId, messages };
        this.userContext = user;
        this.grantContext = grant;
    }

    /**
     * Main chat method - handles all user interactions
     */
    async chat(userMessage: string): Promise<MayaResponse> {
        if (!this.context || !this.userContext || !this.grantContext) {
            throw new Error('Maya agent not initialized');
        }

        try {
            // Detect user intent
            const intent = this.intentDetector.detectIntent(userMessage);

            console.log('=== MAYA INTENT DETECTION ===');
            console.log('User Message:', userMessage);
            console.log('Detected Intent:', intent);
            console.log('=============================');

            // Handle based on intent
            let response: MayaResponse;

            switch (intent.type) {
                case 'complaint':
                    response = await this.handleComplaint(intent, userMessage);
                    break;

                case 'proposal_request':
                    response = await this.handleProposalRequest(intent, userMessage);
                    break;

                case 'file_upload':
                    response = await this.handleFileUpload(userMessage);
                    break;

                case 'question':
                case 'clarification':
                case 'unknown':
                default:
                    response = await this.handleGeneralChat(userMessage);
                    break;
            }

            // Update conversation history
            this.context.messages.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: response.content }
            );

            // Keep only last 20 messages
            if (this.context.messages.length > 20) {
                this.context.messages = this.context.messages.slice(-20);
            }

            return response;

        } catch (error) {
            console.error('Maya chat error:', error);
            return {
                content: "I'm having trouble processing that request. Could you try rephrasing it?",
                confidence: 0.1,
                reasoning: 'Error in processing user request',
                suggestions: ['Try rephrasing your request', 'Check your internet connection'],
                contentType: 'chat'
            };
        }
    }

    /**
     * Handle user complaints about missing content
     */
    private async handleComplaint(intent: UserIntent, userMessage: string): Promise<MayaResponse> {
        console.log('HANDLING COMPLAINT - Generating content immediately');

        // User is frustrated - immediately generate what they need
        const section = intent.section || 'complete_proposal';

        if (section === 'complete_proposal') {
            return await this.proposalGenerator.generateCompleteProposal(
                this.userContext!,
                this.grantContext!
            );
        } else {
            return await this.proposalGenerator.generateSection(
                section,
                this.userContext!,
                this.grantContext!,
                userMessage
            );
        }
    }

    /**
     * Handle proposal content requests
     */
    private async handleProposalRequest(intent: UserIntent, userMessage: string): Promise<MayaResponse> {
        const section = intent.section || 'executive';

        if (intent.specifics?.isComplete || section === 'complete_proposal') {
            return await this.proposalGenerator.generateCompleteProposal(
                this.userContext!,
                this.grantContext!
            );
        } else {
            return await this.proposalGenerator.generateSection(
                section,
                this.userContext!,
                this.grantContext!,
                userMessage
            );
        }
    }

    /**
     * Handle file upload related requests
     */
    private async handleFileUpload(userMessage: string): Promise<MayaResponse> {
        return {
            content: "I can help analyze uploaded documents. Please upload your file and let me know what you'd like me to focus on - whether it's an RFP to review, a previous proposal to improve, or supporting documents to incorporate.",
            confidence: 0.8,
            reasoning: 'Providing guidance on file upload process',
            suggestions: [
                'Upload RFP or grant guidelines',
                'Share previous proposals for improvement',
                'Upload supporting documents'
            ],
            contentType: 'chat'
        };
    }

    /**
     * Handle general chat and questions
     */
    private async handleGeneralChat(userMessage: string): Promise<MayaResponse> {
        const content = await this.responseGenerator.generateChatResponse(
            userMessage,
            this.context!.messages,
            this.userContext!,
            this.grantContext!
        );

        return {
            content,
            confidence: 0.85,
            reasoning: 'Natural conversation response',
            suggestions: this.extractSuggestions(content),
            contentType: 'chat'
        };
    }

    /**
     * Analyze uploaded files
     */
    async analyzeUploadedFile(fileName: string, fileContent: string, fileType: string): Promise<MayaResponse> {
        if (!this.context) {
            throw new Error('Maya agent not initialized');
        }

        // Simple file analysis - can be enhanced later
        const content = `I've analyzed your uploaded file: **${fileName}**

**File type:** ${fileType}
**Content length:** ${fileContent.length} characters

I can help you:
• Extract key information for your proposal
• Identify requirements from RFP documents  
• Incorporate relevant details into proposal sections
• Adapt your content to match funder preferences

What would you like me to focus on from this document?`;

        return {
            content,
            confidence: 0.8,
            reasoning: `Analyzed uploaded file: ${fileName}`,
            suggestions: [
                'Extract key requirements',
                'Incorporate into proposal',
                'Identify funder preferences'
            ],
            contentType: 'document_extract'
        };
    }

    /**
     * Save conversation to database
     */
    async saveConversation(userMessage: string, mayaResponse: MayaResponse): Promise<{ sessionId: string; messageId: string }> {
        if (!this.context) {
            throw new Error('No context available for saving');
        }

        const session = await prisma.aIGrantSession.upsert({
            where: {
                userId_grantId: {
                    userId: this.context.userId,
                    grantId: this.context.grantId,
                },
            },
            update: {
                updatedAt: new Date(),
            },
            create: {
                userId: this.context.userId,
                grantId: this.context.grantId,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        const message = await prisma.aIMessage.create({
            data: {
                sessionId: session.id,
                sender: 'USER',
                messageType: 'TEXT',
                content: userMessage,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            }
        });

        await prisma.aIMessage.create({
            data: {
                sessionId: session.id,
                sender: 'AI',
                messageType: 'TEXT',
                content: mayaResponse.content,
                metadata: {
                    model: 'gpt-4',
                    confidence: mayaResponse.confidence,
                    reasoning: mayaResponse.reasoning,
                    suggestions: mayaResponse.suggestions
                }
            }
        });

        return {
            sessionId: session.id,
            messageId: message.id,
        };
    }

    /**
     * Generate clarifying questions
     */
    async generateClarifyingQuestions(topic: string): Promise<MayaResponse> {
        if (!this.context) {
            throw new Error('Maya agent not initialized');
        }

        const content = await this.responseGenerator.generateChatResponse(
            `Generate clarifying questions about: ${topic}`,
            this.context.messages,
            this.userContext!,
            this.grantContext!
        );

        return {
            content,
            confidence: 0.8,
            reasoning: `Generated clarifying questions about ${topic}`,
            suggestions: this.extractSuggestions(content),
            contentType: 'chat'
        };
    }

    /**
     * Extract suggestions from content
     */
    private extractSuggestions(content: string): string[] {
        const suggestions: string[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
                const suggestion = line.replace(/^[-•*\d.]\s*/, '').trim();
                if (suggestion.length > 10 && suggestion.length < 100) {
                    suggestions.push(suggestion);
                }
            }
        }

        return suggestions.slice(0, 3);
    }
}

/**
 * Factory function to create Maya agent
 */
export async function createMayaAgent(userId: string, grantId: string, sessionId?: string): Promise<MayaAgent> {
    const maya = new MayaAgent();
    await maya.initialize(userId, grantId, sessionId);
    return maya;
}