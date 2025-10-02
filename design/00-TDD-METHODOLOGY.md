# Test-Driven Development Methodology

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Design Document

---

## 1. Overview

This document defines the comprehensive TDD methodology for UnVibe, ensuring every feature is test-driven from inception, with foolproof testing that guarantees the application works out of the box.

---

## 2. TDD Philosophy

### 2.1 Core Principles

```
RED → GREEN → REFACTOR

1. RED:   Write a failing test first
2. GREEN: Write minimum code to pass
3. REFACTOR: Improve code while keeping tests green
4. REPEAT: For every feature, no exceptions
```

### 2.2 Test-First Mandate

**RULE**: No production code is written without a failing test first.

```typescript
// ❌ WRONG: Writing implementation first
function detectGitRepositories(dir: string) {
  // implementation...
}

// ✅ RIGHT: Write test first
describe('detectGitRepositories', () => {
  test('detects single repository', async () => {
    const fixture = await createTestRepo();
    const result = await detectGitRepositories(fixture.path);
    
    expect(result.repositoryType).toBe('single');
    expect(result.hasGit).toBe(true);
  });
});

// THEN implement to make test pass
```

---

## 3. Test Coverage Requirements

### 3.1 Coverage Targets

| Component | Minimum Coverage | Target Coverage | Priority |
|-----------|-----------------|-----------------|----------|
| **Safety Features** | 100% | 100% | Critical |
| **Backup/Restore** | 100% | 100% | Critical |
| **Git Detection** | 95% | 100% | High |
| **Distribution Engine** | 95% | 98% | High |
| **Classification** | 95% | 98% | High |
| **AI Integration** | 90% | 95% | Medium |
| **CLI Commands** | 85% | 90% | Medium |
| **Utilities** | 90% | 95% | Medium |
| **Overall** | 85% | 90% | Required |

### 3.2 Coverage Measurement

```bash
# Run tests with coverage
npm test -- --coverage

# Coverage gates (in vitest.config.ts)
export default {
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85,
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/**'
      ]
    }
  }
};
```

---

## 4. Test Pyramid Strategy

### 4.1 Test Distribution

```
                 /\
                /  \
               /E2E \        10% - End-to-End Tests
              /------\
             /        \
            /Integration\ 20% - Integration Tests
           /------------\
          /              \
         /   Unit Tests   \  70% - Unit Tests
        /------------------\
```

### 4.2 Test Type Definitions

#### Unit Tests (70%)
- **Purpose**: Test individual functions/methods in isolation
- **Speed**: Fast (<1ms per test)
- **Dependencies**: All mocked
- **Coverage**: Every public function

```typescript
// Example: Pure function unit test
describe('calculateConfidenceScore', () => {
  test('returns 1.0 for exact pattern match', () => {
    const score = calculateConfidenceScore({
      pattern: 'api-*',
      fileName: 'api-users.js',
      matchType: 'exact'
    });
    
    expect(score).toBe(1.0);
  });
  
  test('returns 0.8 for partial match', () => {
    const score = calculateConfidenceScore({
      pattern: 'api-*',
      fileName: 'users-api.js',
      matchType: 'partial'
    });
    
    expect(score).toBe(0.8);
  });
  
  test('returns 0 for no match', () => {
    const score = calculateConfidenceScore({
      pattern: 'api-*',
      fileName: 'web-users.js',
      matchType: 'none'
    });
    
    expect(score).toBe(0);
  });
});
```

#### Integration Tests (20%)
- **Purpose**: Test component interactions
- **Speed**: Medium (10-100ms per test)
- **Dependencies**: Partially mocked
- **Coverage**: Component boundaries

```typescript
// Example: Integration test
describe('DistributionEngine Integration', () => {
  test('uses AI when available, falls back to heuristics', async () => {
    const mockAI = createMockAIProvider();
    mockAI.analyzeFile.mockRejectedValueOnce(new Error('API error'));
    
    const engine = new DistributionEngine({
      aiProvider: mockAI,
      heuristicAnalyzer: new HeuristicAnalyzer()
    });
    
    const result = await engine.analyzeFile(testFile);
    
    // Should have tried AI first
    expect(mockAI.analyzeFile).toHaveBeenCalled();
    
    // Should have fallen back to heuristics
    expect(result.method).toBe('heuristic');
    expect(result.targetRepo).toBeDefined();
  });
});
```

#### End-to-End Tests (10%)
- **Purpose**: Test complete user workflows
- **Speed**: Slow (1-10s per test)
- **Dependencies**: Real implementations
- **Coverage**: Critical user paths

```typescript
// Example: E2E test
describe('Full Cleanup Workflow', () => {
  test('scans, distributes, and restores successfully', async () => {
    // Setup: Create test monorepo
    const testRepo = await createTestMonorepo({
      subRepos: ['api', 'web'],
      rootFiles: ['api-controller.js', 'web-component.tsx']
    });
    
    // Execute: Run full workflow
    await runCLI(['scan'], { cwd: testRepo.path });
    await runCLI(['distribute', '--auto-yes'], { cwd: testRepo.path });
    
    // Verify: Files distributed correctly
    expect(await fs.pathExists(
      path.join(testRepo.path, 'api/src/api-controller.js')
    )).toBe(true);
    
    expect(await fs.pathExists(
      path.join(testRepo.path, 'web/src/web-component.tsx')
    )).toBe(true);
    
    // Execute: Restore
    await runCLI(['restore', '--last', '--yes'], { cwd: testRepo.path });
    
    // Verify: Files restored to root
    expect(await fs.pathExists(
      path.join(testRepo.path, 'api-controller.js')
    )).toBe(true);
    
    // Cleanup
    await testRepo.cleanup();
  });
});
```

---

## 5. Test Organization

### 5.1 Directory Structure

```
tests/
├── unit/                          # Unit tests (70%)
│   ├── core/
│   │   ├── git/
│   │   │   ├── detector.test.ts
│   │   │   ├── boundary-validator.test.ts
│   │   │   └── technology-detector.test.ts
│   │   ├── distribution/
│   │   │   ├── explicit-matcher.test.ts
│   │   │   ├── heuristic-analyzer.test.ts
│   │   │   └── conflict-resolver.test.ts
│   │   └── classification/
│   │       ├── script-classifier.test.ts
│   │       └── ai-content-detector.test.ts
│   ├── ai/
│   │   ├── anthropic-provider.test.ts
│   │   ├── cache.test.ts
│   │   └── recommendation.test.ts
│   └── safety/
│       ├── backup-manager.test.ts
│       ├── restore-manager.test.ts
│       └── safety-guard.test.ts
│
├── integration/                   # Integration tests (20%)
│   ├── distribution-workflow.test.ts
│   ├── classification-workflow.test.ts
│   ├── backup-restore-workflow.test.ts
│   └── build-validation.test.ts
│
├── e2e/                          # End-to-end tests (10%)
│   ├── full-cleanup.test.ts
│   ├── yolo-mode.test.ts
│   ├── interactive-mode.test.ts
│   └── cli-commands.test.ts
│
├── fixtures/                     # Test fixtures
│   ├── repositories/
│   │   ├── single-repo/
│   │   ├── monorepo-simple/
│   │   ├── monorepo-complex/
│   │   └── edge-cases/
│   ├── files/
│   │   ├── scripts/
│   │   ├── documents/
│   │   └── code/
│   └── configs/
│       ├── valid-config.js
│       └── invalid-config.js
│
├── helpers/                      # Test utilities
│   ├── repo-builder.ts           # Build test repositories
│   ├── file-factory.ts           # Create test files
│   ├── mock-factory.ts           # Create mocks
│   ├── assertion-helpers.ts      # Custom assertions
│   └── cli-runner.ts             # CLI test runner
│
└── setup/                        # Test setup
    ├── global-setup.ts
    ├── global-teardown.ts
    └── test-environment.ts
```

### 5.2 Naming Conventions

```typescript
// File naming: <module>.test.ts or <module>.spec.ts
// Test suite: describe('<ModuleName>')
// Test case: test('<should do something when condition>')

describe('BackupManager', () => {
  describe('createBackup', () => {
    test('should create backup directory with timestamp', async () => {
      // Arrange
      const manager = new BackupManager();
      const repos = [testRepo];
      
      // Act
      const backupId = await manager.createBackup('cleanup', 'interactive', context);
      
      // Assert
      expect(backupId).toMatch(/^\d{4}-\d{2}-\d{2}T.*-cleanup$/);
      expect(await fs.pathExists(`.unvibe/backups/${backupId}`)).toBe(true);
    });
    
    test('should throw error when no write permissions', async () => {
      // Arrange
      const manager = new BackupManager();
      mockFs.writeFile.mockRejectedValue(new Error('EACCES'));
      
      // Act & Assert
      await expect(
        manager.createBackup('cleanup', 'interactive', context)
      ).rejects.toThrow('Permission denied');
    });
  });
});
```

---

## 6. TDD Workflow

### 6.1 Feature Development Cycle

```
1. DESIGN: Write interface/contract
   ├─ Define TypeScript interface
   ├─ Document expected behavior
   └─ Identify edge cases

2. TEST: Write failing tests
   ├─ Happy path test
   ├─ Edge case tests
   ├─ Error case tests
   └─ Run tests (all should fail)

3. IMPLEMENT: Write minimal code
   ├─ Make tests pass
   ├─ No extra features
   └─ Keep it simple

4. VERIFY: Run all tests
   ├─ New tests pass
   ├─ Old tests still pass
   └─ Coverage increases

5. REFACTOR: Improve code
   ├─ Remove duplication
   ├─ Improve readability
   ├─ Optimize if needed
   └─ Tests still pass

6. DOCUMENT: Update docs
   ├─ JSDoc comments
   ├─ README if needed
   └─ Design docs if changed

7. REPEAT: Next feature
```

### 6.2 Example TDD Session

```typescript
// STEP 1: DESIGN - Define interface
interface GitDetector {
  detectRepositories(workingDir: string): Promise<RepositoryTree>;
  isGitDirectory(path: string): Promise<boolean>;
  detectMonorepoTool(path: string): Promise<MonorepoPattern | undefined>;
}

// STEP 2: TEST - Write failing test
describe('GitDetector', () => {
  test('should detect single repository', async () => {
    // Arrange
    const fixture = await createTestRepo({
      type: 'single',
      hasGit: true
    });
    const detector = new GitDetector();
    
    // Act
    const result = await detector.detectRepositories(fixture.path);
    
    // Assert
    expect(result.repositoryType).toBe('single');
    expect(result.hasGit).toBe(true);
    expect(result.subRepos).toHaveLength(0);
    
    // Cleanup
    await fixture.cleanup();
  });
});

// Run test: ❌ FAILS (GitDetector not implemented)

// STEP 3: IMPLEMENT - Minimal code to pass
class GitDetector implements GitDetector {
  async detectRepositories(workingDir: string): Promise<RepositoryTree> {
    const gitDirs = await this.findGitDirectories(workingDir);
    
    if (gitDirs.length === 0) {
      return {
        repositoryType: 'none',
        hasGit: false,
        subRepos: []
      };
    }
    
    if (gitDirs.length === 1 && gitDirs[0] === path.join(workingDir, '.git')) {
      return {
        repositoryType: 'single',
        hasGit: true,
        subRepos: []
      };
    }
    
    return {
      repositoryType: 'monorepo',
      hasGit: true,
      subRepos: await this.analyzeSubRepos(gitDirs)
    };
  }
  
  private async findGitDirectories(workingDir: string): Promise<string[]> {
    // Minimal implementation
    return glob('.git', { cwd: workingDir, absolute: true });
  }
}

// Run test: ✅ PASSES

// STEP 4: VERIFY - Run all tests
// npm test -- git-detector.test.ts
// All tests pass ✅

// STEP 5: REFACTOR - Improve (if needed)
// Code is clean, no refactoring needed

// STEP 6: DOCUMENT
/**
 * Detects Git repositories in the working directory.
 * Supports single repositories, monorepos, and nested structures.
 * 
 * @param workingDir - Absolute path to directory to scan
 * @returns Repository tree with type and sub-repositories
 * @throws {Error} If directory doesn't exist or no read permission
 * 
 * @example
 * const detector = new GitDetector();
 * const tree = await detector.detectRepositories('/path/to/repo');
 * console.log(tree.repositoryType); // 'single' | 'monorepo' | 'none'
 */

// STEP 7: REPEAT - Next test case
test('should detect monorepo with multiple sub-repos', async () => {
  // Next test...
});
```

---

## 7. Test Data Management

### 7.1 Test Fixture Builder

```typescript
/**
 * Fluent builder for creating test repositories
 */
class TestRepoBuilder {
  private config: TestRepoConfig = {
    type: 'single',
    name: 'test-repo',
    hasGit: true,
    files: [],
    subRepos: []
  };
  
  withType(type: 'single' | 'monorepo' | 'none'): this {
    this.config.type = type;
    return this;
  }
  
  withName(name: string): this {
    this.config.name = name;
    return this;
  }
  
  withFiles(files: TestFile[]): this {
    this.config.files = files;
    return this;
  }
  
  withSubRepo(name: string, files: TestFile[]): this {
    this.config.subRepos.push({ name, files });
    return this;
  }
  
  withTechnology(tech: Technology): this {
    this.config.technologies = this.config.technologies || [];
    this.config.technologies.push(tech);
    return this;
  }
  
  async build(): Promise<TestRepository> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-test-'));
    const repoPath = path.join(tempDir, this.config.name);
    
    await fs.ensureDir(repoPath);
    
    // Initialize git if needed
    if (this.config.hasGit) {
      await git.init(repoPath);
    }
    
    // Create files
    for (const file of this.config.files) {
      const filePath = path.join(repoPath, file.name);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
    }
    
    // Create sub-repos
    for (const subRepo of this.config.subRepos) {
      const subRepoPath = path.join(repoPath, subRepo.name);
      await fs.ensureDir(subRepoPath);
      await git.init(subRepoPath);
      
      for (const file of subRepo.files) {
        const filePath = path.join(subRepoPath, file.name);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content);
      }
    }
    
    return new TestRepository(repoPath, async () => {
      await fs.remove(tempDir);
    });
  }
}

// Usage in tests
test('should detect monorepo', async () => {
  const repo = await new TestRepoBuilder()
    .withType('monorepo')
    .withName('my-monorepo')
    .withFiles([
      { name: 'package.json', content: '{"workspaces": ["api", "web"]}' }
    ])
    .withSubRepo('api', [
      { name: 'package.json', content: '{"name": "api"}' },
      { name: 'src/index.js', content: 'console.log("api")' }
    ])
    .withSubRepo('web', [
      { name: 'package.json', content: '{"name": "web"}' },
      { name: 'src/App.tsx', content: 'export default App' }
    ])
    .build();
  
  const detector = new GitDetector();
  const result = await detector.detectRepositories(repo.path);
  
  expect(result.repositoryType).toBe('monorepo');
  expect(result.subRepos).toHaveLength(2);
  
  await repo.cleanup();
});
```

### 7.2 Mock Factory

```typescript
/**
 * Factory for creating test mocks
 */
class MockFactory {
  static createAIProvider(overrides?: Partial<AIProvider>): jest.Mocked<AIProvider> {
    return {
      name: 'mock-ai',
      apiKey: 'sk-test-123',
      analyzeFileAllocation: jest.fn().mockResolvedValue({
        targetRepo: './api',
        suggestedSubdir: 'src',
        confidence: 0.9,
        reasoning: 'Test reasoning'
      }),
      classifyScript: jest.fn().mockResolvedValue({
        category: 'utility',
        staleness: 'fresh',
        isAIGenerated: false,
        confidence: 0.85,
        reasoning: 'Test reasoning',
        action: 'organize'
      }),
      validateApiKey: jest.fn().mockResolvedValue(true),
      testConnection: jest.fn().mockResolvedValue(true),
      getRateLimits: jest.fn().mockReturnValue({
        requestsPerMinute: 100,
        tokensPerMinute: 10000,
        requestsPerDay: 1000
      }),
      ...overrides
    };
  }
  
  static createRepository(overrides?: Partial<Repository>): Repository {
    return {
      path: '/test/repo',
      name: 'test-repo',
      type: 'root',
      hasGit: true,
      gitPath: '/test/repo/.git',
      isSubmodule: false,
      technologies: [],
      hasPackageJson: false,
      hasDockerfile: false,
      hasSrcDirectory: false,
      children: [],
      ...overrides
    };
  }
  
  static createFileEntry(overrides?: Partial<FileEntry>): FileEntry {
    return {
      path: 'test-file.js',
      absolutePath: '/test/repo/test-file.js',
      repository: '/test/repo',
      type: 'code',
      isGitTracked: false,
      lastModified: new Date(),
      lastAccessed: new Date(),
      size: 1024,
      hash: 'abc123',
      ...overrides
    };
  }
}

// Usage
test('should use AI provider', async () => {
  const mockAI = MockFactory.createAIProvider({
    analyzeFileAllocation: jest.fn().mockResolvedValue({
      targetRepo: './custom',
      confidence: 0.95
    })
  });
  
  const engine = new DistributionEngine({ aiProvider: mockAI });
  await engine.analyzeFile(MockFactory.createFileEntry());
  
  expect(mockAI.analyzeFileAllocation).toHaveBeenCalled();
});
```

---

## 8. Test Contracts

### 8.1 Interface Test Suites

Every interface MUST have a corresponding test contract that verifies all implementations.

```typescript
/**
 * Shared test suite for all AI providers
 * Ensures consistent behavior across implementations
 */
export function testAIProviderContract(
  createProvider: () => AIProvider,
  setupEnv: () => Promise<void>,
  teardownEnv: () => Promise<void>
) {
  describe('AIProvider Contract', () => {
    let provider: AIProvider;
    
    beforeAll(async () => {
      await setupEnv();
    });
    
    afterAll(async () => {
      await teardownEnv();
    });
    
    beforeEach(() => {
      provider = createProvider();
    });
    
    describe('analyzeFileAllocation', () => {
      test('should return valid allocation response', async () => {
        const request = createTestAllocationRequest();
        const response = await provider.analyzeFileAllocation(request);
        
        expect(response).toMatchObject({
          targetRepo: expect.any(String),
          confidence: expect.any(Number),
          reasoning: expect.any(String)
        });
        
        expect(response.confidence).toBeGreaterThanOrEqual(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
      });
      
      test('should handle large files gracefully', async () => {
        const largeRequest = createTestAllocationRequest({
          fileContent: 'x'.repeat(10000)
        });
        
        const response = await provider.analyzeFileAllocation(largeRequest);
        expect(response).toBeDefined();
      });
      
      test('should throw on invalid input', async () => {
        await expect(
          provider.analyzeFileAllocation(null as any)
        ).rejects.toThrow();
      });
    });
    
    describe('validateApiKey', () => {
      test('should return true for valid key', async () => {
        const result = await provider.validateApiKey();
        expect(typeof result).toBe('boolean');
      });
      
      test('should handle network errors', async () => {
        // Test implementation specific error handling
      });
    });
    
    // More contract tests...
  });
}

// Use in each provider test
describe('AnthropicProvider', () => {
  testAIProviderContract(
    () => new AnthropicProvider(process.env.TEST_ANTHROPIC_KEY!),
    async () => { /* setup */ },
    async () => { /* teardown */ }
  );
  
  // Provider-specific tests
  describe('Anthropic-specific behavior', () => {
    // ...
  });
});

describe('OpenAIProvider', () => {
  testAIProviderContract(
    () => new OpenAIProvider(process.env.TEST_OPENAI_KEY!),
    async () => { /* setup */ },
    async () => { /* teardown */ }
  );
});
```

---

## 9. Safety Testing

### 9.1 Safety Test Requirements

**CRITICAL**: Safety features MUST have 100% coverage with extensive edge case testing.

```typescript
describe('SafetyGuard', () => {
  describe('Boundary Protection', () => {
    test('should prevent sub-to-sub repository moves', () => {
      const guard = new SafetyGuard(repoTree);
      const operation: FileOperation = {
        type: 'move',
        source: '/repo/api/file.js',
        target: '/repo/web/file.js'
      };
      
      const result = guard.checkOperation(operation);
      
      expect(result.safe).toBe(false);
      expect(result.violations).toContain('Boundary violation');
    });
    
    test('should prevent sub-to-root moves', () => {
      const guard = new SafetyGuard(repoTree);
      const operation: FileOperation = {
        type: 'move',
        source: '/repo/api/file.js',
        target: '/repo/file.js'
      };
      
      const result = guard.checkOperation(operation);
      
      expect(result.safe).toBe(false);
      expect(result.violations).toContain('sub-to-root');
    });
    
    test('should allow root-to-sub moves (distribution)', () => {
      const guard = new SafetyGuard(repoTree);
      const operation: FileOperation = {
        type: 'move',
        source: '/repo/file.js',
        target: '/repo/api/file.js'
      };
      
      const result = guard.checkOperation(operation);
      
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
    
    test('should allow same-repository moves', () => {
      const guard = new SafetyGuard(repoTree);
      const operation: FileOperation = {
        type: 'move',
        source: '/repo/api/src/file.js',
        target: '/repo/api/dist/file.js'
      };
      
      const result = guard.checkOperation(operation);
      
      expect(result.safe).toBe(true);
    });
  });
  
  describe('Protected Files', () => {
    test.each([
      'package.json',
      '.gitignore',
      '.env',
      'LICENSE',
      'README.md'
    ])('should protect %s from deletion', (fileName) => {
      const guard = new SafetyGuard(repoTree);
      const operation: FileOperation = {
        type: 'delete',
        source: `/repo/${fileName}`
      };
      
      const result = guard.checkOperation(operation);
      
      expect(result.safe).toBe(false);
      expect(result.violations).toContain('protected file');
    });
  });
  
  describe('Critical Paths', () => {
    test('should protect package.json main entry', async () => {
      const repo = await createTestRepo({
        files: [
          { 
            name: 'package.json', 
            content: JSON.stringify({ main: 'index.js' }) 
          },
          { name: 'index.js', content: 'module.exports = {}' }
        ]
      });
      
      const guard = new SafetyGuard(await detectRepoTree(repo.path));
      const operation: FileOperation = {
        type: 'delete',
        source: path.join(repo.path, 'index.js')
      };
      
      const result = guard.checkOperation(operation);
      
      expect(result.safe).toBe(false);
      expect(result.violations).toContain('critical path');
      
      await repo.cleanup();
    });
  });
});
```

### 9.2 Backup/Restore Testing

```typescript
describe('Backup/Restore Safety', () => {
  test('should backup before any deletion', async () => {
    const manager = new BackupManager();
    const backupId = await manager.createBackup('test', 'interactive', context);
    
    const testFile = '/test/file.js';
    await fs.writeFile(testFile, 'content');
    
    // Attempt deletion without backup should fail
    const guard = new BackupSafetyGuard();
    await expect(
      guard.ensureDeletionBackup(testFile, backupId)
    ).resolves.not.toThrow();
    
    // Verify backup exists
    const backupPath = path.join('.unvibe/backups', backupId, 'test/file.js');
    expect(await fs.pathExists(backupPath)).toBe(true);
  });
  
  test('should restore files exactly', async () => {
    const originalContent = 'original content\nwith multiple lines\n';
    const testFile = '/test/file.js';
    
    // Create original file
    await fs.writeFile(testFile, originalContent);
    const originalStat = await fs.stat(testFile);
    
    // Backup
    const backupManager = new BackupManager();
    const backupId = await backupManager.createBackup('test', 'interactive', context);
    await backupManager.backupFile(backupId, testFile, 'delete');
    
    // Modify file
    await fs.writeFile(testFile, 'modified content');
    
    // Restore
    const restoreManager = new RestoreManager();
    await restoreManager.restore(backupId, { skipConfirm: true });
    
    // Verify exact restoration
    const restoredContent = await fs.readFile(testFile, 'utf-8');
    expect(restoredContent).toBe(originalContent);
    
    const restoredStat = await fs.stat(testFile);
    expect(restoredStat.mode).toBe(originalStat.mode);
  });
  
  test('should maintain backup integrity across failures', async () => {
    const manager = new BackupManager();
    const backupId = await manager.createBackup('test', 'interactive', context);
    
    // Simulate partial backup failure
    await manager.backupFile(backupId, '/test/file1.js', 'delete');
    
    // Force failure on second file
    jest.spyOn(fs, 'copy').mockRejectedValueOnce(new Error('Disk full'));
    
    await expect(
      manager.backupFile(backupId, '/test/file2.js', 'delete')
    ).rejects.toThrow();
    
    // Verify first backup still valid
    const manifest = await manager['loadManifest'](
      path.join('.unvibe/backups', backupId)
    );
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].originalPath).toBe('/test/file1.js');
  });
});
```

---

## 10. Continuous Testing

### 10.1 Pre-Commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:changed && npm run lint",
      "pre-push": "npm test && npm run coverage:check"
    }
  }
}
```

### 10.2 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 21]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Check coverage
        run: npm run coverage:check
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 10.3 Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:changed": "vitest related",
    "coverage": "vitest run --coverage",
    "coverage:check": "vitest run --coverage && node scripts/check-coverage.js",
    "test:debug": "node --inspect-brk node_modules/.bin/vitest"
  }
}
```

---

## 11. Test Quality Metrics

### 11.1 Quality Gates

All PRs must pass these gates:

- ✅ **Coverage**: ≥85% overall, 100% for safety
- ✅ **Pass Rate**: 100% (no skipped tests)
- ✅ **Performance**: <30s for full suite
- ✅ **Flakiness**: 0% (tests must be deterministic)
- ✅ **Mutation Score**: ≥80% (if using mutation testing)

### 11.2 Test Smell Detection

Watch for and eliminate these test smells:

```typescript
// ❌ BAD: Overly complex test
test('should do everything', async () => {
  // 100 lines of setup
  // Multiple assertions
  // Testing too much
});

// ✅ GOOD: Focused test
test('should create backup with timestamp', async () => {
  const backupId = await manager.createBackup('test', 'interactive', context);
  expect(backupId).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

// ❌ BAD: Test depends on execution order
test('test 1', () => {
  globalState.value = 1;
});
test('test 2', () => {
  expect(globalState.value).toBe(1); // Depends on test 1
});

// ✅ GOOD: Independent tests
test('test 1', () => {
  const state = { value: 1 };
  expect(state.value).toBe(1);
});

// ❌ BAD: Testing implementation details
test('should use Array.map internally', () => {
  const spy = jest.spyOn(Array.prototype, 'map');
  processFiles(files);
  expect(spy).toHaveBeenCalled();
});

// ✅ GOOD: Testing behavior
test('should process all files', () => {
  const result = processFiles(files);
  expect(result).toHaveLength(files.length);
  expect(result.every(r => r.processed)).toBe(true);
});
```

---

## 12. Documentation Requirements

Every test file MUST include:

```typescript
/**
 * @fileoverview Tests for GitDetector
 * 
 * Tests cover:
 * - Single repository detection
 * - Monorepo detection
 * - Edge cases (no git, nested repos, submodules)
 * - Error handling (permissions, corrupted git)
 * 
 * Coverage target: 100%
 * Last reviewed: 2025-10-02
 */

describe('GitDetector', () => {
  // Tests grouped by feature
  describe('detectRepositories', () => {
    // Each test documents what it verifies
    test('should detect single repository with .git directory', async () => {
      // Test implementation
    });
  });
});
```

---

**Status:** Complete - Ready for Implementation  
**Next:** Interface Segregation Principle Design

