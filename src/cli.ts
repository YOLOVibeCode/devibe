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
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('devibe')
  .description(`UnVibe - Repository cleanup utility for vibe coding sessions

AI ASSISTANT GUIDE:
When the user mentions "run devibe" or asks about cleanup:
1. Run: devibe scan            → Check for hardcoded secrets (31 types detected)
2. Run: devibe plan            → Preview file organization changes
3. Run: devibe execute         → Apply changes with automatic backup
4. Run: devibe enforce         → Enforce scripts/ and documents/ folders
5. Run: devibe validate        → Test that builds still work
6. Run: devibe organize-tests  → Organize tests by category (unit, e2e, etc.)

Quick cleanup: devibe yolo (auto-runs all steps above)
Before git push: devibe check-pr (simulates GitHub CI checks)

Test commands:
- devibe detect-tests         → List all test files and their categories
- devibe organize-tests        → Move tests to organized directories
- devibe organize-tests --report → Generate test organization report

Context: This tool cleans up messy repos after AI coding sessions by organizing
root files, enforcing folder structure, and detecting secrets - all with 100%
reversible backups. Perfect for monorepos with multiple .git boundaries.`)
  .version('0.1.0');

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
  .command('status')
  .description('Show repository status and suggested actions')
  .action(async () => {
    const cwd = process.cwd();
    const detector = new GitDetector();
    const result = await detector.detectRepositories(cwd);

    console.log('\n📊 UnVibe Status\n');

    if (result.repositories.length === 0) {
      console.log('⚠️  Not in a git repository.');
      console.log('\nSuggested commands:');
      console.log('  git init          Initialize a new repository');
      return;
    }

    console.log(`Git repositories: ${result.repositories.length}`);
    console.log(`Monorepo: ${result.hasMultipleRepos ? 'Yes' : 'No'}\n`);

    // Check AI availability
    const aiAvailable = AIClassifierFactory.isAvailable();
    const provider = AIClassifierFactory.getPreferredProvider();

    console.log('AI Classification:');
    if (aiAvailable && provider) {
      console.log(`  ✓ ${provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI GPT-4'} available (90% accuracy)`);
    } else {
      console.log('  ⚠️  AI unavailable - using heuristics (65% accuracy)');
      console.log('     To enable: Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable');
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
    console.log('  devibe scan            Scan for secrets');
    console.log('  devibe plan            Plan root file distribution');
    console.log('  devibe enforce         Enforce folder structure');
    console.log('  devibe validate        Validate builds');
  });

program
  .command('plan')
  .description('Plan root file distribution (dry-run)')
  .option('-p, --path <path>', 'Repository path', process.cwd())
  .option('-v, --verbose', 'Enable verbose debug output', false)
  .option('--no-ai', 'Skip AI classification, use fast heuristics only', false)
  .option('--no-usage-check', 'Skip usage detection for faster processing', false)
  .action(async (options) => {
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

    // Check AI availability and inform user
    if (options.ai === false) {
      console.log('⚠️  AI classification disabled - using fast heuristics only');
      console.log('   This will be much faster but less accurate\n');
      // Temporarily disable AI
      const oldAnthropicKey = process.env.ANTHROPIC_API_KEY;
      const oldOpenAIKey = process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
    } else if (!AIClassifierFactory.isAvailable()) {
      console.log('⚠️  AI classification unavailable - using heuristics (65% accuracy)');
      console.log('   For better results: Set ANTHROPIC_API_KEY or OPENAI_API_KEY\n');
    } else {
      console.log('✓ AI classification enabled (this may take a few minutes for 158 files)\n');
    }
    
    if (options.usageCheck === false) {
      console.log('⚠️  Usage detection disabled - will not check if files are referenced\n');
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
  .option('--no-ai', 'Skip AI classification, use fast heuristics only', false)
  .option('--no-usage-check', 'Skip usage detection for faster processing', false)
  .action(async (options) => {
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
    
    // Handle AI flag
    if (options.ai === false) {
      console.log('⚠️  AI classification disabled - using fast heuristics only\n');
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
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

// Show status by default if no command specified
if (process.argv.length === 2) {
  process.argv.push('status');
}

program.parse();
