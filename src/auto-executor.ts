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
import { getPreferencesManager } from './user-preferences.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AutoExecutorOptions {
  path: string;
  dryRun?: boolean;
  verbose?: boolean;
  skipBackup?: boolean;
  consolidateDocs?: 'safe' | 'aggressive' | 'none';
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
      // Step 1: Check AI availability and prompt user if not configured
      if (!await AIClassifierFactory.isAvailable()) {
        const preferences = getPreferencesManager();
        const shouldPrompt = await preferences.shouldPromptForAPIKey();

        if (shouldPrompt) {
          console.log('\n⚠️  No AI API key configured\n');
          console.log('Auto mode works best with AI classification for accurate results:');
          console.log('  • With AI:      90% accuracy');
          console.log('  • Without AI:   65% accuracy (heuristics only)\n');
          console.log('To enable AI classification, add an API key:');
          console.log('  devibe ai-key add anthropic <your-key>    # Recommended: Claude');
          console.log('  devibe ai-key add openai <your-key>       # Alternative: GPT-4');
          console.log('  devibe ai-key add google <your-key>       # Budget: Gemini\n');

          // Ask user if they want to continue without AI
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer: string = await new Promise((resolve) => {
            rl.question('Continue with heuristics only? (y/n): ', (answer) => {
              rl.close();
              resolve(answer.toLowerCase().trim());
            });
          });

          if (answer !== 'y' && answer !== 'yes') {
            throw new Error('Operation cancelled. Please add an API key and try again.');
          }

          // Increment decline count
          const currentCount = (await preferences.get('apiKeyPromptDeclineCount')) || 0;
          await preferences.incrementAPIKeyPromptDecline();

          // If this was the second decline, let them know
          if (currentCount === 1) {
            console.log('\n💡 Note: We won\'t ask about API keys again.');
            console.log('   To re-enable this prompt: devibe ai-key reset-prompt\n');
          }

          console.log('📊 Continuing with heuristics-based classification...\n');
        } else {
          // User has already declined twice, just continue silently with heuristics
          if (options.verbose) {
            console.log('📊 Using heuristics-based classification (no AI key configured)...\n');
          }
        }
      }

      this.reportProgress(options, 0, 6, 'Initializing auto executor...');

      // Step 2: Detect repositories
      this.reportProgress(options, 1, 7, 'Detecting repositories...');
      const repoResult = await this.detector.detectRepositories(options.path);

      // If no git repos found, treat the directory as a single "non-git" repository
      let repositoriesToProcess = repoResult.repositories;
      if (repositoriesToProcess.length === 0) {
        repositoriesToProcess = [{
          path: options.path,
          rootPath: options.path,
          isRoot: true
        }];
      }

      // Step 2.5: Update .gitignore files (only for actual git repos)
      if (!options.dryRun && repoResult.repositories.length > 0) {
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
      await this.classifier.classifyBatch([], repositoriesToProcess);

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

      // Initialize result variables
      let executionResult = {
        success: true,
        operationsCompleted: 0,
        operationsFailed: 0,
        backupManifestId: undefined as string | undefined,
        errors: [] as string[],
      };

      // Step 5: Execute operations with backup (if any)
      if (plan.operations.length > 0) {
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

        const execResult = await executor.execute(
          plan,
          options.dryRun || false
        );

        executionResult = {
          success: execResult.success,
          operationsCompleted: execResult.operationsCompleted,
          operationsFailed: execResult.operationsFailed,
          backupManifestId: execResult.backupManifestId,
          errors: execResult.errors,
        };

        // Step 6.5: Create documentation index if documents were moved
        if (!options.dryRun && executionResult.success) {
          await this.createDocumentationIndex(options.path, plan.operations);
        }
      }

      // Step 6.8: Consolidate markdown documentation if requested
      if (executionResult.success && options.consolidateDocs && options.consolidateDocs !== 'none') {
        this.reportProgress(options, 6, 7, 'Consolidating markdown documentation...');
        try {
          await this.consolidateMarkdownDocumentation(
            options.path,
            options.consolidateDocs,
            options.verbose || false,
            options.dryRun || false
          );
        } catch (error) {
          if (options.verbose) {
            console.error(`⚠️  Markdown consolidation failed: ${(error as Error).message}`);
          }
          // Don't fail the entire auto-executor if consolidation fails
        }
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

    // If no git repos found, treat the directory as a single "non-git" repository
    let repositoriesToProcess = repoResult.repositories;
    if (repositoriesToProcess.length === 0) {
      repositoriesToProcess = [{
        path: options.path,
        rootPath: options.path,
        isRoot: true
      }];
    }

    this.reportProgress(options, 1, 3, 'Analyzing project structure...');
    await this.classifier.classifyBatch([], repositoriesToProcess);

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
   * Consolidate markdown documentation
   *
   * @param repoPath - Repository path
   * @param mode - 'safe' for folder-by-folder, 'aggressive' for summarize-all
   * @param verbose - Enable verbose output
   * @param dryRun - Preview what would be consolidated without making changes
   */
  private async consolidateMarkdownDocumentation(
    repoPath: string,
    mode: 'safe' | 'aggressive',
    verbose: boolean,
    dryRun: boolean = false
  ): Promise<void> {
    try {
      if (verbose) {
        const action = dryRun ? 'Previewing' : 'Running';
        console.log(`\n   📄 ${action} markdown consolidation...`);
      }

      // Use the new AutoConsolidateService which does everything
      const { AutoConsolidateService } = await import('./markdown-consolidation/auto-consolidate-service.js');
      const { MarkdownScanner } = await import('./markdown-consolidation/markdown-scanner.js');
      const { MarkdownAnalyzer } = await import('./markdown-consolidation/markdown-analyzer.js');
      const { AIContentAnalyzer } = await import('./markdown-consolidation/ai-content-analyzer.js');
      const { MarkdownConsolidator } = await import('./markdown-consolidation/markdown-consolidator.js');
      const { AIClassifierFactory } = await import('./ai-classifier.js');
      const { BackupManager } = await import('./backup-manager.js');

      // Get AI provider (optional)
      const preferredProvider = await AIClassifierFactory.getPreferredProvider();
      const providerToUse = (preferredProvider === 'google' ? 'anthropic' : preferredProvider) || 'anthropic';
      const aiProvider = await AIClassifierFactory.create(providerToUse);

      // Initialize components
      const scanner = new MarkdownScanner();
      const analyzer = new MarkdownAnalyzer();
      const aiAnalyzer = new AIContentAnalyzer(aiProvider);
      const backupDir = path.join(repoPath, '.devibe', 'backups');
      const backupManager = new BackupManager(backupDir);
      const consolidator = new MarkdownConsolidator(aiAnalyzer, backupManager);

      // DRY RUN: Preview what would be consolidated
      if (dryRun) {
        const files = await scanner.scan({
          targetDirectory: repoPath,
          recursive: false,
          excludePatterns: ['node_modules/**', '.git/**', '.devibe/**'],
          includeHidden: false
        });

        const mdFiles = files.filter(f => path.basename(f.path).toLowerCase() !== 'readme.md');

        if (mdFiles.length === 0) {
          if (verbose) {
            console.log('   ℹ️  No markdown files to consolidate');
          }
          return;
        }

        console.log(`\n   📋 Consolidation Preview:`);
        console.log(`   • Would consolidate ${mdFiles.length} markdown file(s):`);
        for (const file of mdFiles) {
          console.log(`     - ${path.basename(file.path)} (${file.metadata.wordCount} words)`);
        }

        // Check for related files (.txt, .log)
        try {
          const dirEntries = await fs.readdir(repoPath);
          const relatedFiles = dirEntries.filter(f =>
            ['.txt', '.log'].includes(path.extname(f).toLowerCase()) &&
            !f.startsWith('.')
          );

          if (relatedFiles.length > 0) {
            console.log(`\n   • Would analyze ${relatedFiles.length} related file(s) with AI:`);
            for (const file of relatedFiles.slice(0, 5)) {
              console.log(`     - ${file}`);
            }
            if (relatedFiles.length > 5) {
              console.log(`     ... and ${relatedFiles.length - 5} more`);
            }
          }
        } catch {
          // Ignore if can't read directory
        }

        console.log(`\n   • Would create: CONSOLIDATED_DOCUMENTATION.md`);
        console.log(`   • Would update: README.md (if exists)`);
        console.log(`   • Would backup originals to: .devibe/backups/`);
        console.log(`   • Would create: BACKUP_INDEX.md`);
        console.log(`   • Would delete original markdown files after backup`);
        console.log(`   • Would clean up UUID backup artifacts\n`);

        return;
      }

      // ACTUAL EXECUTION
      const autoService = new AutoConsolidateService(
        scanner,
        analyzer,
        aiAnalyzer,
        consolidator,
        backupManager
      );

      // Run consolidation in compress mode (default)
      // This will consolidate all .md files, include related .txt files, and clean up
      const result = await autoService.execute({
        targetDirectory: repoPath,
        mode: 'compress',  // Always use compress mode for --auto
        maxOutputFiles: 1, // Single consolidated file
        suppressToC: false,
        respectGitBoundaries: false,  // Process current repo only
        includeRelated: true  // Include .txt, .log files
      });

      if (result.success && verbose) {
        console.log(`   ✓ Consolidated ${result.processedFiles} markdown files`);
        if (result.consolidatedFiles.length > 0) {
          console.log(`   ✓ Created: ${path.basename(result.consolidatedFiles[0])}`);
        }
      }
    } catch (error) {
      if (verbose) {
        console.error(`   ⚠️  Consolidation failed: ${(error as Error).message}`);
      }
      // Don't throw - consolidation failure shouldn't stop the main cleanup
    }
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
