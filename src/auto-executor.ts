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
import { GitIgnoreManager } from './gitignore-manager.js';
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
  private gitignoreManager = new GitIgnoreManager();

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
      this.reportProgress(options, 1, 7, 'Detecting repositories...');
      const repoResult = await this.detector.detectRepositories(options.path);

      if (repoResult.repositories.length === 0) {
        throw new Error('No git repositories found. Run "git init" first.');
      }

      // Step 2.5: Update .gitignore files
      if (!options.dryRun) {
        this.reportProgress(options, 2, 7, 'Updating .gitignore files...');
        const gitignoreResult = await this.gitignoreManager.updateAllRepositories(
          repoResult.repositories
        );

        if (options.verbose) {
          console.log(`\n${GitIgnoreManager.formatResult(gitignoreResult)}`);
        }
      }

      // Step 3: Analyze project structure (for intelligent classification)
      this.reportProgress(options, 3, 7, 'Analyzing project structure...');
      await this.classifier.classifyBatch([], repoResult.repositories);

      // Step 4: Create execution plan using intelligent classification
      this.reportProgress(options, 4, 7, 'Creating execution plan with AI...');

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
            4,
            7,
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
        5,
        7,
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

      // Step 6.5: Create documentation index if documents were moved
      if (!options.dryRun && executionResult.success) {
        await this.createDocumentationIndex(options.path, plan.operations);
      }

      // Step 7: Complete
      this.reportProgress(options, 7, 7, 'Auto cleanup complete!');

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

  /**
   * Create documentation index in documents folder
   */
  private async createDocumentationIndex(
    repoPath: string,
    operations: FileOperation[]
  ): Promise<void> {
    // Find all operations that moved files to documents/
    const docOperations = operations.filter(
      op => op.type === 'move' && op.targetPath?.includes('/documents/')
    );

    if (docOperations.length === 0) {
      return; // No docs moved, skip
    }

    const documentsDir = path.join(repoPath, 'documents');
    
    // Check if documents directory exists
    try {
      await fs.access(documentsDir);
    } catch {
      return; // Documents dir doesn't exist
    }

    // Get list of all files in documents directory
    const files = await fs.readdir(documentsDir);
    const mdFiles = files
      .filter(f => f.endsWith('.md'))
      .sort();

    // Group files by category
    const categories: Record<string, string[]> = {
      'AI & Intelligence': [],
      'Setup & Configuration': [],
      'Architecture & Design': [],
      'Features & Demos': [],
      'Reference & Specs': [],
      'Other Documentation': []
    };

    for (const file of mdFiles) {
      const lower = file.toLowerCase();
      
      if (lower.startsWith('ai_') || lower.includes('intelligent') || lower.includes('batching')) {
        categories['AI & Intelligence'].push(file);
      } else if (lower.includes('setup') || lower.includes('config') || lower.includes('install')) {
        categories['Setup & Configuration'].push(file);
      } else if (lower.includes('architecture') || lower.includes('design') || lower.includes('spec')) {
        categories['Architecture & Design'].push(file);
      } else if (lower.includes('demo') || lower.includes('feature') || lower.includes('mode')) {
        categories['Features & Demos'].push(file);
      } else if (lower.includes('reference') || lower.includes('requirement') || lower.includes('changelog')) {
        categories['Reference & Specs'].push(file);
      } else {
        categories['Other Documentation'].push(file);
      }
    }

    // Create index content
    let indexContent = `# Documentation Index

Welcome to the D-Vibe documentation! All project documentation has been organized here for easy navigation.

**📍 You are here:** \`documents/\`  
**🏠 Main README:** [\`../README.md\`](../README.md)

---

## 📚 Documentation Categories

`;

    // Add each category
    for (const [category, files] of Object.entries(categories)) {
      if (files.length > 0) {
        indexContent += `### ${category}\n\n`;
        for (const file of files) {
          const name = file.replace(/\.md$/, '').replace(/_/g, ' ');
          indexContent += `- [${name}](./${file})\n`;
        }
        indexContent += '\n';
      }
    }

    // Add footer with stats
    indexContent += `---

## 📊 Quick Stats

- **Total Documents:** ${mdFiles.length}
- **Organized by:** D-Vibe Auto Mode
- **Last Updated:** ${new Date().toISOString().split('T')[0]}

---

**Tip:** Use your IDE's file search or \`grep\` to find specific topics across all documentation.

`;

    // Write index file
    const indexPath = path.join(documentsDir, 'README.md');
    await fs.writeFile(indexPath, indexContent, 'utf-8');
  }
}
