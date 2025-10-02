# Interface Segregation Principle (ISP) Design

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Design Document

---

## 1. Overview

This document defines the interface architecture for UnVibe following the Interface Segregation Principle (ISP): **"No client should be forced to depend on methods it does not use."**

We break down large interfaces into smaller, focused, role-specific interfaces that are easier to test, mock, and implement.

---

## 2. ISP Principles Applied

### 2.1 Core Tenets

1. **Small, Focused Interfaces** - Each interface has a single, clear responsibility
2. **Client-Specific** - Interfaces defined by client needs, not implementation capabilities
3. **Composable** - Complex behavior through interface composition
4. **Testable** - Easy to mock and test in isolation
5. **Evolvable** - New features don't break existing interfaces

### 2.2 Anti-Pattern to Avoid

```typescript
// ❌ BAD: Fat interface violates ISP
interface FileOperationService {
  // Git operations
  detectGitRepositories(): Promise<RepositoryTree>;
  isGitTracked(file: string): Promise<boolean>;
  
  // File distribution
  distributeFile(file: string, target: string): Promise<void>;
  analyzeFileContent(file: string): Promise<Analysis>;
  
  // Backup operations
  createBackup(files: string[]): Promise<string>;
  restoreBackup(id: string): Promise<void>;
  
  // Build validation
  validateBuild(repo: string): Promise<boolean>;
  
  // Classification
  classifyScript(file: string): Promise<Classification>;
}

// Problems:
// 1. Clients that only need git detection must depend on all methods
// 2. Hard to mock for testing
// 3. Changes to any feature affect all clients
// 4. Violates Single Responsibility Principle
```

```typescript
// ✅ GOOD: Segregated interfaces
interface GitRepositoryDetector {
  detectRepositories(dir: string): Promise<RepositoryTree>;
}

interface GitFileTracker {
  isTracked(file: string, repo: string): Promise<boolean>;
  getStatus(file: string, repo: string): Promise<GitFileStatus>;
}

interface FileDistributor {
  distributeFile(file: string, target: string): Promise<void>;
}

interface FileContentAnalyzer {
  analyze(file: string): Promise<ContentAnalysis>;
}

interface BackupCreator {
  createBackup(files: string[]): Promise<string>;
}

interface BackupRestorer {
  restore(backupId: string, options?: RestoreOptions): Promise<void>;
}

// Benefits:
// 1. Clients depend only on what they need
// 2. Easy to mock specific capabilities
// 3. Changes are isolated
// 4. Clear responsibilities
```

---

## 3. Core Interface Hierarchies

### 3.1 Git Detection Interfaces

```typescript
/**
 * Detects git repositories in a directory
 * Used by: Scanner, Repository Analyzer
 */
interface GitRepositoryDetector {
  detectRepositories(workingDir: string): Promise<RepositoryTree>;
}

/**
 * Checks if a path contains a git repository
 * Used by: File processors, Boundary validators
 */
interface GitPresenceChecker {
  hasGit(path: string): Promise<boolean>;
  getGitPath(path: string): Promise<string | null>;
}

/**
 * Detects git submodules
 * Used by: Repository Analyzer
 */
interface GitSubmoduleDetector {
  isSubmodule(gitPath: string): Promise<boolean>;
  resolveSubmoduleGitDir(gitFile: string): Promise<string>;
}

/**
 * Detects monorepo tools and configurations
 * Used by: Repository Analyzer
 */
interface MonorepoToolDetector {
  detectTool(repoPath: string): Promise<MonorepoPattern | null>;
  getWorkspacePackages(repoPath: string, tool: MonorepoPattern): Promise<string[]>;
}

/**
 * Tracks git status of files
 * Used by: Classification, Staleness detection
 */
interface GitFileTracker {
  isTracked(filePath: string, repoPath: string): Promise<boolean>;
  getFileStatus(filePath: string, repoPath: string): Promise<GitFileStatus>;
  getLastModified(filePath: string, repoPath: string): Promise<Date>;
}

/**
 * Extracts git metadata
 * Used by: Repository Analyzer, Backup system
 */
interface GitMetadataExtractor {
  getCurrentBranch(repoPath: string): Promise<string>;
  getCurrentCommit(repoPath: string): Promise<string>;
  getRemoteUrl(repoPath: string): Promise<string | null>;
  isClean(repoPath: string): Promise<boolean>;
}
```

### 3.2 File Distribution Interfaces

```typescript
/**
 * Analyzes files to determine allocation
 * Used by: Distribution Engine
 */
interface FileAllocator {
  analyzeFile(file: FileEntry, context: AllocationContext): Promise<AllocationDecision>;
}

/**
 * Matches files against explicit patterns
 * Used by: Distribution Engine (first tier)
 */
interface PatternMatcher {
  match(fileName: string, patterns: ExplicitPattern[]): AllocationDecision | null;
}

/**
 * Performs AI-powered file analysis
 * Used by: Distribution Engine (second tier)
 */
interface AIFileAnalyzer {
  analyze(request: AllocationRequest): Promise<AllocationResponse>;
}

/**
 * Performs heuristic file analysis
 * Used by: Distribution Engine (fallback)
 */
interface HeuristicFileAnalyzer {
  analyze(file: FileEntry, repos: Repository[]): AllocationDecision | null;
}

/**
 * Resolves conflicts when distributing files
 * Used by: Distribution Executor
 */
interface ConflictResolver {
  detectConflict(source: string, target: string): Promise<FileConflict | null>;
  resolve(conflict: FileConflict, mode: 'interactive' | 'yolo'): Promise<ConflictResolution>;
}

/**
 * Suggests subdirectories for files
 * Used by: File Allocators
 */
interface SubdirectorySuggester {
  suggest(file: FileEntry, targetRepo: Repository): string;
}

/**
 * Checks if files are protected
 * Used by: Safety Guard
 */
interface ProtectedFileChecker {
  isProtected(filePath: string): boolean;
  getProtectedPatterns(): string[];
}
```

### 3.3 AI Integration Interfaces

```typescript
/**
 * Base interface for all AI providers
 * Implemented by: AnthropicProvider, OpenAIProvider, LocalLLMProvider
 */
interface AIProvider {
  readonly name: string;
  readonly apiKey: string;
  
  analyzeFileAllocation(request: AllocationRequest): Promise<AllocationResponse>;
  classifyScript(request: ClassificationRequest): Promise<ClassificationResponse>;
  validateApiKey(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  getRateLimits(): RateLimitInfo;
}

/**
 * Manages API keys securely
 * Used by: Config commands, AI providers
 */
interface APIKeyManager {
  getApiKey(provider: string): Promise<string | undefined>;
  setApiKey(provider: string, key: string): Promise<void>;
  removeApiKey(provider: string): Promise<void>;
  maskApiKey(key: string): string;
}

/**
 * Caches AI responses
 * Used by: AI providers
 */
interface AIResponseCache {
  get(type: string, fileHash: string, contextHash: string): Promise<CachedResponse | null>;
  set(type: string, fileHash: string, contextHash: string, response: any, provider: string): Promise<void>;
  invalidate(fileHash: string): Promise<void>;
  clear(): Promise<void>;
  stats(): Promise<CacheStats>;
}

/**
 * Recommends AI setup to users
 * Used by: CLI commands
 */
interface AIRecommender {
  checkFirstRun(): Promise<AIRecommendation | null>;
  checkStatus(): Promise<AIRecommendation | null>;
  checkBeforeScan(): Promise<AIRecommendation | null>;
  checkBeforeDistribution(plan: DistributionPlan): Promise<AIRecommendation | null>;
  checkYoloMode(): Promise<AIRecommendation | null>;
  checkPostOperation(results: OperationResults): Promise<AIRecommendation | null>;
}
```

### 3.4 Classification Interfaces

```typescript
/**
 * Classifies scripts and files
 * Used by: Cleanup workflow
 */
interface ScriptClassifier {
  classify(input: ClassificationInput): Promise<ScriptClassification>;
}

/**
 * Detects staleness of files
 * Used by: Script Classifier
 */
interface StalenessDetector {
  detectStaleness(fileStats: GitFileStatus): 'fresh' | 'aging' | 'stale';
}

/**
 * Detects AI-generated content
 * Used by: Script Classifier
 */
interface AIContentDetector {
  detect(file: FileEntry): boolean;
  hasAISignature(content: string): boolean;
}

/**
 * Finds references to files
 * Used by: Script Classifier, Critical path detection
 */
interface FileReferenceDetector {
  findReferences(file: FileEntry, repo: Repository): Promise<FileReference[]>;
  isReferencedInBuildConfig(file: FileEntry, repo: Repository): Promise<boolean>;
}

/**
 * Detects critical files
 * Used by: Script Classifier, Safety Guard
 */
interface CriticalFileDetector {
  isCritical(file: FileEntry, repo: Repository): Promise<boolean>;
  isEntryPoint(file: FileEntry, repo: Repository): boolean;
  isReferencedInCI(file: FileEntry, repo: Repository): Promise<boolean>;
}
```

### 3.5 Build Validation Interfaces

```typescript
/**
 * Validates builds for a specific technology
 * Implemented by: NodeJSValidator, PythonValidator, etc.
 */
interface BuildValidator {
  readonly technology: string;
  
  detect(repo: Repository): boolean;
  getBuildCommand(repo: Repository): string;
  validate(repo: Repository): Promise<BuildResult>;
}

/**
 * Orchestrates build validation across technologies
 * Used by: Operation executors
 */
interface BuildValidationOrchestrator {
  validateRepository(repo: Repository, stage: ValidationStage): Promise<ValidationReport>;
  validateAll(repos: Repository[], stage: ValidationStage): Promise<Map<string, ValidationReport>>;
}

/**
 * Detects critical paths in builds
 * Used by: Safety Guard
 */
interface CriticalPathDetector {
  detectCriticalPaths(repo: Repository): Promise<Set<string>>;
}

/**
 * Detects technology stack
 * Used by: Repository Analyzer, Build Validators
 */
interface TechnologyDetector {
  detect(repoPath: string): Promise<Technology[]>;
  detectPackageManager(repoPath: string): Promise<PackageManager | undefined>;
  detectBuildCommand(repoPath: string): Promise<string | undefined>;
}
```

### 3.6 Backup & Restore Interfaces

```typescript
/**
 * Creates backups
 * Used by: Operation executors
 */
interface BackupCreator {
  createBackup(
    operationType: OperationType,
    mode: OperationMode,
    context: BackupContext
  ): Promise<string>;
  
  backupFile(backupId: string, filePath: string, operation: FileOperationType): Promise<void>;
  backupFiles(backupId: string, files: FileOperation[]): Promise<void>;
}

/**
 * Restores from backups
 * Used by: Restore command, Auto-restore
 */
interface BackupRestorer {
  restore(backupId: string, options?: RestoreOptions): Promise<RestoreResult>;
  listBackups(): Promise<BackupInfo[]>;
  getLastBackup(): Promise<string | null>;
}

/**
 * Manages backup lifecycle
 * Used by: Backup commands
 */
interface BackupManager extends BackupCreator, BackupRestorer {
  pruneOldBackups(keepCount: number): Promise<number>;
  getBackupSize(backupId: string): Promise<number>;
  validateBackup(backupId: string): Promise<boolean>;
}

/**
 * Reads backup manifests
 * Used by: Restore system, Backup browser
 */
interface BackupManifestReader {
  loadManifest(backupId: string): Promise<BackupManifest>;
  getBackupEntries(backupId: string): Promise<BackupEntry[]>;
  getBackupMetadata(backupId: string): Promise<BackupMetadata>;
}

/**
 * Computes file hashes
 * Used by: Backup system
 */
interface FileHasher {
  hashFile(filePath: string): Promise<string>;
  hashContent(content: string | Buffer): string;
  verifyHash(filePath: string, expectedHash: string): Promise<boolean>;
}
```

### 3.7 Safety Interfaces

```typescript
/**
 * Validates git boundary rules
 * Used by: Safety Guard, Operation validators
 */
interface BoundaryValidator {
  validateMove(sourcePath: string, targetPath: string): ValidationResult;
  enforceBeforeOperation(operation: FileOperation): void;
}

/**
 * Checks safety of operations
 * Used by: Operation executors
 */
interface SafetyChecker {
  checkOperation(operation: FileOperation): Promise<SafetyCheckResult>;
  checkOperations(operations: FileOperation[]): Promise<SafetyCheckResult[]>;
}

/**
 * Guards against unsafe operations
 * Used by: All operation executors
 */
interface SafetyGuard {
  isProtected(filePath: string): boolean;
  isCriticalPath(filePath: string): boolean;
  canDelete(filePath: string): Promise<boolean>;
  canMove(sourcePath: string, targetPath: string): Promise<boolean>;
}

/**
 * Provides auto-restore capability
 * Used by: YOLO mode, Build validation
 */
interface AutoRestoreSystem {
  executeWithAutoRestore(
    operation: () => Promise<void>,
    repos: Repository[],
    mode: OperationMode
  ): Promise<ExecutionResult>;
}
```

### 3.8 CLI Interfaces

```typescript
/**
 * Displays progress indicators
 * Used by: All CLI commands
 */
interface ProgressDisplay {
  startSpinner(message: string): void;
  stopSpinner(success: boolean, message?: string): void;
  startProgress(total: number, message: string): void;
  updateProgress(current: number): void;
  stopProgress(): void;
}

/**
 * Formats output
 * Used by: All CLI commands
 */
interface OutputFormatter {
  formatTable(data: TableData): string;
  formatList(items: string[]): string;
  formatTree(tree: any): string;
  formatError(error: Error): string;
  formatSuccess(message: string): string;
}

/**
 * Handles user prompts
 * Used by: Interactive mode
 */
interface UserPrompter {
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
  select(message: string, choices: Choice[]): Promise<string>;
  input(message: string, defaultValue?: string): Promise<string>;
  multiSelect(message: string, choices: Choice[]): Promise<string[]>;
}

/**
 * Provides contextual help
 * Used by: Main CLI
 */
interface ContextualHelpProvider {
  getHelpForCurrentState(state: ApplicationState): string;
  getSuggestedNextSteps(state: ApplicationState): string[];
  getQuickStart(): string;
}
```

---

## 4. Interface Composition

### 4.1 Composing Complex Behaviors

Instead of fat interfaces, compose smaller ones:

```typescript
/**
 * Distribution Engine composes multiple focused interfaces
 */
class DistributionEngine {
  constructor(
    private patternMatcher: PatternMatcher,
    private aiAnalyzer: AIFileAnalyzer,
    private heuristicAnalyzer: HeuristicFileAnalyzer,
    private conflictResolver: ConflictResolver,
    private subdirSuggester: SubdirectorySuggester
  ) {}
  
  async distributeFiles(files: FileEntry[]): Promise<DistributionResult> {
    const decisions: AllocationDecision[] = [];
    
    for (const file of files) {
      // Try pattern matching first
      let decision = this.patternMatcher.match(file.path, this.config.patterns);
      
      // Fall back to AI
      if (!decision && this.aiAnalyzer) {
        decision = await this.aiAnalyzer.analyze(createRequest(file));
      }
      
      // Fall back to heuristics
      if (!decision) {
        decision = this.heuristicAnalyzer.analyze(file, this.repos);
      }
      
      decisions.push(decision);
    }
    
    return { decisions };
  }
}

// Easy to test with mocks
describe('DistributionEngine', () => {
  test('uses pattern matcher first', async () => {
    const mockPatternMatcher = createMock<PatternMatcher>({
      match: jest.fn().mockReturnValue({ targetRepo: './api', confidence: 0.95 })
    });
    
    const engine = new DistributionEngine(
      mockPatternMatcher,
      mockAI,
      mockHeuristic,
      mockConflict,
      mockSubdir
    );
    
    await engine.distributeFiles([testFile]);
    
    expect(mockPatternMatcher.match).toHaveBeenCalled();
    expect(mockAI.analyze).not.toHaveBeenCalled(); // Didn't need fallback
  });
});
```

### 4.2 Service Locator Pattern (Optional)

For complex scenarios, use dependency injection:

```typescript
/**
 * Service container for interface implementations
 */
class ServiceContainer {
  private services = new Map<string, any>();
  
  register<T>(key: string, implementation: T): void {
    this.services.set(key, implementation);
  }
  
  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not registered: ${key}`);
    }
    return service;
  }
}

// Registration
const container = new ServiceContainer();
container.register<GitRepositoryDetector>('gitDetector', new GitDetector());
container.register<FileAllocator>('fileAllocator', new FileAllocatorImpl());
container.register<BackupCreator>('backupCreator', new BackupManager());

// Usage
class ScanCommand {
  constructor(private container: ServiceContainer) {}
  
  async execute(): Promise<void> {
    const detector = this.container.resolve<GitRepositoryDetector>('gitDetector');
    const repoTree = await detector.detectRepositories(process.cwd());
    // ...
  }
}

// Easy to test with mock container
test('scan command', async () => {
  const mockContainer = new ServiceContainer();
  mockContainer.register<GitRepositoryDetector>('gitDetector', mockDetector);
  
  const command = new ScanCommand(mockContainer);
  await command.execute();
  
  expect(mockDetector.detectRepositories).toHaveBeenCalled();
});
```

---

## 5. Interface Testing Strategy

### 5.1 Contract Tests for Interfaces

Every interface MUST have a contract test suite:

```typescript
/**
 * Contract tests for GitRepositoryDetector interface
 * ALL implementations must pass these tests
 */
export function testGitRepositoryDetectorContract(
  createDetector: () => GitRepositoryDetector
) {
  describe('GitRepositoryDetector Contract', () => {
    let detector: GitRepositoryDetector;
    
    beforeEach(() => {
      detector = createDetector();
    });
    
    describe('detectRepositories', () => {
      test('should return RepositoryTree', async () => {
        const fixture = await createTestRepo({ type: 'single' });
        const result = await detector.detectRepositories(fixture.path);
        
        expect(result).toHaveProperty('repositoryType');
        expect(result).toHaveProperty('hasGit');
        expect(result).toHaveProperty('subRepos');
        expect(Array.isArray(result.subRepos)).toBe(true);
        
        await fixture.cleanup();
      });
      
      test('should detect single repository', async () => {
        const fixture = await createTestRepo({ type: 'single' });
        const result = await detector.detectRepositories(fixture.path);
        
        expect(result.repositoryType).toBe('single');
        expect(result.hasGit).toBe(true);
        expect(result.subRepos).toHaveLength(0);
        
        await fixture.cleanup();
      });
      
      test('should detect monorepo', async () => {
        const fixture = await createTestRepo({ 
          type: 'monorepo',
          subRepos: ['api', 'web']
        });
        const result = await detector.detectRepositories(fixture.path);
        
        expect(result.repositoryType).toBe('monorepo');
        expect(result.subRepos.length).toBeGreaterThan(0);
        
        await fixture.cleanup();
      });
      
      test('should handle no git directory', async () => {
        const fixture = await createTestRepo({ type: 'none' });
        const result = await detector.detectRepositories(fixture.path);
        
        expect(result.repositoryType).toBe('none');
        expect(result.hasGit).toBe(false);
        
        await fixture.cleanup();
      });
      
      test('should throw on invalid directory', async () => {
        await expect(
          detector.detectRepositories('/nonexistent/path')
        ).rejects.toThrow();
      });
      
      test('should handle permission errors gracefully', async () => {
        const fixture = await createTestRepo({ type: 'single', permissions: 0o000 });
        
        await expect(
          detector.detectRepositories(fixture.path)
        ).rejects.toThrow(/permission/i);
        
        await fixture.cleanup();
      });
    });
  });
}

// Use in implementation tests
describe('GitDetector', () => {
  testGitRepositoryDetectorContract(() => new GitDetector());
  
  // Implementation-specific tests
  describe('GitDetector specific behavior', () => {
    // ...
  });
});
```

### 5.2 Mock Implementations

Provide mock implementations for testing:

```typescript
/**
 * Mock implementation of GitRepositoryDetector for testing
 */
export class MockGitRepositoryDetector implements GitRepositoryDetector {
  public detectRepositoriesResult: RepositoryTree = {
    repositoryType: 'single',
    hasGit: true,
    subRepos: []
  };
  
  public detectRepositoriesCalls: string[] = [];
  
  async detectRepositories(workingDir: string): Promise<RepositoryTree> {
    this.detectRepositoriesCalls.push(workingDir);
    return this.detectRepositoriesResult;
  }
  
  reset(): void {
    this.detectRepositoriesCalls = [];
  }
}

// Usage in tests
test('scanner uses detector', async () => {
  const mockDetector = new MockGitRepositoryDetector();
  mockDetector.detectRepositoriesResult = {
    repositoryType: 'monorepo',
    hasGit: true,
    subRepos: [/* ... */]
  };
  
  const scanner = new Scanner(mockDetector);
  await scanner.scan('/test/path');
  
  expect(mockDetector.detectRepositoriesCalls).toContain('/test/path');
});
```

---

## 6. Interface Documentation

### 6.1 Documentation Standards

Every interface MUST include:

```typescript
/**
 * Detects git repositories in a directory tree.
 * 
 * This interface is responsible for identifying git repositories,
 * determining if the structure is a monorepo, and analyzing the
 * repository hierarchy.
 * 
 * ## Responsibilities
 * - Find all .git directories/files
 * - Determine repository type (single, monorepo, none)
 * - Build repository tree structure
 * 
 * ## Usage
 * ```typescript
 * const detector: GitRepositoryDetector = new GitDetector();
 * const tree = await detector.detectRepositories('/path/to/repo');
 * 
 * if (tree.repositoryType === 'monorepo') {
 *   console.log(`Found ${tree.subRepos.length} sub-repositories`);
 * }
 * ```
 * 
 * ## Implementation Notes
 * - Must handle git submodules
 * - Must detect corrupted/incomplete git directories
 * - Should be performant for large directory trees
 * - Must not follow symlinks outside the working directory
 * 
 * ## Testing
 * Implementations must pass the contract tests defined in
 * `testGitRepositoryDetectorContract()`.
 * 
 * @see GitDetector for the primary implementation
 * @see testGitRepositoryDetectorContract for contract tests
 */
interface GitRepositoryDetector {
  /**
   * Detects git repositories in the specified directory.
   * 
   * Scans the directory tree to find all git repositories,
   * determines the overall structure type, and builds a
   * complete repository tree.
   * 
   * @param workingDir - Absolute path to the directory to scan
   * @returns Promise resolving to the repository tree
   * @throws {Error} If directory doesn't exist
   * @throws {Error} If permission denied
   * 
   * @example
   * ```typescript
   * const tree = await detector.detectRepositories('/home/user/myrepo');
   * console.log(tree.repositoryType); // 'single' | 'monorepo' | 'none'
   * ```
   */
  detectRepositories(workingDir: string): Promise<RepositoryTree>;
}
```

---

## 7. Interface Evolution

### 7.1 Versioning Interfaces

When interfaces must change:

```typescript
/**
 * V1 interface (current)
 */
interface GitRepositoryDetector {
  detectRepositories(workingDir: string): Promise<RepositoryTree>;
}

/**
 * V2 interface (new feature needed)
 * Extends V1 for backward compatibility
 */
interface GitRepositoryDetectorV2 extends GitRepositoryDetector {
  detectRepositories(workingDir: string, options?: DetectionOptions): Promise<RepositoryTree>;
  detectRepositoriesWithCache(workingDir: string): Promise<RepositoryTree>;
}

// Implementations can gradually adopt V2
class GitDetector implements GitRepositoryDetectorV2 {
  async detectRepositories(
    workingDir: string,
    options?: DetectionOptions
  ): Promise<RepositoryTree> {
    // New implementation with options support
  }
  
  async detectRepositoriesWithCache(workingDir: string): Promise<RepositoryTree> {
    // New caching feature
  }
}

// Old code still works with V1 interface
function oldFunction(detector: GitRepositoryDetector) {
  return detector.detectRepositories('/path');
}

// New code can use V2 features
function newFunction(detector: GitRepositoryDetectorV2) {
  return detector.detectRepositoriesWithCache('/path');
}
```

### 7.2 Deprecation Strategy

```typescript
/**
 * @deprecated Use GitRepositoryDetectorV2 instead
 * This interface will be removed in v2.0
 */
interface GitRepositoryDetector {
  /**
   * @deprecated Use detectRepositories(workingDir, options) instead
   */
  detectRepositories(workingDir: string): Promise<RepositoryTree>;
}
```

---

## 8. Benefits Summary

### 8.1 Testability

```typescript
// Easy to test with focused mocks
test('distribution uses pattern matcher', () => {
  const mockMatcher = createMock<PatternMatcher>();
  const engine = new DistributionEngine(mockMatcher, ...);
  
  // Only need to mock PatternMatcher, not entire system
});
```

### 8.2 Maintainability

```typescript
// Changes to AI integration don't affect git detection
interface AIFileAnalyzer {
  analyze(request: AllocationRequest): Promise<AllocationResponse>;
}

// Can swap implementations without changing clients
class AnthropicAnalyzer implements AIFileAnalyzer { }
class OpenAIAnalyzer implements AIFileAnalyzer { }
class LocalLLMAnalyzer implements AIFileAnalyzer { }
```

### 8.3 Flexibility

```typescript
// Different implementations for different contexts
interface BackupCreator {
  createBackup(...): Promise<string>;
}

class FileSystemBackupCreator implements BackupCreator { }
class S3BackupCreator implements BackupCreator { } // Future
class DatabaseBackupCreator implements BackupCreator { } // Future
```

---

**Status:** Complete - Ready for Implementation  
**Next:** Detailed Module Design with Test Contracts

