import * as path from 'path';
import type { FileClassification, FileCategory } from './types.js';

export interface RepositorySuggestion {
  repositoryName: string;
  confidence: number;
  reasoning: string;
}

export interface BatchFileInfo {
  fileName: string;
  filePath: string;
  contentPreview: string; // First 500 chars
}

export interface BatchClassificationResult {
  fileName: string;
  category: FileCategory;
  confidence: number;
  reasoning: string;
  suggestedRepo?: string;
}

export interface AIProvider {
  name: string;
  classify(filePath: string, content: string): Promise<FileClassification>;
  classifyBatch?(files: BatchFileInfo[], repositories: Array<{ name: string; path: string; isRoot: boolean }>): Promise<BatchClassificationResult[]>;
  suggestRepository(
    filePath: string,
    content: string,
    repositories: Array<{ name: string; path: string; isRoot: boolean }>
  ): Promise<RepositorySuggestion>;
}

export class AnthropicClassifier implements AIProvider {
  name = 'anthropic';
  private apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(private apiKey: string) {}

  async classifyBatch(
    files: BatchFileInfo[],
    repositories: Array<{ name: string; path: string; isRoot: boolean }>
  ): Promise<BatchClassificationResult[]> {
    const repoList = repositories
      .map(r => `- ${r.name} (${r.isRoot ? 'root' : 'sub-repo'})`)
      .join('\n');

    const filesList = files.map((f, idx) => {
      return `FILE ${idx + 1}: ${f.fileName}
Path: ${f.filePath}
Content preview (first 500 chars):
${f.contentPreview}
---`;
    }).join('\n\n');

    const prompt = `Analyze these ${files.length} files from a monorepo and classify each one.

Available repositories:
${repoList}

FILES TO ANALYZE:
${filesList}

For each file, determine:
1. Category: documentation, script, test, source, config, or asset
2. Which repository it belongs to (based on content, not just filename)
3. Confidence level (0.0-1.0)
4. Brief reasoning

IMPORTANT:
- Look for technology mentions (iOS/Swift → iOS repo, API/Express → API repo, React/web → web repo)
- Test scripts (test-*, check-*, debug-*) are usually test utilities
- Documentation about a specific tech should go to that repo's documents/ folder
- If it's general project-wide documentation, it stays at root

Respond in JSON array format with one object per file:
[
  {
    "fileName": "exact filename",
    "category": "documentation|script|test|source|config|asset",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "suggestedRepo": "repo name from list or root"
  },
  ...
]`;

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
          max_tokens: 4000, // Larger for batch response
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
      const jsonMatch = data.content[0].text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error: any) {
      throw new Error(`Batch AI classification failed: ${error.message}`);
    }
  }

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

  async suggestRepository(
    filePath: string,
    content: string,
    repositories: Array<{ name: string; path: string; isRoot: boolean }>
  ): Promise<RepositorySuggestion> {
    const truncatedContent = content.substring(0, 3000);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    const repoList = repositories
      .map(r => `- ${r.name} (${r.isRoot ? 'root' : 'sub-repo'})`)
      .join('\n');

    const prompt = `Analyze this file and determine which repository it belongs to in this monorepo.

File: ${fileName}
Content (first 3000 chars):
${truncatedContent}

Available repositories:
${repoList}

IMPORTANT ANALYSIS GUIDELINES:
${ext === '.md' ? `
- This is a MARKDOWN file. Look for:
  * Mentions of specific technologies (iOS, Swift, Android, API, React, etc.)
  * References to specific sub-projects or components
  * If it discusses iOS/Swift implementation → belongs in iOS repo
  * If it discusses API/backend → belongs in API repo
  * If it discusses web/frontend → belongs in web/UI repo
  * If it's a general project summary or documentation → keep at root
` : ''}
${ext === '.js' || ext === '.ts' ? `
- This is a SCRIPT file. Look for:
  * Test scripts (test-*, check-*, debug-*) → should go to tests/ directory
  * Import statements and dependencies
  * Which codebase it's testing or interacting with
` : ''}

Based on the file's content, imports, purpose, and context clues, determine which repository this file should belong to.

Respond in JSON format:
{
  "repositoryName": "exact name from list above",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this file belongs to this repo"
}`;

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
      const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        repositoryName: parsed.repositoryName,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error: any) {
      // Fallback: use root repository
      const rootRepo = repositories.find(r => r.isRoot);
      return {
        repositoryName: rootRepo?.name || repositories[0]?.name || '',
        confidence: 0.3,
        reasoning: 'AI analysis failed, defaulting to root',
      };
    }
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

  async suggestRepository(
    filePath: string,
    content: string,
    repositories: Array<{ name: string; path: string; isRoot: boolean }>
  ): Promise<RepositorySuggestion> {
    const truncatedContent = content.substring(0, 3000);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    const repoList = repositories
      .map(r => `- ${r.name} (${r.isRoot ? 'root' : 'sub-repo'})`)
      .join('\n');

    const prompt = `Analyze this file and determine which repository it belongs to in this monorepo.

File: ${fileName}
Content (first 3000 chars):
${truncatedContent}

Available repositories:
${repoList}

IMPORTANT ANALYSIS GUIDELINES:
${ext === '.md' ? `
- This is a MARKDOWN file. Look for:
  * Mentions of specific technologies (iOS, Swift, Android, API, React, etc.)
  * References to specific sub-projects or components
  * If it discusses iOS/Swift implementation → belongs in iOS repo
  * If it discusses API/backend → belongs in API repo
  * If it discusses web/frontend → belongs in web/UI repo
  * If it's a general project summary or documentation → keep at root
` : ''}
${ext === '.js' || ext === '.ts' ? `
- This is a SCRIPT file. Look for:
  * Test scripts (test-*, check-*, debug-*) → should go to tests/ directory
  * Import statements and dependencies
  * Which codebase it's testing or interacting with
` : ''}

Based on the file's content, imports, purpose, and context clues, determine which repository this file should belong to.

Respond with JSON only:
{
  "repositoryName": "exact name from list above",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this file belongs to this repo"
}`;

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
              content: 'You are a monorepo analysis expert. Respond only with valid JSON.',
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
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        repositoryName: parsed.repositoryName,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error: any) {
      // Fallback: use root repository
      const rootRepo = repositories.find(r => r.isRoot);
      return {
        repositoryName: rootRepo?.name || repositories[0]?.name || '',
        confidence: 0.3,
        reasoning: 'AI analysis failed, defaulting to root',
      };
    }
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
