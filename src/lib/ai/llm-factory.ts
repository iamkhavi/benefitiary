/**
 * LLM Factory - Supports multiple AI providers (OpenAI, xAI)
 */

import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface LLMConfig {
  provider: 'openai' | 'xai';
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

export class LLMFactory {
  static createLLM(config?: Partial<LLMConfig>): BaseChatModel {
    const provider = config?.provider || process.env.PRIMARY_AI_PROVIDER || 'xai';
    
    switch (provider) {
      case 'xai':
        return new ChatOpenAI({
          model: config?.model || 'grok-beta',
          temperature: config?.temperature || 0.7,
          maxTokens: config?.maxTokens || 8000, // xAI has higher limits
          openAIApiKey: config?.apiKey || process.env.XAI_API_KEY,
          configuration: {
            baseURL: 'https://api.x.ai/v1',
          },
        });
        
      case 'openai':
      default:
        return new ChatOpenAI({
          model: config?.model || 'gpt-4',
          temperature: config?.temperature || 0.7,
          maxTokens: config?.maxTokens || 4000,
          openAIApiKey: config?.apiKey || process.env.OPENAI_API_KEY,
        });
    }
  }

  static getProviderInfo() {
    const provider = process.env.PRIMARY_AI_PROVIDER || 'xai';
    
    switch (provider) {
      case 'xai':
        return {
          provider: 'xAI',
          model: 'grok-beta',
          maxTokens: 8000,
          features: ['Higher token limits', 'Better reasoning', 'Real-time knowledge']
        };
        
      case 'openai':
      default:
        return {
          provider: 'OpenAI',
          model: 'gpt-4',
          maxTokens: 4000,
          features: ['Stable performance', 'Well-tested', 'Consistent output']
        };
    }
  }
}