/**
 * AI Learning Database
 *
 * Stores user corrections and learned patterns to improve
 * AI classification accuracy over time.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface FileCorrection {
  filePath: string;
  fileName: string;
  aiSuggestion: {
    category: string;
    repository?: string;
    targetPath: string;
  };
  userCorrection: {
    category: string;
    repository?: string;
    targetPath: string;
  };
  timestamp: string;
  fileContent?: string; // First 1000 chars for pattern learning
  imports?: string[]; // Detected imports/dependencies
}

export interface LearnedPattern {
  id: string;
  pattern: string; // Description of the pattern
  rule: string; // What we learned
  confidence: number;
  examples: string[]; // Example file names
  createdAt: string;
  usageCount: number;
}

export interface ProjectStructure {
  type: 'monorepo' | 'single-repo';
  framework?: string; // nx, turborepo, lerna, etc.
  repositories: {
    name: string;
    path: string;
    technology?: string; // React, Node.js, iOS, etc.
    isRoot: boolean;
  }[];
  testStrategy?: 'colocated' | 'centralized' | 'per-package';
  analyzedAt: string;
}

export interface LearningData {
  corrections: FileCorrection[];
  patterns: LearnedPattern[];
  projectStructure?: ProjectStructure;
  version: string;
}

export class AILearningDatabase {
  private dbPath: string;
  private data: LearningData = {
    corrections: [],
    patterns: [],
    version: '1.0.0',
  };

  constructor() {
    const configDir = path.join(os.homedir(), '.devibe');
    this.dbPath = path.join(configDir, 'ai-learning.json');
  }

  /**
   * Load learning data from disk
   */
  async load(): Promise<LearningData> {
    try {
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
      return this.data;
    } catch (error) {
      // File doesn't exist, return empty data
      this.data = {
        corrections: [],
        patterns: [],
        version: '1.0.0',
      };
      return this.data;
    }
  }

  /**
   * Save learning data to disk
   */
  async save(): Promise<void> {
    try {
      const configDir = path.dirname(this.dbPath);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        this.dbPath,
        JSON.stringify(this.data, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  }

  /**
   * Add a user correction
   */
  async addCorrection(correction: FileCorrection): Promise<void> {
    await this.load();
    this.data.corrections.push(correction);

    // Automatically learn patterns from this correction
    await this.learnFromCorrection(correction);

    await this.save();
  }

  /**
   * Learn patterns from a correction
   */
  private async learnFromCorrection(correction: FileCorrection): Promise<void> {
    const { fileName, userCorrection, fileContent, imports } = correction;

    // Pattern 1: File name patterns
    const nameParts = fileName.split(/[-_.]/).filter(p => p.length > 2);
    for (const part of nameParts) {
      const existingPattern = this.data.patterns.find(
        p => p.pattern.includes(part) && p.rule.includes(userCorrection.category)
      );

      if (existingPattern) {
        // Strengthen existing pattern
        existingPattern.confidence = Math.min(0.95, existingPattern.confidence + 0.05);
        existingPattern.usageCount++;
        if (!existingPattern.examples.includes(fileName)) {
          existingPattern.examples.push(fileName);
        }
      } else {
        // Create new pattern
        this.data.patterns.push({
          id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern: `File name contains "${part}"`,
          rule: `Likely category: ${userCorrection.category}, target: ${userCorrection.targetPath}`,
          confidence: 0.6,
          examples: [fileName],
          createdAt: new Date().toISOString(),
          usageCount: 1,
        });
      }
    }

    // Pattern 2: Import-based patterns
    if (imports && imports.length > 0) {
      const importPattern = imports.map(i => this.extractPackageName(i)).filter(Boolean);
      if (importPattern.length > 0) {
        const patternStr = importPattern.join(', ');
        this.data.patterns.push({
          id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern: `Imports from: ${patternStr}`,
          rule: `Should go to: ${userCorrection.targetPath}`,
          confidence: 0.75,
          examples: [fileName],
          createdAt: new Date().toISOString(),
          usageCount: 1,
        });
      }
    }

    // Pattern 3: Content-based patterns
    if (fileContent) {
      const keywords = this.extractKeywords(fileContent);
      if (keywords.length > 0) {
        const keywordPattern = keywords.slice(0, 3).join(', ');
        this.data.patterns.push({
          id: `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern: `Contains keywords: ${keywordPattern}`,
          rule: `Category: ${userCorrection.category}, Repository: ${userCorrection.repository || 'root'}`,
          confidence: 0.7,
          examples: [fileName],
          createdAt: new Date().toISOString(),
          usageCount: 1,
        });
      }
    }

    // Keep only top 100 patterns (most confident/used)
    this.data.patterns.sort((a, b) =>
      (b.confidence * b.usageCount) - (a.confidence * a.usageCount)
    );
    if (this.data.patterns.length > 100) {
      this.data.patterns = this.data.patterns.slice(0, 100);
    }
  }

  /**
   * Extract package name from import statement
   */
  private extractPackageName(importStr: string): string | null {
    // Handle various import formats
    const patterns = [
      /from ['"](@[\w-]+\/[\w-]+)['"]/,  // @scope/package
      /from ['"]([^'".\/][^'"]+)['"]/,    // package-name
      /require\(['"](@[\w-]+\/[\w-]+)['"]\)/, // require @scope
      /require\(['"]([^'".\/][^'"]+)['"]\)/,  // require package
    ];

    for (const pattern of patterns) {
      const match = importStr.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Extract significant keywords from content
   */
  private extractKeywords(content: string): string[] {
    const keywords = new Set<string>();
    const significantWords = [
      'api', 'server', 'client', 'ios', 'android', 'web', 'mobile',
      'test', 'spec', 'mock', 'fixture', 'database', 'migration',
      'component', 'service', 'controller', 'model', 'view',
      'auth', 'authentication', 'authorization', 'login', 'user',
    ];

    const lowercaseContent = content.toLowerCase();
    for (const word of significantWords) {
      if (lowercaseContent.includes(word)) {
        keywords.add(word);
      }
    }

    return Array.from(keywords);
  }

  /**
   * Get learned patterns for a file
   */
  async getPatternsForFile(
    fileName: string,
    content?: string,
    imports?: string[]
  ): Promise<LearnedPattern[]> {
    await this.load();
    const matches: Array<{ pattern: LearnedPattern; score: number }> = [];

    for (const pattern of this.data.patterns) {
      let score = 0;

      // Check file name match
      const nameParts = fileName.split(/[-_.]/).filter(p => p.length > 2);
      for (const part of nameParts) {
        if (pattern.pattern.toLowerCase().includes(part.toLowerCase())) {
          score += pattern.confidence * 0.5;
        }
      }

      // Check import match
      if (imports && pattern.pattern.includes('Imports from:')) {
        for (const imp of imports) {
          const pkg = this.extractPackageName(imp);
          if (pkg && pattern.pattern.includes(pkg)) {
            score += pattern.confidence * 0.8;
          }
        }
      }

      // Check content keywords
      if (content && pattern.pattern.includes('Contains keywords:')) {
        const keywords = this.extractKeywords(content);
        for (const keyword of keywords) {
          if (pattern.pattern.toLowerCase().includes(keyword)) {
            score += pattern.confidence * 0.3;
          }
        }
      }

      if (score > 0) {
        matches.push({ pattern, score });
      }
    }

    // Sort by score and return top matches
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5).map(m => m.pattern);
  }

  /**
   * Store project structure analysis
   */
  async storeProjectStructure(structure: ProjectStructure): Promise<void> {
    await this.load();
    this.data.projectStructure = structure;
    await this.save();
  }

  /**
   * Get stored project structure
   */
  async getProjectStructure(): Promise<ProjectStructure | undefined> {
    await this.load();
    return this.data.projectStructure;
  }

  /**
   * Get all corrections
   */
  async getCorrections(): Promise<FileCorrection[]> {
    await this.load();
    return this.data.corrections;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalCorrections: number;
    totalPatterns: number;
    hasProjectStructure: boolean;
    mostCommonCategory: string | null;
    avgConfidence: number;
  }> {
    await this.load();

    const categoryCount = new Map<string, number>();
    for (const correction of this.data.corrections) {
      const cat = correction.userCorrection.category;
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    }

    const mostCommon = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const avgConfidence = this.data.patterns.length > 0
      ? this.data.patterns.reduce((sum, p) => sum + p.confidence, 0) / this.data.patterns.length
      : 0;

    return {
      totalCorrections: this.data.corrections.length,
      totalPatterns: this.data.patterns.length,
      hasProjectStructure: !!this.data.projectStructure,
      mostCommonCategory: mostCommon ? mostCommon[0] : null,
      avgConfidence,
    };
  }

  /**
   * Clear all learning data (for testing or reset)
   */
  async clear(): Promise<void> {
    this.data = {
      corrections: [],
      patterns: [],
      version: '1.0.0',
    };
    await this.save();
  }
}

// Singleton instance
let instance: AILearningDatabase | null = null;

export function getLearningDatabase(): AILearningDatabase {
  if (!instance) {
    instance = new AILearningDatabase();
  }
  return instance;
}
