/**
 * Auto Executor
 *
 * Automatically executes repository cleanup using AI classification
 * without requiring user confirmation for each file.
 *
 * Features:
 * - Uses IntelligentClassifier for smart file classification
 * - Batch processing for efficiency
 * - Automatic conflict resolution
 * - Progress reporting
 * - Full backup before execution
 */

import type { GitRepository, FileOperation } from './types.js';
import { IntelligentClassifier } from './intelligent-classifier.js';
import { OperationPlanner, OperationExecutor } from './operation-executor.js';
import { GitDetector } from './git-detector.js';
import { BackupManager } from './backup-manager.js';
import { AIClassifierFactory } from './ai-classifier.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AutoExecutorOptions {
  path: string;
  dryRun?: boolean;
  verbose?: boolean;
  skipBackup?: boolean;
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface AutoExecutorResult {
  success: boolean;
  filesAnalyzed: number;
  filesMovedOrDeleted: number;
  operationsCompleted: number;
  operationsFailed: number;
  backupManifestId?: string;
  errors: string[];
  duration: number;
}

export class AutoExecutor {
  private detector = new GitDetector();
  private classifier = new IntelligentClassifier();

  /**
   * Automatically clean up repository using AI
   */
  async execute(options: AutoExecutorOptions): Promise<AutoExecutorResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Step 1: Check AI availability
      if (!await AIClassifierFactory.isAvailable()) {
        throw new Error('AI classification is required for auto mode. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
      }

      this.reportProgress(options, 0, 6, 'Initializing auto executor...');

      // Step 2: Detect repositories
      this.reportProgress(options, 1, 6, 'Detecting repositories...');
      const repoResult = await this.detector.detectRepositories(options.path);

      if (repoResult.repositories.length === 0) {
        throw new Error('No git repositories found. Run "git init" first.');
      }

      // Step 3: Analyze project structure (for intelligent classification)
      this.reportProgress(options, 2, 6, 'Analyzing project structure...');
      await this.classifier.classifyBatch([], repoResult.repositories);

      // Step 4: Create execution plan using intelligent classification
      this.reportProgress(options, 3, 6, 'Creating execution plan with AI...');

      const planner = new OperationPlanner(
        this.detector,
        this.classifier,
        undefined // Skip usage detection for auto mode (faster)
      );

      const plan = await planner.planRootFileDistribution(
        options.path,
        (current, total, file) => {
          this.reportProgress(
            options,
            3,
            6,
            `Analyzing files: ${current}/${total} - ${path.basename(file)}`
          );
        }
      );

      if (plan.operations.length === 0) {
        return {
          success: true,
          filesAnalyzed: 0,
          filesMovedOrDeleted: 0,
          operationsCompleted: 0,
          operationsFailed: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Step 5: Execute operations with backup
      this.reportProgress(
        options,
        4,
        6,
        `Executing ${plan.operations.length} operations...`
      );

      const backupManager = new BackupManager(
        path.join(options.path, '.unvibe', 'backups')
      );
      const executor = new OperationExecutor(backupManager);

      const executionResult = await executor.execute(
        plan,
        options.dryRun || false
      );

      // Step 6: Complete
      this.reportProgress(options, 6, 6, 'Auto cleanup complete!');

      return {
        success: executionResult.success,
        filesAnalyzed: plan.operations.length,
        filesMovedOrDeleted: executionResult.operationsCompleted,
        operationsCompleted: executionResult.operationsCompleted,
        operationsFailed: executionResult.operationsFailed,
        backupManifestId: executionResult.backupManifestId,
        errors: executionResult.errors,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        success: false,
        filesAnalyzed: 0,
        filesMovedOrDeleted: 0,
        operationsCompleted: 0,
        operationsFailed: 0,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Preview what auto mode would do (dry-run)
   */
  async preview(options: Omit<AutoExecutorOptions, 'dryRun'>): Promise<{
    operations: FileOperation[];
    warnings: string[];
    estimatedDuration: number;
  }> {
    // Check AI availability
    if (!await AIClassifierFactory.isAvailable()) {
      throw new Error('AI classification is required for auto mode. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.');
    }

    this.reportProgress(options, 0, 3, 'Analyzing repository...');

    // Detect repositories
    const repoResult = await this.detector.detectRepositories(options.path);

    if (repoResult.repositories.length === 0) {
      throw new Error('No git repositories found.');
    }

    this.reportProgress(options, 1, 3, 'Analyzing project structure...');
    await this.classifier.classifyBatch([], repoResult.repositories);

    // Create plan
    this.reportProgress(options, 2, 3, 'Creating execution plan...');

    const planner = new OperationPlanner(
      this.detector,
      this.classifier,
      undefined
    );

    const plan = await planner.planRootFileDistribution(
      options.path,
      (current, total, file) => {
        this.reportProgress(
          options,
          2,
          3,
          `Analyzing: ${current}/${total} - ${path.basename(file)}`
        );
      }
    );

    this.reportProgress(options, 3, 3, 'Preview ready!');

    return {
      operations: plan.operations,
      warnings: plan.warnings,
      estimatedDuration: plan.estimatedDuration,
    };
  }

  /**
   * Report progress if callback provided
   */
  private reportProgress(
    options: AutoExecutorOptions,
    current: number,
    total: number,
    message: string
  ): void {
    if (options.onProgress) {
      options.onProgress(current, total, message);
    }
  }
}
