# Build Validation & Safety Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines how UnVibe ensures repository builds remain functional after file operations and implements comprehensive safety mechanisms including backups, auto-restore, and boundary protection.

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-5.1-5.4**: Build Validation
- **FR-6.1-6.4**: Backup and Restore

### 2.2 Safety Requirements

- **S-1**: Git Boundary Protection
- **S-2**: Backup Requirements
- **S-3**: Build Integrity
- **S-4**: Protected File Enforcement
- **S-5**: Reversibility

---

## 3. Build Validation System

### 3.1 Build Validator Architecture

```typescript
interface BuildValidator {
  technology: string;
  detect(repo: Repository): boolean;
  getBuildCommand(repo: Repository): string;
  validate(repo: Repository): Promise<BuildResult>;
}

interface BuildResult {
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  exitCode: number;
}

abstract class BaseBuildValidator implements BuildValidator {
  abstract technology: string;
  abstract detect(repo: Repository): boolean;
  abstract getBuildCommand(repo: Repository): string;
  
  async validate(repo: Repository): Promise<BuildResult> {
    const command = this.getBuildCommand(repo);
    const startTime = Date.now();
    
    try {
      const { stdout, stderr, exitCode } = await this.executeCommand(command, repo.path);
      const duration = Date.now() - startTime;
      
      return {
        success: exitCode === 0,
        duration,
        output: stdout + stderr,
        exitCode
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: error.message,
        exitCode: 1
      };
    }
  }
  
  protected async executeCommand(
    command: string,
    cwd: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd, timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: error.code || 1
          });
        } else {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString(),
            exitCode: 0
          });
        }
      });
    });
  }
}
```

### 3.2 Technology-Specific Validators

```typescript
// Node.js Validator
class NodeJSValidator extends BaseBuildValidator {
  technology = 'nodejs';
  
  detect(repo: Repository): boolean {
    return repo.hasPackageJson;
  }
  
  getBuildCommand(repo: Repository): string {
    const pkgJsonPath = path.join(repo.path, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    
    if (pkg.scripts?.build) {
      const pm = repo.packageManager || 'npm';
      return `${pm} run build`;
    }
    
    // No build script, try install
    const pm = repo.packageManager || 'npm';
    return `${pm} install`;
  }
}

// Docker Validator
class DockerValidator extends BaseBuildValidator {
  technology = 'docker';
  
  detect(repo: Repository): boolean {
    return repo.hasDockerfile;
  }
  
  getBuildCommand(repo: Repository): string {
    const tag = `unvibe-test-${path.basename(repo.path)}`;
    return `docker build -t ${tag} .`;
  }
}

// Python Validator
class PythonValidator extends BaseBuildValidator {
  technology = 'python';
  
  detect(repo: Repository): boolean {
    return repo.technologies.some(t => t.name === 'python');
  }
  
  getBuildCommand(repo: Repository): string {
    if (fs.existsSync(path.join(repo.path, 'setup.py'))) {
      return 'python setup.py build';
    }
    if (fs.existsSync(path.join(repo.path, 'pyproject.toml'))) {
      return 'pip install -e .';
    }
    return 'pip install -r requirements.txt';
  }
}

// Go Validator
class GoValidator extends BaseBuildValidator {
  technology = 'go';
  
  detect(repo: Repository): boolean {
    return repo.technologies.some(t => t.name === 'go');
  }
  
  getBuildCommand(repo: Repository): string {
    return 'go build ./...';
  }
}

// Rust Validator
class RustValidator extends BaseBuildValidator {
  technology = 'rust';
  
  detect(repo: Repository): boolean {
    return repo.technologies.some(t => t.name === 'rust');
  }
  
  getBuildCommand(repo: Repository): string {
    return 'cargo build';
  }
}
```

### 3.3 Validation Orchestrator

```typescript
class BuildValidationOrchestrator {
  private validators: BuildValidator[] = [
    new NodeJSValidator(),
    new DockerValidator(),
    new PythonValidator(),
    new GoValidator(),
    new RustValidator()
  ];
  
  async validateRepository(
    repo: Repository,
    stage: 'pre' | 'post-distribution' | 'post-cleanup'
  ): Promise<ValidationReport> {
    console.log(chalk.dim(`\nValidating ${repo.name} (${stage})...`));
    
    const applicableValidators = this.validators.filter(v => v.detect(repo));
    
    if (applicableValidators.length === 0) {
      return {
        repository: repo.path,
        stage,
        skipped: true,
        reason: 'No build system detected',
        results: []
      };
    }
    
    const results: BuildValidationResult[] = [];
    
    for (const validator of applicableValidators) {
      const spinner = ora(`Building ${validator.technology}...`).start();
      
      try {
        const result = await validator.validate(repo);
        
        if (result.success) {
          spinner.succeed(`${validator.technology} build successful (${result.duration}ms)`);
        } else {
          spinner.fail(`${validator.technology} build failed`);
        }
        
        results.push({
          technology: validator.technology,
          command: validator.getBuildCommand(repo),
          result
        });
      } catch (error) {
        spinner.fail(`${validator.technology} build error: ${error.message}`);
        results.push({
          technology: validator.technology,
          command: validator.getBuildCommand(repo),
          result: {
            success: false,
            duration: 0,
            output: '',
            error: error.message,
            exitCode: 1
          }
        });
      }
    }
    
    const allSuccessful = results.every(r => r.result.success);
    
    return {
      repository: repo.path,
      stage,
      skipped: false,
      success: allSuccessful,
      results
    };
  }
  
  async validateAll(
    repos: Repository[],
    stage: 'pre' | 'post-distribution' | 'post-cleanup'
  ): Promise<Map<string, ValidationReport>> {
    const reports = new Map<string, ValidationReport>();
    
    for (const repo of repos) {
      const report = await this.validateRepository(repo, stage);
      reports.set(repo.path, report);
    }
    
    return reports;
  }
}

interface ValidationReport {
  repository: string;
  stage: string;
  skipped: boolean;
  success?: boolean;
  reason?: string;
  results: BuildValidationResult[];
}

interface BuildValidationResult {
  technology: string;
  command: string;
  result: BuildResult;
}
```

---

## 4. Critical Path Detection

### 4.1 Path Analyzer

```typescript
class CriticalPathDetector {
  async detectCriticalPaths(repo: Repository): Promise<Set<string>> {
    const criticalPaths = new Set<string>();
    
    // Check package.json
    await this.checkPackageJson(repo, criticalPaths);
    
    // Check Dockerfile
    await this.checkDockerfile(repo, criticalPaths);
    
    // Check webpack/build configs
    await this.checkBuildConfigs(repo, criticalPaths);
    
    return criticalPaths;
  }
  
  private async checkPackageJson(repo: Repository, paths: Set<string>): Promise<void> {
    const pkgPath = path.join(repo.path, 'package.json');
    if (!await fs.pathExists(pkgPath)) return;
    
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      
      // Main entry point
      if (pkg.main) {
        paths.add(path.join(repo.path, pkg.main));
      }
      
      // Bin entries
      if (typeof pkg.bin === 'string') {
        paths.add(path.join(repo.path, pkg.bin));
      } else if (typeof pkg.bin === 'object') {
        for (const binPath of Object.values(pkg.bin)) {
          paths.add(path.join(repo.path, binPath as string));
        }
      }
      
      // Files field
      if (Array.isArray(pkg.files)) {
        for (const file of pkg.files) {
          paths.add(path.join(repo.path, file));
        }
      }
    } catch {
      // Ignore invalid package.json
    }
  }
  
  private async checkDockerfile(repo: Repository, paths: Set<string>): Promise<void> {
    const dockerfilePath = path.join(repo.path, 'Dockerfile');
    if (!await fs.pathExists(dockerfilePath)) return;
    
    try {
      const content = await fs.readFile(dockerfilePath, 'utf-8');
      
      // Find COPY and ADD commands
      const copyPattern = /^(COPY|ADD)\s+([^\s]+)/gm;
      let match;
      
      while ((match = copyPattern.exec(content)) !== null) {
        const sourcePath = match[2];
        
        // Skip URLs and flags
        if (sourcePath.startsWith('http') || sourcePath.startsWith('--')) {
          continue;
        }
        
        paths.add(path.join(repo.path, sourcePath));
      }
    } catch {
      // Ignore errors
    }
  }
  
  private async checkBuildConfigs(repo: Repository, paths: Set<string>): Promise<void> {
    // Check webpack.config.js
    const webpackPath = path.join(repo.path, 'webpack.config.js');
    if (await fs.pathExists(webpackPath)) {
      try {
        const content = await fs.readFile(webpackPath, 'utf-8');
        
        // Look for entry points
        const entryPattern = /entry:\s*['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = entryPattern.exec(content)) !== null) {
          paths.add(path.join(repo.path, match[1]));
        }
      } catch {
        // Ignore errors
      }
    }
  }
}
```

---

## 5. Safety Mechanisms

### 5.1 Safety Guard

```typescript
class SafetyGuard {
  private boundaryValidator: BoundaryValidator;
  private criticalPathDetector: CriticalPathDetector;
  private protectedPaths: Set<string>;
  
  constructor(repoTree: RepositoryTree) {
    this.boundaryValidator = new BoundaryValidator(repoTree);
    this.criticalPathDetector = new CriticalPathDetector();
    this.protectedPaths = new Set();
    
    this.loadProtectedPaths(repoTree);
  }
  
  private async loadProtectedPaths(repoTree: RepositoryTree): Promise<void> {
    // Add standard protected files
    const protectedPatterns = [
      '.git/**',
      '.env',
      '.env.*',
      '*.pem',
      '*.key',
      '*.crt',
      '*.p12',
      '*.db',
      '*.sqlite',
      'package.json',
      'lerna.json',
      'pnpm-workspace.yaml',
      'nx.json',
      'turbo.json'
    ];
    
    for (const pattern of protectedPatterns) {
      this.protectedPaths.add(pattern);
    }
    
    // Add critical paths from all repos
    for (const repo of [repoTree.rootRepo, ...repoTree.subRepos].filter(Boolean)) {
      const criticalPaths = await this.criticalPathDetector.detectCriticalPaths(repo!);
      for (const path of criticalPaths) {
        this.protectedPaths.add(path);
      }
    }
  }
  
  async checkOperation(operation: FileOperation): Promise<SafetyCheckResult> {
    const violations: string[] = [];
    
    // Check 1: Boundary protection
    try {
      this.boundaryValidator.enforceBeforeOperation(operation);
    } catch (error) {
      if (error instanceof BoundaryViolationError) {
        violations.push(`Boundary violation: ${error.message}`);
      }
    }
    
    // Check 2: Protected files
    if (this.isProtected(operation.source)) {
      violations.push(`Cannot operate on protected file: ${operation.source}`);
    }
    
    // Check 3: Critical paths
    if (operation.type === 'delete' && this.isCriticalPath(operation.source)) {
      violations.push(`Cannot delete critical path: ${operation.source}`);
    }
    
    return {
      safe: violations.length === 0,
      violations
    };
  }
  
  private isProtected(filePath: string): boolean {
    for (const pattern of this.protectedPaths) {
      if (minimatch(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }
  
  private isCriticalPath(filePath: string): boolean {
    return this.protectedPaths.has(filePath);
  }
}

interface SafetyCheckResult {
  safe: boolean;
  violations: string[];
}
```

---

## 6. Auto-Restore Logic

### 6.1 Auto-Restore Implementation

```typescript
class AutoRestoreSystem {
  private backupManager: BackupManager;
  private buildValidator: BuildValidationOrchestrator;
  
  constructor() {
    this.backupManager = new BackupManager();
    this.buildValidator = new BuildValidationOrchestrator();
  }
  
  async executeWithAutoRestore(
    operation: () => Promise<void>,
    repos: Repository[],
    mode: 'interactive' | 'yolo'
  ): Promise<ExecutionResult> {
    // Create backup
    const backupId = await this.backupManager.createBackup(repos);
    
    // Baseline builds (optional in YOLO)
    let baselineResults: Map<string, ValidationReport> | undefined;
    if (mode === 'interactive') {
      console.log(chalk.dim('\n📋 Creating baseline builds...'));
      baselineResults = await this.buildValidator.validateAll(repos, 'pre');
    }
    
    try {
      // Execute operations
      await operation();
      
      // Validate builds after operations
      console.log(chalk.dim('\n🔍 Validating builds...'));
      const postResults = await this.buildValidator.validateAll(repos, 'post-cleanup');
      
      // Check for failures
      const failures = Array.from(postResults.entries())
        .filter(([_, report]) => !report.skipped && !report.success);
      
      if (failures.length > 0) {
        // Build failed!
        console.error(chalk.red('\n❌ Build validation failed!'));
        
        for (const [repoPath, report] of failures) {
          console.error(chalk.red(`\n  Repository: ${path.basename(repoPath)}`));
          for (const result of report.results) {
            if (!result.result.success) {
              console.error(chalk.red(`    ${result.technology}: ${result.result.error || 'Build failed'}`));
            }
          }
        }
        
        if (mode === 'yolo') {
          // Auto-restore in YOLO mode
          console.log(chalk.yellow('\n🔄 Auto-restoring from backup...'));
          await this.backupManager.restore(backupId);
          
          // Revalidate
          const restoreResults = await this.buildValidator.validateAll(repos, 'post-cleanup');
          const stillFailing = Array.from(restoreResults.entries())
            .filter(([_, report]) => !report.skipped && !report.success);
          
          if (stillFailing.length > 0) {
            return {
              success: false,
              restored: true,
              stillFailing: true,
              message: 'Build failed after restore. Manual intervention required.'
            };
          }
          
          return {
            success: false,
            restored: true,
            stillFailing: false,
            message: 'Build failed. Successfully restored from backup.'
          };
        } else {
          // Interactive mode: offer restore
          const { shouldRestore } = await inquirer.prompt([{
            type: 'confirm',
            name: 'shouldRestore',
            message: 'Restore from backup?',
            default: true
          }]);
          
          if (shouldRestore) {
            await this.backupManager.restore(backupId);
            return {
              success: false,
              restored: true,
              message: 'Restored from backup.'
            };
          }
          
          return {
            success: false,
            restored: false,
            message: 'Build failed. Backup available. Use: devibe restore --last'
          };
        }
      }
      
      // Success!
      return {
        success: true,
        restored: false,
        message: 'All builds validated successfully.'
      };
      
    } catch (error) {
      // Unexpected error during execution
      console.error(chalk.red(`\n❌ Error during execution: ${error.message}`));
      
      if (mode === 'yolo') {
        console.log(chalk.yellow('\n🔄 Auto-restoring from backup...'));
        await this.backupManager.restore(backupId);
        return {
          success: false,
          restored: true,
          message: 'Error occurred. Restored from backup.'
        };
      }
      
      throw error;
    }
  }
}

interface ExecutionResult {
  success: boolean;
  restored: boolean;
  stillFailing?: boolean;
  message: string;
}
```

---

## 7. Error Handling

### 7.1 Build Validation Errors

```typescript
class BuildValidationError extends Error {
  constructor(
    message: string,
    public repository: string,
    public technology: string,
    public buildOutput: string
  ) {
    super(message);
    this.name = 'BuildValidationError';
  }
}

function handleBuildFailure(
  error: BuildValidationError,
  backupId: string,
  mode: 'interactive' | 'yolo'
): void {
  console.error(chalk.red('\n❌ Build Validation Failed'));
  console.error('');
  console.error(`Repository: ${error.repository}`);
  console.error(`Technology: ${error.technology}`);
  console.error('');
  console.error(chalk.dim('Build output:'));
  console.error(chalk.dim(error.buildOutput));
  console.error('');
  
  if (mode === 'yolo') {
    console.log(chalk.yellow('Auto-restore will be attempted...'));
  } else {
    console.log('Options:');
    console.log(`  1. Restore from backup: ${chalk.cyan(`devibe restore --from ${backupId}`)}`);
    console.log(`  2. Keep changes and fix manually`);
    console.log(`  3. Review build logs above`);
  }
}
```

---

## 8. Testing

### 8.1 Test Scenarios

```typescript
describe('Build Validation', () => {
  test('validates Node.js builds', async () => {
    const validator = new NodeJSValidator();
    const repo = createTestRepo({ hasPackageJson: true });
    const result = await validator.validate(repo);
    
    expect(result.success).toBe(true);
  });
  
  test('detects build failures', async () => {
    const orchestrator = new BuildValidationOrchestrator();
    const repo = createBrokenRepo();
    const report = await orchestrator.validateRepository(repo, 'post-cleanup');
    
    expect(report.success).toBe(false);
  });
  
  test('auto-restores on YOLO build failure', async () => {
    const system = new AutoRestoreSystem();
    const result = await system.executeWithAutoRestore(
      async () => { /* break build */ },
      [repo],
      'yolo'
    );
    
    expect(result.restored).toBe(true);
    expect(result.success).toBe(false);
  });
  
  test('protects critical paths', async () => {
    const guard = new SafetyGuard(repoTree);
    const operation = { type: 'delete', source: '/path/to/main.js' };
    const result = await guard.checkOperation(operation);
    
    expect(result.safe).toBe(false);
    expect(result.violations).toContain('critical path');
  });
});
```

---

**Document Status:** Complete  
**Implementation Priority:** Phase 8 (Week 10)  
**Dependencies:** Git Detection, Backup System

