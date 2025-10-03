/**
 * Intelligent Batch Processor
 *
 * Uses model-aware context window optimization to maximize batch sizes
 * and minimize API calls while staying within token limits.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AIBatchOptimizer, type FileInfo, type BatchGroup } from './ai-batch-optimizer.js';
import { AIClassifierFactory } from './ai-classifier.js';
import type { FileClassification, GitRepository } from './types.js';
import { getAIResolver } from './ai-provider-resolver.js';
import { AVAILABLE_MODELS, type ModelConfig } from './ai-model-config.js';

export interface BatchProcessingOptions {
  maxFileSize?: number; // Max file size to read (default 100KB)
  showProgress?: boolean; // Show progress output
  onProgress?: (current: number, total: number, batchInfo: string) => void;
}

export interface BatchProcessingResult {
  classifications: FileClassification[];
  stats: {
    totalFiles: number;
    totalBatches: number;
    avgFilesPerBatch: number;
    totalApiCalls: number;
    estimatedCost: number;
    modelUsed: string;
    contextWindow: number;
    contextUtilization: number;
    processingTimeMs: number;
  };
}

export class IntelligentBatchProcessor {
  private optimizer: AIBatchOptimizer | null = null;
  private model: ModelConfig | null = null;

  async initialize(): Promise<void> {
    // Get the active AI model
    const resolver = getAIResolver();
    const resolved = await resolver.resolve();

    if (!resolved) {
      throw new Error('No AI provider configured');
    }

    this.model = resolved.model;
    this.optimizer = new AIBatchOptimizer(this.model);
  }

  /**
   * Process files using intelligent batching based on model's context window
   */
  async processFiles(
    filePaths: string[],
    repositories: GitRepository[],
    options: BatchProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();

    if (!this.optimizer || !this.model) {
      await this.initialize();
    }

    const {
      maxFileSize = 100_000,
      showProgress = false,
      onProgress,
    } = options;

    // Load file contents
    const fileInfos: FileInfo[] = [];
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > maxFileSize) {
          // Skip files that are too large
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        fileInfos.push({
          path: filePath,
          name: path.basename(filePath),
          size: stats.size,
          content,
        });
      } catch (error) {
        // Skip unreadable files
        continue;
      }
    }

    if (fileInfos.length === 0) {
      throw new Error('No readable files to process');
    }

    // Create optimal batches using model's context window
    const batches = this.optimizer!.createOptimalBatches(fileInfos);
    const validation = this.optimizer!.validateBatches(batches);

    if (!validation.valid) {
      throw new Error(`Batch validation failed: ${validation.issues.join(', ')}`);
    }

    // Process each batch
    const allClassifications: FileClassification[] = [];
    const ai = await AIClassifierFactory.create();

    if (!ai || !ai.classifyBatch) {
      throw new Error('AI provider does not support batch classification');
    }

    let batchNum = 0;
    for (const batch of batches) {
      batchNum++;

      if (showProgress || onProgress) {
        const batchInfo = `Batch ${batchNum}/${batches.length}: ${batch.files.length} files (${Math.round(batch.estimatedInputTokens).toLocaleString()} tokens)`;
        if (onProgress) {
          onProgress(batchNum, batches.length, batchInfo);
        }
        if (showProgress) {
          console.log(`📦 ${batchInfo}`);
        }
      }

      // Convert batch to AI-friendly format
      const batchFiles = batch.files.map(f => ({
        fileName: f.name,
        filePath: f.path,
        contentPreview: f.contentSample,
      }));

      const repoInfo = repositories.map(r => ({
        name: path.basename(r.path),
        path: r.path,
        isRoot: r.isRoot,
      }));

      // Classify the batch
      const batchResults = await ai.classifyBatch(batchFiles, repoInfo);

      // Convert batch results to FileClassification format
      for (const result of batchResults) {
        const file = batch.files.find(f => f.name === result.fileName);
        if (file) {
          allClassifications.push({
            path: file.path,
            category: result.category,
            confidence: result.confidence,
            reasoning: result.reasoning,
          });
        }
      }
    }

    // Calculate stats
    const stats = this.optimizer!.getBatchStats(batches);
    const efficiency = this.optimizer!.calculateEfficiency(batches);
    const processingTime = Date.now() - startTime;

    return {
      classifications: allClassifications,
      stats: {
        totalFiles: allClassifications.length,
        totalBatches: batches.length,
        avgFilesPerBatch: efficiency.avgBatchSize,
        totalApiCalls: efficiency.totalApiCalls,
        estimatedCost: stats.estimatedCost,
        modelUsed: this.model!.name,
        contextWindow: this.model!.contextWindow,
        contextUtilization: efficiency.contextUtilization,
        processingTimeMs: processingTime,
      },
    };
  }

  /**
   * Preview batching strategy without making API calls
   */
  async previewBatching(
    filePaths: string[],
    options: { maxFileSize?: number } = {}
  ): Promise<{
    batches: BatchGroup[];
    stats: {
      totalFiles: number;
      totalBatches: number;
      avgFilesPerBatch: number;
      estimatedCost: number;
      modelName: string;
      contextWindow: number;
      contextUtilization: number;
    };
  }> {
    if (!this.optimizer || !this.model) {
      await this.initialize();
    }

    const { maxFileSize = 100_000 } = options;

    // Load file contents
    const fileInfos: FileInfo[] = [];
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > maxFileSize) continue;

        const content = await fs.readFile(filePath, 'utf-8');
        fileInfos.push({
          path: filePath,
          name: path.basename(filePath),
          size: stats.size,
          content,
        });
      } catch {
        continue;
      }
    }

    const batches = this.optimizer!.createOptimalBatches(fileInfos);
    const stats = this.optimizer!.getBatchStats(batches);
    const efficiency = this.optimizer!.calculateEfficiency(batches);

    return {
      batches,
      stats: {
        totalFiles: fileInfos.length,
        totalBatches: batches.length,
        avgFilesPerBatch: efficiency.avgBatchSize,
        estimatedCost: stats.estimatedCost,
        modelName: this.model!.name,
        contextWindow: this.model!.contextWindow,
        contextUtilization: efficiency.contextUtilization,
      },
    };
  }
}

/**
 * Example usage:
 *
 * const processor = new IntelligentBatchProcessor();
 * const result = await processor.processFiles(
 *   ['file1.ts', 'file2.ts', ...],
 *   repositories,
 *   {
 *     showProgress: true,
 *     onProgress: (current, total, info) => {
 *       console.log(`[${current}/${total}] ${info}`);
 *     }
 *   }
 * );
 *
 * console.log('Stats:');
 * console.log(`Model: ${result.stats.modelUsed}`);
 * console.log(`Context: ${result.stats.contextWindow.toLocaleString()} tokens`);
 * console.log(`Batches: ${result.stats.totalBatches}`);
 * console.log(`Avg files/batch: ${result.stats.avgFilesPerBatch.toFixed(1)}`);
 * console.log(`Context utilization: ${(result.stats.contextUtilization * 100).toFixed(1)}%`);
 * console.log(`Cost: $${result.stats.estimatedCost.toFixed(4)}`);
 * console.log(`Time: ${result.stats.processingTimeMs}ms`);
 */
