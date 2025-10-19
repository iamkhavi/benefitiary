/**
 * User Intent Detection - Understanding what users actually want
 */

export interface UserIntent {
  type: 'proposal_request' | 'complaint' | 'question' | 'file_upload' | 'clarification' | 'unknown';
  section?: string;
  emotion?: 'frustrated' | 'neutral' | 'excited';
  urgency?: 'high' | 'medium' | 'low';
  specifics?: {
    isRewrite?: boolean;
    isComplete?: boolean;
    hasComplaint?: boolean;
  };
}

export class IntentDetector {
  
  /**
   * Analyze user message to understand their intent
   */
  detectIntent(userMessage: string): UserIntent {
    const message = userMessage.toLowerCase();
    
    // Detect emotional state first
    const emotion = this.detectEmotion(message);
    const urgency = this.detectUrgency(message);
    
    // Check for complaints about missing content
    if (this.isComplaint(message)) {
      return {
        type: 'complaint',
        emotion,
        urgency: 'high',
        section: this.detectRequestedSection(message) || 'complete_proposal',
        specifics: { hasComplaint: true }
      };
    }
    
    // Check for proposal requests (be more aggressive)
    if (this.isProposalRequest(message) || this.isCompleteProposalRequest(message)) {
      return {
        type: 'proposal_request',
        emotion,
        urgency,
        section: this.detectRequestedSection(message) || 'complete_proposal',
        specifics: {
          isRewrite: this.isRewriteRequest(message),
          isComplete: this.isCompleteProposalRequest(message) || message.includes('proposal')
        }
      };
    }
    
    // Check for file upload context
    if (this.isFileUploadRelated(message)) {
      return {
        type: 'file_upload',
        emotion,
        urgency
      };
    }
    
    // Check for clarification requests
    if (this.isClarificationRequest(message)) {
      return {
        type: 'clarification',
        emotion,
        urgency
      };
    }
    
    // Check for general questions
    if (this.isQuestion(message)) {
      return {
        type: 'question',
        emotion,
        urgency
      };
    }
    
    return {
      type: 'unknown',
      emotion,
      urgency
    };
  }
  
  /**
   * Detect user's emotional state
   */
  private detectEmotion(message: string): 'frustrated' | 'neutral' | 'excited' {
    const frustrationWords = [
      'nothing', 'not working', 'missing', 'where is', 'not seeing',
      'frustrated', 'annoyed', 'problem', 'issue', 'wrong', 'broken',
      'again', 'still', 'please', 'need help', 'not appearing'
    ];
    
    const excitementWords = [
      'great', 'awesome', 'perfect', 'excellent', 'love', 'amazing',
      'fantastic', 'wonderful', 'brilliant', 'excited'
    ];
    
    const frustrationCount = frustrationWords.filter(word => message.includes(word)).length;
    const excitementCount = excitementWords.filter(word => message.includes(word)).length;
    
    if (frustrationCount > excitementCount && frustrationCount > 0) {
      return 'frustrated';
    } else if (excitementCount > 0) {
      return 'excited';
    }
    
    return 'neutral';
  }
  
  /**
   * Detect urgency level
   */
  private detectUrgency(message: string): 'high' | 'medium' | 'low' {
    const highUrgencyWords = [
      'urgent', 'asap', 'immediately', 'now', 'quickly', 'deadline',
      'need it today', 'right away', 'emergency'
    ];
    
    const mediumUrgencyWords = [
      'soon', 'when possible', 'need', 'want', 'should', 'could'
    ];
    
    if (highUrgencyWords.some(word => message.includes(word))) {
      return 'high';
    } else if (mediumUrgencyWords.some(word => message.includes(word))) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Check if user is complaining about missing content
   */
  private isComplaint(message: string): boolean {
    const complaintPhrases = [
      'nothing on the canvas', 'see nothing', 'nothing there', 'not seeing anything',
      'where is', 'missing', 'not working', 'not appearing', 'not showing',
      'for sure i see nothing', 'turns out its all a lie', 'not there',
      'where are other sections', 'cannot see them', 'i cannot see',
      'empty pages', 'pages empty', '10 empty', 'only 1 with content',
      'start fresh', 'start a fresh', 'can we just start'
    ];
    
    return complaintPhrases.some(phrase => message.includes(phrase));
  }
  
  /**
   * Check if user wants proposal content
   */
  private isProposalRequest(message: string): boolean {
    const proposalWords = [
      'proposal', 'write', 'create', 'generate', 'draft', 'build',
      'rewrite', 'application', 'document', 'content'
    ];
    
    const contextWords = [
      'grant', 'funding', 'funder', 'submit', 'apply'
    ];
    
    const hasProposalWord = proposalWords.some(word => message.includes(word));
    const hasContext = contextWords.some(word => message.includes(word)) || 
                     message.includes('executive') || 
                     message.includes('budget') ||
                     message.includes('timeline');
    
    return hasProposalWord || hasContext;
  }
  
  /**
   * Check if it's a rewrite request
   */
  private isRewriteRequest(message: string): boolean {
    return message.includes('rewrite') || 
           message.includes('redo') || 
           message.includes('start over') ||
           message.includes('from scratch') ||
           message.includes('again');
  }
  
  /**
   * Check if user wants complete proposal
   */
  private isCompleteProposalRequest(message: string): boolean {
    const completeWords = [
      'complete proposal', 'full proposal', 'entire proposal', 'whole proposal',
      'complete document', 'full document', 'cover page', 'table of contents',
      'rewrite the entire proposal', 'write the proposal', 'please write the proposal',
      'kindly please write the proposal', 'the proposal'
    ];
    
    return completeWords.some(phrase => message.includes(phrase));
  }
  
  /**
   * Detect which section user wants
   */
  private detectRequestedSection(message: string): string | undefined {
    const sections = {
      'executive': ['executive summary', 'executive', 'summary'],
      'project': ['project description', 'project', 'methodology'],
      'budget': ['budget', 'cost', 'financial'],
      'impact': ['impact', 'outcomes', 'results'],
      'timeline': ['timeline', 'schedule', 'milestones'],
      'team': ['team', 'staff', 'qualifications'],
      'complete_proposal': [
        'complete', 'full', 'entire', 'whole', 'cover page',
        'rewrite the entire proposal', 'write the proposal', 
        'the proposal', 'proposal'
      ]
    };
    
    for (const [section, keywords] of Object.entries(sections)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return section;
      }
    }
    
    // Default to complete proposal for general requests
    if (message.includes('write') || message.includes('create') || message.includes('generate')) {
      return 'complete_proposal';
    }
    
    return undefined;
  }
  
  /**
   * Check if message is about file uploads
   */
  private isFileUploadRelated(message: string): boolean {
    const fileWords = [
      'upload', 'file', 'document', 'pdf', 'analyze', 'review',
      'attached', 'uploaded', 'shared'
    ];
    
    return fileWords.some(word => message.includes(word));
  }
  
  /**
   * Check if user is asking for clarification
   */
  private isClarificationRequest(message: string): boolean {
    const clarificationWords = [
      'what', 'how', 'why', 'when', 'where', 'which', 'explain',
      'clarify', 'understand', 'mean', 'help me understand'
    ];
    
    return clarificationWords.some(word => message.includes(word));
  }
  
  /**
   * Check if it's a general question
   */
  private isQuestion(message: string): boolean {
    return message.includes('?') || 
           message.startsWith('can you') ||
           message.startsWith('could you') ||
           message.startsWith('will you') ||
           message.startsWith('do you');
  }
}