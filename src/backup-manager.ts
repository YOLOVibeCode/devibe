import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type {
  BackupEntry,
  BackupManifest,
  ICanBackupFiles,
  ICanRestoreFiles,
} from './types.js';

export class BackupManager implements ICanBackupFiles, ICanRestoreFiles {
  constructor(private backupDir: string) {}

  async backupFile(
    filePath: string,
    operation: 'move' | 'delete' | 'modify'
  ): Promise<BackupEntry> {
    await this.ensureBackupDir();

    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const id = randomUUID();

    const entry: BackupEntry = {
      id,
      timestamp: new Date(),
      operation,
      sourcePath: filePath,
      content,
      metadata: {
        size: stats.size,
        mode: stats.mode,
      },
    };

    // Store backup on disk
    const backupPath = path.join(this.backupDir, id);
    await fs.writeFile(backupPath, content);

    return entry;
  }

  async createManifest(operations: BackupEntry[]): Promise<BackupManifest> {
    await this.ensureBackupDir();

    const manifest: BackupManifest = {
      id: randomUUID(),
      timestamp: new Date(),
      operations,
      reversible: true,
    };

    // Persist manifest
    const manifestPath = path.join(this.backupDir, `${manifest.id}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
  }

  async restore(manifestId: string): Promise<void> {
    const manifestPath = path.join(this.backupDir, `${manifestId}.json`);
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: BackupManifest = JSON.parse(manifestContent);

    for (const operation of manifest.operations) {
      await this.restoreOperation(operation);
    }
  }

  private async restoreOperation(operation: BackupEntry): Promise<void> {
    const backupPath = path.join(this.backupDir, operation.id);
    const content = await fs.readFile(backupPath, 'utf-8');

    // Ensure parent directory exists
    const parentDir = path.dirname(operation.sourcePath);
    await fs.mkdir(parentDir, { recursive: true });

    // Restore the file
    await fs.writeFile(operation.sourcePath, content);

    // Restore permissions
    await fs.chmod(operation.sourcePath, operation.metadata.mode);
  }

  async listBackups(): Promise<BackupManifest[]> {
    await this.ensureBackupDir();

    try {
      const files = await fs.readdir(this.backupDir);
      const manifestFiles = files.filter((f) => f.endsWith('.json'));

      const manifests: BackupManifest[] = [];

      for (const file of manifestFiles) {
        const manifestPath = path.join(this.backupDir, file);
        const content = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);
        // Convert timestamp string back to Date
        manifest.timestamp = new Date(manifest.timestamp);
        manifest.operations = manifest.operations.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
        manifests.push(manifest);
      }

      // Sort by timestamp (newest first)
      manifests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return manifests;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }
}
