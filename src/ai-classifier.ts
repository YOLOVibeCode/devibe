import * as path from 'path';
import type { FileClassification, FileCategory } from './types.js';

export interface AIProvider {
  name: string;
  classify(filePath: string, content: string): Promise<FileClassification>;
}

export class AnthropicClassifier implements AIProvider {
  name = 'anthropic';
  private apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(private apiKey: string) {}

  async classify(filePath: string, content: string): Promise<FileClassification> {
    const prompt = this.buildPrompt(filePath, content);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data: any = await response.json();
      const result = this.parseResponse(data.content[0].text, filePath);

      return result;
    } catch (error: any) {
      throw new Error(`AI classification failed: ${error.message}`);
    }
  }

  private buildPrompt(filePath: string, content: string): string {
    const truncatedContent = content.substring(0, 2000); // Limit content size

    return `Classify this file into ONE category: source, config, documentation, script, test, or asset.

File: ${path.basename(filePath)}
Content (first 2000 chars):
${truncatedContent}

Respond in JSON format:
{
  "category": "source|config|documentation|script|test|asset",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
  }

  private parseResponse(text: string, filePath: string): FileClassification {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        path: filePath,
        category: parsed.category as FileCategory,
        confidence: parsed.confidence,
        reasoning: `AI: ${parsed.reasoning}`,
      };
    } catch (error) {
      // Fallback to pattern matching
      return {
        path: filePath,
        category: 'unknown',
        confidence: 0.3,
        reasoning: 'AI parsing failed',
      };
    }
  }
}

export class OpenAIClassifier implements AIProvider {
  name = 'openai';
  private apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(private apiKey: string) {}

  async classify(filePath: string, content: string): Promise<FileClassification> {
    const prompt = this.buildPrompt(filePath, content);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a file classification expert. Respond only with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const result = this.parseResponse(
        data.choices[0].message.content,
        filePath
      );

      return result;
    } catch (error: any) {
      throw new Error(`AI classification failed: ${error.message}`);
    }
  }

  private buildPrompt(filePath: string, content: string): string {
    const truncatedContent = content.substring(0, 2000);

    return `Classify this file into ONE category: source, config, documentation, script, test, or asset.

File: ${path.basename(filePath)}
Content (first 2000 chars):
${truncatedContent}

Respond with JSON only:
{
  "category": "source|config|documentation|script|test|asset",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
  }

  private parseResponse(text: string, filePath: string): FileClassification {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        path: filePath,
        category: parsed.category as FileCategory,
        confidence: parsed.confidence,
        reasoning: `AI: ${parsed.reasoning}`,
      };
    } catch (error) {
      return {
        path: filePath,
        category: 'unknown',
        confidence: 0.3,
        reasoning: 'AI parsing failed',
      };
    }
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

  static getPreferredProvider(): 'anthropic' | 'openai' | null {
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.OPENAI_API_KEY) return 'openai';
    return null;
  }
}
