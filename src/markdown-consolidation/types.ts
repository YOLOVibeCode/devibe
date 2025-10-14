/**
 * Markdown Consolidation Types
 * 
 * TypeScript interfaces for the markdown consolidation feature.
 */

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
  file: MarkdownFile;
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

export type AutoConsolidateMode = 'compress' | 'document-archive';

export interface AutoConsolidateOptions {
  targetDirectory: string;
  mode?: AutoConsolidateMode;  // 'compress' (default) or 'document-archive'
  maxOutputFiles?: number;
  suppressToC?: boolean;
  respectGitBoundaries?: boolean;
  recursiveCompress?: boolean;  // For compress mode: recursively process git boundaries
  includeRelated?: boolean;  // Use AI to analyze and include related files (.txt, etc.)
}

