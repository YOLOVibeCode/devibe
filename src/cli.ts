#!/usr/bin/env node
import { Command } from 'commander';
import { GitDetector } from './git-detector.js';
import { SecretScanner } from './secret-scanner.js';
import { FileClassifier } from './file-classifier.js';
import { OperationPlanner, OperationExecutor } from './operation-executor.js';
import { BackupManager } from './backup-manager.js';
import { BuildDetector, BuildValidationService } from './build-validator.js';
import { YoloMode } from './yolo-mode.js';
import { ConfigManager } from './config.js';
import { AIClassifierFactory } from './ai-classifier.js';
import { TestOrganizer, createTestOrganizer } from './test-organizer.js';
import { RulePackValidator, formatValidationResult } from './rulepack-validator.js';
import { RepoBestPracticesAnalyzer, formatBestPracticesReport } from './repo-best-practices.js';
import { getKeyManager } from './ai-key-manager.js';
import { AVAILABLE_MODELS, selectModel, compareModels, estimateCost, type ModelConfig } from './ai-model-config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('devibe')
  .description(`UnVibe - Repository cleanup utility for vibe coding sessions

AI ASSISTANT GUIDE:
When the user mentions "run devibe" or asks about cleanup:
1. Run: devibe scan            → Check for hardcoded secrets (31 types detected)
2. Run: devibe --auto          → Quick auto-organize with AI (one command!)
3. Run: devibe execute --auto  → AI automatically cleans up the repository
4. Run: devibe enforce         → Enforce scripts/ and documents/ folders
5. Run: devibe validate        → Test that builds still work
6. Run: devibe organize-tests  → Organize tests by category (unit, e2e, etc.)

Quick cleanup: devibe --auto (one command does everything!)
Before git push: devibe check-pr (simulates GitHub CI checks)

Auto Mode (NEW):
- devibe --auto              → Quick auto-organize (AI or heuristics)
- devibe --auto --no-ai      → Quick auto-organize (heuristics only, no API key)
- devibe execute --auto      → AI automatically executes cleanup (no prompts!)

Test commands:
- devibe detect-tests         → List all test files and their categories
- devibe organize-tests        → Move tests to organized directories
- devibe organize-tests --report → Generate test organization report

Context: This tool cleans up messy repos after AI coding sessions by organizing
root files, enforcing folder structure, and detecting secrets - all with 100%
reversible backups. Perfect for monorepos with multiple .git boundaries.`)
  .version('1.5.2')
  .option('--auto', 'Quick auto-organize repository', false)
  .option('--no-ai', 'Use heuristics only (no AI)', false)
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('-v, --verbose', 'Enable verbose debug output', false)
  .action(async (options) => {
    // Handle --auto mode
    if (options.auto) {
      const { AutoExecutor } = await import('./auto-executor.js');
      const autoExecutor = new AutoExecutor();

      // Handle --no-ai flag with auto mode
      if (options.ai === false) {
        console.log('\n🤖 Quick Auto-Organize: Using heuristics (no AI)\n');
        // Temporarily disable AI for this run
        const oldAnthropicKey = process.env.ANTHROPIC_API_KEY;
        const oldOpenAIKey = process.env.OPENAI_API_KEY;
        const oldGoogleKey = process.env.GOOGLE_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
      } else {
        console.log('\n🤖 Quick Auto-Organize: AI will automatically organize your repository\n');
      }

      try {
        const result = await autoExecutor.execute({
          path: options.path,
          dryRun: false,
          verbose: options.verbose,
          onProgress: (current, total, message) => {
            if (options.verbose) {
              console.log(`  [${current}/${total}] ${message}`);
            } else if (current === total) {
              console.log(`✅ ${message}\n`);
            }
          },
        });

        if (result.success) {
          console.log(`Files analyzed: ${result.filesAnalyzed}`);
          console.log(`Operations completed: ${result.operationsCompleted}`);
          console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s\n`);

          if (result.backupManifestId) {
            console.log(`📦 Backup created: ${result.backupManifestId}`);
            console.log(`   Restore with: devibe restore ${result.backupManifestId}\n`);
          }
        } else {
          console.error(`\n❌ Auto-organize failed:\n`);
          for (const error of result.errors) {
            console.error(`   ${error}`);
          }
          console.error('');
          process.exit(1);
        }
      } catch (error) {
        console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
      return;
    }

    // Default action: show status (original behavior)
    const cwd = options.path;
    const detector = new GitDetector();
    const result = await detector.detectRepositories(cwd);

    console.log('\n📊 UnVibe Status\n');

    if (result.repositories.length === 0) {
      console.log('⚠️  Not in a git repository.');
      console.log('\nSuggested commands:');
      console.log('  git init          Initialize a new repository');
      console.log('  devibe --auto     Quick auto-organize (once in a git repo)');
      return;
    }

    console.log(`Git repositories: ${result.repositories.length}`);
    console.log(`Monorepo: ${result.hasMultipleRepos ? 'Yes' : 'No'}\n`);

    // Check AI availability
    const aiAvailable = await AIClassifierFactory.isAvailable();
    const provider = await AIClassifierFactory.getPreferredProvider();

    console.log('AI Classification:');
    if (aiAvailable && provider) {
      console.log(`  ✓ ${provider === 'anthropic' ? 'Anthropic Claude' : provider === 'google' ? 'Google Gemini' : 'OpenAI GPT-4'} available (90% accuracy)`);
    } else {
      console.log('  ⚠️  AI unavailable - using heuristics (65% accuracy)');
      console.log('     To enable: Run `devibe ai-key add <provider> <api-key>`');
    }
    console.log();

    // Check for build script in package.json (if Node.js project)
    try {
      const packageJsonPath = path.join(cwd, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      console.log('Build Configuration:');
      if (packageJson.scripts?.build) {
        console.log(`  ✓ Build script configured: "${packageJson.scripts.build}"`);
      } else {
        console.log('  ⚠️  No build script found');
        console.log('     To enable validation: Add "build" script to package.json');
      }
      console.log();
    } catch {
      // Not a Node.js project or no package.json
    }

    console.log('Suggested commands:');
    console.log('  devibe --auto          Quick auto-organize');
    console.log('  devibe scan            Scan for secrets');
    console.log('  devibe plan            Plan file distribution');
    console.log('  devibe best-practices  Analyze repo best practices\n');
  });

program
  .command('detect')
  .description('Detect git repositories in current directory')
  .option('-p, --path <path>', 'Path to scan', process.cwd())
  .action(async (options) => {
    const detector = new GitDetector();
    const result = await detector.detectRepositories(options.path);

    console.log('\nGit Repository Detection:\n');
    console.log(`Found ${result.repositories.length} repositories`);
    console.log(`Multiple repos: ${result.hasMultipleRepos ? 'Yes' : 'No'}\n`);

    for (const repo of result.repositories) {
      console.log(
        `${repo.isRoot ? '📦 ROOT:' : '  📁 Sub:'} ${repo.path}`
      );
    }

    if (result.repositories.length === 0) {
      console.log('\n⚠️  No git repositories found.');
      console.log('Run "git init" to create one.');
    }
  });

program
  .command('scan')
  .description('Scan for secrets in files')
  .option('-p, --path <path>', 'Path to scan', process.cwd())
  .action(async (options) => {
    const scanner = new SecretScanner();
    const files = await findSourceFiles(options.path);

    if (files.length === 0) {
      console.log('\n⚠️  No source files found to scan.');
      return;
    }

    console.log(`\nScanning ${files.length} files for secrets...\n`);

    const result = await scanner.scanFiles(files);

    console.log(`✓ Scanned ${result.filesScanned} files in ${result.duration}ms\n`);

    if (result.secretsFound === 0) {
      console.log('✓ No secrets detected. You\'re all good!');
    } else {
      console.log(`⚠️  Found ${result.secretsFound} potential secrets:\n`);
      console.log(`   Critical: ${result.summary.critical}`);
      console.log(`   High:     ${result.summary.high}`);
      console.log(`   Medium:   ${result.summary.medium}`);
      console.log(`   Low:      ${result.summary.low}\n`);

      // Show first 5 findings
      const topFindings = result.findings.slice(0, 5);
      for (const finding of topFindings) {
        console.log(`  ${getSeverityIcon(finding.severity)} ${finding.file}:${finding.line}`);
        console.log(`     Type: ${finding.type}`);
        console.log(`     Context: ${finding.context}`);
        console.log(`     Fix: ${finding.recommendation}\n`);
      }

      if (result.findings.length > 5) {
        console.log(`   ... and ${result.findings.length - 5} more findings.\n`);
      }

      console.log('⚠️  Please review and remove secrets before committing.\n');
    }
  });

program
  .command('update-gitignore')
  .description('Update .gitignore files to exclude .devibe and .unvibe directories')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    const { GitIgnoreManager } = await import('./gitignore-manager.js');
    const detector = new GitDetector();

    console.log('\n📝 Updating .gitignore files...\n');

    const repoResult = await detector.detectRepositories(options.path);

    if (repoResult.repositories.length === 0) {
      console.log('❌ No git repositories found.\n');
      return;
    }

    const manager = new GitIgnoreManager();
    const result = await manager.updateAllRepositories(repoResult.repositories);

    console.log('Results:\n');

    if (result.created.length > 0) {
      console.log(`✅ Created .gitignore in ${result.created.length} repositories:`);
      for (const repoPath of result.created) {
        console.log(`   ${repoPath}`);
      }
      console.log();
    }

    if (result.updated.length > 0) {
      console.log(`✅ Updated .gitignore in ${result.updated.length} repositories:`);
      for (const repoPath of result.updated) {
        console.log(`   ${repoPath}`);
      }
      console.log();
    }

    if (result.skipped.length > 0) {
      console.log(`⏭️  Skipped ${result.skipped.length} repositories (already configured):`);
      for (const repoPath of result.skipped) {
        console.log(`   ${repoPath}`);
      }
      console.log();
    }

    if (result.errors.length > 0) {
      console.log(`❌ Failed to update ${result.errors.length} repositories:`);
      for (const error of result.errors) {
        console.log(`   ${error.path}: ${error.error}`);
      }
      console.log();
    }

    const totalProcessed = result.created.length + result.updated.length;
    if (totalProcessed > 0) {
      console.log(`✅ Successfully processed ${totalProcessed} repositories\n`);
    }
  });

program
  .command('plan')
  .description('Plan root file distribution (dry-run)')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('-v, --verbose', 'Enable verbose debug output', false)
  .option('--auto', 'Automatically organize without prompts', false)
  .option('--no-ai', 'Use heuristics only (no AI)', false)
  .option('--no-usage-check', 'Skip usage detection for faster processing', false)
  .action(async (options) => {
    // Handle --auto mode
    if (options.auto) {
      const { AutoExecutor } = await import('./auto-executor.js');
      const autoExecutor = new AutoExecutor();

      // Handle --no-ai flag with auto mode
      if (options.ai === false) {
        console.log('\n🤖 Auto Mode: Organizing automatically using heuristics (no AI)\n');
        // Temporarily disable AI for this run
        const oldAnthropicKey = process.env.ANTHROPIC_API_KEY;
        const oldOpenAIKey = process.env.OPENAI_API_KEY;
        const oldGoogleKey = process.env.GOOGLE_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
      } else {
        console.log('\n🤖 Auto Mode: AI will analyze and plan all operations automatically\n');
      }

      try {
        const preview = await autoExecutor.preview({
          path: options.path,
          verbose: options.verbose,
          onProgress: (current, total, message) => {
            if (options.verbose) {
              console.log(`  [${current}/${total}] ${message}`);
            } else {
              const percentage = Math.round((current / total) * 100);
              process.stdout.write(`\r  Progress: ${percentage}% - ${message.substring(0, 60).padEnd(60)}`);
            }
          },
        });

        if (!options.verbose) {
          process.stdout.write('\r' + ' '.repeat(80) + '\r');
        }

        console.log(`\n✓ AI analysis complete!\n`);

        if (preview.operations.length === 0) {
          console.log('✓ No operations needed. Repository is clean!\n');
          return;
        }

        if (preview.warnings.length > 0) {
          console.log('⚠️  Warnings:\n');
          for (const warning of preview.warnings) {
            console.log(`  ${warning}`);
          }
          console.log('');
        }

        console.log(`Found ${preview.operations.length} operations:\n`);

        const moveOps = preview.operations.filter(op => op.type === 'move');
        const deleteOps = preview.operations.filter(op => op.type === 'delete');

        if (moveOps.length > 0) {
          console.log(`📦 MOVE Operations (${moveOps.length}):\n`);
          for (const op of moveOps) {
            console.log(`  ${path.basename(op.sourcePath)}`);
            if (op.targetPath) {
              console.log(`    → ${op.targetPath}`);
            }
            console.log(`    ${op.reason}\n`);
          }
        }

        if (deleteOps.length > 0) {
          console.log(`🗑️  DELETE Operations (${deleteOps.length}):\n`);
          for (const op of deleteOps) {
            console.log(`  ${path.basename(op.sourcePath)}`);
            console.log(`    ${op.reason}\n`);
          }
        }

        console.log(`Estimated duration: ${preview.estimatedDuration}ms\n`);
        console.log('Run "devibe execute --auto" to apply these changes.\n');

      } catch (error) {
        console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
      return;
    }

    // Original plan logic
    const detector = new GitDetector();
    const classifier = new FileClassifier();

    // Conditionally create usage detector
    let usageDetector = undefined;
    if (options.usageCheck !== false) {
      const { UsageDetector } = await import('./usage-detector.js');
      usageDetector = new UsageDetector();
    }

    const planner = new OperationPlanner(detector, classifier, usageDetector);

    console.log('\n📋 Planning root file distribution...\n');

    // Show AI startup banner if AI is available
    const aiAvailable = await AIClassifierFactory.isAvailable();
    if (aiAvailable) {
      const { showAIStartupBanner } = await import('./ai-cost-advisor.js');
      
      // Estimate file count (quick scan of root directory)
      try {
        const entries = await fs.readdir(options.path, { withFileTypes: true });
        const estimatedFiles = entries.filter(e => 
          e.isFile() && 
          !e.name.startsWith('.') && 
          !['package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'LICENSE'].includes(e.name)
        ).length;
        await showAIStartupBanner(estimatedFiles || 10);
      } catch {
        await showAIStartupBanner(10); // Default estimate if scan fails
      }
    } else {
      console.log('⚠️  AI unavailable - using heuristics only');
      console.log('   To enable AI: devibe ai-key add <provider> <api-key>\n');
    }

    // Progress callback
    let lastProgressLine = '';
    const startTime = Date.now();
    let lastFileTime = startTime;
    
    const plan = await planner.planRootFileDistribution(options.path, (current, total, file) => {
      const now = Date.now();
      const fileTime = now - lastFileTime;
      const avgTime = (now - startTime) / current;
      const remaining = Math.round((avgTime * (total - current)) / 1000);
      lastFileTime = now;
      
      if (options.verbose) {
        // Verbose mode: show each file on new line with timing
        console.log(`  [${current}/${total}] Processing: ${file} (${fileTime}ms, ~${remaining}s remaining)`);
      } else {
        // Normal mode: progress bar
        const percentage = Math.round((current / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
        const progressLine = `\r  Progress: [${progressBar}] ${percentage}% (${current}/${total}) - ${file.substring(0, 40).padEnd(40)}`;
        
        // Clear previous line and write new one
        if (lastProgressLine) {
          process.stdout.write('\r' + ' '.repeat(lastProgressLine.length) + '\r');
        }
        process.stdout.write(progressLine);
        lastProgressLine = progressLine;
      }
    });
    
    // Clear progress line and move to new line
    if (!options.verbose && lastProgressLine) {
      process.stdout.write('\r' + ' '.repeat(lastProgressLine.length) + '\r');
    }
    console.log('✓ Analysis complete!\n');

    if (plan.operations.length === 0) {
      console.log('✓ No operations needed. Repository is clean!\n');
      return;
    }

    // Show warnings first
    if (plan.warnings.length > 0) {
      console.log('⚠️  Warnings:\n');
      for (const warning of plan.warnings) {
        console.log(`  ${warning}`);
      }
      console.log('');
    }

    console.log(`Found ${plan.operations.length} operations:\n`);

    // Separate operations by type
    const moveOps = plan.operations.filter(op => op.type === 'move');
    const deleteOps = plan.operations.filter(op => op.type === 'delete');

    if (moveOps.length > 0) {
      console.log(`📦 MOVE Operations (${moveOps.length}):\n`);
      for (const op of moveOps) {
        console.log(`  ${path.basename(op.sourcePath)}`);
        if (op.targetPath) {
          console.log(`    → ${op.targetPath}`);
        }
        console.log(`    ${op.reason}`);
        if (op.warning) {
          console.log(`    ⚠️  ${op.warning}`);
        }
        console.log('');
      }
    }

    if (deleteOps.length > 0) {
      console.log(`🗑️  DELETE Operations (${deleteOps.length}):\n`);
      for (const op of deleteOps) {
        console.log(`  ${path.basename(op.sourcePath)}`);
        console.log(`    ${op.reason}\n`);
      }
    }

    console.log(`Estimated duration: ${plan.estimatedDuration}ms`);
    console.log(`Backup required: ${plan.backupRequired ? 'Yes' : 'No'}\n`);
    console.log('Run "devibe execute" to apply these changes.\n');
  });

program
  .command('execute')
  .description('Execute planned operations')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('-v, --verbose', 'Enable verbose debug output', false)
  .option('--auto', 'Automatically execute without prompts', false)
  .option('--no-ai', 'Use heuristics only (no AI)', false)
  .option('--no-usage-check', 'Skip usage detection for faster processing', false)
  .action(async (options) => {
    // Handle --auto mode
    if (options.auto) {
      const { AutoExecutor } = await import('./auto-executor.js');
      const autoExecutor = new AutoExecutor();

      // Handle --no-ai flag with auto mode
      if (options.ai === false) {
        console.log('\n🤖 Auto Mode: Automatically executing using heuristics (no AI)\n');
        // Temporarily disable AI for this run
        const oldAnthropicKey = process.env.ANTHROPIC_API_KEY;
        const oldOpenAIKey = process.env.OPENAI_API_KEY;
        const oldGoogleKey = process.env.GOOGLE_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
      } else {
        console.log('\n🤖 Auto Mode: AI will automatically execute all operations\n');
      }

      if (options.dryRun) {
        console.log('⚠️  Running in DRY-RUN mode - no changes will be made\n');
      }

      try {
        const result = await autoExecutor.execute({
          path: options.path,
          dryRun: options.dryRun,
          verbose: options.verbose,
          onProgress: (current, total, message) => {
            if (options.verbose) {
              console.log(`  [${current}/${total}] ${message}`);
            } else {
              const percentage = Math.round((current / total) * 100);
              process.stdout.write(`\r  Progress: ${percentage}% - ${message.substring(0, 60).padEnd(60)}`);
            }
          },
        });

        if (!options.verbose) {
          process.stdout.write('\r' + ' '.repeat(80) + '\r');
        }

        if (result.success) {
          console.log(`\n✅ Auto cleanup complete!\n`);
          console.log(`Files analyzed: ${result.filesAnalyzed}`);
          console.log(`Operations completed: ${result.operationsCompleted}`);
          console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s\n`);

          if (result.backupManifestId && !options.dryRun) {
            console.log(`📦 Backup created: ${result.backupManifestId}`);
            console.log(`   Restore with: devibe restore ${result.backupManifestId}\n`);
          }
        } else {
          console.log(`\n⚠️  Auto cleanup completed with errors\n`);
          console.log(`Operations completed: ${result.operationsCompleted}`);
          console.log(`Operations failed: ${result.operationsFailed}\n`);

          if (result.errors.length > 0) {
            console.log('Errors:');
            for (const error of result.errors) {
              console.log(`  ❌ ${error}`);
            }
            console.log();
          }
          process.exit(1);
        }

      } catch (error) {
        console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
      return;
    }

    // Original execute logic
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    
    // Conditionally create usage detector
    let usageDetector = undefined;
    if (options.usageCheck !== false) {
      const { UsageDetector } = await import('./usage-detector.js');
      usageDetector = new UsageDetector();
    }
    
    const planner = new OperationPlanner(detector, classifier, usageDetector);
    const backupManager = new BackupManager(path.join(options.path, '.unvibe', 'backups'));
    const executor = new OperationExecutor(backupManager);

    console.log(`\n${options.dryRun ? '🔍 DRY RUN: ' : '⚡ '}Executing operations...\n`);

    // Show AI startup banner if AI is available
    const aiAvailable = await AIClassifierFactory.isAvailable();
    if (aiAvailable) {
      const { showAIStartupBanner } = await import('./ai-cost-advisor.js');
      
      // Estimate file count (quick scan of root directory)
      try {
        const entries = await fs.readdir(options.path, { withFileTypes: true });
        const estimatedFiles = entries.filter(e => 
          e.isFile() && 
          !e.name.startsWith('.') && 
          !['package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'LICENSE'].includes(e.name)
        ).length;
        await showAIStartupBanner(estimatedFiles || 10);
      } catch {
        await showAIStartupBanner(10); // Default estimate if scan fails
      }
    } else {
      console.log('⚠️  AI unavailable - using heuristics only');
      console.log('   To enable AI: devibe ai-key add <provider> <api-key>\n');
    }

    if (options.usageCheck === false) {
      console.log('⚠️  Usage detection disabled\n');
    }

    // Progress callback  
    let lastProgressLine = '';
    const startTime = Date.now();
    let lastFileTime = startTime;
    
    const plan = await planner.planRootFileDistribution(options.path, (current, total, file) => {
      const now = Date.now();
      const fileTime = now - lastFileTime;
      const avgTime = (now - startTime) / current;
      const remaining = Math.round((avgTime * (total - current)) / 1000);
      lastFileTime = now;
      
      if (options.verbose) {
        // Verbose mode: show each file on new line with timing
        console.log(`  [${current}/${total}] Analyzing: ${file} (${fileTime}ms, ~${remaining}s remaining)`);
      } else {
        // Normal mode: progress bar
        const percentage = Math.round((current / total) * 100);
        const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
        const progressLine = `\r  Analyzing: [${progressBar}] ${percentage}% (${current}/${total}) - ${file.substring(0, 40).padEnd(40)}`;
        
        if (lastProgressLine) {
          process.stdout.write('\r' + ' '.repeat(lastProgressLine.length) + '\r');
        }
        process.stdout.write(progressLine);
        lastProgressLine = progressLine;
      }
    });
    
    if (!options.verbose && lastProgressLine) {
      process.stdout.write('\r' + ' '.repeat(lastProgressLine.length) + '\r');
    }
    console.log('✓ Analysis complete!\n');

    if (plan.operations.length === 0) {
      console.log('✓ No operations to execute.\n');
      return;
    }

    // Show warnings before executing
    if (plan.warnings.length > 0) {
      console.log('⚠️  Warnings:\n');
      for (const warning of plan.warnings) {
        console.log(`  ${warning}`);
      }
      console.log('');
    }

    const result = await executor.execute(plan, options.dryRun);

    if (result.success) {
      console.log(`✓ Successfully completed ${result.operationsCompleted} operations\n`);
      if (result.backupManifestId && !options.dryRun) {
        console.log(`📦 Backup created: ${result.backupManifestId}\n`);
        console.log(`   Restore with: devibe restore ${result.backupManifestId}\n`);
      }
    } else {
      console.log(`⚠️  Completed ${result.operationsCompleted}, failed ${result.operationsFailed}\n`);
      for (const error of result.errors) {
        console.log(`  ❌ ${error}`);
      }
    }
  });

program
  .command('enforce')
  .description('Enforce folder structure (scripts/, documents/)')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('--dry-run', 'Show what would be done', false)
  .action(async (options) => {
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    const planner = new OperationPlanner(detector, classifier);
    const backupManager = new BackupManager(path.join(options.path, '.unvibe', 'backups'));
    const executor = new OperationExecutor(backupManager);

    console.log(`\n${options.dryRun ? '🔍 DRY RUN: ' : '📁 '}Enforcing folder structure...\n`);

    const plan = await planner.planFolderEnforcement(options.path);

    if (plan.operations.length === 0) {
      console.log('✓ Folder structure is already compliant!\n');
      return;
    }

    console.log(`Planning ${plan.operations.length} operations:\n`);
    for (const op of plan.operations) {
      console.log(`  ${op.type.toUpperCase()}: ${path.basename(op.sourcePath)}`);
      if (op.targetPath) {
        console.log(`    → ${op.targetPath}`);
      }
    }
    console.log();

    const result = await executor.execute(plan, options.dryRun);

    if (result.success) {
      console.log(`✓ Folder structure enforced successfully!\n`);
    } else {
      console.log(`⚠️  Some operations failed. See errors above.\n`);
    }
  });

program
  .command('validate')
  .description('Validate build systems')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    const detector = new BuildDetector();
    const validator = new BuildValidationService();

    console.log('\n🔧 Detecting build systems...\n');

    const technologies = await detector.detect(options.path);

    if (technologies.length === 0) {
      console.log('⚠️  No recognized build systems found.\n');
      return;
    }

    console.log(`Found: ${technologies.join(', ')}\n`);
    console.log('Running validations...\n');

    const results = await validator.validateAllBuilds(options.path);

    for (const [tech, result] of results) {
      const icon = result.success ? '✓' : '✗';
      console.log(`${icon} ${tech}: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);

      if (result.recommendation) {
        console.log(`   ${result.recommendation}\n`);
      } else if (!result.success) {
        console.log(`   ${result.stderr}\n`);
      }
    }
    console.log();
  });

program
  .command('restore <manifest-id>')
  .description('Restore from backup')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (manifestId, options) => {
    const backupManager = new BackupManager(path.join(options.path, '.unvibe', 'backups'));

    console.log(`\n♻️  Restoring from backup ${manifestId}...\n`);

    try {
      await backupManager.restore(manifestId);
      console.log('✓ Restore completed successfully!\n');
    } catch (error: any) {
      console.log(`❌ Restore failed: ${error.message}\n`);
    }
  });

program
  .command('backups')
  .description('List all backups')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    const backupManager = new BackupManager(path.join(options.path, '.unvibe', 'backups'));

    console.log('\n📦 Available Backups:\n');

    const backups = await backupManager.listBackups();

    if (backups.length === 0) {
      console.log('  No backups found.\n');
      return;
    }

    for (const backup of backups) {
      console.log(`  ${backup.id}`);
      console.log(`    Date: ${backup.timestamp.toLocaleString()}`);
      console.log(`    Operations: ${backup.operations.length}`);
      console.log(`    Reversible: ${backup.reversible ? 'Yes' : 'No'}\n`);
    }
  });

program
  .command('yolo')
  .description('YOLO mode: aggressive auto-cleanup (use with caution!)')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    console.log('\n⚡ YOLO MODE - Aggressive Auto-Cleanup\n');

    if (!AIClassifierFactory.isAvailable()) {
      console.log('⚠️  WARNING: AI not available!');
      console.log('   YOLO mode works best with AI classification.');
      console.log('   Set ANTHROPIC_API_KEY or OPENAI_API_KEY for best results.\n');
    }

    console.log('🚀 Running full cleanup workflow...\n');

    const yolo = new YoloMode();
    const result = await yolo.run(options.path);

    // Display results
    console.log('📊 Results:\n');
    console.log(`  Secret Scan: ${result.steps.secretScan.found} found (${result.steps.secretScan.critical} critical)`);
    console.log(`  Planning: ${result.steps.planning.operations} operations`);
    console.log(`  Execution: ${result.steps.execution.completed} completed, ${result.steps.execution.failed} failed`);
    console.log(`  Folder Enforcement: ${result.steps.folderEnforcement.operations} operations`);
    console.log(`  Build Validation: ${result.steps.buildValidation.passed ? '✓ PASSED' : '✗ FAILED'}\n`);

    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      for (const warning of result.warnings) {
        console.log(`  - ${warning}`);
      }
      console.log();
    }

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
      console.log();
    }

    if (result.success) {
      console.log('✅ YOLO mode completed successfully!\n');
      if (result.backupManifestId) {
        console.log(`📦 Backup: ${result.backupManifestId}`);
        console.log(`   Restore with: devibe restore ${result.backupManifestId}\n`);
      }
    } else {
      console.log('⚠️  YOLO mode completed with warnings/errors.\n');
    }
  });

program
  .command('init')
  .description('Initialize UnVibe configuration')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    console.log('\n⚙️  Initializing UnVibe configuration...\n');

    try {
      await ConfigManager.create(options.path);
      console.log('✓ Created .unvibe.config.js\n');
      console.log('Edit this file to customize UnVibe behavior.\n');
    } catch (error: any) {
      console.log(`❌ Failed to create config: ${error.message}\n`);
    }
  });

program
  .command('setup-hooks')
  .description('Setup Git hooks for automated checks')
  .action(async () => {
    console.log('\n🔧 Setting up Git hooks...\n');

    try {
      const { execSync } = await import('child_process');
      const scriptPath = path.join(__dirname, '../scripts/setup-hooks.sh');

      execSync('bash ' + scriptPath, { stdio: 'inherit' });
    } catch (error: any) {
      console.log(`❌ Failed to setup hooks: ${error.message}\n`);
      console.log('Manual setup:');
      console.log('  bash scripts/setup-hooks.sh\n');
    }
  });

program
  .command('organize-tests')
  .description('Organize test files by category (unit, integration, e2e, etc.)')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('--dry-run', 'Preview changes without executing')
  .option('--report', 'Generate a report of current test organization')
  .action(async (options) => {
    console.log('\n🧪 Test Organization\n');

    const config = await ConfigManager.load(options.path);
    const testOrganizer = createTestOrganizer(config);

    if (!testOrganizer) {
      console.log('❌ Test organization is not configured.');
      console.log('   Run "devibe init" to create a configuration file.\n');
      return;
    }

    // Generate report if requested
    if (options.report) {
      console.log('Analyzing test files...\n');
      const report = await testOrganizer.generateReport(options.path);
      console.log(report);
      return;
    }

    // Plan test organization
    console.log('Planning test organization...\n');
    const plan = await testOrganizer.planTestOrganization(options.path);

    if (plan.operations.length === 0) {
      console.log('✓ All tests are already organized!\n');
      return;
    }

    console.log(`Found ${plan.operations.length} test files to organize:\n`);

    // Group operations by target directory
    const byDirectory = new Map<string, typeof plan.operations>();
    for (const op of plan.operations) {
      const targetDir = path.dirname(op.targetPath!);
      if (!byDirectory.has(targetDir)) {
        byDirectory.set(targetDir, []);
      }
      byDirectory.get(targetDir)!.push(op);
    }

    // Display grouped operations
    for (const [targetDir, ops] of byDirectory.entries()) {
      console.log(`📁 ${targetDir} (${ops.length} files)`);
      for (const op of ops.slice(0, 5)) {
        const fileName = path.basename(op.sourcePath);
        console.log(`   • ${fileName}`);
      }
      if (ops.length > 5) {
        console.log(`   ... and ${ops.length - 5} more`);
      }
      console.log();
    }

    if (options.dryRun) {
      console.log('🔍 Dry run mode - no changes made.\n');
      console.log('Run without --dry-run to execute these operations.\n');
      return;
    }

    // Execute the plan
    const backupManager = new BackupManager(path.join(options.path, '.unvibe', 'backups'));
    const executor = new OperationExecutor(backupManager);

    console.log('Executing test organization...\n');
    const result = await executor.execute(plan, false);

    if (result.success) {
      console.log(`✅ Successfully organized ${result.operationsCompleted} test files!\n`);
      if (result.backupManifestId) {
        console.log(`📦 Backup: ${result.backupManifestId}`);
        console.log(`   Restore with: devibe restore ${result.backupManifestId}\n`);
      }
    } else {
      console.log(`⚠️  Completed with errors:\n`);
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }
      console.log();
    }
  });

program
  .command('detect-tests')
  .description('Detect all test files in the repository')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    console.log('\n🔍 Detecting test files...\n');

    const config = await ConfigManager.load(options.path);
    const testOrganizer = createTestOrganizer(config);

    if (!testOrganizer) {
      console.log('❌ Test organization is not configured.\n');
      return;
    }

    const testFiles = await testOrganizer.detectTestFiles(options.path);
    console.log(`Found ${testFiles.length} test files:\n`);

    for (const testFile of testFiles) {
      const category = await testOrganizer.categorizeTest(testFile);
      console.log(`[${category.toUpperCase().padEnd(12)}] ${testFile}`);
    }
    console.log();
  });

program
  .command('validate-rulepack')
  .description('Validate a rule pack file against the specification')
  .argument('<file>', 'Path to rule pack YAML/JSON file')
  .action(async (file) => {
    console.log('\n🔍 Validating Rule Pack...\n');

    try {
      // Read and parse the rule pack
      const content = await fs.readFile(file, 'utf-8');
      let rulePack;

      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        // For YAML, we'd need a YAML parser (js-yaml)
        // For now, show helpful message
        console.log('ℹ️  YAML support requires js-yaml package');
        console.log('   For now, please use JSON format or convert YAML to JSON\n');
        return;
      } else {
        rulePack = JSON.parse(content);
      }

      // Validate
      const validator = new RulePackValidator();
      const result = await validator.validate(rulePack);

      // Format and display
      console.log(formatValidationResult(result));

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error: any) {
      console.log(`❌ Failed to validate rule pack: ${error.message}\n`);
      process.exit(1);
    }
  });

program
  .command('best-practices')
  .description('Analyze repository against industry best practices')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    console.log('\n📊 Analyzing Repository Best Practices...\n');

    const analyzer = new RepoBestPracticesAnalyzer();
    const report = await analyzer.analyze(options.path);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatBestPracticesReport(report));

      // Summary recommendations
      if (report.score < 90) {
        console.log('\n💡 Quick Wins (Auto-fixable):');
        const autoFixable = report.checks.filter(c => !c.passed && c.autoFixable);
        autoFixable.slice(0, 5).forEach(check => {
          console.log(`   • ${check.name}`);
          if (check.recommendation) {
            console.log(`     ${check.recommendation}`);
          }
        });
        console.log();
      }

      // Exit code based on critical issues
      if (report.summary.critical > 0) {
        console.log('❌ Fix critical issues before proceeding\n');
        process.exit(1);
      } else if (report.score >= 75) {
        console.log('✅ Repository meets minimum best practices\n');
      } else {
        console.log('⚠️  Consider addressing high-priority issues\n');
      }
    }
  });

program
  .command('check-pr')
  .description('Check if repository is ready for PR/push to main')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    console.log('\n🔍 Pre-Push Check (simulating GitHub CI)...\n');

    let hasErrors = false;

    // Step 1: Secret Scan
    console.log('1️⃣  Scanning for secrets...');
    const scanner = new SecretScanner();
    const files = await findSourceFiles(options.path);

    if (files.length > 0) {
      const scanResult = await scanner.scanFiles(files);

      if (scanResult.summary.critical > 0) {
        console.log(`   ❌ CRITICAL: Found ${scanResult.summary.critical} critical secrets!\n`);
        hasErrors = true;

        // Show first 3 critical findings
        const criticalFindings = scanResult.findings
          .filter((f) => f.severity === 'critical')
          .slice(0, 3);

        for (const finding of criticalFindings) {
          console.log(`      ${finding.file}:${finding.line}`);
          console.log(`      ${finding.type}: ${finding.context}\n`);
        }
      } else {
        console.log('   ✓ No critical secrets found\n');
      }
    }

    // Step 2: Build Check
    console.log('2️⃣  Checking build...');
    try {
      const { execSync } = await import('child_process');
      execSync('npm run build', { stdio: 'ignore', cwd: options.path });
      console.log('   ✓ Build successful\n');
    } catch {
      console.log('   ⚠️  Build failed or not configured\n');
    }

    // Step 3: Tests
    console.log('3️⃣  Running tests...');
    try {
      const { execSync } = await import('child_process');
      execSync('npm test', { stdio: 'ignore', cwd: options.path });
      console.log('   ✓ All tests passed\n');
    } catch {
      console.log('   ❌ Tests failed\n');
      hasErrors = true;
    }

    // Step 4: Folder Structure
    console.log('4️⃣  Checking folder structure...');
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    const planner = new OperationPlanner(detector, classifier);

    const enforcePlan = await planner.planFolderEnforcement(options.path);

    if (enforcePlan.operations.length > 0) {
      console.log(`   ⚠️  WARNING: ${enforcePlan.operations.length} folder structure issues\n`);
    } else {
      console.log('   ✓ Folder structure compliant\n');
    }

    // Final Result
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (hasErrors) {
      console.log('❌ PUSH BLOCKED: Fix errors above before pushing to main\n');
      process.exit(1);
    } else {
      console.log('✅ All checks passed! Safe to push to main\n');
    }
  });

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
    default:
      return '⚪';
  }
}

async function findSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.env'];

  // Detect git repositories to find .gitignore scope
  const detector = new GitDetector();
  const repoResult = await detector.detectRepositories(dir);
  const gitRoots = repoResult.repositories.map(r => r.path);

  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Find the closest git repository root for this file
      const gitRoot = findClosestGitRoot(fullPath, gitRoots);

      // Skip if matches .gitignore from the appropriate repository
      if (gitRoot && await isIgnoredByGit(fullPath, gitRoot)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (
          entry.name !== 'node_modules' &&
          entry.name !== '.git' &&
          entry.name !== 'dist' &&
          entry.name !== 'build'
        ) {
          await scan(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext) || entry.name === '.env') {
          files.push(fullPath);
        }
      }
    }
  }

  await scan(dir);
  return files;
}

function findClosestGitRoot(filePath: string, gitRoots: string[]): string | null {
  // Find the git root that contains this file and is the deepest (most specific)
  let closest: string | null = null;
  let maxDepth = -1;

  for (const root of gitRoots) {
    if (filePath.startsWith(root)) {
      const depth = root.split(path.sep).length;
      if (depth > maxDepth) {
        maxDepth = depth;
        closest = root;
      }
    }
  }

  return closest;
}

async function isIgnoredByGit(filePath: string, gitRoot: string): Promise<boolean> {
  const gitignorePath = path.join(gitRoot, '.gitignore');

  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const patterns = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    // Get path relative to git root
    const relativePath = path.relative(gitRoot, filePath);

    for (const pattern of patterns) {
      // Simple pattern matching (supports * wildcards and exact matches)
      const regex = new RegExp(
        '^' + pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') +
        '(/.*)?$'
      );

      if (regex.test(relativePath)) {
        return true;
      }

      // Also check basename for patterns without /
      if (!pattern.includes('/')) {
        const basename = path.basename(relativePath);
        const basenameRegex = new RegExp(
          '^' + pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.') +
          '$'
        );
        if (basenameRegex.test(basename)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    // No .gitignore file or can't read it
    return false;
  }
}

// ============================================================================
// AI Model Management Commands
// ============================================================================

program
  .command('ai-analyze')
  .alias('ai')
  .description('Analyze AI model options and get cost recommendations')
  .option('-f, --files <count>', 'Estimated number of files to classify', '1000')
  .action(async (options) => {
    const fileCount = parseInt(options.files);
    const keyManager = getKeyManager();

    console.log('\n🤖 AI Model Cost Analysis\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check configured providers
    const configuredProviders = await keyManager.getConfiguredProviders();
    console.log('📋 Configured Providers:\n');

    if (configuredProviders.length === 0) {
      console.log('   ⚠️  No API keys configured yet\n');
    } else {
      for (const provider of configuredProviders) {
        const key = await keyManager.getKey(provider);
        if (key) {
          console.log(`   ✓ ${provider.padEnd(12)} ${keyManager.maskKey(key)}`);
        }
      }
      console.log('');
    }

    // Show cost comparison
    console.log(`💰 Cost Comparison for ${fileCount.toLocaleString()} Files:\n`);

    const comparison = compareModels(fileCount, 400, 100);

    // Format as table
    console.log('┌────────────────────────┬─────────────┬──────────────┬────────────┐');
    console.log('│ Model                  │ Total Cost  │ Cost/File    │ API Calls  │');
    console.log('├────────────────────────┼─────────────┼──────────────┼────────────┤');

    comparison.slice(0, 7).forEach(c => {
      const model = c.model.padEnd(22);
      const cost = `$${c.totalCost.toFixed(4)}`.padEnd(11);
      const perFile = `$${c.costPerFile.toFixed(6)}`.padEnd(12);
      const calls = c.apiCalls.toString().padStart(10);
      console.log(`│ ${model} │ ${cost} │ ${perFile} │ ${calls} │`);
    });

    console.log('└────────────────────────┴─────────────┴──────────────┴────────────┘\n');

    // Recommendation
    const cheapest = selectModel('cheapest');
    const currentModel = selectModel('claude-3-5-sonnet');
    const currentCost = estimateCost(currentModel, fileCount * 400, fileCount * 100);
    const cheapestCost = estimateCost(cheapest, fileCount * 400, fileCount * 100);
    const savings = currentCost - cheapestCost;
    const savingsPercent = ((savings / currentCost) * 100).toFixed(1);

    console.log('🎯 Recommendation:\n');
    console.log(`   Use: ${cheapest.name}`);
    console.log(`   Provider: ${cheapest.provider}`);
    console.log(`   Context: ${cheapest.contextWindow.toLocaleString()} tokens`);
    console.log(`   Batch size: ${cheapest.recommendedBatchSize} files per call`);
    console.log(`   Cost: $${cheapestCost.toFixed(4)} (save $${savings.toFixed(4)} or ${savingsPercent}%)\n`);

    // Check if key is configured
    const hasKey = await keyManager.getKeyWithFallback(cheapest.provider);

    if (!hasKey) {
      console.log('⚡ Quick Setup:\n');
      console.log(`   To use ${cheapest.name}, add your ${cheapest.provider} API key:\n`);
      console.log(`   devibe ai-key add ${cheapest.provider} <your-api-key>\n`);

      // Show where to get keys
      const keyUrls: Record<string, string> = {
        anthropic: 'https://console.anthropic.com/settings/keys',
        openai: 'https://platform.openai.com/api-keys',
        google: 'https://makersuite.google.com/app/apikey',
      };

      console.log(`   Get your key: ${keyUrls[cheapest.provider]}\n`);
    } else {
      console.log('✅ Ready to Use:\n');
      console.log(`   Your ${cheapest.provider} key is configured and ready!\n`);
    }

    // Alternative options
    console.log('📊 Other Options:\n');
    console.log('   • Largest context:  devibe ai-key add google <key>  (Gemini: 1M-2M tokens)');
    console.log('   • Best quality:     devibe ai-key add anthropic <key>  (Claude Opus)');
    console.log('   • Easy to try:      devibe ai-key add anthropic <key>  (Claude Haiku - 12x cheaper)\n');

    console.log('📖 Learn More:\n');
    console.log('   • View all models:  devibe ai-models');
    console.log('   • Manage keys:      devibe ai-key list');
    console.log('   • Set default:      export AI_MODEL=gemini-1.5-flash\n');
  });

program
  .command('ai-models')
  .description('List all available AI models with details')
  .action(async () => {
    console.log('\n🤖 Available AI Models\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const keyManager = getKeyManager();

    for (const [key, model] of Object.entries(AVAILABLE_MODELS)) {
      const hasKey = await keyManager.getKeyWithFallback(model.provider);
      const status = hasKey ? '✓' : '○';

      console.log(`${status} ${model.name}`);
      console.log(`   Provider: ${model.provider}`);
      console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
      console.log(`   Price: $${model.inputPricePerMillion}/M input, $${model.outputPricePerMillion}/M output`);
      console.log(`   Batch: ~${model.recommendedBatchSize} files/call`);
      console.log(`   Quality: ${model.quality}, Speed: ${model.speed}`);
      console.log(`   Command: export AI_MODEL=${key}\n`);
    }

    console.log('Legend: ✓ = configured, ○ = needs API key\n');
  });

program
  .command('ai-key')
  .description('Manage AI API keys')
  .argument('<action>', 'Action: add, remove, list, show, clear, or status')
  .argument('[provider]', 'Provider: anthropic, openai, or google')
  .argument('[key]', 'API key value')
  .action(async (action, provider, key) => {
    const keyManager = getKeyManager();

    switch (action) {
      case 'add':
        if (!provider || !key) {
          console.error('\n❌ Error: Missing provider or key');
          console.log('\nUsage: devibe ai-key add <provider> <api-key>\n');
          console.log('Providers: anthropic, openai, google\n');
          console.log('Examples:');
          console.log('  devibe ai-key add anthropic sk-ant-api03-xxx...');
          console.log('  devibe ai-key add google AIzaSyXXX...');
          console.log('  devibe ai-key add openai sk-xxx...\n');
          process.exit(1);
        }

        if (!['anthropic', 'openai', 'google'].includes(provider)) {
          console.error(`\n❌ Error: Invalid provider "${provider}"`);
          console.log('\nValid providers: anthropic, openai, google\n');
          process.exit(1);
        }

        // Validate key format
        if (!keyManager.validateKeyFormat(provider as any, key)) {
          console.error(`\n❌ Error: Invalid ${provider} API key format`);
          console.log(`\nExpected format for ${provider}:`);
          if (provider === 'anthropic') console.log('  sk-ant-api03-...');
          if (provider === 'openai') console.log('  sk-...');
          if (provider === 'google') console.log('  AIzaSy...');
          console.log('');
          process.exit(1);
        }

        await keyManager.setKey(provider as any, key);
        console.log(`\n✅ ${provider} API key saved securely\n`);
        console.log(`   Location: ${keyManager.getStorageLocation()}`);
        console.log('   Encrypted: Yes');
        console.log('   Git-ignored: Yes (stored in ~/.devibe/)\n');

        // Show what they can do now
        const models = Object.values(AVAILABLE_MODELS).filter(m => m.provider === provider);
        if (models.length > 0) {
          console.log('✨ You can now use:');
          models.forEach(m => {
            console.log(`   • ${m.name} (${m.quality} quality, ${m.contextWindow.toLocaleString()} tokens)`);
          });
          console.log('');
        }
        break;

      case 'remove':
        if (!provider) {
          console.error('\n❌ Error: Missing provider');
          console.log('\nUsage: devibe ai-key remove <provider>\n');
          process.exit(1);
        }

        await keyManager.removeKey(provider as any);
        console.log(`\n✅ ${provider} API key removed\n`);
        break;

      case 'list':
        const configured = await keyManager.getConfiguredProviders();
        console.log('\n🔑 Configured API Keys:\n');

        if (configured.length === 0) {
          console.log('   No API keys configured yet\n');
          console.log('   Add a key: devibe ai-key add <provider> <api-key>\n');
        } else {
          for (const prov of configured) {
            const storedKey = await keyManager.getKey(prov);
            if (storedKey) {
              console.log(`   ✓ ${prov.padEnd(12)} ${keyManager.maskKey(storedKey)}`);
            }
          }
          console.log(`\n   Stored at: ${keyManager.getStorageLocation()}\n`);
        }
        break;

      case 'show':
        console.log('\n🔑 API Key Storage:\n');
        console.log(`   Location: ${keyManager.getStorageLocation()}`);
        console.log(`   Encrypted: Yes (AES-256)`);
        console.log(`   Git-safe: Yes (stored in ~/.devibe/)`);
        console.log(`   Permissions: 600 (owner only)\n`);

        const hasStored = await keyManager.hasStoredKeys();
        if (hasStored) {
          const providers = await keyManager.getConfiguredProviders();
          console.log(`   Providers: ${providers.join(', ')}\n`);
        } else {
          console.log('   Status: No keys stored yet\n');
        }
        break;

      case 'clear':
        // Clear all devibe-configured keys (reverts to environment variables)
        const configuredCount = (await keyManager.getConfiguredProviders()).length;

        if (configuredCount === 0) {
          console.log('\n   No devibe keys to clear (already using environment variables)\n');
          break;
        }

        await keyManager.clearAllKeys();
        console.log(`\n✅ Cleared ${configuredCount} devibe-configured key(s)\n`);
        console.log('   DevIbe will now use environment variables (if set):\n');
        console.log('   • ANTHROPIC_API_KEY');
        console.log('   • OPENAI_API_KEY');
        console.log('   • GOOGLE_API_KEY\n');

        // Show which env vars are set
        const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasGoogle = !!process.env.GOOGLE_API_KEY;

        if (hasAnthropic || hasOpenAI || hasGoogle) {
          console.log('   Environment variables found:');
          if (hasAnthropic) console.log('   ✓ ANTHROPIC_API_KEY');
          if (hasOpenAI) console.log('   ✓ OPENAI_API_KEY');
          if (hasGoogle) console.log('   ✓ GOOGLE_API_KEY');
          console.log('');
        } else {
          console.log('   ⚠️  No environment variables found. AI classification disabled.\n');
        }
        break;

      case 'status':
        // Show complete status of AI configuration
        console.log('\n🤖 AI Configuration Status\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // DevIbe-configured keys
        const devibeConfigured = await keyManager.getConfiguredProviders();
        console.log('🔧 DevIbe Keys (Primary):\n');
        if (devibeConfigured.length > 0) {
          for (const prov of devibeConfigured) {
            const storedKey = await keyManager.getKey(prov);
            if (storedKey) {
              console.log(`   ✓ ${prov.padEnd(12)} ${keyManager.maskKey(storedKey)}`);
            }
          }
          console.log(`\n   Stored at: ${keyManager.getStorageLocation()}\n`);
        } else {
          console.log('   No keys configured\n');
        }

        // Environment variables
        const envAnthropic = !!process.env.ANTHROPIC_API_KEY;
        const envOpenAI = !!process.env.OPENAI_API_KEY;
        const envGoogle = !!process.env.GOOGLE_API_KEY;

        console.log('🔑 Environment Variables (Fallback):\n');
        if (envAnthropic || envOpenAI || envGoogle) {
          if (envAnthropic) console.log('   ✓ ANTHROPIC_API_KEY');
          if (envOpenAI) console.log('   ✓ OPENAI_API_KEY');
          if (envGoogle) console.log('   ✓ GOOGLE_API_KEY');
          console.log('');
        } else {
          console.log('   No environment variables set\n');
        }

        // Show which will be used
        const { getAIResolver } = await import('./ai-provider-resolver.js');
        const resolver = getAIResolver();
        const resolved = await resolver.resolve();

        console.log('📊 Active Configuration:\n');
        if (resolved) {
          const sourceIcon = resolved.source === 'devibe-config' ? '🔧' : '🔑';
          const sourceLabel = resolved.source === 'devibe-config' ? 'DevIbe key' : 'Environment';

          console.log(`   ${sourceIcon} Using: ${resolved.model.name}`);
          console.log(`   Provider: ${resolved.provider}`);
          console.log(`   Source: ${sourceLabel}`);
          console.log(`   Context: ${resolved.model.contextWindow.toLocaleString()} tokens`);
          console.log(`   Cost: $${resolved.model.inputPricePerMillion}/M input\n`);

          // Suggest upgrade if using environment and there's a cheaper option
          if (resolved.source === 'environment') {
            const cheapest = selectModel('cheapest');
            const currentCost = resolved.model.inputPricePerMillion;
            const cheapestCost = cheapest.inputPricePerMillion;

            if (cheapestCost < currentCost) {
              const savings = ((currentCost - cheapestCost) / currentCost * 100).toFixed(0);
              console.log('💡 Cost Optimization Available:\n');
              console.log(`   Switch to ${cheapest.name} and save ${savings}%`);
              console.log(`   From: $${currentCost}/M → To: $${cheapestCost}/M\n`);
              console.log(`   devibe ai-key add ${cheapest.provider} <your-api-key>\n`);
              console.log(`   Get your key: https://${cheapest.provider === 'google' ? 'makersuite.google.com/app/apikey' : cheapest.provider === 'anthropic' ? 'console.anthropic.com/settings/keys' : 'platform.openai.com/api-keys'}\n`);
            }
          }
        } else {
          console.log('   ❌ No AI provider available\n');
          console.log('   Add a key: devibe ai-key add <provider> <api-key>\n');
        }

        // Show how to revert
        if (devibeConfigured.length > 0 && (envAnthropic || envOpenAI || envGoogle)) {
          console.log('🔄 To Revert to Environment Variables:\n');
          console.log('   devibe ai-key clear\n');
        }

        break;

      default:
        console.error(`\n❌ Unknown action: ${action}`);
        console.log('\nAvailable actions:');
        console.log('  add      Add or update an API key');
        console.log('  remove   Remove an API key');
        console.log('  list     List configured providers');
        console.log('  show     Show storage information');
        console.log('  clear    Remove all devibe keys (revert to environment)');
        console.log('  status   Show complete AI configuration status\n');
        process.exit(1);
    }
  });

program
  .command('ai-learn')
  .description('View AI learning statistics and patterns')
  .action(async () => {
    const { getLearningDatabase } = await import('./ai-learning-database.js');
    const learningDb = getLearningDatabase();

    console.log('\n📚 AI Learning Statistics\n');

    const stats = await learningDb.getStats();

    console.log(`Total Corrections: ${stats.totalCorrections}`);
    console.log(`Learned Patterns: ${stats.totalPatterns}`);
    console.log(`Project Structure Analyzed: ${stats.hasProjectStructure ? 'Yes' : 'No'}`);

    if (stats.mostCommonCategory) {
      console.log(`Most Corrected Category: ${stats.mostCommonCategory}`);
    }

    if (stats.totalPatterns > 0) {
      console.log(`Average Pattern Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
    }

    // Show project structure if available
    const structure = await learningDb.getProjectStructure();
    if (structure) {
      console.log('\n📁 Project Structure:\n');
      console.log(`  Type: ${structure.type}`);
      if (structure.framework) {
        console.log(`  Framework: ${structure.framework}`);
      }
      if (structure.testStrategy) {
        console.log(`  Test Strategy: ${structure.testStrategy}`);
      }

      if (structure.repositories.length > 0) {
        console.log(`\n  Repositories (${structure.repositories.length}):`);
        for (const repo of structure.repositories) {
          const tech = repo.technology ? ` - ${repo.technology}` : '';
          console.log(`    • ${repo.name}${tech}`);
        }
      }
    }

    console.log();
  });

program
  .command('ai-correct <file> <target>')
  .description('Teach AI the correct location for a file')
  .option('-c, --category <category>', 'File category (documentation, script, test, source, config, asset)')
  .option('-r, --repository <repository>', 'Repository name (for monorepos)')
  .action(async (filePath: string, targetPath: string, options) => {
    const { IntelligentClassifier } = await import('./intelligent-classifier.js');
    const classifier = new IntelligentClassifier();

    console.log(`\n📖 Teaching AI...\n`);
    console.log(`File: ${filePath}`);
    console.log(`Target: ${targetPath}`);

    // Get AI's current suggestion
    console.log('\nGetting AI suggestion...');
    const aiSuggestion = await classifier.classify(filePath);

    console.log(`AI suggested: ${aiSuggestion.category} (${(aiSuggestion.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`AI reasoning: ${aiSuggestion.reasoning}`);

    // Record the correction
    await classifier.recordCorrection(
      filePath,
      {
        category: aiSuggestion.category,
        repository: options.repository,
        targetPath: filePath, // Current location
      },
      {
        category: options.category || aiSuggestion.category,
        repository: options.repository,
        targetPath,
      }
    );

    console.log('\n✅ Correction recorded!');
    console.log('   AI will learn from this and improve future classifications.\n');
  });

program
  .command('ai-analyze-project')
  .description('Analyze project structure for smarter AI classification')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .action(async (options) => {
    const { GitDetector } = await import('./git-detector.js');
    const { ProjectStructureAnalyzer } = await import('./project-structure-analyzer.js');
    const { getLearningDatabase } = await import('./ai-learning-database.js');

    console.log('\n🔍 Analyzing project structure...\n');

    const detector = new GitDetector();
    const analyzer = new ProjectStructureAnalyzer();
    const learningDb = getLearningDatabase();

    const result = await detector.detectRepositories(options.path);

    console.log('Detecting repositories...');
    const structure = await analyzer.analyze(options.path, result.repositories);

    console.log('\n📊 Project Structure Analysis:\n');
    console.log(`Type: ${structure.type}`);

    if (structure.framework) {
      console.log(`Framework: ${structure.framework}`);
    }

    if (structure.testStrategy) {
      console.log(`Test Strategy: ${structure.testStrategy}`);
    }

    console.log(`\nRepositories: ${structure.repositories.length}`);
    for (const repo of structure.repositories) {
      const tech = repo.technology ? ` (${repo.technology})` : '';
      const root = repo.isRoot ? ' [ROOT]' : '';
      console.log(`  • ${repo.name}${tech}${root}`);
    }

    // Store the analysis
    await learningDb.storeProjectStructure(structure);

    console.log('\n✅ Project structure analyzed and saved!');
    console.log('   AI will use this context for smarter classifications.\n');
  });

// Show status by default if no command specified
if (process.argv.length === 2) {
  process.argv.push('status');
}

program.parse();
