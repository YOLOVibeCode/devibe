import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { OperationPlanner, OperationExecutor } from '../../src/operation-executor.js';
import { GitDetector } from '../../src/git-detector.js';
import { FileClassifier } from '../../src/file-classifier.js';
import { BackupManager } from '../../src/backup-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('OperationPlanner', () => {
  let testDir: string;
  let planner: OperationPlanner;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-planner-test-'));
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    planner = new OperationPlanner(detector, classifier);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('planRootFileDistribution', () => {
    test('should create plan for root files in monorepo', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.mkdir(path.join(testDir, 'app1/.git'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'README.md'), 'readme');
      await fs.writeFile(path.join(testDir, 'script.sh'), '#!/bin/bash');

      // Act
      const plan = await planner.planRootFileDistribution(testDir);

      // Assert
      expect(plan.operations.length).toBeGreaterThan(0);
      expect(plan.backupRequired).toBe(true);
    });

    test('should not plan operations when no root files exist', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src/index.ts'), 'code');

      // Act
      const plan = await planner.planRootFileDistribution(testDir);

      // Assert
      expect(plan.operations).toHaveLength(0);
    });

    test('should include operation reasons', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.writeFile(path.join(testDir, 'deploy.sh'), '#!/bin/bash');

      // Act
      const plan = await planner.planRootFileDistribution(testDir);

      // Assert
      if (plan.operations.length > 0) {
        expect(plan.operations[0].reason).toBeDefined();
        expect(plan.operations[0].reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('planFolderEnforcement', () => {
    test('should create folders when missing', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));

      // Act
      const plan = await planner.planFolderEnforcement(testDir);

      // Assert
      expect(plan.operations.length).toBeGreaterThanOrEqual(2); // scripts/ and documents/
      expect(plan.operations.some(op => op.type === 'create')).toBe(true);
    });

    test('should not create folders that already exist', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.mkdir(path.join(testDir, 'scripts'));
      await fs.mkdir(path.join(testDir, 'documents'));

      // Act
      const plan = await planner.planFolderEnforcement(testDir);

      // Assert
      expect(plan.operations).toHaveLength(0);
    });

    test('should move scripts to scripts folder', async () => {
      // Arrange
      await fs.mkdir(path.join(testDir, '.git'));
      await fs.writeFile(path.join(testDir, 'deploy.sh'), '#!/bin/bash');

      // Act
      const plan = await planner.planFolderEnforcement(testDir);

      // Assert
      const moveOps = plan.operations.filter(op => op.type === 'move');
      expect(moveOps.length).toBeGreaterThan(0);
    });
  });
});

describe('OperationExecutor', () => {
  let testDir: string;
  let backupDir: string;
  let executor: OperationExecutor;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-executor-test-'));
    backupDir = path.join(testDir, '.unvibe/backups');
    const backupManager = new BackupManager(backupDir);
    executor = new OperationExecutor(backupManager);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should execute move operation', async () => {
    // Arrange
    const sourcePath = path.join(testDir, 'file.txt');
    const targetPath = path.join(testDir, 'new/file.txt');
    await fs.writeFile(sourcePath, 'content');

    const plan = {
      operations: [
        {
          type: 'move' as const,
          sourcePath,
          targetPath,
          reason: 'test move',
        },
      ],
      backupRequired: true,
      estimatedDuration: 100,
    };

    // Act
    const result = await executor.execute(plan, false);

    // Assert
    expect(result.success).toBe(true);
    expect(result.operationsCompleted).toBe(1);
    const targetExists = await fs.access(targetPath).then(() => true).catch(() => false);
    expect(targetExists).toBe(true);
  });

  test('should execute create operation', async () => {
    // Arrange
    const dirPath = path.join(testDir, 'newdir');

    const plan = {
      operations: [
        {
          type: 'create' as const,
          sourcePath: dirPath,
          reason: 'test create',
        },
      ],
      backupRequired: false,
      estimatedDuration: 50,
    };

    // Act
    const result = await executor.execute(plan, false);

    // Assert
    expect(result.success).toBe(true);
    const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
    expect(dirExists).toBe(true);
  });

  test('should not execute operations in dry-run mode', async () => {
    // Arrange
    const sourcePath = path.join(testDir, 'file.txt');
    const targetPath = path.join(testDir, 'new/file.txt');
    await fs.writeFile(sourcePath, 'content');

    const plan = {
      operations: [
        {
          type: 'move' as const,
          sourcePath,
          targetPath,
          reason: 'test',
        },
      ],
      backupRequired: true,
      estimatedDuration: 100,
    };

    // Act
    const result = await executor.execute(plan, true);

    // Assert
    expect(result.success).toBe(true);
    const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
    expect(sourceExists).toBe(true); // Original still exists
    const targetExists = await fs.access(targetPath).then(() => true).catch(() => false);
    expect(targetExists).toBe(false); // Target not created
  });

  test('should create backup when required', async () => {
    // Arrange
    const sourcePath = path.join(testDir, 'file.txt');
    const targetPath = path.join(testDir, 'new/file.txt');
    await fs.writeFile(sourcePath, 'important content');

    const plan = {
      operations: [
        {
          type: 'move' as const,
          sourcePath,
          targetPath,
          reason: 'test',
        },
      ],
      backupRequired: true,
      estimatedDuration: 100,
    };

    // Act
    const result = await executor.execute(plan, false);

    // Assert
    expect(result.success).toBe(true);
    expect(result.backupManifestId).toBeDefined();
  });

  test('should handle execution errors gracefully', async () => {
    // Arrange
    const plan = {
      operations: [
        {
          type: 'move' as const,
          sourcePath: '/nonexistent/file.txt',
          targetPath: '/also/nonexistent/file.txt',
          reason: 'test error',
        },
      ],
      backupRequired: false,
      estimatedDuration: 100,
    };

    // Act
    const result = await executor.execute(plan, false);

    // Assert
    expect(result.success).toBe(false);
    expect(result.operationsFailed).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
