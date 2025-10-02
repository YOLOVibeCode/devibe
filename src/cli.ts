#!/usr/bin/env node
import { Command } from 'commander';
import { GitDetector } from './git-detector.js';
import { SecretScanner } from './secret-scanner.js';
import { FileClassifier } from './file-classifier.js';
import { OperationPlanner, OperationExecutor } from './operation-executor.js';
import { BackupManager } from './backup-manager.js';
import { BuildDetector, BuildValidationService } from './build-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('devibe')
  .description('UnVibe - Repository cleanup utility for vibe coding sessions')
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
  .action(async (options) => {
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    const planner = new OperationPlanner(detector, classifier);

    console.log('\n📋 Planning root file distribution...\n');

    const plan = await planner.planRootFileDistribution(options.path);

    if (plan.operations.length === 0) {
      console.log('✓ No operations needed. Repository is clean!\n');
      return;
    }

    console.log(`Found ${plan.operations.length} operations:\n`);

    for (const op of plan.operations) {
      console.log(`  ${op.type.toUpperCase()}: ${path.basename(op.sourcePath)}`);
      if (op.targetPath) {
        console.log(`    → ${op.targetPath}`);
      }
      console.log(`    Reason: ${op.reason}\n`);
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
  .action(async (options) => {
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    const planner = new OperationPlanner(detector, classifier);
    const backupManager = new BackupManager(path.join(options.path, '.unvibe', 'backups'));
    const executor = new OperationExecutor(backupManager);

    console.log(`\n${options.dryRun ? '🔍 DRY RUN: ' : '⚡ '}Executing operations...\n`);

    const plan = await planner.planRootFileDistribution(options.path);

    if (plan.operations.length === 0) {
      console.log('✓ No operations to execute.\n');
      return;
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
      if (!result.success) {
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

  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

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

// Show status by default if no command specified
if (process.argv.length === 2) {
  process.argv.push('status');
}

program.parse();
