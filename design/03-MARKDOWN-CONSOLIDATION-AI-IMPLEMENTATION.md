# Markdown Consolidation - AI Developer Implementation Guide

**For AI-Assisted Development | Optimized for Claude, GPT, and similar AI coding assistants**

---

## Context for AI

You are implementing a markdown consolidation feature for a CLI tool called `devibe`. This feature uses AI to intelligently consolidate 30-40 fragmented markdown files into 3-5 organized documents.

**Current codebase:**
- TypeScript/Node.js project
- Existing AI integration via `AIProvider` interface
- Existing backup system via `BackupManager`
- CLI built with Commander.js
- Tests with Vitest

**Key constraint:** This feature REQUIRES AI to be enabled (not optional).

---

## Implementation Order

Follow this exact sequence. Each step builds on the previous.

### Step 1: Types & Interfaces (30 min)
### Step 2: Scanner (4 hours)
### Step 3: Basic Analyzer (4 hours)
### Step 4: AI Analyzer (3 hours)
### Step 5: Consolidator (8 hours)
### Step 6: Super README (4 hours)
### Step 7: Validator (3 hours)
### Step 8: CLI Integration (3 hours)
### Step 9: Tests (8 hours)

**Total:** ~38 hours of focused implementation

---

## STEP 1: Create Types & Interfaces

**File:** `src/markdown-consolidation/types.ts`

**Task:** Define all TypeScript interfaces.

<function_calls>
```typescript
// File: src/markdown-consolidation/types.ts

export interface MarkdownFile {
  path: string;
  relativePath: string;
  name: string;
  size: number;
  lastModified: Date;
  content: string;
  metadata: MarkdownMetadata;
}

export interface MarkdownMetadata {
  title: string;
  headers: string[];
  wordCount: number;
  linkCount: number;
  codeBlockCount: number;
  imageCount: number;
  frontMatter?: Record<string, any>;
}

export interface ScanOptions {
  targetDirectory: string;
  recursive: boolean;
  excludePatterns: string[];
  includeHidden: boolean;
}

export interface RelevanceAnalysis {
  score: number; // 0-100
  factors: RelevanceFactors;
  status: 'highly-relevant' | 'relevant' | 'marginal' | 'stale';
  reasoning: string;
}

export interface RelevanceFactors {
  recency: number;        // 0-25 points
  contentQuality: number; // 0-25 points
  connectivity: number;   // 0-25 points
  uniqueness: number;     // 0-25 points
}

export interface TopicCluster {
  name: string;
  description: string;
  files: MarkdownFile[];
  suggestedFilename: string;
  consolidationStrategy: 'merge' | 'summarize' | 'link-only';
}

export interface ConsolidationPlan {
  strategy: 'merge-by-topic' | 'merge-by-folder' | 'summarize-cluster' | 'create-super-readme' | 'archive-stale';
  inputFiles: MarkdownFile[];
  outputFile: string;
  preserveOriginals: boolean;
  confidence: number;
  reasoning: string;
}

export interface ConsolidationResult {
  success: boolean;
  outputFile: string;
  inputFiles: number;
  action: string;
  backupPath: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConsolidationOptions {
  maxOutputFiles: number;
  preserveOriginals: boolean;
  createSuperReadme: boolean;
}
```

**Success:** All types compile without errors.

---

## STEP 2: Implement Scanner

**File:** `src/markdown-consolidation/markdown-scanner.ts`

**Purpose:** Find markdown files and extract metadata.

**Dependencies to install:**
```bash
npm install fast-glob gray-matter
npm install -D @types/js-yaml
```

**Implementation:**

```typescript
// File: src/markdown-consolidation/markdown-scanner.ts

import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { MarkdownFile, MarkdownMetadata, ScanOptions } from './types';

export class MarkdownScanner {
  async scan(options: ScanOptions): Promise<MarkdownFile[]> {
    const pattern = options.recursive ? '**/*.md' : '*.md';
    
    const files = await fg(pattern, {
      cwd: options.targetDirectory,
      ignore: this.buildIgnorePatterns(options),
      absolute: true,
      dot: options.includeHidden
    });
    
    return Promise.all(
      files.map(filePath => this.analyzeFile(filePath, options.targetDirectory))
    );
  }
  
  private buildIgnorePatterns(options: ScanOptions): string[] {
    const defaults = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.devibe/**',
      '**/.unvibe/**'
    ];
    
    return [...defaults, ...options.excludePatterns];
  }
  
  private async analyzeFile(filePath: string, baseDir: string): Promise<MarkdownFile> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = this.extractMetadata(content);
    
    return {
      path: filePath,
      relativePath: path.relative(baseDir, filePath),
      name: path.basename(filePath),
      size: stats.size,
      lastModified: stats.mtime,
      content,
      metadata
    };
  }
  
  private extractMetadata(content: string): MarkdownMetadata {
    // Parse frontmatter
    let frontMatter: Record<string, any> | undefined;
    try {
      const parsed = matter(content);
      if (Object.keys(parsed.data).length > 0) {
        frontMatter = parsed.data;
      }
    } catch {
      // No frontmatter or invalid
    }
    
    // Extract title
    const title = frontMatter?.title || this.extractTitle(content) || 'Untitled';
    
    // Extract headers
    const headers = this.extractHeaders(content);
    
    // Count elements
    const wordCount = this.countWords(content);
    const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    
    return {
      title,
      headers,
      wordCount,
      linkCount,
      codeBlockCount,
      imageCount,
      frontMatter
    };
  }
  
  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
  
  private extractHeaders(content: string): string[] {
    const matches = content.matchAll(/^#{1,6}\s+(.+)$/gm);
    return Array.from(matches, m => m[1].trim());
  }
  
  private countWords(content: string): number {
    // Remove code blocks
    const withoutCode = content.replace(/```[\s\S]*?```/g, '');
    // Remove links
    const withoutLinks = withoutCode.replace(/\[.*?\]\(.*?\)/g, '');
    // Count words
    return withoutLinks.split(/\s+/).filter(w => w.length > 0).length;
  }
}
```

**Test file:** `tests/unit/markdown-consolidation/scanner.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { MarkdownScanner } from '../../../src/markdown-consolidation/markdown-scanner';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('MarkdownScanner', () => {
  const scanner = new MarkdownScanner();
  const testDir = path.join(process.cwd(), 'test-fixtures', 'markdown-test');
  
  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'test1.md'),
      '# Test Document\n\nThis is a test with 10 words in it.'
    );
    await fs.writeFile(
      path.join(testDir, 'test2.md'),
      '---\ntitle: Custom Title\n---\n\n## Section\n\nContent here.'
    );
  });
  
  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  test('should scan directory and find markdown files', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toMatch(/\.md$/);
  });
  
  test('should extract metadata correctly', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    const test1 = result.find(f => f.name === 'test1.md');
    expect(test1?.metadata.title).toBe('Test Document');
    expect(test1?.metadata.wordCount).toBeGreaterThan(5);
    
    const test2 = result.find(f => f.name === 'test2.md');
    expect(test2?.metadata.title).toBe('Custom Title');
    expect(test2?.metadata.frontMatter?.title).toBe('Custom Title');
  });
});
```

**Success criteria:**
- ✅ Scans directory successfully
- ✅ Extracts metadata (title, headers, word count)
- ✅ Parses frontmatter
- ✅ Tests pass with 90%+ coverage

---

## STEP 3: Implement Basic Analyzer

**File:** `src/markdown-consolidation/markdown-analyzer.ts`

**Purpose:** Calculate relevance scores (0-100) using 4 factors.

**Implementation:**

```typescript
// File: src/markdown-consolidation/markdown-analyzer.ts

import { MarkdownFile, RelevanceAnalysis, RelevanceFactors } from './types';
import * as path from 'path';

export class MarkdownAnalyzer {
  analyzeRelevance(file: MarkdownFile, allFiles: MarkdownFile[]): RelevanceAnalysis {
    const factors: RelevanceFactors = {
      recency: this.scoreRecency(file),
      contentQuality: this.scoreContentQuality(file),
      connectivity: this.scoreConnectivity(file, allFiles),
      uniqueness: this.scoreUniqueness(file, allFiles)
    };
    
    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    const status = this.determineStatus(score);
    const reasoning = this.generateReasoning(factors, file);
    
    return { score, factors, status, reasoning };
  }
  
  private scoreRecency(file: MarkdownFile): number {
    const ageInDays = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays <= 7) return 25;
    if (ageInDays <= 30) return 20;
    if (ageInDays <= 90) return 15;
    if (ageInDays <= 180) return 10;
    return 5;
  }
  
  private scoreContentQuality(file: MarkdownFile): number {
    let score = 0;
    const meta = file.metadata;
    
    // Word count (0-10 points)
    if (meta.wordCount >= 500) score += 10;
    else if (meta.wordCount >= 200) score += 7;
    else if (meta.wordCount >= 50) score += 4;
    else score += 1;
    
    // Structure (0-8 points)
    if (meta.headers.length >= 5) score += 8;
    else if (meta.headers.length >= 3) score += 5;
    else if (meta.headers.length >= 1) score += 3;
    
    // Code blocks (0-4 points)
    if (meta.codeBlockCount >= 3) score += 4;
    else if (meta.codeBlockCount >= 1) score += 2;
    
    // Links (0-3 points)
    if (meta.linkCount >= 5) score += 3;
    else if (meta.linkCount >= 1) score += 2;
    
    return Math.min(25, score);
  }
  
  private scoreConnectivity(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    let score = 0;
    
    // Inbound links
    const inboundLinks = this.countInboundLinks(file, allFiles);
    score += Math.min(15, inboundLinks * 3);
    
    // Outbound links
    const outboundLinks = this.countOutboundLinks(file, allFiles);
    score += Math.min(10, outboundLinks * 2);
    
    return Math.min(25, score);
  }
  
  private scoreUniqueness(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    const similarFiles = this.findSimilarFiles(file, allFiles);
    
    if (similarFiles.length === 0) return 25;
    if (similarFiles.length === 1) return 20;
    if (similarFiles.length <= 3) return 15;
    if (similarFiles.length <= 5) return 10;
    return 5;
  }
  
  private countInboundLinks(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    let count = 0;
    const fileName = path.basename(file.path);
    
    for (const other of allFiles) {
      if (other.path === file.path) continue;
      if (other.content.includes(fileName) || other.content.includes(file.relativePath)) {
        count++;
      }
    }
    
    return count;
  }
  
  private countOutboundLinks(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    const linkMatches = file.content.matchAll(/\[.*?\]\((.*?)\)/g);
    const links = Array.from(linkMatches, m => m[1]);
    
    return links.filter(link => {
      return link.endsWith('.md') && !link.startsWith('http');
    }).length;
  }
  
  private findSimilarFiles(file: MarkdownFile, allFiles: MarkdownFile[]): MarkdownFile[] {
    return allFiles.filter(f => 
      f.path !== file.path &&
      this.calculateTitleSimilarity(file.metadata.title, f.metadata.title) > 0.7
    );
  }
  
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.toLowerCase().split(/\s+/));
    const words2 = new Set(title2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  private determineStatus(score: number): RelevanceAnalysis['status'] {
    if (score >= 75) return 'highly-relevant';
    if (score >= 50) return 'relevant';
    if (score >= 30) return 'marginal';
    return 'stale';
  }
  
  private generateReasoning(factors: RelevanceFactors, file: MarkdownFile): string {
    const reasons: string[] = [];
    
    if (factors.recency < 10) {
      reasons.push('Very old file (6+ months)');
    } else if (factors.recency >= 20) {
      reasons.push('Recently modified');
    }
    
    if (factors.contentQuality < 10) {
      reasons.push('Minimal content or structure');
    } else if (factors.contentQuality >= 20) {
      reasons.push('Well-structured with good content');
    }
    
    if (factors.connectivity === 0) {
      reasons.push('Not referenced by any other files');
    } else if (factors.connectivity >= 15) {
      reasons.push('Well-connected to other documentation');
    }
    
    if (factors.uniqueness < 10) {
      reasons.push('Content significantly duplicated elsewhere');
    } else if (factors.uniqueness >= 20) {
      reasons.push('Contains unique information');
    }
    
    return reasons.join('; ');
  }
}
```

**Success criteria:**
- ✅ Scores calculate correctly (0-100 range)
- ✅ All 4 factors work independently
- ✅ Status classification accurate
- ✅ Reasoning strings generated

---

## STEP 4: Implement AI Analyzer

**File:** `src/markdown-consolidation/ai-content-analyzer.ts`

**Purpose:** Use existing `AIProvider` to cluster files and detect relevance.

**Key:** Use the EXISTING `AIProvider` from `src/ai-provider-resolver.ts`.

**Implementation:**

```typescript
// File: src/markdown-consolidation/ai-content-analyzer.ts

import { AIProvider } from '../ai-provider-resolver';
import { MarkdownFile, TopicCluster } from './types';

export class AIContentAnalyzer {
  constructor(private aiProvider: AIProvider) {}
  
  async clusterByTopic(files: MarkdownFile[]): Promise<TopicCluster[]> {
    const prompt = this.buildClusteringPrompt(files);
    
    try {
      const response = await this.aiProvider.analyzeFileAllocation({
        fileName: 'markdown-clustering',
        fileContent: prompt,
        availableRepos: [],
        context: {} as any
      });
      
      return this.parseClusteringResponse(response.reasoning, files);
    } catch (error) {
      console.warn('AI clustering failed:', (error as Error).message);
      return this.fallbackClustering(files);
    }
  }
  
  private buildClusteringPrompt(files: MarkdownFile[]): string {
    return `
Analyze these markdown files and group them into logical topic clusters.
Goal: Consolidate ${files.length} files into 3-5 coherent documents.

Files to analyze:
${files.map((f, i) => `
${i + 1}. ${f.name} (${f.metadata.wordCount} words)
   Title: ${f.metadata.title}
   Age: ${this.formatAge(f.lastModified)}
   Headers: ${f.metadata.headers.slice(0, 3).join(', ')}${f.metadata.headers.length > 3 ? '...' : ''}
   Content preview: ${f.content.substring(0, 200)}...
`).join('\n')}

Respond with JSON:
{
  "clusters": [
    {
      "name": "cluster-name",
      "description": "what this cluster represents",
      "fileIndices": [1, 3, 5],
      "suggestedFilename": "consolidated-name.md",
      "consolidationStrategy": "merge|summarize|link-only",
      "reasoning": "why these files belong together"
    }
  ],
  "staleFiles": [2, 7],
  "standaloneFiles": [4]
}

Strategies:
- "merge": Combine full content (complementary topics)
- "summarize": Extract key points (similar topics)
- "link-only": Keep separate but reference in README (distinct topics)
`;
  }
  
  private formatAge(date: Date): string {
    const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 7) return `${Math.floor(days)} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  }
  
  private parseClusteringResponse(responseText: string, files: MarkdownFile[]): TopicCluster[] {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const data = JSON.parse(jsonMatch[0]);
      
      return data.clusters.map((cluster: any) => ({
        name: cluster.name,
        description: cluster.description,
        files: cluster.fileIndices.map((i: number) => files[i - 1]),
        suggestedFilename: cluster.suggestedFilename,
        consolidationStrategy: cluster.consolidationStrategy
      }));
    } catch (error) {
      console.warn('Failed to parse AI response:', (error as Error).message);
      return this.fallbackClustering(files);
    }
  }
  
  private fallbackClustering(files: MarkdownFile[]): TopicCluster[] {
    // Simple fallback: cluster by directory
    const clusters = new Map<string, MarkdownFile[]>();
    
    for (const file of files) {
      const dir = file.relativePath.includes('/') 
        ? file.relativePath.split('/')[0]
        : 'root';
      
      if (!clusters.has(dir)) {
        clusters.set(dir, []);
      }
      clusters.get(dir)!.push(file);
    }
    
    return Array.from(clusters.entries()).map(([name, clusterFiles]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: `Files from ${name} directory`,
      files: clusterFiles,
      suggestedFilename: `${name.toUpperCase()}.md`,
      consolidationStrategy: 'merge' as const
    }));
  }
}
```

**Success criteria:**
- ✅ Uses existing AIProvider
- ✅ Handles AI failures gracefully
- ✅ Falls back to directory-based clustering
- ✅ Returns 3-5 clusters

---

## STEP 5: Implement Consolidator

**File:** `src/markdown-consolidation/markdown-consolidator.ts`

**Purpose:** Execute consolidation strategies.

**Critical:** Integrate with existing `BackupManager` from `src/backup-manager.ts`.

**Implementation:**

```typescript
// File: src/markdown-consolidation/markdown-consolidator.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownFile, ConsolidationPlan, ConsolidationResult, ConsolidationOptions, TopicCluster } from './types';
import { BackupManager } from '../backup-manager';
import { AIContentAnalyzer } from './ai-content-analyzer';

export class MarkdownConsolidator {
  constructor(
    private aiAnalyzer: AIContentAnalyzer,
    private backupManager: BackupManager
  ) {}
  
  async createPlan(files: MarkdownFile[], options: ConsolidationOptions): Promise<ConsolidationPlan[]> {
    const clusters = await this.aiAnalyzer.clusterByTopic(files);
    const plans: ConsolidationPlan[] = [];
    
    for (const cluster of clusters.slice(0, options.maxOutputFiles)) {
      if (cluster.consolidationStrategy === 'merge') {
        plans.push({
          strategy: 'merge-by-topic',
          inputFiles: cluster.files,
          outputFile: cluster.suggestedFilename,
          preserveOriginals: options.preserveOriginals,
          confidence: 0.85,
          reasoning: `Merge ${cluster.files.length} files on topic: ${cluster.description}`
        });
      } else if (cluster.consolidationStrategy === 'summarize') {
        plans.push({
          strategy: 'summarize-cluster',
          inputFiles: cluster.files,
          outputFile: cluster.suggestedFilename,
          preserveOriginals: options.preserveOriginals,
          confidence: 0.90,
          reasoning: `Summarize ${cluster.files.length} similar files: ${cluster.description}`
        });
      }
    }
    
    return plans;
  }
  
  async executePlan(plan: ConsolidationPlan): Promise<ConsolidationResult> {
    // Backup originals
    const filePaths = plan.inputFiles.map(f => f.path);
    await this.backupManager.createBackup(filePaths, 'markdown-consolidation');
    
    let consolidatedContent: string;
    
    switch (plan.strategy) {
      case 'merge-by-topic':
        consolidatedContent = this.mergeByTopic(plan.inputFiles);
        break;
      case 'merge-by-folder':
        consolidatedContent = this.mergeByFolder(plan.inputFiles);
        break;
      case 'summarize-cluster':
        consolidatedContent = this.summarizeCluster(plan.inputFiles);
        break;
      default:
        throw new Error(`Unknown strategy: ${plan.strategy}`);
    }
    
    // Write consolidated file
    await fs.mkdir(path.dirname(plan.outputFile), { recursive: true });
    await fs.writeFile(plan.outputFile, consolidatedContent);
    
    return {
      success: true,
      outputFile: plan.outputFile,
      inputFiles: plan.inputFiles.length,
      action: plan.strategy,
      backupPath: await this.backupManager.getLatestBackupPath()
    };
  }
  
  private mergeByTopic(files: MarkdownFile[]): string {
    const sorted = files.sort((a, b) => b.metadata.wordCount - a.metadata.wordCount);
    const sections: string[] = [];
    
    // Header
    sections.push(`# ${this.inferTopicTitle(files)}`);
    sections.push('');
    sections.push(`*Consolidated from ${files.length} files on ${new Date().toLocaleDateString()}*`);
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Table of contents
    sections.push('## Table of Contents');
    sections.push('');
    for (const file of sorted) {
      sections.push(`- [${file.metadata.title}](#${this.slugify(file.metadata.title)})`);
    }
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Content
    for (const file of sorted) {
      sections.push(`## ${file.metadata.title}`);
      sections.push('');
      sections.push(`*Originally from: ${file.name}*`);
      sections.push('');
      
      let content = file.content.replace(/^#\s+.+$/m, '').trim();
      sections.push(content);
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    // Source attribution
    sections.push('## Source Files');
    sections.push('');
    sections.push('This document was consolidated from:');
    sections.push('');
    for (const file of files) {
      sections.push(`- \`${file.relativePath}\` (${file.metadata.wordCount} words, modified ${file.lastModified.toLocaleDateString()})`);
    }
    
    return sections.join('\n');
  }
  
  private mergeByFolder(files: MarkdownFile[]): string {
    return '# Folder Index\n\nComing soon...';
  }
  
  private summarizeCluster(files: MarkdownFile[]): string {
    return '# Summary\n\nComing soon...';
  }
  
  private inferTopicTitle(files: MarkdownFile[]): string {
    const words = files.map(f => f.metadata.title.toLowerCase().split(/\s+/));
    const commonWords = this.findCommonWords(words);
    
    if (commonWords.length > 0) {
      return commonWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    return 'Consolidated Documentation';
  }
  
  private findCommonWords(wordArrays: string[][]): string[] {
    const wordCounts = new Map<string, number>();
    
    for (const words of wordArrays) {
      const uniqueWords = new Set(words);
      for (const word of uniqueWords) {
        if (word.length > 3) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }
    
    const threshold = wordArrays.length / 2;
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([word, _]) => word)
      .slice(0, 3);
  }
  
  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  }
}
```

**Success criteria:**
- ✅ Creates plans successfully
- ✅ Executes merge-by-topic strategy
- ✅ Backs up files before changes
- ✅ Generates valid markdown output

---

## STEP 6: Implement Super README Generator

**File:** `src/markdown-consolidation/super-readme-generator.ts`

**Purpose:** Create documentation hub with categorized navigation.

**Implementation:**

```typescript
// File: src/markdown-consolidation/super-readme-generator.ts

import { MarkdownFile } from './types';

export class SuperReadmeGenerator {
  async generate(files: MarkdownFile[], existingReadme?: MarkdownFile): Promise<string> {
    const sections: string[] = [];
    
    sections.push('# Documentation Hub');
    sections.push('');
    sections.push('*Consolidated navigation for all project documentation*');
    sections.push('');
    sections.push('---');
    sections.push('');
    
    if (existingReadme) {
      sections.push('## Main Documentation');
      sections.push('');
      sections.push('📖 [Project README](./README.md) - Start here for overview');
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    const categorized = this.categorizeFiles(files);
    
    for (const [categoryName, categoryFiles] of Object.entries(categorized)) {
      if (categoryFiles.length === 0) continue;
      
      const icon = this.getCategoryIcon(categoryName);
      sections.push(`## ${icon} ${categoryName}`);
      sections.push('');
      
      for (const file of categoryFiles) {
        sections.push(`### [${file.metadata.title}](${file.relativePath})`);
        sections.push('');
        sections.push(`*${file.metadata.wordCount} words · ${this.formatDate(file.lastModified)}*`);
        sections.push('');
      }
    }
    
    sections.push('---');
    sections.push('');
    sections.push(`*This index was automatically generated on ${new Date().toLocaleDateString()}*`);
    
    return sections.join('\n');
  }
  
  private categorizeFiles(files: MarkdownFile[]): Record<string, MarkdownFile[]> {
    const categories: Record<string, MarkdownFile[]> = {
      'Architecture & Design': [],
      'Guides & Tutorials': [],
      'API Reference': [],
      'Development': [],
      'Planning & Notes': [],
      'Other': []
    };
    
    for (const file of files) {
      const category = this.determineCategory(file);
      categories[category].push(file);
    }
    
    return categories;
  }
  
  private determineCategory(file: MarkdownFile): string {
    const title = file.metadata.title.toLowerCase();
    const pathLower = file.relativePath.toLowerCase();
    
    if (pathLower.includes('/specs/') || title.includes('architecture') || title.includes('design')) {
      return 'Architecture & Design';
    }
    if (pathLower.includes('/guides/') || title.includes('guide') || title.includes('tutorial')) {
      return 'Guides & Tutorials';
    }
    if (pathLower.includes('/api/') || title.includes('api') || title.includes('reference')) {
      return 'API Reference';
    }
    if (title.includes('development') || title.includes('coding')) {
      return 'Development';
    }
    if (title.includes('note') || title.includes('planning')) {
      return 'Planning & Notes';
    }
    
    return 'Other';
  }
  
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Architecture & Design': '🏗️',
      'Guides & Tutorials': '📚',
      'API Reference': '🔌',
      'Development': '💻',
      'Planning & Notes': '📝',
      'Other': '📄'
    };
    return icons[category] || '📄';
  }
  
  private formatDate(date: Date): string {
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  }
}
```

**Success criteria:**
- ✅ Generates valid markdown
- ✅ Categorizes files correctly
- ✅ Adds icons and formatting
- ✅ Links work correctly

---

## STEP 7: Implement Validator

**File:** `src/markdown-consolidation/consolidation-validator.ts`

**Purpose:** Validate safety and content preservation.

**Implementation:**

```typescript
// File: src/markdown-consolidation/consolidation-validator.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownFile, ValidationResult } from './types';

export class ConsolidationValidator {
  async validate(
    originalFiles: MarkdownFile[],
    consolidatedFiles: string[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check files exist
    for (const file of consolidatedFiles) {
      try {
        await fs.access(file);
      } catch {
        errors.push(`Consolidated file not created: ${file}`);
      }
    }
    
    // Check content preservation
    const originalWordCount = originalFiles.reduce(
      (sum, f) => sum + f.metadata.wordCount,
      0
    );
    
    let consolidatedWordCount = 0;
    for (const file of consolidatedFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        consolidatedWordCount += content.split(/\s+/).length;
      } catch {
        // File doesn't exist, already logged above
      }
    }
    
    const loss = (originalWordCount - consolidatedWordCount) / originalWordCount;
    if (loss > 0.3) {
      errors.push(`Significant content loss: ${Math.round(loss * 100)}%`);
    } else if (loss > 0.1) {
      warnings.push(`Moderate content reduction: ${Math.round(loss * 100)}%`);
    }
    
    // Check links
    for (const file of consolidatedFiles) {
      const brokenLinks = await this.findBrokenLinks(file);
      if (brokenLinks.length > 0) {
        warnings.push(`Broken links in ${path.basename(file)}: ${brokenLinks.length} found`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private async findBrokenLinks(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const links = Array.from(content.matchAll(/\[.*?\]\((.*?)\)/g), m => m[1]);
      const brokenLinks: string[] = [];
      const dir = path.dirname(filePath);
      
      for (const link of links) {
        if (link.startsWith('http') || link.startsWith('#')) {
          continue;
        }
        
        const targetPath = path.resolve(dir, link);
        try {
          await fs.access(targetPath);
        } catch {
          brokenLinks.push(link);
        }
      }
      
      return brokenLinks;
    } catch {
      return [];
    }
  }
}
```

**Success criteria:**
- ✅ Validates file creation
- ✅ Checks content preservation
- ✅ Finds broken links
- ✅ Returns errors and warnings

---

## STEP 8: CLI Integration

**File:** `src/cli.ts` (modify existing)

**Task:** Add `consolidate` and `consolidate finalize` commands.

**Add to cli.ts:**

```typescript
// Add these imports at the top
import { MarkdownScanner } from './markdown-consolidation/markdown-scanner';
import { MarkdownAnalyzer } from './markdown-consolidation/markdown-analyzer';
import { AIContentAnalyzer } from './markdown-consolidation/ai-content-analyzer';
import { MarkdownConsolidator } from './markdown-consolidation/markdown-consolidator';
import { SuperReadmeGenerator } from './markdown-consolidation/super-readme-generator';
import { ConsolidationValidator } from './markdown-consolidation/consolidation-validator';
import { BackupManager } from './backup-manager';
import { AIProviderFactory } from './ai-provider-resolver';
import ora from 'ora';

// Add command
program
  .command('consolidate [directory]')
  .description('Consolidate markdown documentation intelligently')
  .option('-r, --recursive', 'Process subdirectories recursively')
  .option('--max-output <number>', 'Maximum output files', '5')
  .option('--dry-run', 'Preview without making changes')
  .option('--auto', 'Auto-approve consolidation plan')
  .option('--exclude <pattern>', 'Exclude file patterns', (val, prev) => [...prev, val], [])
  .action(async (directory: string = '.', options: any) => {
    await consolidateCommand(directory, options);
  });

async function consolidateCommand(directory: string, options: any): Promise<void> {
  console.log('\n📝 Markdown Consolidation\n');
  
  // Check AI enabled
  const config = loadConfig();
  if (!config.ai?.enabled) {
    console.error('❌ AI engine must be enabled for markdown consolidation');
    console.error('Setup AI with: devibe config set-api-key');
    process.exit(1);
  }
  
  const aiProvider = AIProviderFactory.create(config.ai);
  if (!aiProvider) {
    console.error('❌ Failed to initialize AI provider');
    process.exit(1);
  }
  
  // Initialize components
  const scanner = new MarkdownScanner();
  const analyzer = new MarkdownAnalyzer();
  const aiAnalyzer = new AIContentAnalyzer(aiProvider);
  const backupManager = new BackupManager();
  const consolidator = new MarkdownConsolidator(aiAnalyzer, backupManager);
  const readmeGenerator = new SuperReadmeGenerator();
  const validator = new ConsolidationValidator();
  
  // Scan
  const spinner = ora('Scanning directory...').start();
  const files = await scanner.scan({
    targetDirectory: directory,
    recursive: options.recursive || false,
    excludePatterns: options.exclude || [],
    includeHidden: false
  });
  spinner.succeed(`Found ${files.length} markdown files`);
  
  if (files.length === 0) {
    console.log('No markdown files found.');
    return;
  }
  
  // Analyze
  spinner.start('Analyzing relevance and relationships...');
  const analyses = files.map(f => analyzer.analyzeRelevance(f, files));
  spinner.succeed('Analysis complete');
  
  // Show summary
  console.log('\nAnalysis Summary:');
  const byStatus = analyses.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`  Highly Relevant: ${byStatus['highly-relevant'] || 0}`);
  console.log(`  Relevant:        ${byStatus['relevant'] || 0}`);
  console.log(`  Marginal:        ${byStatus['marginal'] || 0}`);
  console.log(`  Stale:           ${byStatus['stale'] || 0}`);
  
  // Create plan
  spinner.start('Creating consolidation plan...');
  const plans = await consolidator.createPlan(files, {
    maxOutputFiles: parseInt(options.maxOutput) || 5,
    preserveOriginals: true,
    createSuperReadme: true
  });
  spinner.succeed(`Created plan with ${plans.length} consolidations`);
  
  // Display plan
  console.log('\nConsolidation Plan:');
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    console.log(`${i + 1}. ${plan.strategy}`);
    console.log(`   Output: ${plan.outputFile}`);
    console.log(`   Input:  ${plan.inputFiles.length} files`);
  }
  
  const totalInput = plans.reduce((sum, p) => sum + p.inputFiles.length, 0);
  const totalOutput = plans.length;
  const reduction = Math.round((1 - totalOutput / totalInput) * 100);
  
  console.log(`\nImpact: ${totalInput} files → ${totalOutput} files (${reduction}% reduction)`);
  
  if (options.dryRun) {
    console.log('\n✓ Dry run complete. No changes made.');
    return;
  }
  
  // Confirm
  if (!options.auto) {
    const { default: inquirer } = await import('inquirer');
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Execute consolidation plan?',
      default: false
    }]);
    
    if (!confirmed) {
      console.log('Consolidation cancelled.');
      return;
    }
  }
  
  // Execute
  console.log('\nExecuting consolidation...');
  const results = [];
  for (const plan of plans) {
    const planSpinner = ora(plan.outputFile).start();
    try {
      const result = await consolidator.executePlan(plan);
      results.push(result);
      planSpinner.succeed();
    } catch (error) {
      planSpinner.fail(`Error: ${(error as Error).message}`);
    }
  }
  
  // Generate super README
  spinner.start('Generating documentation hub...');
  const superReadme = await readmeGenerator.generate(files);
  await fs.writeFile(path.join(directory, 'DOCUMENTATION_HUB.md'), superReadme);
  spinner.succeed('Documentation hub created');
  
  // Validate
  spinner.start('Validating consolidation...');
  const validation = await validator.validate(
    files,
    results.map(r => r.outputFile)
  );
  
  if (validation.valid) {
    spinner.succeed('Validation passed');
  } else {
    spinner.fail('Validation found issues');
    validation.errors.forEach(e => console.error(`  ❌ ${e}`));
  }
  
  validation.warnings.forEach(w => console.warn(`  ⚠️  ${w}`));
  
  // Summary
  console.log('\n✓ Consolidation Complete');
  console.log(`\nCreated ${results.length} consolidated files`);
  console.log(`Processed ${totalInput} original files`);
  console.log('\nOriginal files preserved (not deleted yet)');
  console.log('Review consolidated files, then run:');
  console.log(`  devibe consolidate finalize ${directory}`);
}
```

**Success criteria:**
- ✅ Command registers correctly
- ✅ Checks AI is enabled
- ✅ Shows progress indicators
- ✅ Displays plan summary
- ✅ Executes consolidation

---

## STEP 9: Create Tests

Create comprehensive tests for each component.

**Test files needed:**
1. `tests/unit/markdown-consolidation/scanner.test.ts` (done in Step 2)
2. `tests/unit/markdown-consolidation/analyzer.test.ts`
3. `tests/unit/markdown-consolidation/ai-analyzer.test.ts`
4. `tests/unit/markdown-consolidation/consolidator.test.ts`
5. `tests/unit/markdown-consolidation/readme-generator.test.ts`
6. `tests/unit/markdown-consolidation/validator.test.ts`
7. `tests/integration/markdown-consolidation.test.ts`

**Target:** 90%+ coverage

---

## Configuration

**Add to config file:**

```typescript
// Add to src/config.ts

export interface ConsolidationConfig {
  requireAI: boolean;
  defaults: {
    maxOutputFiles: number;
    preserveOriginals: boolean;
    createSuperReadme: boolean;
    recursive: boolean;
  };
  relevance: {
    highlyRelevant: number;
    relevant: number;
    marginal: number;
    stale: number;
  };
  protected: string[];
}

// Add to default config
consolidation: {
  requireAI: true,
  defaults: {
    maxOutputFiles: 5,
    preserveOriginals: true,
    createSuperReadme: true,
    recursive: false
  },
  relevance: {
    highlyRelevant: 75,
    relevant: 50,
    marginal: 30,
    stale: 0
  },
  protected: [
    'README.md',
    'LICENSE*',
    'CHANGELOG*',
    'CONTRIBUTING.md'
  ]
}
```

---

## Success Criteria (Final Check)

When implementation is complete, verify:

- [ ] All TypeScript compiles without errors
- [ ] `npm test` passes with 90%+ coverage
- [ ] Command works: `devibe consolidate --help`
- [ ] Can scan directory: `devibe consolidate ./test-docs --dry-run`
- [ ] Can consolidate: `devibe consolidate ./test-docs --auto`
- [ ] AI required check works (fails without AI)
- [ ] Backup created before consolidation
- [ ] Validation detects issues
- [ ] Super README generated correctly
- [ ] Original files preserved until finalize

---

## Common Issues & Solutions

### Issue: "Cannot find module 'fast-glob'"
**Solution:** Run `npm install fast-glob gray-matter`

### Issue: "AIProvider not found"
**Solution:** Import from `../ai-provider-resolver`, not a new path

### Issue: "BackupManager not found"
**Solution:** Import from `../backup-manager`, ensure it exists in codebase

### Issue: AI clustering returns empty array
**Solution:** Check AI prompt format, ensure JSON response is parsed correctly

### Issue: Tests fail with "ENOENT: no such file or directory"
**Solution:** Create test directories in `beforeAll`, clean up in `afterAll`

---

## File Creation Order (Quick Reference)

1. `src/markdown-consolidation/types.ts`
2. `src/markdown-consolidation/markdown-scanner.ts`
3. `src/markdown-consolidation/markdown-analyzer.ts`
4. `src/markdown-consolidation/ai-content-analyzer.ts`
5. `src/markdown-consolidation/markdown-consolidator.ts`
6. `src/markdown-consolidation/super-readme-generator.ts`
7. `src/markdown-consolidation/consolidation-validator.ts`
8. `src/markdown-consolidation/index.ts` (exports)
9. Modify `src/cli.ts` (add commands)
10. Create all test files
11. Add configuration to `src/config.ts`

---

## Export File

**Create:** `src/markdown-consolidation/index.ts`

```typescript
export { MarkdownScanner } from './markdown-scanner';
export { MarkdownAnalyzer } from './markdown-analyzer';
export { AIContentAnalyzer } from './ai-content-analyzer';
export { MarkdownConsolidator } from './markdown-consolidator';
export { SuperReadmeGenerator } from './super-readme-generator';
export { ConsolidationValidator } from './consolidation-validator';
export * from './types';
```

---

**IMPLEMENTATION COMPLETE WHEN:**
All files created, tests pass, CLI command works, and you can successfully consolidate markdown files with `devibe consolidate`.

**Estimated Time:** 38 hours focused implementation
**Lines of Code:** ~3,300 (implementation) + ~2,000 (tests) = ~5,300 total

---

**Start with Step 1 (types) and work sequentially through Step 9.**




