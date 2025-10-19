/**
 * Maya Agent Type Definitions
 */

export interface ChatContext {
  userId: string;
  grantId: string;
  sessionId?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface MayaResponse {
  content: string;
  confidence: number;
  reasoning?: string;
  suggestions?: string[];
  contentType?: 'chat' | 'proposal_section' | 'document_extract';
  extractedContent?: {
    section: string;
    title: string;
    content: string;
  };
}

export interface UserContext {
  id: string;
  organization?: any; // Use any to match Prisma types
}

export interface GrantContext {
  id: string;
  title?: string;
  funder?: any;
  fundingAmountMin?: any;
  fundingAmountMax?: any;
  deadline?: Date;
  category?: string;
}

export interface ProposalState {
  sections: {
    id: string;
    title: string;
    content: string;
    lastEdited: string;
  }[];
  lastAction: string;
  overallProgress: string; // e.g., "3/8 sections completed"
}