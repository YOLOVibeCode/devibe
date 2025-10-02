# Git Detection & Repository Analysis Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines how UnVibe detects git repositories, analyzes monorepo structures, and enforces repository boundaries throughout all operations.

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-1.1**: Multi-Repository Detection
- **FR-1.2**: Fallback Behavior
- **FR-1.3**: Boundary Enforcement

### 2.2 Safety Requirements

- **S-1**: Git Boundary Protection

---

## 3. Git Repository Detection

### 3.1 Detection Algorithm

```typescript
interface GitDetectionResult {
  hasGit: boolean;
  gitDirectories: string[];
  repositoryType: 'none' | 'single' | 'monorepo';
  rootRepo?: Repository;
  subRepos: Repository[];
}

async function detectGitRepositories(workingDir: string): Promise<GitDetectionResult> {
  // Step 1: Find all .git locations
  const gitDirs = await findGitDirectories(workingDir);
  
  // Step 2: Classify repository structure
  if (gitDirs.length === 0) {
    return { 
      hasGit: false, 
      gitDirectories: [],
      repositoryType: 'none',
      subRepos: []
    };
  }
  
  if (gitDirs.length === 1 && gitDirs[0] === path.join(workingDir, '.git')) {
    return {
      hasGit: true,
      gitDirectories: gitDirs,
      repositoryType: 'single',
      rootRepo: await analyzeRepository(workingDir),
      subRepos: []
    };
  }
  
  // Multiple .git directories = monorepo
  return {
    hasGit: true,
    gitDirectories: gitDirs,
    repositoryType: 'monorepo',
    rootRepo: await analyzeRepository(workingDir),
    subRepos: await analyzeSubRepositories(gitDirs, workingDir)
  };
}
```

### 3.2 Finding Git Directories

```typescript
async function findGitDirectories(workingDir: string): Promise<string[]> {
  const gitDirs: string[] = [];
  
  // Use fast-glob to find all .git directories/files
  const found = await glob('.git', {
    cwd: workingDir,
    absolute: true,
    dot: true,
    onlyFiles: false,
    markDirectories: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  for (const gitPath of found) {
    if (await isGitDirectory(gitPath)) {
      gitDirs.push(gitPath);
    } else if (await isGitSubmodule(gitPath)) {
      // Handle git submodules (.git file pointing to parent)
      const actualGitDir = await resolveSubmoduleGitDir(gitPath);
      gitDirs.push(actualGitDir);
    }
  }
  
  return gitDirs.sort(); // Consistent ordering
}

async function isGitDirectory(gitPath: string): Promise<boolean> {
  const stat = await fs.stat(gitPath);
  return stat.isDirectory();
}

async function isGitSubmodule(gitPath: string): Promise<boolean> {
  const stat = await fs.stat(gitPath);
  if (!stat.isFile()) return false;
  
  // Submodules have a .git file with content like:
  // gitdir: ../.git/modules/submodule-name
  const content = await fs.readFile(gitPath, 'utf-8');
  return content.startsWith('gitdir:');
}

async function resolveSubmoduleGitDir(gitFilePath: string): Promise<string> {
  const content = await fs.readFile(gitFilePath, 'utf-8');
  const match = content.match(/^gitdir:\s*(.+)$/m);
  
  if (!match) {
    throw new Error(`Invalid git submodule file: ${gitFilePath}`);
  }
  
  const relativePath = match[1].trim();
  const basePath = path.dirname(gitFilePath);
  return path.resolve(basePath, relativePath);
}
```

### 3.3 Handling Edge Cases

```typescript
interface EdgeCaseHandling {
  // Nested monorepos (monorepo inside monorepo)
  nestedMonorepos: 'treat-as-boundaries' | 'flatten';
  
  // Bare repositories (server-side)
  bareRepos: 'skip' | 'include';
  
  // Corrupted .git directories
  corruptedGit: 'skip' | 'error';
  
  // Symlinked git directories
  symlinks: 'follow' | 'skip';
}

const defaultEdgeCaseHandling: EdgeCaseHandling = {
  nestedMonorepos: 'treat-as-boundaries',
  bareRepos: 'skip',
  corruptedGit: 'skip',
  symlinks: 'skip'
};
```

---

## 4. Repository Analysis

### 4.1 Repository Structure

```typescript
interface Repository {
  // Basic information
  path: string;              // Absolute path to repository root
  name: string;              // Directory name or git remote name
  type: 'root' | 'sub';      // Root of monorepo or sub-repository
  
  // Git information
  hasGit: boolean;
  gitPath: string;           // Path to .git directory/file
  isSubmodule: boolean;
  gitRemote?: string;        // Primary remote URL if available
  currentBranch?: string;
  
  // Technology detection
  technologies: Technology[];
  packageManager?: PackageManager;
  buildCommand?: string;
  testCommand?: string;
  
  // File structure
  hasPackageJson: boolean;
  hasDockerfile: boolean;
  hasSrcDirectory: boolean;
  
  // Relationships (for monorepos)
  parent?: string;           // Path to parent repo if sub-repo
  children: string[];        // Paths to child repos if root
}

interface Technology {
  name: string;              // 'nodejs', 'python', 'go', etc.
  confidence: number;        // 0.0 - 1.0
  indicators: string[];      // Files that indicated this technology
  version?: string;          // Detected version if available
}

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'poetry' | 'cargo' | 'go' | 'maven' | 'gradle';
```

### 4.2 Repository Analysis Algorithm

```typescript
async function analyzeRepository(repoPath: string): Promise<Repository> {
  const gitPath = path.join(repoPath, '.git');
  const hasGit = await fs.pathExists(gitPath);
  
  return {
    path: repoPath,
    name: path.basename(repoPath),
    type: 'root', // Will be adjusted if it's a sub-repo
    
    hasGit,
    gitPath: hasGit ? gitPath : '',
    isSubmodule: hasGit && (await isGitSubmodule(gitPath)),
    gitRemote: hasGit ? await getGitRemote(repoPath) : undefined,
    currentBranch: hasGit ? await getCurrentBranch(repoPath) : undefined,
    
    technologies: await detectTechnologies(repoPath),
    packageManager: await detectPackageManager(repoPath),
    buildCommand: await detectBuildCommand(repoPath),
    testCommand: await detectTestCommand(repoPath),
    
    hasPackageJson: await fs.pathExists(path.join(repoPath, 'package.json')),
    hasDockerfile: await fs.pathExists(path.join(repoPath, 'Dockerfile')),
    hasSrcDirectory: await fs.pathExists(path.join(repoPath, 'src')),
    
    children: []
  };
}

async function analyzeSubRepositories(
  gitDirs: string[], 
  workingDir: string
): Promise<Repository[]> {
  const subRepos: Repository[] = [];
  
  for (const gitPath of gitDirs) {
    const repoPath = path.dirname(gitPath);
    
    // Skip if this is the root
    if (repoPath === workingDir) continue;
    
    const repo = await analyzeRepository(repoPath);
    repo.type = 'sub';
    repo.parent = workingDir;
    
    subRepos.push(repo);
  }
  
  return subRepos;
}
```

### 4.3 Git Information Extraction

```typescript
import simpleGit from 'simple-git';

async function getGitRemote(repoPath: string): Promise<string | undefined> {
  try {
    const git = simpleGit(repoPath);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    return origin?.refs.fetch;
  } catch {
    return undefined;
  }
}

async function getCurrentBranch(repoPath: string): Promise<string | undefined> {
  try {
    const git = simpleGit(repoPath);
    const status = await git.status();
    return status.current;
  } catch {
    return undefined;
  }
}

async function isFileGitTracked(filePath: string, repoPath: string): Promise<boolean> {
  try {
    const git = simpleGit(repoPath);
    const relativePath = path.relative(repoPath, filePath);
    const result = await git.raw(['ls-files', '--', relativePath]);
    return result.trim().length > 0;
  } catch {
    return false;
  }
}
```

---

## 5. Technology Detection

### 5.1 Technology Indicators

```typescript
interface TechnologyIndicator {
  name: string;
  confidence: number;
  requiredFiles?: string[];      // At least one must exist
  requiredAll?: string[];        // All must exist
  patterns?: RegExp[];           // File name patterns
  contentPatterns?: ContentPattern[];
}

interface ContentPattern {
  file: string;
  pattern: RegExp;
  confidence: number;
}

const technologyIndicators: TechnologyIndicator[] = [
  // Node.js
  {
    name: 'nodejs',
    confidence: 0.95,
    requiredFiles: ['package.json']
  },
  
  // Python
  {
    name: 'python',
    confidence: 0.90,
    requiredFiles: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile']
  },
  
  // Go
  {
    name: 'go',
    confidence: 0.95,
    requiredFiles: ['go.mod']
  },
  
  // Rust
  {
    name: 'rust',
    confidence: 0.95,
    requiredFiles: ['Cargo.toml']
  },
  
  // Java
  {
    name: 'java',
    confidence: 0.90,
    requiredFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts']
  },
  
  // Ruby
  {
    name: 'ruby',
    confidence: 0.90,
    requiredFiles: ['Gemfile']
  },
  
  // PHP
  {
    name: 'php',
    confidence: 0.90,
    requiredFiles: ['composer.json']
  },
  
  // Docker
  {
    name: 'docker',
    confidence: 0.95,
    requiredFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml']
  },
  
  // Frontend frameworks (requires package.json analysis)
  {
    name: 'react',
    confidence: 0.85,
    contentPatterns: [{
      file: 'package.json',
      pattern: /"react":/,
      confidence: 0.85
    }]
  },
  
  {
    name: 'vue',
    confidence: 0.85,
    contentPatterns: [{
      file: 'package.json',
      pattern: /"vue":/,
      confidence: 0.85
    }]
  },
  
  {
    name: 'angular',
    confidence: 0.85,
    contentPatterns: [{
      file: 'package.json',
      pattern: /"@angular\/core":/,
      confidence: 0.85
    }]
  },
  
  // Backend frameworks
  {
    name: 'express',
    confidence: 0.80,
    contentPatterns: [{
      file: 'package.json',
      pattern: /"express":/,
      confidence: 0.80
    }]
  },
  
  {
    name: 'fastapi',
    confidence: 0.80,
    contentPatterns: [{
      file: 'requirements.txt',
      pattern: /^fastapi/m,
      confidence: 0.80
    }]
  }
];
```

### 5.2 Technology Detection Algorithm

```typescript
async function detectTechnologies(repoPath: string): Promise<Technology[]> {
  const detected: Technology[] = [];
  
  for (const indicator of technologyIndicators) {
    const result = await checkIndicator(repoPath, indicator);
    if (result.detected) {
      detected.push({
        name: indicator.name,
        confidence: result.confidence,
        indicators: result.indicators,
        version: result.version
      });
    }
  }
  
  // Sort by confidence descending
  return detected.sort((a, b) => b.confidence - a.confidence);
}

async function checkIndicator(
  repoPath: string, 
  indicator: TechnologyIndicator
): Promise<{ detected: boolean; confidence: number; indicators: string[]; version?: string }> {
  const indicators: string[] = [];
  let confidence = 0;
  
  // Check required files
  if (indicator.requiredFiles) {
    for (const file of indicator.requiredFiles) {
      const filePath = path.join(repoPath, file);
      if (await fs.pathExists(filePath)) {
        indicators.push(file);
        confidence = Math.max(confidence, indicator.confidence);
        break; // At least one required file found
      }
    }
  }
  
  // Check required all files
  if (indicator.requiredAll) {
    let allFound = true;
    for (const file of indicator.requiredAll) {
      const filePath = path.join(repoPath, file);
      if (await fs.pathExists(filePath)) {
        indicators.push(file);
      } else {
        allFound = false;
        break;
      }
    }
    if (allFound) {
      confidence = Math.max(confidence, indicator.confidence);
    }
  }
  
  // Check content patterns
  if (indicator.contentPatterns) {
    for (const contentPattern of indicator.contentPatterns) {
      const filePath = path.join(repoPath, contentPattern.file);
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        if (contentPattern.pattern.test(content)) {
          indicators.push(`${contentPattern.file} (content)`);
          confidence = Math.max(confidence, contentPattern.confidence);
        }
      }
    }
  }
  
  // Extract version if possible
  const version = await extractVersion(repoPath, indicator.name, indicators);
  
  return {
    detected: confidence > 0,
    confidence,
    indicators,
    version
  };
}

async function extractVersion(
  repoPath: string, 
  technology: string, 
  indicators: string[]
): Promise<string | undefined> {
  // Extract version from package.json, setup.py, etc.
  // Implementation depends on technology
  return undefined; // Placeholder
}
```

### 5.3 Package Manager Detection

```typescript
async function detectPackageManager(repoPath: string): Promise<PackageManager | undefined> {
  // Check for lock files (most reliable)
  if (await fs.pathExists(path.join(repoPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await fs.pathExists(path.join(repoPath, 'yarn.lock'))) {
    return 'yarn';
  }
  if (await fs.pathExists(path.join(repoPath, 'bun.lockb'))) {
    return 'bun';
  }
  if (await fs.pathExists(path.join(repoPath, 'package-lock.json'))) {
    return 'npm';
  }
  
  // Check for Python
  if (await fs.pathExists(path.join(repoPath, 'poetry.lock'))) {
    return 'poetry';
  }
  if (await fs.pathExists(path.join(repoPath, 'requirements.txt'))) {
    return 'pip';
  }
  
  // Check for Rust
  if (await fs.pathExists(path.join(repoPath, 'Cargo.lock'))) {
    return 'cargo';
  }
  
  // Check for Go
  if (await fs.pathExists(path.join(repoPath, 'go.sum'))) {
    return 'go';
  }
  
  // Check for Java
  if (await fs.pathExists(path.join(repoPath, 'pom.xml'))) {
    return 'maven';
  }
  if (await fs.pathExists(path.join(repoPath, 'build.gradle'))) {
    return 'gradle';
  }
  
  return undefined;
}
```

### 5.4 Build Command Detection

```typescript
async function detectBuildCommand(repoPath: string): Promise<string | undefined> {
  // Check package.json for Node.js projects
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    if (pkg.scripts?.build) {
      const pm = await detectPackageManager(repoPath) || 'npm';
      return `${pm} run build`;
    }
  }
  
  // Check Dockerfile
  const dockerfilePath = path.join(repoPath, 'Dockerfile');
  if (await fs.pathExists(dockerfilePath)) {
    return 'docker build -t test .';
  }
  
  // Check Python
  if (await fs.pathExists(path.join(repoPath, 'setup.py'))) {
    return 'python setup.py build';
  }
  
  // Check Go
  if (await fs.pathExists(path.join(repoPath, 'go.mod'))) {
    return 'go build ./...';
  }
  
  // Check Rust
  if (await fs.pathExists(path.join(repoPath, 'Cargo.toml'))) {
    return 'cargo build';
  }
  
  return undefined;
}
```

---

## 6. Repository Boundary Enforcement

### 6.1 Boundary Rules

```typescript
interface BoundaryRules {
  // MUST NEVER: Move files between sub-repositories
  allowSubToSubMoves: false;
  
  // MAY: Move files from root to sub-repository (distribution)
  allowRootToSubMoves: true;
  
  // MUST NEVER: Move files from sub-repository to root
  allowSubToRootMoves: false;
  
  // MUST: Respect git boundaries for all operations except distribution
  respectGitBoundaries: true;
}
```

### 6.2 Boundary Validation

```typescript
class BoundaryValidator {
  private boundaries: Set<string>;
  private repositoryMap: Map<string, Repository>;
  
  constructor(repoTree: RepositoryTree) {
    this.boundaries = new Set(repoTree.subRepos.map(r => r.path));
    this.repositoryMap = new Map(
      repoTree.subRepos.map(r => [r.path, r])
    );
  }
  
  validateMove(sourcePath: string, targetPath: string): ValidationResult {
    const sourceRepo = this.getRepositoryForPath(sourcePath);
    const targetRepo = this.getRepositoryForPath(targetPath);
    
    // Same repository - always allowed
    if (sourceRepo === targetRepo) {
      return { valid: true };
    }
    
    // Root to sub-repository - allowed for distribution
    if (sourceRepo === 'root' && targetRepo !== 'root') {
      return { valid: true, type: 'distribution' };
    }
    
    // Sub to root - NEVER allowed
    if (sourceRepo !== 'root' && targetRepo === 'root') {
      return { 
        valid: false, 
        reason: 'Cannot move files from sub-repository to root',
        violation: 'sub-to-root'
      };
    }
    
    // Sub to sub - NEVER allowed
    if (sourceRepo !== 'root' && targetRepo !== 'root' && sourceRepo !== targetRepo) {
      return { 
        valid: false, 
        reason: `Cannot move files between sub-repositories (${sourceRepo} → ${targetRepo})`,
        violation: 'sub-to-sub'
      };
    }
    
    return { valid: false, reason: 'Unknown boundary violation' };
  }
  
  private getRepositoryForPath(filePath: string): string {
    // Check if file is within any sub-repository
    for (const [repoPath, repo] of this.repositoryMap) {
      if (filePath.startsWith(repoPath + path.sep) || filePath === repoPath) {
        return repo.name;
      }
    }
    
    // File is at root
    return 'root';
  }
  
  enforceBeforeOperation(operation: FileOperation): void {
    if (operation.type === 'move' || operation.type === 'distribute') {
      const validation = this.validateMove(operation.source, operation.target);
      if (!validation.valid) {
        throw new BoundaryViolationError(
          validation.reason!,
          validation.violation
        );
      }
    }
  }
}

interface ValidationResult {
  valid: boolean;
  type?: 'distribution' | 'internal-move';
  reason?: string;
  violation?: 'sub-to-sub' | 'sub-to-root' | 'other';
}

class BoundaryViolationError extends Error {
  constructor(
    message: string, 
    public violation?: string
  ) {
    super(message);
    this.name = 'BoundaryViolationError';
  }
}
```

### 6.3 Pre-Operation Boundary Checks

```typescript
async function validateOperationPlan(
  plan: DistributionPlan | CleanupPlan,
  validator: BoundaryValidator
): Promise<ValidationReport> {
  const violations: BoundaryViolation[] = [];
  
  // Check all file operations
  for (const operation of plan.operations) {
    try {
      validator.enforceBeforeOperation(operation);
    } catch (error) {
      if (error instanceof BoundaryViolationError) {
        violations.push({
          operation,
          error: error.message,
          violation: error.violation
        });
      } else {
        throw error;
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    checkedOperations: plan.operations.length
  };
}
```

---

## 7. Monorepo Structure Detection

### 7.1 Common Monorepo Patterns

```typescript
interface MonorepoPattern {
  name: string;
  indicators: string[];      // Files that indicate this pattern
  subRepoGlobs: string[];    // Where to look for sub-repos
  workspaceConfig?: string;  // Workspace configuration file
}

const monorepoPatterns: MonorepoPattern[] = [
  {
    name: 'lerna',
    indicators: ['lerna.json'],
    subRepoGlobs: ['packages/*'],
    workspaceConfig: 'lerna.json'
  },
  {
    name: 'pnpm-workspace',
    indicators: ['pnpm-workspace.yaml'],
    subRepoGlobs: [], // Read from config
    workspaceConfig: 'pnpm-workspace.yaml'
  },
  {
    name: 'yarn-workspace',
    indicators: ['package.json'],
    subRepoGlobs: [], // Read from package.json workspaces
    workspaceConfig: 'package.json'
  },
  {
    name: 'nx',
    indicators: ['nx.json', 'workspace.json'],
    subRepoGlobs: ['apps/*', 'libs/*'],
    workspaceConfig: 'nx.json'
  },
  {
    name: 'turborepo',
    indicators: ['turbo.json'],
    subRepoGlobs: ['apps/*', 'packages/*'],
    workspaceConfig: 'turbo.json'
  }
];
```

### 7.2 Workspace Configuration Parsing

```typescript
async function detectMonorepoTool(repoPath: string): Promise<MonorepoPattern | undefined> {
  for (const pattern of monorepoPatterns) {
    for (const indicator of pattern.indicators) {
      if (await fs.pathExists(path.join(repoPath, indicator))) {
        return pattern;
      }
    }
  }
  return undefined;
}

async function getWorkspacePackages(
  repoPath: string, 
  pattern: MonorepoPattern
): Promise<string[]> {
  if (!pattern.workspaceConfig) {
    return [];
  }
  
  const configPath = path.join(repoPath, pattern.workspaceConfig);
  const packages: string[] = [];
  
  switch (pattern.name) {
    case 'lerna':
      const lernaConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return lernaConfig.packages || ['packages/*'];
      
    case 'pnpm-workspace':
      const pnpmConfig = await readYaml(configPath);
      return pnpmConfig.packages || [];
      
    case 'yarn-workspace':
    case 'npm-workspace':
      const pkgJson = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return pkgJson.workspaces || [];
      
    case 'nx':
      // Nx uses conventional directories
      return ['apps/*', 'libs/*'];
      
    case 'turborepo':
      // Turborepo uses conventional directories
      return ['apps/*', 'packages/*'];
  }
  
  return [];
}
```

---

## 8. Output Structures

### 8.1 Repository Tree Output

```typescript
interface RepositoryTree {
  // Metadata
  detectedAt: string;
  workingDirectory: string;
  
  // Structure
  isMonorepo: boolean;
  monorepoTool?: string;
  
  // Repositories
  rootRepo?: Repository;
  subRepos: Repository[];
  totalRepos: number;
  
  // Boundaries
  gitBoundaries: string[];
  
  // Status
  allGitClean: boolean;
  hasUncommittedChanges: boolean;
}

function displayRepositoryTree(tree: RepositoryTree): string {
  const lines: string[] = [];
  
  lines.push(chalk.bold('Repository Structure:'));
  lines.push('');
  
  if (!tree.isMonorepo) {
    lines.push('  Type: Single Repository');
    if (tree.rootRepo) {
      lines.push(`  Technologies: ${tree.rootRepo.technologies.map(t => t.name).join(', ')}`);
      lines.push(`  Build: ${tree.rootRepo.buildCommand || 'Not detected'}`);
    }
  } else {
    lines.push('  Type: Monorepo');
    if (tree.monorepoTool) {
      lines.push(`  Tool: ${tree.monorepoTool}`);
    }
    lines.push(`  Sub-repositories: ${tree.subRepos.length}`);
    lines.push('');
    
    for (const repo of tree.subRepos) {
      lines.push(`  📦 ${chalk.cyan(repo.name)}`);
      lines.push(`     Path: ${path.relative(tree.workingDirectory, repo.path)}`);
      lines.push(`     Tech: ${repo.technologies.map(t => t.name).join(', ') || 'Unknown'}`);
      if (repo.buildCommand) {
        lines.push(`     Build: ${repo.buildCommand}`);
      }
      lines.push('');
    }
  }
  
  if (tree.hasUncommittedChanges) {
    lines.push(chalk.yellow('  ⚠️  Uncommitted changes detected'));
  }
  
  return lines.join('\n');
}
```

---

## 9. Error Handling

### 9.1 Git Detection Errors

```typescript
class GitDetectionError extends Error {
  constructor(
    message: string,
    public code: 'GIT_NOT_FOUND' | 'GIT_CORRUPTED' | 'PERMISSION_DENIED'
  ) {
    super(message);
    this.name = 'GitDetectionError';
  }
}

async function detectWithErrorHandling(workingDir: string): Promise<GitDetectionResult> {
  try {
    return await detectGitRepositories(workingDir);
  } catch (error) {
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new GitDetectionError(
        'Permission denied while scanning for git repositories',
        'PERMISSION_DENIED'
      );
    }
    throw error;
  }
}
```

### 9.2 Boundary Violation Handling

```typescript
function handleBoundaryViolation(error: BoundaryViolationError): never {
  console.error(chalk.red('❌ Git Boundary Violation'));
  console.error('');
  console.error(error.message);
  console.error('');
  console.error(chalk.dim('This operation would violate git repository boundaries.'));
  console.error(chalk.dim('UnVibe enforces strict boundary protection to prevent data corruption.'));
  
  process.exit(3);
}
```

---

## 10. Testing Requirements

### 10.1 Test Cases

```typescript
describe('Git Detection', () => {
  test('detects single repository', async () => {
    const result = await detectGitRepositories(fixtures.singleRepo);
    expect(result.repositoryType).toBe('single');
    expect(result.subRepos).toHaveLength(0);
  });
  
  test('detects monorepo structure', async () => {
    const result = await detectGitRepositories(fixtures.monorepo);
    expect(result.repositoryType).toBe('monorepo');
    expect(result.subRepos.length).toBeGreaterThan(1);
  });
  
  test('handles no git repositories', async () => {
    const result = await detectGitRepositories(fixtures.noGit);
    expect(result.repositoryType).toBe('none');
    expect(result.hasGit).toBe(false);
  });
  
  test('detects git submodules', async () => {
    const result = await detectGitRepositories(fixtures.withSubmodules);
    const submoduleRepo = result.subRepos.find(r => r.isSubmodule);
    expect(submoduleRepo).toBeDefined();
  });
});

describe('Boundary Enforcement', () => {
  test('allows root to sub-repo moves', () => {
    const validator = new BoundaryValidator(repoTree);
    const result = validator.validateMove('/root/file.js', '/api/file.js');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('distribution');
  });
  
  test('prevents sub to root moves', () => {
    const validator = new BoundaryValidator(repoTree);
    const result = validator.validateMove('/api/file.js', '/root/file.js');
    expect(result.valid).toBe(false);
    expect(result.violation).toBe('sub-to-root');
  });
  
  test('prevents sub to sub moves', () => {
    const validator = new BoundaryValidator(repoTree);
    const result = validator.validateMove('/api/file.js', '/web/file.js');
    expect(result.valid).toBe(false);
    expect(result.violation).toBe('sub-to-sub');
  });
});
```

### 10.2 Test Fixtures

Create test fixtures with various repository structures:
- Single repository
- Simple monorepo (2 sub-repos)
- Complex monorepo (5+ sub-repos)
- Nested monorepo
- Git submodules
- No git
- Corrupted git

---

## 11. Performance Considerations

### 11.1 Optimization Strategies

- **Parallel git operations**: Process sub-repos in parallel
- **Cache git status**: Store git status for repeated queries
- **Lazy technology detection**: Only detect when needed
- **Minimal git calls**: Batch git operations where possible

### 11.2 Performance Targets

- Single repo detection: <100ms
- Monorepo with 10 sub-repos: <2 seconds
- Technology detection per repo: <500ms

---

**Document Status:** Complete  
**Implementation Priority:** Phase 2 (Week 3)  
**Dependencies:** None

