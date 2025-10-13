# Markdown Consolidation Specification

**Version:** 1.0  
**Last Updated:** 2025-10-11  
**Status:** Draft

---

## 1. Overview

This specification defines how UnVibe intelligently analyzes, consolidates, and organizes markdown documentation across a repository. The system addresses the proliferation of markdown files created during vibe coding sessions by:

1. **Analyzing markdown files** for relevance and staleness
2. **Consolidating related content** into logical groupings
3. **Creating super READMEs** with organized link structures
4. **Maintaining AI context** while reducing file count

**Key Goal**: Transform 30-40 fragmented markdown files into 3-5 well-organized documents while preserving all useful information for AI analysis.

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-8.1**: Markdown Discovery & Scanning
- **FR-8.2**: Relevance & Staleness Detection
- **FR-8.3**: Intelligent Content Analysis
- **FR-8.4**: Consolidation Strategy Selection
- **FR-8.5**: Super README Generation
- **FR-8.6**: Recursive Directory Processing
- **FR-8.7**: AI-Powered Decision Making
- **FR-8.8**: Content Preservation & Backup

### 2.2 Non-Functional Requirements

- **NFR-8.1**: AI engine must be enabled for consolidation
- **NFR-8.2**: All operations must be reversible
- **NFR-8.3**: Original files preserved until user confirmation
- **NFR-8.4**: 100% content preservation (no data loss)
- **NFR-8.5**: Clear audit trail of consolidation decisions

---

## 3. Design Philosophy

### 3.1 Core Principles

1. **AI-Powered Intelligence**
   - Requires AI engine to be enabled
   - Uses AI to determine relevance and relationships
   - Falls back gracefully with clear error messages

2. **Content Preservation**
   - Never delete content without backup
   - Maintain semantic integrity during consolidation
   - Preserve markdown formatting and structure

3. **Context Optimization**
   - Reduce file count while maintaining information density
   - Optimize for AI consumption (fewer, richer files)
   - Maintain logical relationships between topics

4. **Non-Destructive by Default**
   - Create new consolidated files first
   - Preserve originals until user confirms
   - Provide clear diff and change summaries

---

## 4. Feature Architecture

### 4.1 Component Overview

```typescript
interface MarkdownConsolidationSystem {
  // Core components
  scanner: MarkdownScanner;
  analyzer: MarkdownAnalyzer;
  consolidator: MarkdownConsolidator;
  readmeGenerator: SuperReadmeGenerator;
  
  // Support systems
  aiProvider: AIProvider;
  backupManager: BackupManager;
  validator: ConsolidationValidator;
}
```

### 4.2 Data Flow

```
1. Scan Directory (recursive optional)
   ↓
2. Analyze Each Markdown
   - Extract metadata
   - Determine staleness
   - Calculate relevance score
   ↓
3. AI-Powered Analysis
   - Topic clustering
   - Relationship mapping
   - Consolidation recommendations
   ↓
4. Strategy Selection
   - Folder-based consolidation
   - Topic-based consolidation
   - Super README creation
   ↓
5. Execute Consolidation
   - Create consolidated files
   - Generate super README
   - Backup originals
   ↓
6. User Review & Approval
   - Show diff summary
   - Preview consolidated content
   - Confirm changes
   ↓
7. Finalize or Rollback
```

---

## 5. Markdown Discovery & Scanning

### 5.1 Scanner Implementation

```typescript
interface MarkdownScanOptions {
  targetDirectory: string;
  recursive: boolean;
  excludePatterns: string[];
  includeHidden: boolean;
}

interface MarkdownFile {
  path: string;
  relativePath: string;
  name: string;
  size: number;
  lastModified: Date;
  content: string;
  metadata: MarkdownMetadata;
}

interface MarkdownMetadata {
  title: string;
  headers: string[];
  wordCount: number;
  linkCount: number;
  codeBlockCount: number;
  imageCount: number;
  frontMatter?: Record<string, any>;
}

class MarkdownScanner {
  async scan(options: MarkdownScanOptions): Promise<MarkdownFile[]> {
    const pattern = options.recursive 
      ? '**/*.md' 
      : '*.md';
    
    const files = await glob(pattern, {
      cwd: options.targetDirectory,
      ignore: this.buildIgnorePatterns(options),
      absolute: true,
      dot: options.includeHidden
    });
    
    return Promise.all(
      files.map(filePath => this.analyzeFile(filePath))
    );
  }
  
  private buildIgnorePatterns(options: MarkdownScanOptions): string[] {
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
  
  private async analyzeFile(filePath: string): Promise<MarkdownFile> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = this.extractMetadata(content);
    
    return {
      path: filePath,
      relativePath: path.relative(process.cwd(), filePath),
      name: path.basename(filePath),
      size: stats.size,
      lastModified: stats.mtime,
      content,
      metadata
    };
  }
  
  private extractMetadata(content: string): MarkdownMetadata {
    // Extract frontmatter if present
    const frontMatter = this.parseFrontMatter(content);
    
    // Extract title (first # heading or from frontmatter)
    const title = frontMatter?.title || 
                  this.extractTitle(content) || 
                  'Untitled';
    
    // Extract all headers
    const headers = this.extractHeaders(content);
    
    // Count various elements
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
  
  private parseFrontMatter(content: string): Record<string, any> | undefined {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return undefined;
    
    try {
      return yaml.parse(match[1]);
    } catch {
      return undefined;
    }
  }
  
  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
  
  private extractHeaders(content: string): string[] {
    const matches = content.matchAll(/^(#{1,6})\s+(.+)$/gm);
    return Array.from(matches, m => m[2].trim());
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

### 5.2 Default Exclusions

The scanner automatically excludes:
- `node_modules/`
- `.git/`
- Build directories (`dist/`, `build/`, `out/`)
- Package manager caches
- UnVibe directories (`.devibe/`, `.unvibe/`)
- Hidden files (unless `includeHidden` is true)

---

## 6. Relevance & Staleness Detection

### 6.1 Relevance Scoring

```typescript
interface RelevanceAnalysis {
  score: number; // 0-100
  factors: RelevanceFactors;
  status: 'highly-relevant' | 'relevant' | 'marginal' | 'stale';
  reasoning: string;
}

interface RelevanceFactors {
  recency: number; // 0-25 points
  contentQuality: number; // 0-25 points
  connectivity: number; // 0-25 points
  uniqueness: number; // 0-25 points
}

class MarkdownAnalyzer {
  async analyzeRelevance(
    file: MarkdownFile,
    allFiles: MarkdownFile[],
    aiProvider: AIProvider
  ): Promise<RelevanceAnalysis> {
    const factors: RelevanceFactors = {
      recency: this.scoreRecency(file),
      contentQuality: this.scoreContentQuality(file),
      connectivity: this.scoreConnectivity(file, allFiles),
      uniqueness: await this.scoreUniqueness(file, allFiles, aiProvider)
    };
    
    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    
    const status = this.determineStatus(score);
    
    const reasoning = this.generateReasoning(factors, file);
    
    return { score, factors, status, reasoning };
  }
  
  private scoreRecency(file: MarkdownFile): number {
    const ageInDays = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays <= 7) return 25;      // Fresh: last week
    if (ageInDays <= 30) return 20;     // Recent: last month
    if (ageInDays <= 90) return 15;     // Aging: last quarter
    if (ageInDays <= 180) return 10;    // Old: last 6 months
    return 5;                            // Very old: 6+ months
  }
  
  private scoreContentQuality(file: MarkdownFile): number {
    let score = 0;
    const meta = file.metadata;
    
    // Word count (0-10 points)
    if (meta.wordCount >= 500) score += 10;
    else if (meta.wordCount >= 200) score += 7;
    else if (meta.wordCount >= 50) score += 4;
    else score += 1; // Very short, likely minimal value
    
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
    
    // Check if this file is linked from others
    const inboundLinks = this.countInboundLinks(file, allFiles);
    score += Math.min(15, inboundLinks * 3);
    
    // Check if this file links to others
    const outboundLinks = this.countOutboundLinks(file, allFiles);
    score += Math.min(10, outboundLinks * 2);
    
    return Math.min(25, score);
  }
  
  private async scoreUniqueness(
    file: MarkdownFile,
    allFiles: MarkdownFile[],
    aiProvider: AIProvider
  ): Promise<number> {
    // Check for duplicate or highly similar content
    const similarFiles = await this.findSimilarContent(file, allFiles, aiProvider);
    
    if (similarFiles.length === 0) return 25; // Completely unique
    if (similarFiles.length === 1) return 20; // Mostly unique
    if (similarFiles.length <= 3) return 15;  // Some overlap
    if (similarFiles.length <= 5) return 10;  // Significant overlap
    return 5; // Highly duplicated content
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
      // Count only local markdown links
      return link.endsWith('.md') && !link.startsWith('http');
    }).length;
  }
  
  private async findSimilarContent(
    file: MarkdownFile,
    allFiles: MarkdownFile[],
    aiProvider: AIProvider
  ): Promise<MarkdownFile[]> {
    // Use AI to find semantically similar content
    const prompt = `
Compare this markdown file with others and identify files with similar content:

Target File: ${file.name}
Title: ${file.metadata.title}
Content Preview: ${file.content.substring(0, 500)}...

Other Files:
${allFiles.filter(f => f.path !== file.path).map(f => 
  `- ${f.name}: ${f.metadata.title}`
).join('\n')}

Return a JSON array of file names that have significant content overlap (>60% similar topics):
`;
    
    try {
      const response = await aiProvider.analyzeFileAllocation({
        fileName: file.name,
        fileContent: prompt,
        availableRepos: [],
        context: {} as any
      });
      
      // Parse response for similar file names
      const similarNames = JSON.parse(response.reasoning);
      return allFiles.filter(f => similarNames.includes(f.name));
    } catch (error) {
      // Fallback to simple title matching
      return allFiles.filter(f => 
        f.path !== file.path &&
        this.calculateTitleSimilarity(file.metadata.title, f.metadata.title) > 0.7
      );
    }
  }
  
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.toLowerCase().split(/\s+/));
    const words2 = new Set(title2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
}
```

---

## 7. AI-Powered Content Analysis

### 7.1 Topic Clustering

```typescript
interface TopicCluster {
  name: string;
  description: string;
  files: MarkdownFile[];
  suggestedFilename: string;
  consolidationStrategy: 'merge' | 'summarize' | 'link-only';
}

class AIContentAnalyzer {
  constructor(private aiProvider: AIProvider) {}
  
  async clusterByTopic(files: MarkdownFile[]): Promise<TopicCluster[]> {
    const prompt = this.buildClusteringPrompt(files);
    
    const response = await this.aiProvider.analyzeFileAllocation({
      fileName: 'markdown-clustering',
      fileContent: prompt,
      availableRepos: [],
      context: {} as any
    });
    
    return this.parseClusteringResponse(response, files);
  }
  
  private buildClusteringPrompt(files: MarkdownFile[]): string {
    return `
Analyze these markdown files and group them into logical topic clusters.
Goal: Consolidate 30-40 files into 3-5 coherent documents.

Files to analyze:
${files.map((f, i) => `
${i + 1}. ${f.name} (${f.metadata.wordCount} words)
   Title: ${f.metadata.title}
   Age: ${this.formatAge(f.lastModified)}
   Headers: ${f.metadata.headers.slice(0, 3).join(', ')}${f.metadata.headers.length > 3 ? '...' : ''}
   Content preview: ${f.content.substring(0, 200)}...
`).join('\n')}

Please respond with a JSON object containing:
{
  "clusters": [
    {
      "name": "cluster-name",
      "description": "what this cluster represents",
      "fileIndices": [1, 3, 5], // indices from the list above
      "suggestedFilename": "consolidated-name.md",
      "consolidationStrategy": "merge|summarize|link-only",
      "reasoning": "why these files belong together"
    }
  ],
  "staleFiles": [2, 7], // files that are outdated/irrelevant
  "standaloneFiles": [4] // files that should remain separate
}

Consolidation strategies:
- "merge": Combine full content (for complementary topics)
- "summarize": Extract key points and combine (for similar topics)
- "link-only": Keep separate but reference in super README (for distinct topics)
`;
  }
  
  private formatAge(date: Date): string {
    const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 7) return `${Math.floor(days)} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  }
  
  private parseClusteringResponse(
    response: any,
    files: MarkdownFile[]
  ): TopicCluster[] {
    try {
      const data = JSON.parse(response.reasoning);
      
      return data.clusters.map((cluster: any) => ({
        name: cluster.name,
        description: cluster.description,
        files: cluster.fileIndices.map((i: number) => files[i - 1]),
        suggestedFilename: cluster.suggestedFilename,
        consolidationStrategy: cluster.consolidationStrategy
      }));
    } catch (error) {
      throw new Error(`Failed to parse AI clustering response: ${error.message}`);
    }
  }
  
  async determineRelevance(file: MarkdownFile): Promise<{
    isRelevant: boolean;
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Analyze if this markdown file is still relevant to the project:

File: ${file.name}
Title: ${file.metadata.title}
Last Modified: ${file.lastModified.toISOString()}
Word Count: ${file.metadata.wordCount}

Content:
${file.content}

Consider:
1. Is the information current or outdated?
2. Does it reference features/code that no longer exist?
3. Is it a temporary note or permanent documentation?
4. Does it duplicate information available elsewhere?

Respond with JSON:
{
  "isRelevant": true|false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "suggestedAction": "keep|consolidate|archive|delete"
}
`;
    
    try {
      const response = await this.aiProvider.classifyScript({
        fileName: file.name,
        fileContent: prompt,
        fileMetadata: {} as any,
        repositoryContext: {} as any
      });
      
      return {
        isRelevant: response.action !== 'delete',
        confidence: response.confidence,
        reasoning: response.reasoning
      };
    } catch (error) {
      // Conservative fallback: assume relevant
      return {
        isRelevant: true,
        confidence: 0.5,
        reasoning: 'AI analysis unavailable, defaulting to keep'
      };
    }
  }
}
```

---

## 8. Consolidation Strategies

### 8.1 Strategy Selection

```typescript
type ConsolidationStrategy = 
  | 'merge-by-topic'
  | 'merge-by-folder'
  | 'summarize-cluster'
  | 'create-super-readme'
  | 'archive-stale';

interface ConsolidationPlan {
  strategy: ConsolidationStrategy;
  inputFiles: MarkdownFile[];
  outputFile: string;
  preserveOriginals: boolean;
  confidence: number;
  reasoning: string;
}

class MarkdownConsolidator {
  constructor(
    private analyzer: AIContentAnalyzer,
    private backupManager: BackupManager
  ) {}
  
  async createPlan(
    files: MarkdownFile[],
    options: ConsolidationOptions
  ): Promise<ConsolidationPlan[]> {
    // Step 1: Cluster files by topic
    const clusters = await this.analyzer.clusterByTopic(files);
    
    // Step 2: Analyze folder structure
    const folderGroups = this.groupByFolder(files);
    
    // Step 3: Determine strategy for each group
    const plans: ConsolidationPlan[] = [];
    
    for (const cluster of clusters) {
      if (cluster.consolidationStrategy === 'merge') {
        plans.push({
          strategy: 'merge-by-topic',
          inputFiles: cluster.files,
          outputFile: cluster.suggestedFilename,
          preserveOriginals: true,
          confidence: 0.85,
          reasoning: `Merge ${cluster.files.length} related files on topic: ${cluster.description}`
        });
      } else if (cluster.consolidationStrategy === 'summarize') {
        plans.push({
          strategy: 'summarize-cluster',
          inputFiles: cluster.files,
          outputFile: cluster.suggestedFilename,
          preserveOriginals: true,
          confidence: 0.90,
          reasoning: `Summarize ${cluster.files.length} similar files: ${cluster.description}`
        });
      }
    }
    
    // Step 4: Handle folder-based consolidation
    for (const [folder, folderFiles] of Object.entries(folderGroups)) {
      if (folderFiles.length >= 5 && this.isLogicalFolder(folder)) {
        plans.push({
          strategy: 'merge-by-folder',
          inputFiles: folderFiles,
          outputFile: path.join(folder, 'INDEX.md'),
          preserveOriginals: true,
          confidence: 0.80,
          reasoning: `Consolidate ${folderFiles.length} files in ${folder}/`
        });
      }
    }
    
    return plans;
  }
  
  async executePlan(plan: ConsolidationPlan): Promise<ConsolidationResult> {
    // Backup originals
    await this.backupManager.backupFiles(plan.inputFiles.map(f => f.path));
    
    let consolidatedContent: string;
    
    switch (plan.strategy) {
      case 'merge-by-topic':
        consolidatedContent = await this.mergeByTopic(plan.inputFiles);
        break;
        
      case 'merge-by-folder':
        consolidatedContent = await this.mergeByFolder(plan.inputFiles);
        break;
        
      case 'summarize-cluster':
        consolidatedContent = await this.summarizeCluster(plan.inputFiles);
        break;
        
      case 'create-super-readme':
        consolidatedContent = await this.createSuperReadme(plan.inputFiles);
        break;
        
      case 'archive-stale':
        return this.archiveStaleFiles(plan.inputFiles);
        
      default:
        throw new Error(`Unknown strategy: ${plan.strategy}`);
    }
    
    // Write consolidated file
    await fs.ensureDir(path.dirname(plan.outputFile));
    await fs.writeFile(plan.outputFile, consolidatedContent);
    
    return {
      success: true,
      outputFile: plan.outputFile,
      inputFiles: plan.inputFiles.length,
      action: plan.strategy,
      backupPath: this.backupManager.getLatestBackupPath()
    };
  }
  
  private async mergeByTopic(files: MarkdownFile[]): Promise<string> {
    // Sort files by relevance
    const sorted = files.sort((a, b) => 
      b.metadata.wordCount - a.metadata.wordCount
    );
    
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
    
    // Merge content
    for (const file of sorted) {
      sections.push(`## ${file.metadata.title}`);
      sections.push('');
      sections.push(`*Originally from: ${file.name}*`);
      sections.push('');
      
      // Remove the file's own title if present
      let content = file.content;
      content = content.replace(/^#\s+.+$/m, '').trim();
      
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
  
  private async mergeByFolder(files: MarkdownFile[]): Promise<string> {
    const folder = path.dirname(files[0].relativePath);
    
    const sections: string[] = [];
    
    sections.push(`# ${path.basename(folder)} Documentation`);
    sections.push('');
    sections.push(`*Index of ${files.length} documents*`);
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Group by subcategory if possible
    const categorized = this.categorizeFiles(files);
    
    for (const [category, categoryFiles] of Object.entries(categorized)) {
      sections.push(`## ${category}`);
      sections.push('');
      
      for (const file of categoryFiles) {
        sections.push(`### [${file.metadata.title}](./${file.name})`);
        sections.push('');
        
        // Extract first paragraph as description
        const preview = this.extractPreview(file.content);
        sections.push(preview);
        sections.push('');
        
        if (file.metadata.headers.length > 0) {
          sections.push('**Contents:**');
          for (const header of file.metadata.headers.slice(0, 5)) {
            sections.push(`- ${header}`);
          }
          sections.push('');
        }
      }
    }
    
    return sections.join('\n');
  }
  
  private async summarizeCluster(files: MarkdownFile[]): Promise<string> {
    // Use AI to create intelligent summary
    const prompt = `
Create a consolidated summary document from these markdown files:

${files.map((f, i) => `
File ${i + 1}: ${f.name}
Title: ${f.metadata.title}
Content:
${f.content}
---
`).join('\n')}

Requirements:
1. Combine duplicate information
2. Preserve all unique insights
3. Organize by logical topics
4. Include attribution to original files
5. Maintain code examples and links
6. Keep the summary comprehensive but concise

Format as well-structured markdown with:
- Clear title
- Table of contents
- Logical sections
- Source attribution at the end
`;
    
    const response = await this.analyzer['aiProvider'].classifyScript({
      fileName: 'consolidation-summary',
      fileContent: prompt,
      fileMetadata: {} as any,
      repositoryContext: {} as any
    });
    
    return response.reasoning; // AI-generated consolidated content
  }
  
  private inferTopicTitle(files: MarkdownFile[]): string {
    // Extract common words from titles
    const words = files.map(f => f.metadata.title.toLowerCase().split(/\s+/));
    const commonWords = this.findCommonWords(words);
    
    if (commonWords.length > 0) {
      return commonWords
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    
    return 'Consolidated Documentation';
  }
  
  private findCommonWords(wordArrays: string[][]): string[] {
    const wordCounts = new Map<string, number>();
    
    for (const words of wordArrays) {
      const uniqueWords = new Set(words);
      for (const word of uniqueWords) {
        if (word.length > 3) { // Skip short words
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }
    
    // Return words that appear in at least half the files
    const threshold = wordArrays.length / 2;
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([word, _]) => word)
      .slice(0, 3); // Top 3 common words
  }
  
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }
  
  private categorizeFiles(files: MarkdownFile[]): Record<string, MarkdownFile[]> {
    // Simple categorization by title prefixes or keywords
    const categories: Record<string, MarkdownFile[]> = {
      'Documentation': [],
      'Guides': [],
      'Reference': [],
      'Other': []
    };
    
    for (const file of files) {
      const title = file.metadata.title.toLowerCase();
      
      if (title.includes('guide') || title.includes('tutorial')) {
        categories['Guides'].push(file);
      } else if (title.includes('reference') || title.includes('api')) {
        categories['Reference'].push(file);
      } else if (title.includes('doc')) {
        categories['Documentation'].push(file);
      } else {
        categories['Other'].push(file);
      }
    }
    
    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, files]) => files.length > 0)
    );
  }
  
  private extractPreview(content: string): string {
    // Remove title
    const withoutTitle = content.replace(/^#\s+.+$/m, '').trim();
    
    // Find first paragraph
    const paragraphs = withoutTitle.split('\n\n');
    const firstPara = paragraphs.find(p => 
      p.length > 20 && !p.startsWith('#') && !p.startsWith('-')
    );
    
    if (!firstPara) return '';
    
    // Truncate if too long
    return firstPara.length > 200 
      ? firstPara.substring(0, 200) + '...'
      : firstPara;
  }
  
  private groupByFolder(files: MarkdownFile[]): Record<string, MarkdownFile[]> {
    const groups: Record<string, MarkdownFile[]> = {};
    
    for (const file of files) {
      const folder = path.dirname(file.relativePath);
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(file);
    }
    
    return groups;
  }
  
  private isLogicalFolder(folder: string): boolean {
    const folderName = path.basename(folder);
    const logicalNames = [
      'docs', 'documentation', 'guides', 'specs', 
      'design', 'architecture', 'api', 'reference',
      'notes', 'planning'
    ];
    
    return logicalNames.some(name => 
      folderName.toLowerCase().includes(name)
    );
  }
  
  private async archiveStaleFiles(files: MarkdownFile[]): Promise<ConsolidationResult> {
    const archiveDir = '.devibe/archive/markdown';
    await fs.ensureDir(archiveDir);
    
    for (const file of files) {
      const archivePath = path.join(archiveDir, file.name);
      await fs.move(file.path, archivePath);
    }
    
    return {
      success: true,
      outputFile: archiveDir,
      inputFiles: files.length,
      action: 'archive-stale',
      backupPath: this.backupManager.getLatestBackupPath()
    };
  }
}

interface ConsolidationOptions {
  maxOutputFiles: number;
  preserveOriginals: boolean;
  createSuperReadme: boolean;
}

interface ConsolidationResult {
  success: boolean;
  outputFile: string;
  inputFiles: number;
  action: string;
  backupPath: string;
}
```

---

## 9. Super README Generation

### 9.1 Super README Strategy

When files are in a logical folder structure, instead of altering the original README, create enhanced navigation:

```typescript
class SuperReadmeGenerator {
  constructor(private analyzer: AIContentAnalyzer) {}
  
  async generate(
    files: MarkdownFile[],
    existingReadme?: MarkdownFile
  ): Promise<string> {
    const sections: string[] = [];
    
    // Header
    sections.push('# Documentation Hub');
    sections.push('');
    sections.push('*Consolidated navigation for all project documentation*');
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // If existing README, reference it
    if (existingReadme) {
      sections.push('## Main Documentation');
      sections.push('');
      sections.push(`📖 [Project README](./README.md) - Start here for overview and quick start`);
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    // Organize files by category
    const categorized = await this.categorizeForSuperReadme(files);
    
    // Generate sections for each category
    for (const [category, categoryFiles] of Object.entries(categorized)) {
      sections.push(`## ${category.icon} ${category.name}`);
      sections.push('');
      
      if (category.description) {
        sections.push(category.description);
        sections.push('');
      }
      
      // Sort by relevance
      const sorted = categoryFiles.sort((a, b) => 
        b.metadata.wordCount - a.metadata.wordCount
      );
      
      for (const file of sorted) {
        sections.push(`### [${file.metadata.title}](${file.relativePath})`);
        sections.push('');
        
        // Add description
        const preview = this.extractDescription(file);
        if (preview) {
          sections.push(preview);
          sections.push('');
        }
        
        // Add metadata
        sections.push(`*${file.metadata.wordCount} words · ${this.formatDate(file.lastModified)}*`);
        sections.push('');
      }
      
      sections.push('');
    }
    
    // Add quick navigation
    sections.push('---');
    sections.push('');
    sections.push('## Quick Navigation');
    sections.push('');
    sections.push('| Category | Documents | Last Updated |');
    sections.push('|----------|-----------|--------------|');
    
    for (const [category, categoryFiles] of Object.entries(categorized)) {
      const latest = categoryFiles.reduce((a, b) => 
        a.lastModified > b.lastModified ? a : b
      );
      sections.push(`| ${category.name} | ${categoryFiles.length} | ${this.formatDate(latest.lastModified)} |`);
    }
    
    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push(`*This index was automatically generated on ${new Date().toLocaleDateString()}*`);
    
    return sections.join('\n');
  }
  
  private async categorizeForSuperReadme(
    files: MarkdownFile[]
  ): Promise<Record<string, { name: string; icon: string; description?: string; files: MarkdownFile[] }>> {
    const categories = {
      'Architecture': {
        name: 'Architecture & Design',
        icon: '🏗️',
        description: 'System architecture, design decisions, and technical specifications',
        files: [] as MarkdownFile[]
      },
      'Guides': {
        name: 'Guides & Tutorials',
        icon: '📚',
        description: 'Step-by-step guides and tutorials for common tasks',
        files: [] as MarkdownFile[]
      },
      'API': {
        name: 'API Reference',
        icon: '🔌',
        description: 'API documentation and integration guides',
        files: [] as MarkdownFile[]
      },
      'Development': {
        name: 'Development',
        icon: '💻',
        description: 'Development workflows, conventions, and best practices',
        files: [] as MarkdownFile[]
      },
      'Planning': {
        name: 'Planning & Notes',
        icon: '📝',
        description: 'Project planning, meeting notes, and decision records',
        files: [] as MarkdownFile[]
      },
      'Other': {
        name: 'Other Documentation',
        icon: '📄',
        files: [] as MarkdownFile[]
      }
    };
    
    // Categorize each file
    for (const file of files) {
      const category = await this.determineCategory(file);
      categories[category].files.push(file);
    }
    
    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, cat]) => cat.files.length > 0)
    );
  }
  
  private async determineCategory(file: MarkdownFile): Promise<string> {
    const title = file.metadata.title.toLowerCase();
    const content = file.content.toLowerCase();
    const path = file.relativePath.toLowerCase();
    
    // Check path first
    if (path.includes('/specs/') || path.includes('/architecture/')) {
      return 'Architecture';
    }
    if (path.includes('/guides/') || path.includes('/tutorials/')) {
      return 'Guides';
    }
    if (path.includes('/api/') || path.includes('/reference/')) {
      return 'API';
    }
    if (path.includes('/dev/') || path.includes('/development/')) {
      return 'Development';
    }
    if (path.includes('/planning/') || path.includes('/notes/')) {
      return 'Planning';
    }
    
    // Check title and content
    if (title.includes('architecture') || title.includes('design') || title.includes('spec')) {
      return 'Architecture';
    }
    if (title.includes('guide') || title.includes('tutorial') || title.includes('how to')) {
      return 'Guides';
    }
    if (title.includes('api') || title.includes('reference') || title.includes('endpoint')) {
      return 'API';
    }
    if (title.includes('development') || content.includes('coding standard') || content.includes('best practice')) {
      return 'Development';
    }
    if (title.includes('note') || title.includes('meeting') || title.includes('planning')) {
      return 'Planning';
    }
    
    return 'Other';
  }
  
  private extractDescription(file: MarkdownFile): string {
    // Look for description in frontmatter
    if (file.metadata.frontMatter?.description) {
      return file.metadata.frontMatter.description;
    }
    
    // Extract first meaningful paragraph
    const lines = file.content.split('\n');
    let inCodeBlock = false;
    
    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      if (inCodeBlock || line.startsWith('#') || line.trim().length === 0) {
        continue;
      }
      
      // Found first paragraph
      if (line.length > 20) {
        return line.length > 150 
          ? line.substring(0, 150) + '...'
          : line;
      }
    }
    
    return '';
  }
  
  private formatDate(date: Date): string {
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  }
  
  async enhanceExistingReadme(
    readmePath: string,
    consolidatedFiles: string[]
  ): Promise<void> {
    let content = await fs.readFile(readmePath, 'utf-8');
    
    // Check if already has documentation section
    if (content.includes('## Documentation') || content.includes('## Docs')) {
      console.log('README already has documentation section, skipping enhancement');
      return;
    }
    
    // Add documentation section before the last heading (usually License or Footer)
    const linkSection = this.buildDocumentationLinks(consolidatedFiles);
    
    // Find insertion point (before last ## heading or at end)
    const headings = content.match(/^## .+$/gm) || [];
    if (headings.length > 0) {
      const lastHeading = headings[headings.length - 1];
      const insertPos = content.lastIndexOf(lastHeading);
      
      content = 
        content.substring(0, insertPos) +
        linkSection + '\n\n' +
        content.substring(insertPos);
    } else {
      content += '\n\n' + linkSection;
    }
    
    await fs.writeFile(readmePath, content);
  }
  
  private buildDocumentationLinks(files: string[]): string {
    return `
## 📚 Documentation

For detailed documentation, see:

${files.map(f => `- [${path.basename(f, '.md')}](./${f})`).join('\n')}

*See [DOCUMENTATION_HUB.md](./DOCUMENTATION_HUB.md) for complete documentation index*
`;
  }
}
```

---

## 10. CLI Interface

### 10.1 Command Structure

```bash
# Main consolidation command
devibe consolidate [directory] [options]

# Options:
--recursive, -r        # Recursively process subdirectories
--max-output <number>  # Maximum output files (default: 5)
--dry-run             # Preview without making changes
--strategy <type>      # Force strategy: topic|folder|super-readme
--exclude <pattern>    # Exclude file patterns
--auto                # Auto-approve consolidation plan
--preserve-originals  # Keep original files (default: true until confirmed)
```

### 10.2 Command Implementation

```typescript
async function consolidateCommand(
  directory: string = '.',
  options: ConsolidateOptions
): Promise<void> {
  // Guard: Require AI
  const config = loadConfig();
  if (!config.ai?.enabled) {
    console.error(chalk.red('✗ AI engine must be enabled for markdown consolidation'));
    console.error('');
    console.error('Setup AI with: devibe config set-api-key');
    console.error('');
    console.error(chalk.dim('Why? Markdown consolidation requires AI to:'));
    console.error(chalk.dim('  - Detect stale/outdated content'));
    console.error(chalk.dim('  - Identify semantic relationships'));
    console.error(chalk.dim('  - Intelligently merge related topics'));
    console.error(chalk.dim('  - Preserve important information'));
    process.exit(1);
  }
  
  console.log(chalk.bold('\n📝 Markdown Consolidation\n'));
  
  // Initialize components
  const aiProvider = AIProviderFactory.create(config.ai);
  const scanner = new MarkdownScanner();
  const analyzer = new MarkdownAnalyzer();
  const aiAnalyzer = new AIContentAnalyzer(aiProvider!);
  const consolidator = new MarkdownConsolidator(aiAnalyzer, new BackupManager());
  const readmeGenerator = new SuperReadmeGenerator(aiAnalyzer);
  
  // Step 1: Scan directory
  console.log(`Scanning ${directory}${options.recursive ? ' (recursive)' : ''}...`);
  
  const files = await scanner.scan({
    targetDirectory: directory,
    recursive: options.recursive,
    excludePatterns: options.exclude || [],
    includeHidden: false
  });
  
  console.log(chalk.green(`✓ Found ${files.length} markdown files`));
  console.log('');
  
  if (files.length === 0) {
    console.log('No markdown files found.');
    return;
  }
  
  // Step 2: Analyze files
  console.log('Analyzing relevance and relationships...');
  const spinner = ora('Processing with AI...').start();
  
  const analyses = await Promise.all(
    files.map(f => analyzer.analyzeRelevance(f, files, aiProvider!))
  );
  
  spinner.succeed('Analysis complete');
  console.log('');
  
  // Show analysis summary
  console.log(chalk.bold('Analysis Summary:'));
  console.log('');
  
  const byStatus = analyses.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`  Highly Relevant: ${byStatus['highly-relevant'] || 0}`);
  console.log(`  Relevant:        ${byStatus['relevant'] || 0}`);
  console.log(`  Marginal:        ${byStatus['marginal'] || 0}`);
  console.log(`  Stale:           ${byStatus['stale'] || 0}`);
  console.log('');
  
  // Step 3: Create consolidation plan
  console.log('Creating consolidation plan...');
  
  const plans = await consolidator.createPlan(files, {
    maxOutputFiles: options.maxOutput || 5,
    preserveOriginals: options.preserveOriginals ?? true,
    createSuperReadme: true
  });
  
  console.log(chalk.green(`✓ Created plan with ${plans.length} consolidations`));
  console.log('');
  
  // Step 4: Display plan
  console.log(chalk.bold('Consolidation Plan:'));
  console.log('');
  
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    console.log(`${i + 1}. ${chalk.cyan(plan.strategy)}`);
    console.log(`   Output: ${plan.outputFile}`);
    console.log(`   Input:  ${plan.inputFiles.length} files`);
    console.log(`   ${chalk.dim(plan.reasoning)}`);
    console.log('');
  }
  
  // Show projected reduction
  const totalInput = plans.reduce((sum, p) => sum + p.inputFiles.length, 0);
  const totalOutput = plans.length;
  const reduction = Math.round((1 - totalOutput / totalInput) * 100);
  
  console.log(chalk.bold('Impact:'));
  console.log(`  Files: ${totalInput} → ${totalOutput} (${reduction}% reduction)`);
  console.log('');
  
  // Step 5: Dry run or execute
  if (options.dryRun) {
    console.log(chalk.yellow('Dry run complete. No changes made.'));
    console.log('Run without --dry-run to execute consolidation.');
    return;
  }
  
  // Confirm execution
  if (!options.auto) {
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
  
  // Step 6: Execute consolidation
  console.log('');
  console.log('Executing consolidation...');
  
  const results: ConsolidationResult[] = [];
  
  for (const plan of plans) {
    const spinner = ora(`${plan.strategy}: ${plan.outputFile}`).start();
    
    try {
      const result = await consolidator.executePlan(plan);
      results.push(result);
      spinner.succeed();
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  }
  
  // Step 7: Generate super README
  if (options.createSuperReadme) {
    const spinner = ora('Generating documentation hub...').start();
    
    const superReadme = await readmeGenerator.generate(files);
    await fs.writeFile(
      path.join(directory, 'DOCUMENTATION_HUB.md'),
      superReadme
    );
    
    spinner.succeed('Documentation hub created');
  }
  
  // Step 8: Summary
  console.log('');
  console.log(chalk.bold.green('✓ Consolidation Complete'));
  console.log('');
  console.log(`Created ${results.length} consolidated files`);
  console.log(`Processed ${totalInput} original files`);
  console.log('');
  
  if (options.preserveOriginals) {
    console.log(chalk.dim('Original files preserved (not deleted yet)'));
    console.log(chalk.dim('Review consolidated files, then run:'));
    console.log(chalk.dim(`  devibe consolidate finalize ${directory}`));
  }
  
  console.log('');
  console.log(chalk.dim('Backup available at:'));
  console.log(chalk.dim(`  ${results[0]?.backupPath}`));
}

interface ConsolidateOptions {
  recursive: boolean;
  maxOutput?: number;
  dryRun: boolean;
  strategy?: string;
  exclude?: string[];
  auto: boolean;
  preserveOriginals?: boolean;
  createSuperReadme?: boolean;
}
```

### 10.3 Finalize Command

```typescript
async function consolidateFinalizeCommand(directory: string = '.'): Promise<void> {
  console.log(chalk.bold('\n🗑️  Finalize Consolidation\n'));
  
  // Load consolidation metadata
  const metaPath = path.join(directory, '.devibe', 'consolidation-meta.json');
  
  if (!await fs.pathExists(metaPath)) {
    console.error('No pending consolidation found.');
    return;
  }
  
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
  
  console.log(`Found consolidation from ${new Date(meta.timestamp).toLocaleString()}`);
  console.log(`Original files: ${meta.originalFiles.length}`);
  console.log('');
  
  // Confirm deletion
  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: `Delete ${meta.originalFiles.length} original files?`,
    default: false
  }]);
  
  if (!confirmed) {
    console.log('Finalization cancelled. Original files preserved.');
    return;
  }
  
  // Delete original files
  let deleted = 0;
  for (const filePath of meta.originalFiles) {
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      deleted++;
    }
  }
  
  console.log('');
  console.log(chalk.green(`✓ Deleted ${deleted} original files`));
  
  // Clean up metadata
  await fs.remove(metaPath);
  
  console.log('');
  console.log('Consolidation finalized.');
}
```

---

## 11. Safety & Validation

### 11.1 Safety Guarantees

```typescript
class ConsolidationValidator {
  async validate(
    originalFiles: MarkdownFile[],
    consolidatedFiles: string[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Verify all consolidated files were created
    for (const file of consolidatedFiles) {
      if (!await fs.pathExists(file)) {
        errors.push(`Consolidated file not created: ${file}`);
      }
    }
    
    // 2. Check content preservation (approximate)
    const originalWordCount = originalFiles.reduce(
      (sum, f) => sum + f.metadata.wordCount,
      0
    );
    
    let consolidatedWordCount = 0;
    for (const file of consolidatedFiles) {
      const content = await fs.readFile(file, 'utf-8');
      consolidatedWordCount += content.split(/\s+/).length;
    }
    
    const loss = (originalWordCount - consolidatedWordCount) / originalWordCount;
    if (loss > 0.3) {
      errors.push(
        `Significant content loss detected: ${Math.round(loss * 100)}% reduction`
      );
    } else if (loss > 0.1) {
      warnings.push(
        `Moderate content reduction: ${Math.round(loss * 100)}%`
      );
    }
    
    // 3. Verify backup exists
    const backupManager = new BackupManager();
    if (!backupManager.hasRecentBackup()) {
      errors.push('No backup found for consolidation');
    }
    
    // 4. Check for broken internal links
    for (const file of consolidatedFiles) {
      const brokenLinks = await this.findBrokenLinks(file);
      if (brokenLinks.length > 0) {
        warnings.push(
          `Broken links in ${file}: ${brokenLinks.join(', ')}`
        );
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private async findBrokenLinks(filePath: string): Promise<string[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const links = Array.from(
      content.matchAll(/\[.*?\]\((.*?)\)/g),
      m => m[1]
    );
    
    const brokenLinks: string[] = [];
    const dir = path.dirname(filePath);
    
    for (const link of links) {
      // Only check local links
      if (link.startsWith('http') || link.startsWith('#')) {
        continue;
      }
      
      const targetPath = path.resolve(dir, link);
      if (!await fs.pathExists(targetPath)) {
        brokenLinks.push(link);
      }
    }
    
    return brokenLinks;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## 12. Testing Strategy

### 12.1 Test Coverage Requirements

- Markdown scanning: 95%
- Relevance analysis: 90%
- AI integration: 85%
- Consolidation strategies: 95%
- Super README generation: 90%
- Safety validation: 100%

### 12.2 Test Scenarios

```typescript
describe('Markdown Consolidation', () => {
  describe('MarkdownScanner', () => {
    test('finds all markdown files', async () => {
      const scanner = new MarkdownScanner();
      const files = await scanner.scan({
        targetDirectory: './test-fixtures',
        recursive: true,
        excludePatterns: [],
        includeHidden: false
      });
      
      expect(files.length).toBeGreaterThan(0);
      expect(files.every(f => f.path.endsWith('.md'))).toBe(true);
    });
    
    test('respects exclusion patterns', async () => {
      const scanner = new MarkdownScanner();
      const files = await scanner.scan({
        targetDirectory: './test-fixtures',
        recursive: true,
        excludePatterns: ['**/ignored/**'],
        includeHidden: false
      });
      
      expect(files.every(f => !f.path.includes('ignored'))).toBe(true);
    });
    
    test('extracts metadata correctly', async () => {
      const scanner = new MarkdownScanner();
      const files = await scanner.scan({
        targetDirectory: './test-fixtures',
        recursive: false,
        excludePatterns: [],
        includeHidden: false
      });
      
      const file = files[0];
      expect(file.metadata).toHaveProperty('title');
      expect(file.metadata).toHaveProperty('wordCount');
      expect(file.metadata).toHaveProperty('headers');
    });
  });
  
  describe('MarkdownAnalyzer', () => {
    test('scores relevance correctly', async () => {
      const analyzer = new MarkdownAnalyzer();
      const mockFile: MarkdownFile = {
        path: '/test/file.md',
        relativePath: 'test/file.md',
        name: 'file.md',
        size: 1000,
        lastModified: new Date(),
        content: '# Test\n\nContent here...',
        metadata: {
          title: 'Test',
          headers: ['Test', 'Section 1'],
          wordCount: 100,
          linkCount: 2,
          codeBlockCount: 1,
          imageCount: 0
        }
      };
      
      const analysis = await analyzer.analyzeRelevance(mockFile, [mockFile], mockAIProvider);
      
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(analysis.status).toBeDefined();
    });
    
    test('detects stale files', async () => {
      const analyzer = new MarkdownAnalyzer();
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 1);
      
      const staleFile: MarkdownFile = {
        path: '/test/old.md',
        relativePath: 'test/old.md',
        name: 'old.md',
        size: 100,
        lastModified: oldDate,
        content: '# Old\n\nShort.',
        metadata: {
          title: 'Old',
          headers: [],
          wordCount: 10,
          linkCount: 0,
          codeBlockCount: 0,
          imageCount: 0
        }
      };
      
      const analysis = await analyzer.analyzeRelevance(staleFile, [staleFile], mockAIProvider);
      
      expect(analysis.status).toBe('stale');
    });
  });
  
  describe('MarkdownConsolidator', () => {
    test('creates consolidation plan', async () => {
      const consolidator = new MarkdownConsolidator(mockAIAnalyzer, mockBackupManager);
      
      const files = [mockFile1, mockFile2, mockFile3];
      const plans = await consolidator.createPlan(files, {
        maxOutputFiles: 2,
        preserveOriginals: true,
        createSuperReadme: true
      });
      
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.every(p => p.outputFile)).toBe(true);
    });
    
    test('merges files by topic', async () => {
      const consolidator = new MarkdownConsolidator(mockAIAnalyzer, mockBackupManager);
      
      const merged = await consolidator['mergeByTopic']([mockFile1, mockFile2]);
      
      expect(merged).toContain('## Table of Contents');
      expect(merged).toContain(mockFile1.metadata.title);
      expect(merged).toContain(mockFile2.metadata.title);
    });
  });
  
  describe('SuperReadmeGenerator', () => {
    test('generates super README', async () => {
      const generator = new SuperReadmeGenerator(mockAIAnalyzer);
      
      const readme = await generator.generate([mockFile1, mockFile2, mockFile3]);
      
      expect(readme).toContain('# Documentation Hub');
      expect(readme).toContain('Quick Navigation');
      expect(readme).toContain(mockFile1.name);
    });
    
    test('categorizes files correctly', async () => {
      const generator = new SuperReadmeGenerator(mockAIAnalyzer);
      
      const archFile: MarkdownFile = {
        ...mockFile1,
        metadata: { ...mockFile1.metadata, title: 'Architecture Design' }
      };
      
      const category = await generator['determineCategory'](archFile);
      
      expect(category).toBe('Architecture');
    });
  });
  
  describe('Safety & Validation', () => {
    test('validates content preservation', async () => {
      const validator = new ConsolidationValidator();
      
      const result = await validator.validate(
        [mockFile1, mockFile2],
        ['./consolidated.md']
      );
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
    
    test('requires backup before consolidation', async () => {
      const consolidator = new MarkdownConsolidator(mockAIAnalyzer, mockBackupManager);
      
      const plan: ConsolidationPlan = {
        strategy: 'merge-by-topic',
        inputFiles: [mockFile1],
        outputFile: './test.md',
        preserveOriginals: true,
        confidence: 0.9,
        reasoning: 'test'
      };
      
      await consolidator.executePlan(plan);
      
      expect(mockBackupManager.backupFiles).toHaveBeenCalled();
    });
  });
  
  describe('AI Integration', () => {
    test('requires AI to be enabled', async () => {
      const config = { ai: { enabled: false } };
      
      expect(() => {
        // This should throw or exit
        consolidateCommand('.', { ...defaultOptions });
      }).toThrow();
    });
    
    test('uses AI for topic clustering', async () => {
      const analyzer = new AIContentAnalyzer(mockAIProvider);
      
      const clusters = await analyzer.clusterByTopic([mockFile1, mockFile2]);
      
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0]).toHaveProperty('name');
      expect(clusters[0]).toHaveProperty('files');
      expect(mockAIProvider.analyzeFileAllocation).toHaveBeenCalled();
    });
  });
});
```

---

## 13. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- MarkdownScanner implementation
- Metadata extraction
- Basic file analysis

### Phase 2: Relevance Analysis (Week 1-2)
- Relevance scoring system
- Staleness detection
- Connectivity analysis

### Phase 3: AI Integration (Week 2)
- AI provider integration
- Topic clustering
- Content similarity detection

### Phase 4: Consolidation Engine (Week 3)
- Consolidation strategies
- Merge by topic
- Merge by folder
- Summarization

### Phase 5: Super README (Week 3-4)
- Super README generation
- Categorization system
- Link management

### Phase 6: CLI & UX (Week 4)
- Command implementation
- Interactive prompts
- Progress indicators

### Phase 7: Safety & Validation (Week 4-5)
- Backup integration
- Content validation
- Link verification

### Phase 8: Testing & Documentation (Week 5)
- Comprehensive test suite
- User documentation
- Example workflows

---

## 14. Configuration

### 14.1 Configuration File

```javascript
// .devibe/config/consolidation.js
module.exports = {
  consolidation: {
    // Require AI (cannot be disabled)
    requireAI: true,
    
    // Default options
    defaults: {
      maxOutputFiles: 5,
      preserveOriginals: true,
      createSuperReadme: true,
      recursive: false
    },
    
    // Relevance thresholds
    relevance: {
      highlyRelevant: 75,
      relevant: 50,
      marginal: 30,
      stale: 0
    },
    
    // Staleness thresholds (days)
    staleness: {
      fresh: 7,
      recent: 30,
      aging: 90,
      old: 180,
      veryOld: 180
    },
    
    // Exclusion patterns
    exclude: [
      'README.md',       // Never consolidate main README
      'CHANGELOG.md',    // Keep changelog separate
      'LICENSE.md',      // Keep license separate
      'CONTRIBUTING.md'  // Keep contributing separate
    ],
    
    // Protected files (never consolidate)
    protected: [
      'README.md',
      'LICENSE*',
      'CHANGELOG*'
    ]
  }
};
```

---

## 15. Success Criteria

### Core Functionality
- ✅ Successfully scan and analyze 30+ markdown files
- ✅ Consolidate into 3-5 logical documents
- ✅ Detect stale content with >80% accuracy
- ✅ Preserve 100% of relevant content
- ✅ Generate useful super README with proper categorization

### AI Integration
- ✅ Graceful error when AI not enabled
- ✅ Clear value proposition for AI requirement
- ✅ Accurate topic clustering (>85% user satisfaction)
- ✅ Meaningful staleness detection

### Safety
- ✅ 100% backup before any changes
- ✅ Preserve originals until user confirms
- ✅ Zero data loss
- ✅ Broken link detection

### User Experience
- ✅ Clear progress indicators
- ✅ Meaningful preview in dry-run mode
- ✅ Intuitive finalization workflow
- ✅ Helpful error messages

---

## 16. Out of Scope (v1.0)

❌ Non-markdown documentation (RST, AsciiDoc, etc.)  
❌ Consolidation of code comments into docs  
❌ Automatic translation or internationalization  
❌ Version control integration (git commits)  
❌ Collaborative editing features  
❌ Real-time preview of consolidated docs  
❌ Custom templates for consolidated output

---

## 17. Future Enhancements (Post-v1.0)

### v1.5 - Enhanced Analysis
- Support for RST and AsciiDoc
- Duplicate detection across formats
- Automated cross-referencing
- Image deduplication

### v2.0 - Advanced Features
- Custom consolidation templates
- Multi-language documentation support
- Integration with documentation generators (MkDocs, Docusaurus)
- Automated changelog generation from docs

### v2.5 - Collaboration
- Team review workflows
- Diff visualization
- Collaborative editing suggestions
- Documentation quality metrics

---

**Document Status:** Complete and Ready for Review  
**Implementation Priority:** Post-v1.0 (Phase 13)  
**Dependencies:** AI Integration, Backup System, CLI Framework

**Estimated Development Time:** 5 weeks  
**Estimated Testing Time:** 1 week  
**Total Timeline:** 6 weeks

---

**Author:** Development Team  
**Review Cycle:** Before implementation begins  
**Status:** Draft - Awaiting Approval




