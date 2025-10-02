# CLI and User Interface Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines the command-line interface, user interactions, contextual help system, and output formatting for UnVibe.

---

## 2. Command Structure

### 2.1 Primary Commands

```bash
devibe                      # Contextual help and status
devibe scan                 # Scan and create inventory
devibe distribute           # Review/execute root file distribution
devibe plan                 # Create cleanup plan
devibe review               # Review current plan
devibe execute              # Execute distribution + cleanup
devibe yolo                 # Full auto-cleanup (AI recommended)
devibe restore              # Restore from backup
devibe status               # Show repo and AI status
devibe config               # Configuration management
```

### 2.2 Configuration Commands

```bash
devibe config show                          # Display configuration
devibe config set-api-key                   # Interactive API setup
devibe config set-api-key --provider anthropic --key sk-xxx
devibe config get-api-key                   # Show masked key
devibe config remove-api-key                # Remove API key
devibe config init                          # Create default configs
devibe config edit                          # Edit in $EDITOR
devibe config validate                      # Validate configs
```

### 2.3 Global Flags

```bash
# Mode flags
--yolo                  # Enable YOLO mode
--yolo-confirm          # YOLO but confirm before execute
--interactive           # Prompt for decisions (default)
--dry-run               # Simulate without changes

# AI flags
--no-ai                 # Use heuristics only
--no-ai-warnings        # Suppress AI recommendations
--ai-provider <name>    # anthropic | openai | local
--ai-confidence <n>     # Min confidence threshold (0.0-1.0)

# Repository flags
--mono-repo             # Force monorepo mode
--no-git-detect         # Treat as single repo
--skip-distribution     # Skip root file distribution

# Validation flags
--no-build-test         # Skip build validation
--docker-only           # Only validate Docker builds
--post-build-only       # Skip pre-build tests

# Auto-decision flags
--auto-yes              # Accept all recommendations
--auto-merge            # Auto-merge into folders
--auto-delete-stale     # Auto-delete stale scripts
--auto-distribute       # Auto-accept high-confidence

# Output flags
--verbose               # Detailed output with reasoning
--quiet                 # Minimal output
--no-color              # Disable colors
--json                  # Output as JSON
```

---

## 3. Contextual Help System

### 3.1 Main Help (`devibe`)

```typescript
async function displayContextualHelp(): Promise<void> {
  // Detect repository structure
  const repoTree = await detectGitRepositories(process.cwd());
  const config = await loadConfig();
  
  console.log(chalk.bold('\n📦 UnVibe - Repository Cleanup Utility'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');
  
  // Repository status
  console.log(chalk.bold('Repository Status:'));
  if (repoTree.isMonorepo) {
    console.log(`  Type: ${chalk.cyan('Monorepo')}`);
    console.log(`  Sub-repositories: ${chalk.cyan(repoTree.subRepos.length)}`);
    
    // Check for root files
    const rootFiles = await findRootFiles(repoTree);
    if (rootFiles.length > 0) {
      console.log(`  ${chalk.yellow('⚠')} Root files needing distribution: ${chalk.yellow(rootFiles.length)}`);
    }
  } else if (repoTree.repositoryType === 'single') {
    console.log(`  Type: ${chalk.cyan('Single Repository')}`);
  } else {
    console.log(`  Type: ${chalk.yellow('No Git Repository')}`);
  }
  console.log('');
  
  // AI configuration status
  console.log(chalk.bold('AI Configuration:'));
  if (config.ai?.enabled && config.ai?.apiKey) {
    console.log(`  Status: ${chalk.green('✓ Enabled')}`);
    console.log(`  Provider: ${chalk.cyan(config.ai.provider)}`);
    console.log(`  Key: ${maskApiKey(config.ai.apiKey)}`);
  } else {
    console.log(`  Status: ${chalk.yellow('⚠ Not Configured')}`);
    console.log(chalk.dim('  AI significantly improves accuracy (90% vs 65%)'));
    console.log(chalk.dim(`  Setup: ${chalk.cyan('devibe config set-api-key')}`));
  }
  console.log('');
  
  // Last cleanup
  const lastCleanup = await getLastCleanupTime();
  if (lastCleanup) {
    console.log(chalk.bold('Last Cleanup:'));
    console.log(`  ${formatRelativeTime(lastCleanup)}`);
    console.log('');
  }
  
  // Suggested next steps
  console.log(chalk.bold('Suggested Next Steps:'));
  
  if (!config.ai?.enabled) {
    console.log(`  1. ${chalk.cyan('devibe config set-api-key')} - Enable AI for better accuracy`);
  }
  
  if (repoTree.isMonorepo && rootFiles.length > 0) {
    console.log(`  ${config.ai?.enabled ? '1' : '2'}. ${chalk.cyan('devibe scan')} - Scan repository`);
    console.log(`  ${config.ai?.enabled ? '2' : '3'}. ${chalk.cyan('devibe distribute')} - Distribute ${rootFiles.length} root files`);
  } else {
    console.log(`  ${config.ai?.enabled ? '1' : '2'}. ${chalk.cyan('devibe scan')} - Scan repository`);
    console.log(`  ${config.ai?.enabled ? '2' : '3'}. ${chalk.cyan('devibe plan')} - Create cleanup plan`);
  }
  
  console.log('');
  console.log(chalk.bold('Quick Start:'));
  console.log(`  ${chalk.cyan('devibe yolo')}  - Full auto-cleanup (use with caution)`);
  console.log('');
  console.log(chalk.dim('For more commands: devibe --help'));
  console.log(chalk.dim('For configuration: devibe config --help'));
  console.log('');
}
```

### 3.2 Command Help

```typescript
const commands = {
  scan: {
    description: 'Scan repository and create inventory',
    usage: 'devibe scan [options]',
    options: [
      '--verbose          Show detailed scan information',
      '--json             Output as JSON'
    ],
    examples: [
      'devibe scan',
      'devibe scan --verbose'
    ]
  },
  
  distribute: {
    description: 'Distribute root files to sub-repositories',
    usage: 'devibe distribute [options]',
    options: [
      '--auto-yes         Auto-accept high-confidence allocations',
      '--dry-run          Show what would happen',
      '--no-ai            Use heuristics only'
    ],
    examples: [
      'devibe distribute',
      'devibe distribute --auto-yes --dry-run'
    ]
  },
  
  yolo: {
    description: 'Full auto-cleanup with AI (recommended)',
    usage: 'devibe yolo [options]',
    options: [
      '--yolo-confirm     Confirm before execution',
      '--no-ai            Use heuristics (not recommended)'
    ],
    examples: [
      'devibe yolo',
      'devibe yolo --yolo-confirm'
    ],
    warning: 'YOLO mode makes aggressive decisions. AI is strongly recommended.'
  }
};
```

---

## 4. Interactive Prompts

### 4.1 Distribution Review

```typescript
async function promptDistributionReview(plan: DistributionPlan): Promise<DistributionDecisions> {
  console.log(chalk.bold('\n📦 Distribution Plan Review'));
  console.log(chalk.dim('─'.repeat(60)));
  
  const decisions: DistributionDecisions = {
    approved: [],
    rejected: [],
    modified: []
  };
  
  // Auto-approve high confidence
  if (plan.highConfidence.length > 0) {
    console.log(chalk.green(`\n✓ Auto-approving ${plan.highConfidence.length} high-confidence allocations`));
    decisions.approved.push(...plan.highConfidence);
  }
  
  // Review low confidence
  if (plan.lowConfidence.length > 0) {
    console.log(chalk.yellow(`\n⚠ Reviewing ${plan.lowConfidence.length} lower-confidence allocations\n`));
    
    for (const decision of plan.lowConfidence) {
      console.log(chalk.cyan(path.basename(decision.file)));
      console.log(`  → ${decision.targetRepo}${decision.targetSubdir ? '/' + decision.targetSubdir : ''}`);
      console.log(`  ${chalk.dim(`${(decision.confidence * 100).toFixed(0)}% confidence`)}`);
      console.log(`  ${chalk.dim(decision.reasoning)}`);
      
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: 'Accept', value: 'accept' },
          { name: 'Reject (keep at root)', value: 'reject' },
          { name: 'Modify target', value: 'modify' },
          { name: 'Skip for now', value: 'skip' }
        ]
      }]);
      
      if (action === 'accept') {
        decisions.approved.push(decision);
      } else if (action === 'reject') {
        decisions.rejected.push(decision);
      } else if (action === 'modify') {
        const modified = await promptModifyTarget(decision, plan.availableRepos);
        decisions.modified.push(modified);
      }
      
      console.log('');
    }
  }
  
  return decisions;
}

async function promptModifyTarget(
  decision: AllocationDecision,
  availableRepos: string[]
): Promise<AllocationDecision> {
  const { newRepo } = await inquirer.prompt([{
    type: 'list',
    name: 'newRepo',
    message: 'Select target repository:',
    choices: availableRepos
  }]);
  
  const { newSubdir } = await inquirer.prompt([{
    type: 'input',
    name: 'newSubdir',
    message: 'Enter subdirectory (optional):',
    default: decision.targetSubdir
  }]);
  
  return {
    ...decision,
    targetRepo: newRepo,
    targetSubdir: newSubdir,
    confidence: 0.5, // User override
    method: 'manual'
  };
}
```

### 4.2 Cleanup Review

```typescript
async function promptCleanupReview(plan: CleanupPlan): Promise<CleanupDecisions> {
  console.log(chalk.bold('\n🧹 Cleanup Plan Review'));
  console.log(chalk.dim('─'.repeat(60)));
  
  const decisions: CleanupDecisions = {
    confirmDelete: [],
    skipDelete: [],
    confirmOrganize: plan.toOrganize // Auto-approve organization
  };
  
  // Review files to delete
  if (plan.toDelete.length > 0) {
    console.log(chalk.red(`\n⚠ ${plan.toDelete.length} files marked for deletion\n`));
    
    const { reviewAll } = await inquirer.prompt([{
      type: 'confirm',
      name: 'reviewAll',
      message: 'Review each file individually?',
      default: true
    }]);
    
    if (reviewAll) {
      for (const classification of plan.toDelete) {
        console.log(chalk.cyan(path.basename(classification.file.path)));
        console.log(`  ${chalk.dim(classification.reasoning)}`);
        console.log(`  ${chalk.dim(`Staleness: ${classification.staleness}, Confidence: ${(classification.confidence * 100).toFixed(0)}%`)}`);
        
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Delete this file?',
          default: true
        }]);
        
        if (confirm) {
          decisions.confirmDelete.push(classification);
        } else {
          decisions.skipDelete.push(classification);
        }
        
        console.log('');
      }
    } else {
      const { confirmAll } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmAll',
        message: `Delete all ${plan.toDelete.length} files?`,
        default: false
      }]);
      
      if (confirmAll) {
        decisions.confirmDelete.push(...plan.toDelete);
      } else {
        decisions.skipDelete.push(...plan.toDelete);
      }
    }
  }
  
  return decisions;
}
```

---

## 5. Output Formatting

### 5.1 Progress Indicators

```typescript
class ProgressDisplay {
  private spinner?: ora.Ora;
  private progressBar?: cliProgress.SingleBar;
  
  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }
  
  stopSpinner(success: boolean, message?: string): void {
    if (!this.spinner) return;
    
    if (success) {
      this.spinner.succeed(message);
    } else {
      this.spinner.fail(message);
    }
    
    this.spinner = undefined;
  }
  
  startProgress(total: number, message: string): void {
    this.progressBar = new cliProgress.SingleBar({
      format: `${message} |{bar}| {percentage}% | {value}/{total} files`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    this.progressBar.start(total, 0);
  }
  
  updateProgress(current: number): void {
    this.progressBar?.update(current);
  }
  
  stopProgress(): void {
    this.progressBar?.stop();
    this.progressBar = undefined;
  }
}
```

### 5.2 Summary Tables

```typescript
function displaySummaryTable(data: SummaryData): void {
  const table = new Table({
    head: ['Category', 'Count', 'Action'].map(h => chalk.bold(h)),
    colWidths: [20, 10, 30]
  });
  
  for (const row of data.rows) {
    table.push([
      row.category,
      row.count.toString(),
      row.action
    ]);
  }
  
  console.log(table.toString());
}

function displayFileList(files: FileEntry[], action: string): void {
  const table = new Table({
    head: ['File', 'Size', 'Modified'].map(h => chalk.bold(h)),
    colWidths: [40, 12, 25]
  });
  
  for (const file of files) {
    table.push([
      path.basename(file.path),
      formatBytes(file.size),
      formatDate(file.lastModified)
    ]);
  }
  
  console.log(`\n${chalk.bold(action)}`);
  console.log(table.toString());
}
```

### 5.3 Results Display

```typescript
function displayOperationResults(results: OperationResults): void {
  console.log(chalk.bold('\n✨ Operation Complete'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');
  
  // Summary
  console.log(chalk.bold('Summary:'));
  console.log(`  Files distributed: ${chalk.green(results.distributed)}`);
  console.log(`  Files organized: ${chalk.green(results.organized)}`);
  console.log(`  Files deleted: ${chalk.red(results.deleted)}`);
  console.log(`  Files kept: ${chalk.blue(results.kept)}`);
  console.log('');
  
  // Build validation
  if (results.buildValidation) {
    console.log(chalk.bold('Build Validation:'));
    for (const [repo, status] of Object.entries(results.buildValidation)) {
      const icon = status === 'success' ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${icon} ${path.basename(repo)}`);
    }
    console.log('');
  }
  
  // Backup info
  console.log(chalk.bold('Backup:'));
  console.log(`  Location: ${chalk.dim('.unvibe/backups/' + results.backupId)}`);
  console.log(`  Restore: ${chalk.cyan(`devibe restore --from ${results.backupId}`)}`);
  console.log('');
  
  // Duration
  console.log(chalk.dim(`Completed in ${formatDuration(results.duration)}`));
  console.log('');
}
```

---

## 6. Error Display

### 6.1 Error Formatting

```typescript
function displayError(error: Error): void {
  console.error(chalk.red('\n❌ Error'));
  console.error(chalk.dim('─'.repeat(60)));
  console.error('');
  console.error(error.message);
  console.error('');
  
  if (error instanceof AIError) {
    displayAIError(error);
  } else if (error instanceof BuildValidationError) {
    displayBuildError(error);
  } else if (error instanceof BoundaryViolationError) {
    displayBoundaryError(error);
  }
  
  if (error.stack && process.env.DEBUG) {
    console.error(chalk.dim('Stack trace:'));
    console.error(chalk.dim(error.stack));
  }
  
  console.error('');
}

function displayAIError(error: AIError): void {
  if (error.code === 'INVALID_API_KEY') {
    console.error(chalk.yellow('💡 Tip:'));
    console.error(`   Run: ${chalk.cyan('devibe config set-api-key')}`);
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.error(chalk.yellow('💡 Tip:'));
    console.error('   Wait a few minutes and try again');
    console.error('   Or use: --no-ai flag for heuristic analysis');
  }
}
```

---

## 7. CLI Implementation

### 7.1 Main CLI Setup

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('devibe')
  .description('Repository cleanup utility for vibe coding sessions')
  .version('1.0.0');

// Default command (contextual help)
program
  .action(async () => {
    await displayContextualHelp();
  });

// Scan command
program
  .command('scan')
  .description('Scan repository and create inventory')
  .option('--verbose', 'Show detailed information')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await scanCommand(options);
  });

// Distribute command
program
  .command('distribute')
  .description('Distribute root files to sub-repositories')
  .option('--auto-yes', 'Auto-accept high-confidence allocations')
  .option('--dry-run', 'Show what would happen')
  .option('--no-ai', 'Use heuristics only')
  .action(async (options) => {
    await distributeCommand(options);
  });

// YOLO command
program
  .command('yolo')
  .description('Full auto-cleanup (AI recommended)')
  .option('--yolo-confirm', 'Confirm before execution')
  .option('--no-ai', 'Use heuristics (not recommended)')
  .action(async (options) => {
    await yoloCommand(options);
  });

// Config commands
const config = program
  .command('config')
  .description('Configuration management');

config
  .command('set-api-key')
  .description('Set up AI API key')
  .option('--provider <name>', 'AI provider (anthropic|openai)')
  .option('--key <key>', 'API key')
  .action(async (options) => {
    await setApiKeyCommand(options);
  });

program.parse();
```

---

## 8. Testing

### 8.1 CLI Testing

```typescript
describe('CLI', () => {
  test('displays contextual help', async () => {
    const output = await runCLI([]);
    expect(output).toContain('UnVibe');
    expect(output).toContain('Repository Status');
  });
  
  test('prompts for AI setup on first run', async () => {
    const output = await runCLI([], { firstRun: true });
    expect(output).toContain('AI Configuration');
    expect(output).toContain('devibe config set-api-key');
  });
  
  test('handles --help flag', async () => {
    const output = await runCLI(['--help']);
    expect(output).toContain('Usage:');
    expect(output).toContain('Commands:');
  });
});
```

---

**Document Status:** Complete  
**Implementation Priority:** Phase 9-11 (Weeks 11-13)  
**Dependencies:** All Core Features

