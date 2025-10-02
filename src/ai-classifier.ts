import * as fs from 'fs/promises';
import type { FileClassification, FileCategory } from './types.js';

export interface AIProvider {
  name: string;
  classify(filePath: string, content: string): Promise<FileClassification>;
}

export class AnthropicClassifier implements AIProvider {
  name = 'anthropic';

  constructor(private apiKey: string) {}

  async classify(filePath: string, content: string): Promise<FileClassification> {
    // TODO: Implement actual Anthropic API call
    // For now, return high-confidence heuristic
    throw new Error('AI classification requires API key. Set ANTHROPIC_API_KEY environment variable.');
  }
}

export class OpenAIClassifier implements AIProvider {
  name = 'openai';

  constructor(private apiKey: string) {}

  async classify(filePath: string, content: string): Promise<FileClassification> {
    // TODO: Implement actual OpenAI API call
    throw new Error('AI classification requires API key. Set OPENAI_API_KEY environment variable.');
  }
}

export class AIClassifierFactory {
  static create(provider: 'anthropic' | 'openai' = 'anthropic'): AIProvider | null {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (provider === 'anthropic' && anthropicKey) {
      return new AnthropicClassifier(anthropicKey);
    }

    if (provider === 'openai' && openaiKey) {
      return new OpenAIClassifier(openaiKey);
    }

    return null;
  }

  static isAvailable(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  }
}
