import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BackupManager } from '../../src/backup-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('BackupManager', () => {
  let testDir: string;
  let backupDir: string;
  let manager: BackupManager;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-backup-test-'));
    backupDir = path.join(testDir, '.unvibe', 'backups');
    manager = new BackupManager(backupDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('backupFile', () => {
    test('should backup file for delete operation', async () => {
      // Arrange
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test content');

      // Act
      const entry = await manager.backupFile(filePath, 'delete');

      // Assert
      expect(entry.operation).toBe('delete');
      expect(entry.sourcePath).toBe(filePath);
      expect(entry.content).toBe('test content');
      expect(entry.id).toBeDefined();
      expect(entry.metadata.size).toBeGreaterThan(0);
    });

    test('should backup file for move operation', async () => {
      // Arrange
      const filePath = path.join(testDir, 'move-me.txt');
      await fs.writeFile(filePath, 'moving');

      // Act
      const entry = await manager.backupFile(filePath, 'move');

      // Assert
      expect(entry.operation).toBe('move');
      expect(entry.sourcePath).toBe(filePath);
      expect(entry.content).toBe('moving');
    });

    test('should store backup on disk', async () => {
      // Arrange
      const filePath = path.join(testDir, 'store-me.txt');
      await fs.writeFile(filePath, 'stored content');

      // Act
      const entry = await manager.backupFile(filePath, 'delete');

      // Assert
      const backupPath = path.join(backupDir, entry.id);
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });
  });

  describe('createManifest', () => {
    test('should create manifest with multiple operations', async () => {
      // Arrange
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      const entry1 = await manager.backupFile(file1, 'delete');
      const entry2 = await manager.backupFile(file2, 'move');

      // Act
      const manifest = await manager.createManifest([entry1, entry2]);

      // Assert
      expect(manifest.id).toBeDefined();
      expect(manifest.operations).toHaveLength(2);
      expect(manifest.reversible).toBe(true);
      expect(manifest.timestamp).toBeInstanceOf(Date);
    });

    test('should persist manifest to disk', async () => {
      // Arrange
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content');
      const entry = await manager.backupFile(filePath, 'delete');

      // Act
      const manifest = await manager.createManifest([entry]);

      // Assert
      const manifestPath = path.join(backupDir, `${manifest.id}.json`);
      const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
      expect(manifestExists).toBe(true);
    });
  });

  describe('restore', () => {
    test('should restore deleted file', async () => {
      // Arrange
      const filePath = path.join(testDir, 'deleted.txt');
      await fs.writeFile(filePath, 'original content');
      const entry = await manager.backupFile(filePath, 'delete');
      const manifest = await manager.createManifest([entry]);
      await fs.unlink(filePath); // Simulate deletion

      // Act
      await manager.restore(manifest.id);

      // Assert
      const restored = await fs.readFile(filePath, 'utf-8');
      expect(restored).toBe('original content');
    });

    test('should restore multiple files', async () => {
      // Arrange
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      const entry1 = await manager.backupFile(file1, 'delete');
      const entry2 = await manager.backupFile(file2, 'delete');
      const manifest = await manager.createManifest([entry1, entry2]);

      await fs.unlink(file1);
      await fs.unlink(file2);

      // Act
      await manager.restore(manifest.id);

      // Assert
      const restored1 = await fs.readFile(file1, 'utf-8');
      const restored2 = await fs.readFile(file2, 'utf-8');
      expect(restored1).toBe('content1');
      expect(restored2).toBe('content2');
    });

    test('should throw error for non-existent manifest', async () => {
      // Act & Assert
      await expect(manager.restore('nonexistent')).rejects.toThrow();
    });
  });

  describe('listBackups', () => {
    test('should list all backup manifests', async () => {
      // Arrange
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      const entry1 = await manager.backupFile(file1, 'delete');
      const entry2 = await manager.backupFile(file2, 'delete');

      await manager.createManifest([entry1]);
      await manager.createManifest([entry2]);

      // Act
      const backups = await manager.listBackups();

      // Assert
      expect(backups).toHaveLength(2);
      expect(backups[0].id).toBeDefined();
      expect(backups[0].operations.length).toBeGreaterThan(0);
    });

    test('should return empty array when no backups exist', async () => {
      // Act
      const backups = await manager.listBackups();

      // Assert
      expect(backups).toHaveLength(0);
    });

    test('should sort backups by timestamp (newest first)', async () => {
      // Arrange
      const file1 = path.join(testDir, 'file1.txt');
      await fs.writeFile(file1, 'content1');

      const entry1 = await manager.backupFile(file1, 'delete');
      const manifest1 = await manager.createManifest([entry1]);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const entry2 = await manager.backupFile(file1, 'delete');
      const manifest2 = await manager.createManifest([entry2]);

      // Act
      const backups = await manager.listBackups();

      // Assert
      expect(backups[0].id).toBe(manifest2.id);
      expect(backups[1].id).toBe(manifest1.id);
    });
  });
});
