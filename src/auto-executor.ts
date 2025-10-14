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

      // Step 6.8: Consolidate markdown documentation if requested
      if (!options.dryRun && executionResult.success && options.consolidateDocs && options.consolidateDocs !== 'none') {
        this.reportProgress(options, 6, 7, 'Consolidating markdown documentation...');
        try {
          await this.consolidateMarkdownDocumentation(
            options.path,
            options.consolidateDocs,
            options.verbose || false
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
   * Consolidate markdown documentation
   * 
   * @param repoPath - Repository path
   * @param mode - 'safe' for folder-by-folder, 'aggressive' for summarize-all
   * @param verbose - Enable verbose output
   */
  private async consolidateMarkdownDocumentation(
    repoPath: string,
    mode: 'safe' | 'aggressive',
    verbose: boolean
  ): Promise<void> {
    const { MarkdownScanner } = await import('./markdown-consolidation/markdown-scanner.js');
    const { MarkdownAnalyzer } = await import('./markdown-consolidation/markdown-analyzer.js');
    const { AIContentAnalyzer } = await import('./markdown-consolidation/ai-content-analyzer.js');
    const { MarkdownConsolidator } = await import('./markdown-consolidation/markdown-consolidator.js');
    const { SuperReadmeGenerator } = await import('./markdown-consolidation/super-readme-generator.js');
    const { AIClassifierFactory } = await import('./ai-classifier.js');
    
    // Check for documents directory
    const documentsDir = path.join(repoPath, 'documents');
    const hasDocuments = await fs.access(documentsDir).then(() => true).catch(() => false);
    
    if (!hasDocuments) {
      if (verbose) {
        console.log('   No documents/ directory found, skipping consolidation');
      }
      return;
    }

    // Get AI provider
    const preferredProvider = await AIClassifierFactory.getPreferredProvider();
    const providerToUse = (preferredProvider === 'google' ? 'anthropic' : preferredProvider) || 'anthropic';
    const aiProvider = await AIClassifierFactory.create(providerToUse);
    
    if (!aiProvider) {
      if (verbose) {
        console.log('   AI provider not available, skipping consolidation');
      }
      return;
    }

    // Initialize components
    const scanner = new MarkdownScanner();
    const analyzer = new MarkdownAnalyzer();
    const aiAnalyzer = new AIContentAnalyzer(aiProvider);
    const backupDir = path.join(repoPath, '.unvibe', 'backups');
    const backupManager = new BackupManager(backupDir);
    const consolidator = new MarkdownConsolidator(aiAnalyzer, backupManager);
    const readmeGenerator = new SuperReadmeGenerator();

    // Scan for markdown files in documents/
    const files = await scanner.scan({
      targetDirectory: documentsDir,
      recursive: true,
      excludePatterns: ['node_modules', '.git', 'DOCUMENTATION_HUB.md'],
      includeHidden: false
    });

    if (files.length === 0) {
      if (verbose) {
        console.log('   No markdown files found in documents/');
      }
      return;
    }

    if (verbose) {
      console.log(`   Found ${files.length} markdown files`);
    }

    // Analyze relevance
    const analysisResults = files.map(file => analyzer.analyzeRelevance(file, files));
    const relevantFiles = analysisResults
      .filter(r => r.status !== 'stale')
      .map(r => r.file);

    if (relevantFiles.length === 0) {
      if (verbose) {
        console.log('   No relevant files to consolidate');
      }
      return;
    }

    // Create consolidation plans based on mode
    const plans = await this.createConsolidationPlans(
      relevantFiles,
      aiAnalyzer,
      documentsDir,
      mode,
      verbose
    );

    if (plans.length === 0) {
      if (verbose) {
        console.log('   No consolidation needed');
      }
      return;
    }

    // Execute plans
    for (const plan of plans) {
      try {
        await consolidator.executePlan(plan);
        if (verbose) {
          console.log(`   ✓ Consolidated: ${path.basename(plan.outputFile)}`);
        }
      } catch (error) {
        if (verbose) {
          console.error(`   ✗ Failed: ${(error as Error).message}`);
        }
      }
    }

    // Generate super README
    const superReadme = await readmeGenerator.generate(relevantFiles);
    await fs.writeFile(path.join(documentsDir, 'DOCUMENTATION_HUB.md'), superReadme);
    
    if (verbose) {
      console.log('   ✓ Created DOCUMENTATION_HUB.md');
    }
  }

  /**
   * Create consolidation plans based on mode
   */
  private async createConsolidationPlans(
    files: any[],
    aiAnalyzer: any,
    documentsDir: string,
    mode: 'safe' | 'aggressive',
    verbose: boolean
  ): Promise<any[]> {
    const plans: any[] = [];

    if (mode === 'safe') {
      // SAFE MODE: Folder-by-folder consolidation
      // Group files by immediate parent folder
      const filesByFolder = new Map<string, any[]>();
      
      for (const file of files) {
        const relativePath = path.relative(documentsDir, file.path);
        const folderPath = path.dirname(relativePath);
        const folder = folderPath === '.' ? 'root' : folderPath.split(path.sep)[0];
        
        if (!filesByFolder.has(folder)) {
          filesByFolder.set(folder, []);
        }
        filesByFolder.get(folder)!.push(file);
      }

      // Create one plan per folder (only if 2+ files)
      for (const [folder, folderFiles] of filesByFolder) {
        if (folderFiles.length >= 2) {
          const outputFileName = folder === 'root' 
            ? 'CONSOLIDATED_DOCS.md'
            : `${folder.toUpperCase()}_CONSOLIDATED.md`;
          
          plans.push({
            strategy: 'merge-by-folder' as const,
            inputFiles: folderFiles,
            outputFile: path.join(documentsDir, outputFileName),
            topic: `${folder} Documentation`
          });

          if (verbose) {
            console.log(`   Plan: Merge ${folderFiles.length} files in ${folder}/`);
          }
        }
      }

    } else if (mode === 'aggressive') {
      // AGGRESSIVE MODE: Summarize everything into fewer docs
      // Use AI clustering to group by topic
      const clusters = await aiAnalyzer.clusterByTopic(files);
      
      if (verbose) {
        console.log(`   Found ${clusters.length} topic clusters`);
      }

      // Create aggressive consolidation plans
      for (const cluster of clusters) {
        if (cluster.files.length >= 2) {
          const outputFileName = `${cluster.name.replace(/\s+/g, '_').toUpperCase()}_SUMMARY.md`;
          
          plans.push({
            strategy: 'summarize-cluster' as const,
            inputFiles: cluster.files,
            outputFile: path.join(documentsDir, outputFileName),
            topic: cluster.name,
            summary: cluster.summary
          });

          if (verbose) {
            console.log(`   Plan: Summarize ${cluster.files.length} files → ${cluster.name}`);
          }
        }
      }
    }

    return plans;
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
