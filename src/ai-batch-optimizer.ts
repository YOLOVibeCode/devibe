/**
 * AI Batch Optimizer
 *
 * Intelligent batching strategy to maximize files per API call
 * while staying within context window limits.
 */

import type { FileClassification } from './types.js';

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  content: string;
}

export interface BatchGroup {
  files: FileWithSample[];
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  tier: 'micro' | 'small' | 'medium' | 'large';
}

export interface FileWithSample {
  path: string;
  name: string;
  size: number;
  contentSample: string;
  samplingStrategy: string;
}

import type { ModelConfig } from './ai-model-config.js';

// Default configuration (can be overridden by model)
const DEFAULT_BATCH_CONFIG = {
  // Token estimation (conservative)
  CHARS_PER_TOKEN: 3.3, // ~0.3 tokens per char
  BASE_PROMPT_TOKENS: 200,
  PER_FILE_OVERHEAD_TOKENS: 50,
  PER_FILE_RESPONSE_TOKENS: 100,
  SAFETY_MARGIN_PERCENT: 0.15, // Reserve 15% for safety

  // Sampling strategies by file size
  TIERS: {
    micro: { maxSize: 200, contentChars: 200, name: 'micro' },
    small: { maxSize: 2000, contentChars: 1000, name: 'small' },
    medium: { maxSize: 10000, contentChars: 1500, name: 'medium' },
    large: { maxSize: Infinity, contentChars: 1200, name: 'large' },
  },
};

export interface BatchConfig {
  maxContextTokens: number;
  targetInputTokens: number;
  safetyMargin: number;
  charsPerToken: number;
  basePromptTokens: number;
  perFileOverheadTokens: number;
  perFileResponseTokens: number;
  tiers: typeof DEFAULT_BATCH_CONFIG.TIERS;
}

/**
 * Create model-specific batch configuration
 */
export function createBatchConfig(model: ModelConfig): BatchConfig {
  const maxContextTokens = model.contextWindow;
  const safetyMargin = Math.floor(maxContextTokens * DEFAULT_BATCH_CONFIG.SAFETY_MARGIN_PERCENT);
  const targetInputTokens = maxContextTokens - safetyMargin;

  return {
    maxContextTokens,
    targetInputTokens,
    safetyMargin,
    charsPerToken: DEFAULT_BATCH_CONFIG.CHARS_PER_TOKEN,
    basePromptTokens: DEFAULT_BATCH_CONFIG.BASE_PROMPT_TOKENS,
    perFileOverheadTokens: DEFAULT_BATCH_CONFIG.PER_FILE_OVERHEAD_TOKENS,
    perFileResponseTokens: DEFAULT_BATCH_CONFIG.PER_FILE_RESPONSE_TOKENS,
    tiers: DEFAULT_BATCH_CONFIG.TIERS,
  };
}

// For backwards compatibility
export const BATCH_CONFIG = DEFAULT_BATCH_CONFIG;

export class AIBatchOptimizer {
  private config: BatchConfig;

  constructor(private model?: ModelConfig) {
    // Use model-specific config or default
    if (model) {
      this.config = createBatchConfig(model);
    } else {
      this.config = {
        maxContextTokens: 200000,
        targetInputTokens: 170000,
        safetyMargin: 30000,
        charsPerToken: DEFAULT_BATCH_CONFIG.CHARS_PER_TOKEN,
        basePromptTokens: DEFAULT_BATCH_CONFIG.BASE_PROMPT_TOKENS,
        perFileOverheadTokens: DEFAULT_BATCH_CONFIG.PER_FILE_OVERHEAD_TOKENS,
        perFileResponseTokens: DEFAULT_BATCH_CONFIG.PER_FILE_RESPONSE_TOKENS,
        tiers: DEFAULT_BATCH_CONFIG.TIERS,
      };
    }
  }

  /**
   * Estimate tokens for a string (conservative estimate)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / this.config.charsPerToken);
  }

  /**
   * Determine optimal content sampling for a file
   */
  private sampleFileContent(file: FileInfo): { sample: string; strategy: string } {
    const { content, size } = file;

    // Tier 1: Micro files - include everything
    if (size <= this.config.tiers.micro.maxSize) {
      return {
        sample: content,
        strategy: 'full',
      };
    }

    // Tier 2: Small files - first N chars
    if (size <= this.config.tiers.small.maxSize) {
      return {
        sample: content.slice(0, this.config.tiers.small.contentChars),
        strategy: 'head',
      };
    }

    // Tier 3: Medium files - strategic sampling (head + middle + tail)
    if (size <= this.config.tiers.medium.maxSize) {
      const third = Math.floor(this.config.tiers.medium.contentChars / 3);
      const head = content.slice(0, third);
      const middle = content.slice(size / 2 - third / 2, size / 2 + third / 2);
      const tail = content.slice(-third);
      return {
        sample: `${head}\n[...middle...]\n${middle}\n[...end...]\n${tail}`,
        strategy: 'strategic',
      };
    }

    // Tier 4: Large files - header + sparse sampling + footer
    const charsPerSection = Math.floor(this.config.tiers.large.contentChars / 3);
    const head = content.slice(0, charsPerSection);

    // Sample every ~10% of the file
    const samples: string[] = [];
    const step = Math.floor(size / 10);
    for (let i = step; i < size - step; i += step) {
      samples.push(content.slice(i, i + 50)); // 50 chars per sample
    }
    const middle = samples.join('\n[...]\n');

    const tail = content.slice(-charsPerSection);

    return {
      sample: `${head}\n[...sampled...]\n${middle}\n[...end...]\n${tail}`,
      strategy: 'sparse',
    };
  }

  /**
   * Calculate optimal batches for maximum throughput
   * Now uses model-specific context window limits for intelligent packing
   */
  public createOptimalBatches(files: FileInfo[]): BatchGroup[] {
    const batches: BatchGroup[] = [];

    // Sort by size (small first) for better packing
    const sorted = [...files].sort((a, b) => a.size - b.size);

    let currentBatch: FileWithSample[] = [];
    let currentInputTokens = this.config.basePromptTokens;
    let currentOutputTokens = 0;
    let currentTier: 'micro' | 'small' | 'medium' | 'large' = 'micro';

    for (const file of sorted) {
      // Sample the file content
      const { sample, strategy } = this.sampleFileContent(file);

      // Estimate tokens for this file
      const contentTokens = this.estimateTokens(sample);
      const overheadTokens = this.config.perFileOverheadTokens;
      const fileInputTokens = contentTokens + overheadTokens;
      const fileOutputTokens = this.config.perFileResponseTokens;

      // Determine tier
      let tier: 'micro' | 'small' | 'medium' | 'large' = 'large';
      if (file.size <= this.config.tiers.micro.maxSize) tier = 'micro';
      else if (file.size <= this.config.tiers.small.maxSize) tier = 'small';
      else if (file.size <= this.config.tiers.medium.maxSize) tier = 'medium';

      // Check if adding this file exceeds limits
      const projectedInputTokens = currentInputTokens + fileInputTokens;
      const projectedOutputTokens = currentOutputTokens + fileOutputTokens;
      const totalProjected = projectedInputTokens + projectedOutputTokens;

      const limit = this.config.targetInputTokens + this.config.perFileResponseTokens * currentBatch.length;

      if (totalProjected > limit && currentBatch.length > 0) {
        // Batch is full, save it and start new batch
        batches.push({
          files: currentBatch,
          estimatedInputTokens: currentInputTokens,
          estimatedOutputTokens: currentOutputTokens,
          tier: currentTier,
        });

        // Reset for new batch
        currentBatch = [];
        currentInputTokens = this.config.basePromptTokens;
        currentOutputTokens = 0;
        currentTier = tier;
      }

      // Add file to current batch
      currentBatch.push({
        path: file.path,
        name: file.name,
        size: file.size,
        contentSample: sample,
        samplingStrategy: strategy,
      });

      currentInputTokens += fileInputTokens;
      currentOutputTokens += fileOutputTokens;

      // Update tier to the largest in batch
      if (tier === 'large' || (tier === 'medium' && currentTier !== 'large') ||
          (tier === 'small' && currentTier === 'micro')) {
        currentTier = tier;
      }
    }

    // Add final batch if it has files
    if (currentBatch.length > 0) {
      batches.push({
        files: currentBatch,
        estimatedInputTokens: currentInputTokens,
        estimatedOutputTokens: currentOutputTokens,
        tier: currentTier,
      });
    }

    return batches;
  }

  /**
   * Build a compact, token-efficient prompt
   */
  public buildCompactPrompt(batch: BatchGroup, repositories: string[]): string {
    // Ultra-compact format to save tokens
    const repoList = repositories.join('|');

    const filesList = batch.files.map((f, idx) => {
      return `${idx}|${f.name}|${f.path}\n${f.contentSample}\n--`;
    }).join('\n');

    // Minimal prompt - every token counts!
    return `Classify ${batch.files.length} files. Categories: doc|script|test|src|config|asset. Repos: ${repoList}

FILES:
${filesList}

JSON: [{i,cat,conf,repo,why}]`;
  }

  /**
   * Get statistics about batching efficiency
   */
  public getBatchStats(batches: BatchGroup[]): {
    totalFiles: number;
    totalBatches: number;
    avgFilesPerBatch: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    estimatedCost: number;
    byTier: Record<string, number>;
  } {
    const totalFiles = batches.reduce((sum, b) => sum + b.files.length, 0);
    const totalInputTokens = batches.reduce((sum, b) => sum + b.estimatedInputTokens, 0);
    const totalOutputTokens = batches.reduce((sum, b) => sum + b.estimatedOutputTokens, 0);

    // Pricing: $3/M input tokens, $15/M output tokens (Claude 3.5 Sonnet)
    const inputCost = (totalInputTokens / 1_000_000) * 3;
    const outputCost = (totalOutputTokens / 1_000_000) * 15;
    const estimatedCost = inputCost + outputCost;

    const byTier: Record<string, number> = {
      micro: 0,
      small: 0,
      medium: 0,
      large: 0,
    };

    batches.forEach(b => {
      byTier[b.tier] += b.files.length;
    });

    return {
      totalFiles,
      totalBatches: batches.length,
      avgFilesPerBatch: totalFiles / batches.length,
      avgInputTokens: totalInputTokens / batches.length,
      avgOutputTokens: totalOutputTokens / batches.length,
      estimatedCost,
      byTier,
    };
  }

  /**
   * Validate that batches fit within limits
   */
  public validateBatches(batches: BatchGroup[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const total = batch.estimatedInputTokens + batch.estimatedOutputTokens;

      if (total > this.config.maxContextTokens) {
        issues.push(
          `Batch ${i} exceeds context limit: ${total} > ${this.config.maxContextTokens}`
        );
      }

      if (batch.files.length === 0) {
        issues.push(`Batch ${i} is empty`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get model info for reporting
   */
  public getModelInfo(): { name: string; contextWindow: number } | null {
    if (!this.model) return null;
    return {
      name: this.model.name,
      contextWindow: this.model.contextWindow,
    };
  }

  /**
   * Calculate efficiency metrics
   */
  public calculateEfficiency(batches: BatchGroup[]): {
    contextUtilization: number;
    avgBatchSize: number;
    totalApiCalls: number;
    estimatedTimeSeconds: number;
  } {
    const totalFiles = batches.reduce((sum, b) => sum + b.files.length, 0);
    const totalTokensUsed = batches.reduce(
      (sum, b) => sum + b.estimatedInputTokens + b.estimatedOutputTokens,
      0
    );
    const maxPossibleTokens = batches.length * this.config.maxContextTokens;

    return {
      contextUtilization: maxPossibleTokens > 0 ? totalTokensUsed / maxPossibleTokens : 0,
      avgBatchSize: totalFiles / batches.length,
      totalApiCalls: batches.length,
      estimatedTimeSeconds: batches.length * 2.5, // ~2.5s per API call
    };
  }
}

// Example usage:
/*
const optimizer = new AIBatchOptimizer();

// Create optimal batches
const files = await loadFilesToClassify();
const batches = optimizer.createOptimalBatches(files);

// Get statistics
const stats = optimizer.getBatchStats(batches);
console.log(`Batching ${stats.totalFiles} files into ${stats.totalBatches} batches`);
console.log(`Average: ${stats.avgFilesPerBatch.toFixed(1)} files/batch`);
console.log(`Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
console.log(`By tier:`, stats.byTier);

// Validate
const validation = optimizer.validateBatches(batches);
if (!validation.valid) {
  console.error('Batch validation failed:', validation.issues);
}

// Process each batch
for (const batch of batches) {
  const prompt = optimizer.buildCompactPrompt(batch, ['root', 'app1', 'app2']);
  const results = await callAnthropicAPI(prompt);
  // Process results...
}
*/
