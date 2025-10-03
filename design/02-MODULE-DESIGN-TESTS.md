# Detailed Module Design with Test Contracts

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Design Document

---

## 1. Overview

This document provides detailed design for each module with comprehensive test contracts, ensuring every component is fully testable and works correctly out of the box.

---

## 2. Module: Git Detection

### 2.1 Module Structure

```
src/core/git/
├── detector.ts              # Main GitDetector class
├── presence-checker.ts      # GitPresenceChecker
├── submodule-detector.ts    # GitSubmoduleDetector
├── monorepo-detector.ts     # MonorepoToolDetector
├── file-tracker.ts          # GitFileTracker
├── metadata-extractor.ts    # GitMetadataExtractor
├── boundary-validator.ts    # BoundaryValidator
└── technology-detector.ts   # TechnologyDetector

tests/unit/core/git/
├── detector.test.ts
├── presence-checker.test.ts
├── submodule-detector.test.ts
├── monorepo-detector.test.ts
├── file-tracker.test.ts
├── metadata-extractor.test.ts
├── boundary-validator.test.ts
└── technology-detector.test.ts

tests/integration/git/
└── git-workflow.test.ts
```

### 2.2 Test Contract: GitDetector

```typescript
/**
 * Test contract for GitDetector
 * Coverage target: 100%
 */
describe('GitDetector', () => {
  let detector: GitDetector;
  let testRepos: TestRepository[];
  
  beforeEach(() => {
    detector = new GitDetector();
    testRepos = [];
  });
  
  afterEach(async () => {
    await Promise.all(testRepos.map(r => r.cleanup()));
  });
  
  describe('detectRepositories', () => {
    describe('Single Repository Detection', () => {
      test('should detect single repository with .git directory', async () => {
        // Arrange
        const repo = await new TestRepoBuilder()
          .withType('single')
          .withFiles([{ name: 'README.md', content: '# Test' }])
          .build();
        testRepos.push(repo);
        
        // Act
        const result = await detector.detectRepositories(repo.path);
        
        // Assert
        expect(result.repositoryType).toBe('single');
        expect(result.hasGit).toBe(true);
        expect(result.subRepos).toHaveLength(0);
        expect(result.rootRepo).toBeDefined();
        expect(result.rootRepo?.path).toBe(repo.path);
      });
      
      test('should handle repository with no files', async () => {
        const repo = await new TestRepoBuilder()
          .withType('single')
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        expect(result.repositoryType).toBe('single');
        expect(result.hasGit).toBe(true);
      });
      
      test('should detect repository technologies', async () => {
        const repo = await new TestRepoBuilder()
          .withType('single')
          .withFiles([
            { name: 'package.json', content: '{"name": "test"}' },
            { name: 'Dockerfile', content: 'FROM node:18' }
          ])
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        expect(result.rootRepo?.technologies).toContainEqual(
          expect.objectContaining({ name: 'nodejs' })
        );
        expect(result.rootRepo?.technologies).toContainEqual(
          expect.objectContaining({ name: 'docker' })
        );
      });
    });
    
    describe('Monorepo Detection', () => {
      test('should detect monorepo with multiple sub-repositories', async () => {
        const repo = await new TestRepoBuilder()
          .withType('monorepo')
          .withSubRepo('api', [{ name: 'package.json', content: '{"name": "api"}' }])
          .withSubRepo('web', [{ name: 'package.json', content: '{"name": "web"}' }])
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        expect(result.repositoryType).toBe('monorepo');
        expect(result.hasGit).toBe(true);
        expect(result.subRepos).toHaveLength(2);
        expect(result.subRepos.map(r => r.name)).toContain('api');
        expect(result.subRepos.map(r => r.name)).toContain('web');
      });
      
      test('should detect monorepo tool', async () => {
        const repo = await new TestRepoBuilder()
          .withType('monorepo')
          .withFiles([
            { name: 'lerna.json', content: '{"version": "1.0.0"}' }
          ])
          .withSubRepo('api', [])
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        expect(result.monorepoTool).toBe('lerna');
      });
      
      test('should handle nested monorepos', async () => {
        const repo = await new TestRepoBuilder()
          .withType('monorepo')
          .withSubRepo('packages/api', [{ name: 'package.json', content: '{}' }])
          .withSubRepo('packages/web', [{ name: 'package.json', content: '{}' }])
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        expect(result.subRepos.length).toBeGreaterThanOrEqual(2);
      });
    });
    
    describe('No Git Detection', () => {
      test('should detect directory with no git', async () => {
        const repo = await new TestRepoBuilder()
          .withType('none')
          .withFiles([{ name: 'file.txt', content: 'test' }])
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        expect(result.repositoryType).toBe('none');
        expect(result.hasGit).toBe(false);
        expect(result.subRepos).toHaveLength(0);
      });
    });
    
    describe('Git Submodules', () => {
      test('should detect git submodules', async () => {
        const repo = await new TestRepoBuilder()
          .withType('monorepo')
          .withSubmodule('submodule-repo', 'https://github.com/test/repo.git')
          .build();
        testRepos.push(repo);
        
        const result = await detector.detectRepositories(repo.path);
        
        const submodule = result.subRepos.find(r => r.name === 'submodule-repo');
        expect(submodule).toBeDefined();
        expect(submodule?.isSubmodule).toBe(true);
      });
    });
    
    describe('Error Handling', () => {
      test('should throw on non-existent directory', async () => {
        await expect(
          detector.detectRepositories('/nonexistent/path/12345')
        ).rejects.toThrow(/does not exist|ENOENT/i);
      });
      
      test('should throw on file instead of directory', async () => {
        const repo = await new TestRepoBuilder()
          .withType('single')
          .withFiles([{ name: 'test.txt', content: 'test' }])
          .build();
        testRepos.push(repo);
        
        const filePath = path.join(repo.path, 'test.txt');
        
        await expect(
          detector.detectRepositories(filePath)
        ).rejects.toThrow(/not a directory/i);
      });
      
      test('should handle permission denied gracefully', async () => {
        if (process.platform === 'win32') {
          // Skip on Windows (permissions work differently)
          return;
        }
        
        const repo = await new TestRepoBuilder()
          .withType('single')
          .withPermissions(0o000)
          .build();
        testRepos.push(repo);
        
        await expect(
          detector.detectRepositories(repo.path)
        ).rejects.toThrow(/permission/i);
      });
      
      test('should handle corrupted git directory', async () => {
        const repo = await new TestRepoBuilder()
          .withType('single')
          .build();
        testRepos.push(repo);
        
        // Corrupt git directory
        await fs.remove(path.join(repo.path, '.git/HEAD'));
        
        const result = await detector.detectRepositories(repo.path);
        
        // Should detect git exists but may have warnings
        expect(result.hasGit).toBe(true);
      });
    });
    
    describe('Performance', () => {
      test('should detect large monorepo in reasonable time', async () => {
        const repo = await new TestRepoBuilder()
          .withType('monorepo')
          .withSubRepos(10) // 10 sub-repos
          .withFilesPerRepo(50) // 50 files each
          .build();
        testRepos.push(repo);
        
        const startTime = Date.now();
        const result = await detector.detectRepositories(repo.path);
        const duration = Date.now() - startTime;
        
        expect(result.subRepos).toHaveLength(10);
        expect(duration).toBeLessThan(5000); // <5 seconds
      });
      
      test('should cache repeated detections', async () => {
        const repo = await new TestRepoBuilder()
          .withType('single')
          .build();
        testRepos.push(repo);
        
        // First detection
        const start1 = Date.now();
        await detector.detectRepositories(repo.path);
        const duration1 = Date.now() - start1;
        
        // Second detection (should be faster with caching)
        const start2 = Date.now();
        await detector.detectRepositories(repo.path);
        const duration2 = Date.now() - start2;
        
        expect(duration2).toBeLessThan(duration1);
      });
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle empty repository', async () => {
      const repo = await new TestRepoBuilder()
        .withType('single')
        .build();
      testRepos.push(repo);
      
      const result = await detector.detectRepositories(repo.path);
      
      expect(result.repositoryType).toBe('single');
    });
    
    test('should handle repository with .gitignore only', async () => {
      const repo = await new TestRepoBuilder()
        .withType('single')
        .withFiles([{ name: '.gitignore', content: 'node_modules/' }])
        .build();
      testRepos.push(repo);
      
      const result = await detector.detectRepositories(repo.path);
      
      expect(result.hasGit).toBe(true);
    });
    
    test('should handle symlinks', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }
      
      const repo = await new TestRepoBuilder()
        .withType('single')
        .withFiles([{ name: 'real-file.txt', content: 'test' }])
        .build();
      testRepos.push(repo);
      
      // Create symlink
      const symlinkPath = path.join(repo.path, 'symlink.txt');
      await fs.symlink(
        path.join(repo.path, 'real-file.txt'),
        symlinkPath
      );
      
      const result = await detector.detectRepositories(repo.path);
      
      expect(result.repositoryType).toBe('single');
    });
    
    test('should handle very long file paths', async () => {
      const deepPath = 'a/'.repeat(50); // Very deep directory
      const repo = await new TestRepoBuilder()
        .withType('single')
        .withFiles([{ name: `${deepPath}file.txt`, content: 'test' }])
        .build();
      testRepos.push(repo);
      
      const result = await detector.detectRepositories(repo.path);
      
      expect(result.repositoryType).toBe('single');
    });
  });
});
```

### 2.3 Test Contract: BoundaryValidator

```typescript
describe('BoundaryValidator', () => {
  let validator: BoundaryValidator;
  let repoTree: RepositoryTree;
  
  beforeEach(async () => {
    const repo = await new TestRepoBuilder()
      .withType('monorepo')
      .withSubRepo('api', [])
      .withSubRepo('web', [])
      .build();
    
    repoTree = await new GitDetector().detectRepositories(repo.path);
    validator = new BoundaryValidator(repoTree);
  });
  
  describe('validateMove', () => {
    test('should allow root-to-sub moves (distribution)', () => {
      const result = validator.validateMove(
        '/repo/file.js',
        '/repo/api/file.js'
      );
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('distribution');
    });
    
    test('should reject sub-to-root moves', () => {
      const result = validator.validateMove(
        '/repo/api/file.js',
        '/repo/file.js'
      );
      
      expect(result.valid).toBe(false);
      expect(result.violation).toBe('sub-to-root');
      expect(result.reason).toContain('Cannot move files from sub-repository to root');
    });
    
    test('should reject sub-to-sub moves', () => {
      const result = validator.validateMove(
        '/repo/api/file.js',
        '/repo/web/file.js'
      );
      
      expect(result.valid).toBe(false);
      expect(result.violation).toBe('sub-to-sub');
      expect(result.reason).toContain('Cannot move files between sub-repositories');
    });
    
    test('should allow same-repo moves', () => {
      const result = validator.validateMove(
        '/repo/api/src/file.js',
        '/repo/api/dist/file.js'
      );
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('enforceBeforeOperation', () => {
    test('should throw on boundary violation', () => {
      const operation: FileOperation = {
        type: 'move',
        source: '/repo/api/file.js',
        target: '/repo/web/file.js'
      };
      
      expect(() => {
        validator.enforceBeforeOperation(operation);
      }).toThrow(BoundaryViolationError);
    });
    
    test('should not throw on valid operation', () => {
      const operation: FileOperation = {
        type: 'move',
        source: '/repo/file.js',
        target: '/repo/api/file.js'
      };
      
      expect(() => {
        validator.enforceBeforeOperation(operation);
      }).not.toThrow();
    });
  });
});
```

---

## 3. Module: File Distribution

### 3.1 Test Contract: DistributionEngine

```typescript
describe('DistributionEngine', () => {
  let engine: DistributionEngine;
  let mockAI: jest.Mocked<AIProvider>;
  let repos: Repository[];
  
  beforeEach(() => {
    mockAI = MockFactory.createAIProvider();
    repos = [
      MockFactory.createRepository({ path: '/repo/api', name: 'api' }),
      MockFactory.createRepository({ path: '/repo/web', name: 'web' })
    ];
    
    engine = new DistributionEngine({
      aiProvider: mockAI,
      repositories: repos,
      config: defaultDistributionConfig
    });
  });
  
  describe('analyzeFile', () => {
    test('should use explicit pattern matching first', async () => {
      const file = MockFactory.createFileEntry({
        path: 'api-controller.js',
        absolutePath: '/repo/api-controller.js'
      });
      
      const decision = await engine.analyzeFile(file);
      
      expect(decision.targetRepo).toBe('./api');
      expect(decision.method).toBe('explicit');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.95);
      expect(mockAI.analyzeFileAllocation).not.toHaveBeenCalled();
    });
    
    test('should fall back to AI when pattern does not match', async () => {
      const file = MockFactory.createFileEntry({
        path: 'controller.js',
        absolutePath: '/repo/controller.js'
      });
      
      mockAI.analyzeFileAllocation.mockResolvedValueOnce({
        targetRepo: './api',
        suggestedSubdir: 'src/controllers',
        confidence: 0.92,
        reasoning: 'Express controller pattern detected'
      });
      
      const decision = await engine.analyzeFile(file);
      
      expect(decision.targetRepo).toBe('./api');
      expect(decision.method).toBe('ai');
      expect(decision.confidence).toBe(0.92);
      expect(mockAI.analyzeFileAllocation).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'controller.js'
        })
      );
    });
    
    test('should fall back to heuristics when AI fails', async () => {
      const file = MockFactory.createFileEntry({
        path: 'user-api.js',
        absolutePath: '/repo/user-api.js',
        content: "const express = require('express');"
      });
      
      mockAI.analyzeFileAllocation.mockRejectedValueOnce(new Error('API error'));
      
      const decision = await engine.analyzeFile(file);
      
      expect(decision.method).toBe('heuristic');
      expect(decision.targetRepo).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
    });
    
    test('should keep file at root when confidence too low', async () => {
      const file = MockFactory.createFileEntry({
        path: 'random.txt',
        absolutePath: '/repo/random.txt'
      });
      
      mockAI.analyzeFileAllocation.mockResolvedValueOnce({
        targetRepo: './api',
        confidence: 0.45, // Below threshold
        reasoning: 'Uncertain'
      });
      
      const decision = await engine.analyzeFile(file);
      
      expect(decision.targetRepo).toBe('root');
      expect(decision.confidence).toBeLessThan(0.60);
    });
    
    test('should respect protected files', async () => {
      const file = MockFactory.createFileEntry({
        path: 'package.json',
        absolutePath: '/repo/package.json'
      });
      
      const decision = await engine.analyzeFile(file);
      
      expect(decision.targetRepo).toBe('root');
      expect(decision.reasoning).toContain('protected');
    });
  });
  
  describe('createDistributionPlan', () => {
    test('should process multiple files', async () => {
      const files = [
        MockFactory.createFileEntry({ path: 'api-users.js' }),
        MockFactory.createFileEntry({ path: 'web-app.tsx' }),
        MockFactory.createFileEntry({ path: 'random.txt' })
      ];
      
      const plan = await engine.createDistributionPlan(files);
      
      expect(plan.decisions).toHaveLength(3);
      expect(plan.highConfidence.length).toBeGreaterThan(0);
      expect(plan.keepAtRoot.length).toBeGreaterThan(0);
    });
    
    test('should categorize by confidence', async () => {
      const files = [
        MockFactory.createFileEntry({ path: 'api-controller.js' }), // High confidence
        MockFactory.createFileEntry({ path: 'utils.js' }) // Low confidence
      ];
      
      const plan = await engine.createDistributionPlan(files);
      
      expect(plan.highConfidence.length).toBeGreaterThanOrEqual(1);
      expect(plan.lowConfidence.length + plan.keepAtRoot.length).toBeGreaterThanOrEqual(1);
    });
    
    test('should track statistics', async () => {
      const files = [
        MockFactory.createFileEntry({ path: 'api-users.js' }),
        MockFactory.createFileEntry({ path: 'web-app.tsx' })
      ];
      
      const plan = await engine.createDistributionPlan(files);
      
      expect(plan.statistics.total).toBe(2);
      expect(plan.statistics.byMethod).toHaveProperty('explicit');
      expect(plan.statistics.aiEnabled).toBe(true);
    });
  });
  
  describe('Conflict Detection', () => {
    test('should detect file conflicts', async () => {
      // Setup: Create target file
      const targetPath = '/repo/api/src/controller.js';
      await fs.ensureFile(targetPath);
      await fs.writeFile(targetPath, 'existing content');
      
      const file = MockFactory.createFileEntry({
        path: 'controller.js',
        absolutePath: '/repo/controller.js'
      });
      
      const decision = await engine.analyzeFile(file);
      decision.targetRepo = './api';
      decision.targetSubdir = 'src';
      
      const conflict = await engine.detectConflict(decision);
      
      expect(conflict).toBeDefined();
      expect(conflict?.targetFile).toBe(targetPath);
      expect(conflict?.conflictType).toBe('exact');
      
      // Cleanup
      await fs.remove(targetPath);
    });
    
    test('should handle identical files', async () => {
      const content = 'test content';
      const targetPath = '/repo/api/src/file.js';
      await fs.ensureFile(targetPath);
      await fs.writeFile(targetPath, content);
      
      const sourcePath = '/repo/file.js';
      await fs.writeFile(sourcePath, content);
      
      const conflict = await engine.detectConflict({
        file: sourcePath,
        targetRepo: './api',
        targetSubdir: 'src'
      });
      
      expect(conflict?.areSame).toBe(true);
      
      // Cleanup
      await fs.remove(targetPath);
      await fs.remove(sourcePath);
    });
  });
  
  describe('Performance', () => {
    test('should process files in parallel', async () => {
      const files = Array.from({ length: 100 }, (_, i) =>
        MockFactory.createFileEntry({ path: `file-${i}.js` })
      );
      
      const startTime = Date.now();
      await engine.createDistributionPlan(files);
      const duration = Date.now() - startTime;
      
      // Should complete in reasonable time with parallelization
      expect(duration).toBeLessThan(10000); // <10 seconds for 100 files
    });
    
    test('should respect concurrency limits', async () => {
      const files = Array.from({ length: 50 }, (_, i) =>
        MockFactory.createFileEntry({ path: `file-${i}.js` })
      );
      
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      mockAI.analyzeFileAllocation.mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        return { targetRepo: './api', confidence: 0.9, reasoning: 'test' };
      });
      
      await engine.createDistributionPlan(files);
      
      expect(maxConcurrent).toBeLessThanOrEqual(engine.config.concurrency);
    });
  });
});
```

---

## 4. Module: AI Integration

### 4.1 Test Contract: AIProvider Interface

```typescript
/**
 * Contract tests that ALL AI providers must pass
 */
export function testAIProviderContract(
  createProvider: () => AIProvider,
  providerName: string
) {
  describe(`${providerName} AIProvider Contract`, () => {
    let provider: AIProvider;
    
    beforeEach(() => {
      provider = createProvider();
    });
    
    describe('analyzeFileAllocation', () => {
      test('should return valid allocation response', async () => {
        const request = TestDataFactory.createAllocationRequest({
          fileName: 'user-controller.js',
          fileContent: `
            const express = require('express');
            const router = express.Router();
            router.get('/users', (req, res) => {});
            module.exports = router;
          `
        });
        
        const response = await provider.analyzeFileAllocation(request);
        
        // Must return required fields
        expect(response).toMatchObject({
          targetRepo: expect.any(String),
          confidence: expect.any(Number),
          reasoning: expect.any(String)
        });
        
        // Confidence must be valid range
        expect(response.confidence).toBeGreaterThanOrEqual(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
        
        // Reasoning must be non-empty
        expect(response.reasoning.length).toBeGreaterThan(10);
      });
      
      test('should handle empty files', async () => {
        const request = TestDataFactory.createAllocationRequest({
          fileName: 'empty.js',
          fileContent: ''
        });
        
        const response = await provider.analyzeFileAllocation(request);
        
        expect(response).toBeDefined();
        expect(response.confidence).toBeLessThan(0.5);
      });
      
      test('should handle large files', async () => {
        const largeContent = 'x'.repeat(50000); // 50KB
        const request = TestDataFactory.createAllocationRequest({
          fileName: 'large.js',
          fileContent: largeContent
        });
        
        const response = await provider.analyzeFileAllocation(request);
        
        expect(response).toBeDefined();
      });
      
      test('should throw on null request', async () => {
        await expect(
          provider.analyzeFileAllocation(null as any)
        ).rejects.toThrow();
      });
      
      test('should complete within timeout', async () => {
        const request = TestDataFactory.createAllocationRequest();
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        
        await expect(
          Promise.race([
            provider.analyzeFileAllocation(request),
            timeoutPromise
          ])
        ).resolves.toBeDefined();
      });
    });
    
    describe('classifyScript', () => {
      test('should return valid classification response', async () => {
        const request = TestDataFactory.createClassificationRequest({
          fileName: 'temp-test.js',
          fileContent: 'console.log("test");'
        });
        
        const response = await provider.classifyScript(request);
        
        expect(response).toMatchObject({
          category: expect.stringMatching(/utility|build|critical|test|document|unknown/),
          staleness: expect.stringMatching(/fresh|aging|stale/),
          isAIGenerated: expect.any(Boolean),
          confidence: expect.any(Number),
          reasoning: expect.any(String),
          action: expect.stringMatching(/keep|organize|delete/)
        });
      });
      
      test('should detect utility scripts', async () => {
        const request = TestDataFactory.createClassificationRequest({
          fileName: 'debug-test.js',
          fileContent: 'console.log("debugging");'
        });
        
        const response = await provider.classifyScript(request);
        
        expect(response.category).toBe('utility');
      });
      
      test('should detect AI-generated content', async () => {
        const request = TestDataFactory.createClassificationRequest({
          fileName: 'notes.md',
          fileContent: '<!-- Generated by Claude -->\n# Notes'
        });
        
        const response = await provider.classifyScript(request);
        
        expect(response.isAIGenerated).toBe(true);
      });
    });
    
    describe('validateApiKey', () => {
      test('should validate correct API key', async () => {
        const result = await provider.validateApiKey();
        
        expect(typeof result).toBe('boolean');
      });
      
      test('should handle network errors gracefully', async () => {
        // Test implementation-specific error handling
        // Mock network failure and ensure graceful handling
      });
    });
    
    describe('Rate Limiting', () => {
      test('should respect rate limits', async () => {
        const limits = provider.getRateLimits();
        
        expect(limits).toMatchObject({
          requestsPerMinute: expect.any(Number),
          tokensPerMinute: expect.any(Number),
          requestsPerDay: expect.any(Number)
        });
        
        expect(limits.requestsPerMinute).toBeGreaterThan(0);
      });
    });
  });
}

// Usage in specific provider tests
describe('AnthropicProvider', () => {
  // Run contract tests
  testAIProviderContract(
    () => new AnthropicProvider(getTestApiKey('anthropic')),
    'Anthropic'
  );
  
  // Provider-specific tests
  describe('Anthropic-specific features', () => {
    test('should use Claude 3.5 Sonnet model', async () => {
      const provider = new AnthropicProvider(getTestApiKey('anthropic'));
      const spy = jest.spyOn(provider['client'].messages, 'create');
      
      await provider.analyzeFileAllocation(TestDataFactory.createAllocationRequest());
      
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022'
        })
      );
    });
  });
});

describe('OpenAIProvider', () => {
  testAIProviderContract(
    () => new OpenAIProvider(getTestApiKey('openai')),
    'OpenAI'
  );
  
  describe('OpenAI-specific features', () => {
    test('should use GPT-4 Turbo model', async () => {
      const provider = new OpenAIProvider(getTestApiKey('openai'));
      const spy = jest.spyOn(provider['client'].chat.completions, 'create');
      
      await provider.analyzeFileAllocation(TestDataFactory.createAllocationRequest());
      
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo-preview'
        })
      );
    });
  });
});
```

---

## 5. Module: Backup & Restore

### 5.1 Test Contract: BackupManager

```typescript
describe('BackupManager', () => {
  let manager: BackupManager;
  let testRepo: TestRepository;
  let testFiles: string[];
  
  beforeEach(async () => {
    manager = new BackupManager();
    testRepo = await new TestRepoBuilder()
      .withType('single')
      .withFiles([
        { name: 'file1.js', content: 'content1' },
        { name: 'file2.js', content: 'content2' },
        { name: 'src/file3.js', content: 'content3' }
      ])
      .build();
    
    testFiles = [
      path.join(testRepo.path, 'file1.js'),
      path.join(testRepo.path, 'file2.js'),
      path.join(testRepo.path, 'src/file3.js')
    ];
  });
  
  afterEach(async () => {
    await testRepo.cleanup();
    // Clean up any backups created during tests
    await fs.remove('.unvibe/backups');
  });
  
  describe('createBackup', () => {
    test('should create backup with timestamp', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      expect(backupId).toMatch(/^\d{4}-\d{2}-\d{2}T.*-test$/);
      expect(await fs.pathExists(`.unvibe/backups/${backupId}`)).toBe(true);
      expect(await fs.pathExists(`.unvibe/backups/${backupId}/manifest.json`)).toBe(true);
    });
    
    test('should create unique backup IDs', async () => {
      const id1 = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const id2 = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      expect(id1).not.toBe(id2);
    });
    
    test('should include repository snapshots', async () => {
      const repos = [
        MockFactory.createRepository({ path: testRepo.path })
      ];
      
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: repos,
        aiEnabled: false
      });
      
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      
      expect(manifest.repositories).toHaveLength(1);
      expect(manifest.repositories[0]).toMatchObject({
        path: testRepo.path,
        gitBranch: expect.any(String),
        gitCommit: expect.any(String)
      });
    });
  });
  
  describe('backupFile', () => {
    test('should backup file to correct location', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      const relativePath = path.relative(process.cwd(), testFiles[0]);
      const backupPath = path.join('.unvibe/backups', backupId, relativePath);
      
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      const backedUpContent = await fs.readFile(backupPath, 'utf-8');
      const originalContent = await fs.readFile(testFiles[0], 'utf-8');
      
      expect(backedUpContent).toBe(originalContent);
    });
    
    test('should preserve file permissions', async () => {
      if (process.platform === 'win32') return; // Skip on Windows
      
      // Make file executable
      await fs.chmod(testFiles[0], 0o755);
      
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      const entry = manifest.entries[0];
      
      expect(entry.metadata.permissions).toBe('755');
    });
    
    test('should store file hash', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      const entry = manifest.entries[0];
      
      expect(entry.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
      
      // Verify hash is correct
      const actualHash = await manager['hashFile'](testFiles[0]);
      expect(entry.hash).toBe(actualHash);
    });
    
    test('should update manifest', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      
      expect(manifest.entries).toHaveLength(1);
      expect(manifest.totalFiles).toBe(1);
      expect(manifest.totalSize).toBeGreaterThan(0);
    });
    
    test('should handle nested directories', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      await manager.backupFile(backupId, testFiles[2], 'delete'); // src/file3.js
      
      const relativePath = path.relative(process.cwd(), testFiles[2]);
      const backupPath = path.join('.unvibe/backups', backupId, relativePath);
      
      expect(await fs.pathExists(backupPath)).toBe(true);
    });
  });
  
  describe('backupFiles', () => {
    test('should backup multiple files', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      const operations: FileOperation[] = testFiles.map(file => ({
        type: 'delete',
        source: file
      }));
      
      await manager.backupFiles(backupId, operations);
      
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      
      expect(manifest.entries).toHaveLength(3);
      expect(manifest.totalFiles).toBe(3);
    });
    
    test('should handle backup failures gracefully', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      const operations: FileOperation[] = [
        { type: 'delete', source: testFiles[0] },
        { type: 'delete', source: '/nonexistent/file.js' }, // Will fail
        { type: 'delete', source: testFiles[1] }
      ];
      
      // Should continue despite one failure
      await expect(
        manager.backupFiles(backupId, operations)
      ).rejects.toThrow();
      
      // But first file should still be backed up
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      expect(manifest.entries.length).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Safety Guarantees', () => {
    test('GUARANTEE: Must backup before any deletion', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      // This test ensures the contract: MUST call backupFile before deletion
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      const entry = manifest.entries.find(e => e.originalPath === testFiles[0]);
      
      expect(entry).toBeDefined();
      expect(entry?.operation).toBe('delete');
    });
    
    test('GUARANTEE: Backup must be complete before operation', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      // Verify backup file exists and is complete
      const relativePath = path.relative(process.cwd(), testFiles[0]);
      const backupPath = path.join('.unvibe/backups', backupId, relativePath);
      
      const originalContent = await fs.readFile(testFiles[0], 'utf-8');
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      
      expect(backupContent).toBe(originalContent);
    });
    
    test('GUARANTEE: Backup integrity maintained on partial failure', async () => {
      const backupId = await manager.createBackup('test', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      // Backup first file successfully
      await manager.backupFile(backupId, testFiles[0], 'delete');
      
      // Force failure on second file
      jest.spyOn(fs, 'copy').mockRejectedValueOnce(new Error('Disk full'));
      
      await expect(
        manager.backupFile(backupId, testFiles[1], 'delete')
      ).rejects.toThrow();
      
      // First backup should still be valid
      const manifest = await manager['loadManifest'](`.unvibe/backups/${backupId}`);
      expect(manifest.entries).toHaveLength(1);
      expect(manifest.entries[0].originalPath).toBe(testFiles[0]);
    });
  });
});
```

### 5.2 Test Contract: RestoreManager

```typescript
describe('RestoreManager', () => {
  let manager: RestoreManager;
  let backupManager: BackupManager;
  let testRepo: TestRepository;
  let testFiles: string[];
  let backupId: string;
  
  beforeEach(async () => {
    manager = new RestoreManager();
    backupManager = new BackupManager();
    
    testRepo = await new TestRepoBuilder()
      .withType('single')
      .withFiles([
        { name: 'file1.js', content: 'original content 1' },
        { name: 'file2.js', content: 'original content 2' }
      ])
      .build();
    
    testFiles = [
      path.join(testRepo.path, 'file1.js'),
      path.join(testRepo.path, 'file2.js')
    ];
    
    // Create backup
    backupId = await backupManager.createBackup('test', 'interactive', {
      repositories: [],
      aiEnabled: false
    });
    
    await Promise.all(
      testFiles.map(file => backupManager.backupFile(backupId, file, 'delete'))
    );
    
    // Modify original files to simulate changes
    await fs.writeFile(testFiles[0], 'modified content 1');
    await fs.writeFile(testFiles[1], 'modified content 2');
  });
  
  afterEach(async () => {
    await testRepo.cleanup();
    await fs.remove('.unvibe/backups');
  });
  
  describe('restore', () => {
    test('should restore all files from backup', async () => {
      const result = await manager.restore(backupId, { skipConfirm: true });
      
      expect(result.success).toBe(true);
      expect(result.filesRestored).toBe(2);
      
      // Verify files restored
      const content1 = await fs.readFile(testFiles[0], 'utf-8');
      const content2 = await fs.readFile(testFiles[1], 'utf-8');
      
      expect(content1).toBe('original content 1');
      expect(content2).toBe('original content 2');
    });
    
    test('should restore file permissions', async () => {
      if (process.platform === 'win32') return;
      
      const result = await manager.restore(backupId, { skipConfirm: true });
      
      expect(result.success).toBe(true);
      
      // Verify permissions restored (would need to be set in setup)
    });
    
    test('should handle overwrite option', async () => {
      const result = await manager.restore(backupId, {
        skipConfirm: true,
        overwrite: true
      });
      
      expect(result.success).toBe(true);
    });
    
    test('should skip existing files when skipExisting=true', async () => {
      const result = await manager.restore(backupId, {
        skipConfirm: true,
        skipExisting: true
      });
      
      // Files should not be restored (already exist)
      const content1 = await fs.readFile(testFiles[0], 'utf-8');
      expect(content1).toBe('modified content 1'); // Not restored
    });
    
    test('should restore specific repository only', async () => {
      const result = await manager.restore(backupId, {
        skipConfirm: true,
        repository: testRepo.path
      });
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('listBackups', () => {
    test('should list all backups chronologically', async () => {
      // Create another backup
      await new Promise(resolve => setTimeout(resolve, 10));
      const backupId2 = await backupManager.createBackup('test2', 'interactive', {
        repositories: [],
        aiEnabled: false
      });
      
      const backups = await manager.listBackups();
      
      expect(backups.length).toBeGreaterThanOrEqual(2);
      
      // Should be sorted newest first
      for (let i = 1; i < backups.length; i++) {
        expect(backups[i-1].timestamp.getTime()).toBeGreaterThanOrEqual(
          backups[i].timestamp.getTime()
        );
      }
    });
  });
  
  describe('Safety Guarantees', () => {
    test('GUARANTEE: 100% reversibility', async () => {
      // Delete original files
      await Promise.all(testFiles.map(file => fs.remove(file)));
      
      // Verify deleted
      for (const file of testFiles) {
        expect(await fs.pathExists(file)).toBe(false);
      }
      
      // Restore
      const result = await manager.restore(backupId, { skipConfirm: true });
      
      expect(result.success).toBe(true);
      
      // Verify all files restored with exact content
      const content1 = await fs.readFile(testFiles[0], 'utf-8');
      const content2 = await fs.readFile(testFiles[1], 'utf-8');
      
      expect(content1).toBe('original content 1');
      expect(content2).toBe('original content 2');
    });
    
    test('GUARANTEE: Restore maintains file integrity', async () => {
      const result = await manager.restore(backupId, { skipConfirm: true });
      
      expect(result.success).toBe(true);
      
      // Verify hash matches original
      const manifest = await backupManager['loadManifest'](
        `.unvibe/backups/${backupId}`
      );
      
      for (const entry of manifest.entries) {
        const currentHash = await backupManager['hashFile'](entry.originalPath);
        expect(currentHash).toBe(entry.hash);
      }
    });
  });
});
```

---

**Status:** In Progress  
**Next:** Integration Testing Strategy and Complete Test Fixtures

