import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { GitDetector } from '../../src/git-detector.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('GitDetector', () => {
  let testDir: string;
  let detector: GitDetector;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-test-'));
    detector = new GitDetector();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('detectRepositories', () => {
    test('should detect single git repository', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));

      // Act
      const result = await detector.detectRepositories(testDir);

      // Assert
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].path).toBe(testDir);
      expect(result.repositories[0].isRoot).toBe(true);
      expect(result.hasMultipleRepos).toBe(false);
    });

    test('should detect multiple git repositories in monorepo', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.mkdir(path.join(testDir, 'packages/app1'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'packages/app1/.git'));
      await fs.mkdir(path.join(testDir, 'packages/app2'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'packages/app2/.git'));

      // Act
      const result = await detector.detectRepositories(testDir);

      // Assert
      expect(result.repositories).toHaveLength(3);
      expect(result.hasMultipleRepos).toBe(true);
      expect(result.rootRepo?.path).toBe(testDir);
    });

    test('should return empty result when no git repository found', async () => {
      // Arrange - testDir has no .git folder

      // Act
      const result = await detector.detectRepositories(testDir);

      // Assert
      expect(result.repositories).toHaveLength(0);
      expect(result.hasMultipleRepos).toBe(false);
      expect(result.rootRepo).toBeUndefined();
    });

    test('should detect nested repositories at various depths', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.mkdir(path.join(testDir, 'a/b/c/repo1'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'a/b/c/repo1/.git'));

      // Act
      const result = await detector.detectRepositories(testDir);

      // Assert
      expect(result.repositories).toHaveLength(2);
      expect(result.repositories.some((r) => r.path.endsWith('repo1'))).toBe(
        true
      );
    });
  });

  describe('isWithinRepository', () => {
    test('should return true for file inside repository', () => {
      // Arrange
      const repoPath = '/home/user/project';
      const filePath = '/home/user/project/src/index.ts';

      // Act
      const result = detector.isWithinRepository(filePath, repoPath);

      // Assert
      expect(result).toBe(true);
    });

    test('should return false for file outside repository', () => {
      // Arrange
      const repoPath = '/home/user/project';
      const filePath = '/home/user/other/file.ts';

      // Act
      const result = detector.isWithinRepository(filePath, repoPath);

      // Assert
      expect(result).toBe(false);
    });

    test('should return true for file at repository root', () => {
      // Arrange
      const repoPath = '/home/user/project';
      const filePath = '/home/user/project/README.md';

      // Act
      const result = detector.isWithinRepository(filePath, repoPath);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('canMoveFile', () => {
    test('should allow move within same repository', () => {
      // Arrange
      const repos = [{ path: '/home/user/mono', rootPath: '/home/user/mono', isRoot: true }];
      const source = '/home/user/mono/file.ts';
      const target = '/home/user/mono/src/file.ts';

      // Act
      const result = detector.canMoveFile(source, target, repos);

      // Assert
      expect(result).toBe(true);
    });

    test('should allow move from root to sub-repository', () => {
      // Arrange
      const repos = [
        { path: '/home/user/mono', rootPath: '/home/user/mono', isRoot: true },
        { path: '/home/user/mono/packages/app', rootPath: '/home/user/mono', isRoot: false },
      ];
      const source = '/home/user/mono/file.ts';
      const target = '/home/user/mono/packages/app/file.ts';

      // Act
      const result = detector.canMoveFile(source, target, repos);

      // Assert
      expect(result).toBe(true);
    });

    test('should prevent move between sibling repositories', () => {
      // Arrange
      const repos = [
        { path: '/home/user/mono/packages/app1', rootPath: '/home/user/mono', isRoot: false },
        { path: '/home/user/mono/packages/app2', rootPath: '/home/user/mono', isRoot: false },
      ];
      const source = '/home/user/mono/packages/app1/file.ts';
      const target = '/home/user/mono/packages/app2/file.ts';

      // Act
      const result = detector.canMoveFile(source, target, repos);

      // Assert
      expect(result).toBe(false);
    });

    test('should prevent move from sub-repository to root', () => {
      // Arrange
      const repos = [
        { path: '/home/user/mono', rootPath: '/home/user/mono', isRoot: true },
        { path: '/home/user/mono/packages/app', rootPath: '/home/user/mono', isRoot: false },
      ];
      const source = '/home/user/mono/packages/app/file.ts';
      const target = '/home/user/mono/file.ts';

      // Act
      const result = detector.canMoveFile(source, target, repos);

      // Assert
      expect(result).toBe(false);
    });
  });
});
