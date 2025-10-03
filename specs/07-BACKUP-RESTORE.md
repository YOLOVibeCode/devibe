# Backup and Restore Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines the comprehensive backup and restore system that ensures all UnVibe operations are safely reversible.

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-6.1**: Backup Strategy
- **FR-6.2**: Backup Contents
- **FR-6.3**: Restore Capabilities
- **FR-6.4**: Backup Pruning

### 2.2 Safety Requirements

- **S-2**: Backup Requirements (NON-NEGOTIABLE)
- **S-5**: Reversibility

---

## 3. Backup Architecture

### 3.1 Backup Structure

```
.unvibe/backups/
└── {timestamp}-{operation}/
    ├── manifest.json          # Complete backup manifest
    ├── metadata.json          # Operation metadata
    ├── root/                  # Root repository files
    │   ├── file1.js
    │   └── file2.md
    ├── api/                   # Sub-repository files
    │   └── controller.js
    └── web/                   # Sub-repository files
        └── component.tsx
```

### 3.2 Backup Manifest Structure

```typescript
interface BackupManifest {
  version: string;                    // Manifest version
  timestamp: string;                  // ISO timestamp
  operationType: 'distribution' | 'cleanup' | 'full';
  mode: 'interactive' | 'yolo';
  
  // Repository state
  repositories: RepositorySnapshot[];
  
  // Backed up files
  entries: BackupEntry[];
  
  // Operation plans
  distributionPlan?: DistributionPlan;
  cleanupPlan?: CleanupPlan;
  
  // Metadata
  totalFiles: number;
  totalSize: number;
  aiEnabled: boolean;
}

interface RepositorySnapshot {
  path: string;
  name: string;
  gitBranch: string;
  gitCommit: string;
  gitStatus: string;             // Clean, modified, etc.
}

interface BackupEntry {
  originalPath: string;          // Where file was
  backupPath: string;            // Where it's backed up
  operation: 'delete' | 'move' | 'overwrite';
  hash: string;                  // SHA-256 hash
  size: number;
  timestamp: string;
  metadata: {
    isGitTracked: boolean;
    lastModified: string;
    permissions: string;
  };
}
```

---

## 4. Backup Manager Implementation

### 4.1 Core Backup Manager

```typescript
class BackupManager {
  private backupRoot = '.unvibe/backups';
  
  async createBackup(
    operationType: 'distribution' | 'cleanup' | 'full',
    mode: 'interactive' | 'yolo',
    context: BackupContext
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${timestamp}-${operationType}`;
    const backupDir = path.join(this.backupRoot, backupId);
    
    await fs.ensureDir(backupDir);
    
    // Create repository snapshots
    const repoSnapshots = await this.snapshotRepositories(context.repositories);
    
    // Create manifest
    const manifest: BackupManifest = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      operationType,
      mode,
      repositories: repoSnapshots,
      entries: [],
      distributionPlan: context.distributionPlan,
      cleanupPlan: context.cleanupPlan,
      totalFiles: 0,
      totalSize: 0,
      aiEnabled: context.aiEnabled
    };
    
    // Save manifest
    await this.saveManifest(backupDir, manifest);
    
    return backupId;
  }
  
  async backupFile(
    backupId: string,
    filePath: string,
    operation: 'delete' | 'move' | 'overwrite'
  ): Promise<void> {
    const backupDir = path.join(this.backupRoot, backupId);
    const manifest = await this.loadManifest(backupDir);
    
    // Determine backup location
    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(backupDir, relativePath);
    
    // Copy file to backup
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copy(filePath, backupPath, { preserveTimestamps: true });
    
    // Get file metadata
    const stat = await fs.stat(filePath);
    const hash = await this.hashFile(filePath);
    
    // Get git status
    const isGitTracked = await this.isGitTracked(filePath);
    
    // Create backup entry
    const entry: BackupEntry = {
      originalPath: filePath,
      backupPath: relativePath,
      operation,
      hash,
      size: stat.size,
      timestamp: new Date().toISOString(),
      metadata: {
        isGitTracked,
        lastModified: stat.mtime.toISOString(),
        permissions: stat.mode.toString(8)
      }
    };
    
    // Update manifest
    manifest.entries.push(entry);
    manifest.totalFiles++;
    manifest.totalSize += stat.size;
    
    await this.saveManifest(backupDir, manifest);
  }
  
  async backupFiles(backupId: string, files: FileOperation[]): Promise<void> {
    const progress = new ProgressDisplay();
    progress.startProgress(files.length, 'Backing up files');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await this.backupFile(backupId, file.source, file.type);
      progress.updateProgress(i + 1);
    }
    
    progress.stopProgress();
  }
  
  private async snapshotRepositories(repos: Repository[]): Promise<RepositorySnapshot[]> {
    const snapshots: RepositorySnapshot[] = [];
    
    for (const repo of repos) {
      const git = simpleGit(repo.path);
      
      try {
        const status = await git.status();
        const branch = await git.branch();
        const log = await git.log({ maxCount: 1 });
        
        snapshots.push({
          path: repo.path,
          name: repo.name,
          gitBranch: branch.current,
          gitCommit: log.latest?.hash || 'unknown',
          gitStatus: status.isClean() ? 'clean' : 'modified'
        });
      } catch {
        snapshots.push({
          path: repo.path,
          name: repo.name,
          gitBranch: 'unknown',
          gitCommit: 'unknown',
          gitStatus: 'unknown'
        });
      }
    }
    
    return snapshots;
  }
  
  private async hashFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }
  
  private async isGitTracked(filePath: string): Promise<boolean> {
    // Find repository root
    let dir = path.dirname(filePath);
    while (dir !== path.dirname(dir)) {
      if (await fs.pathExists(path.join(dir, '.git'))) {
        break;
      }
      dir = path.dirname(dir);
    }
    
    try {
      const git = simpleGit(dir);
      const relativePath = path.relative(dir, filePath);
      const result = await git.raw(['ls-files', '--', relativePath]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }
  
  private async loadManifest(backupDir: string): Promise<BackupManifest> {
    const manifestPath = path.join(backupDir, 'manifest.json');
    return JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  }
  
  private async saveManifest(backupDir: string, manifest: BackupManifest): Promise<void> {
    const manifestPath = path.join(backupDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

interface BackupContext {
  repositories: Repository[];
  distributionPlan?: DistributionPlan;
  cleanupPlan?: CleanupPlan;
  aiEnabled: boolean;
}

interface FileOperation {
  source: string;
  target?: string;
  type: 'delete' | 'move' | 'overwrite';
}
```

---

## 5. Restore System

### 5.1 Restore Manager

```typescript
class RestoreManager {
  private backupRoot = '.unvibe/backups';
  
  async restore(backupId: string, options: RestoreOptions = {}): Promise<RestoreResult> {
    const backupDir = path.join(this.backupRoot, backupId);
    
    if (!await fs.pathExists(backupDir)) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    const manifest = await this.loadManifest(backupDir);
    
    console.log(chalk.bold('\n🔄 Restoring from backup'));
    console.log(chalk.dim(`Backup: ${backupId}`));
    console.log(chalk.dim(`Files: ${manifest.totalFiles}`));
    console.log('');
    
    // Filter entries if needed
    let entriesToRestore = manifest.entries;
    
    if (options.filePattern) {
      entriesToRestore = entriesToRestore.filter(e => 
        minimatch(e.originalPath, options.filePattern!)
      );
    }
    
    if (options.repository) {
      entriesToRestore = entriesToRestore.filter(e =>
        e.originalPath.startsWith(options.repository!)
      );
    }
    
    if (options.distributionOnly) {
      // Only restore files from distribution operation
      entriesToRestore = entriesToRestore.filter(e =>
        e.operation === 'move' && manifest.operationType === 'distribution'
      );
    }
    
    // Confirm restore
    if (!options.skipConfirm) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Restore ${entriesToRestore.length} files?`,
        default: true
      }]);
      
      if (!confirm) {
        return { success: false, filesRestored: 0, message: 'Restore cancelled' };
      }
    }
    
    // Restore files
    const progress = new ProgressDisplay();
    progress.startProgress(entriesToRestore.length, 'Restoring files');
    
    let filesRestored = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < entriesToRestore.length; i++) {
      const entry = entriesToRestore[i];
      
      try {
        await this.restoreEntry(backupDir, entry, options);
        filesRestored++;
      } catch (error) {
        errors.push(`${entry.originalPath}: ${error.message}`);
      }
      
      progress.updateProgress(i + 1);
    }
    
    progress.stopProgress();
    
    if (errors.length > 0) {
      console.log(chalk.yellow(`\n⚠ ${errors.length} files failed to restore:`));
      for (const error of errors.slice(0, 5)) {
        console.log(chalk.dim(`  ${error}`));
      }
      if (errors.length > 5) {
        console.log(chalk.dim(`  ... and ${errors.length - 5} more`));
      }
    }
    
    console.log(chalk.green(`\n✓ Restored ${filesRestored} files`));
    
    return {
      success: errors.length === 0,
      filesRestored,
      errors,
      message: errors.length === 0 
        ? 'Restore completed successfully' 
        : `Restore completed with ${errors.length} errors`
    };
  }
  
  private async restoreEntry(
    backupDir: string,
    entry: BackupEntry,
    options: RestoreOptions
  ): Promise<void> {
    const backupPath = path.join(backupDir, entry.backupPath);
    const targetPath = entry.originalPath;
    
    // Check if target exists
    const targetExists = await fs.pathExists(targetPath);
    
    if (targetExists && !options.overwrite) {
      if (options.skipExisting) {
        return; // Skip
      }
      
      // Verify hash
      const currentHash = await this.hashFile(targetPath);
      if (currentHash === entry.hash) {
        return; // File unchanged, skip
      }
      
      throw new Error('Target file exists and differs from backup');
    }
    
    // Restore file
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(backupPath, targetPath, { 
      preserveTimestamps: true,
      overwrite: options.overwrite 
    });
    
    // Restore permissions
    if (entry.metadata.permissions) {
      await fs.chmod(targetPath, parseInt(entry.metadata.permissions, 8));
    }
    
    // If file was git-tracked, add it back
    if (entry.metadata.isGitTracked) {
      await this.addToGit(targetPath);
    }
  }
  
  private async addToGit(filePath: string): Promise<void> {
    // Find repository root
    let dir = path.dirname(filePath);
    while (dir !== path.dirname(dir)) {
      if (await fs.pathExists(path.join(dir, '.git'))) {
        break;
      }
      dir = path.dirname(dir);
    }
    
    try {
      const git = simpleGit(dir);
      const relativePath = path.relative(dir, filePath);
      await git.add(relativePath);
    } catch {
      // Ignore git errors
    }
  }
  
  async listBackups(): Promise<BackupInfo[]> {
    if (!await fs.pathExists(this.backupRoot)) {
      return [];
    }
    
    const backupDirs = await fs.readdir(this.backupRoot);
    const backups: BackupInfo[] = [];
    
    for (const dir of backupDirs) {
      const backupDir = path.join(this.backupRoot, dir);
      const stat = await fs.stat(backupDir);
      
      if (!stat.isDirectory()) continue;
      
      try {
        const manifest = await this.loadManifest(backupDir);
        
        backups.push({
          id: dir,
          timestamp: new Date(manifest.timestamp),
          operationType: manifest.operationType,
          mode: manifest.mode,
          totalFiles: manifest.totalFiles,
          totalSize: manifest.totalSize,
          repositories: manifest.repositories.map(r => r.name)
        });
      } catch {
        // Skip invalid backups
      }
    }
    
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async getLastBackup(): Promise<string | null> {
    const backups = await this.listBackups();
    return backups.length > 0 ? backups[0].id : null;
  }
  
  async pruneOldBackups(keepCount: number = 5): Promise<number> {
    const backups = await this.listBackups();
    
    if (backups.length <= keepCount) {
      return 0;
    }
    
    const toDelete = backups.slice(keepCount);
    
    for (const backup of toDelete) {
      const backupDir = path.join(this.backupRoot, backup.id);
      await fs.remove(backupDir);
    }
    
    return toDelete.length;
  }
  
  private async loadManifest(backupDir: string): Promise<BackupManifest> {
    const manifestPath = path.join(backupDir, 'manifest.json');
    return JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  }
  
  private async hashFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }
}

interface RestoreOptions {
  overwrite?: boolean;
  skipExisting?: boolean;
  skipConfirm?: boolean;
  filePattern?: string;
  repository?: string;
  distributionOnly?: boolean;
}

interface RestoreResult {
  success: boolean;
  filesRestored: number;
  errors?: string[];
  message: string;
}

interface BackupInfo {
  id: string;
  timestamp: Date;
  operationType: string;
  mode: string;
  totalFiles: number;
  totalSize: number;
  repositories: string[];
}
```

---

## 6. CLI Commands

### 6.1 Restore Commands

```typescript
// Restore from last backup
program
  .command('restore')
  .description('Restore from backup')
  .option('--last', 'Restore from last backup')
  .option('--from <id>', 'Restore from specific backup ID')
  .option('--list', 'List available backups')
  .option('--distribution', 'Only restore distribution changes')
  .option('--repo <path>', 'Only restore specific repository')
  .option('--overwrite', 'Overwrite existing files')
  .option('--yes', 'Skip confirmation')
  .action(async (options) => {
    const restoreManager = new RestoreManager();
    
    if (options.list) {
      const backups = await restoreManager.listBackups();
      displayBackupList(backups);
      return;
    }
    
    let backupId: string | null;
    
    if (options.from) {
      backupId = options.from;
    } else if (options.last) {
      backupId = await restoreManager.getLastBackup();
      if (!backupId) {
        console.error(chalk.red('No backups found'));
        process.exit(1);
      }
    } else {
      // Interactive selection
      const backups = await restoreManager.listBackups();
      if (backups.length === 0) {
        console.error(chalk.red('No backups found'));
        process.exit(1);
      }
      
      const { selected } = await inquirer.prompt([{
        type: 'list',
        name: 'selected',
        message: 'Select backup to restore:',
        choices: backups.map(b => ({
          name: `${b.id} (${b.totalFiles} files, ${formatBytes(b.totalSize)})`,
          value: b.id
        }))
      }]);
      
      backupId = selected;
    }
    
    await restoreManager.restore(backupId, {
      distributionOnly: options.distribution,
      repository: options.repo,
      overwrite: options.overwrite,
      skipConfirm: options.yes
    });
  });

function displayBackupList(backups: BackupInfo[]): void {
  if (backups.length === 0) {
    console.log(chalk.dim('No backups found'));
    return;
  }
  
  console.log(chalk.bold('\n📦 Available Backups'));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');
  
  const table = new Table({
    head: ['ID', 'Date', 'Type', 'Files', 'Size'].map(h => chalk.bold(h)),
    colWidths: [25, 20, 15, 10, 15]
  });
  
  for (const backup of backups) {
    table.push([
      backup.id,
      formatDate(backup.timestamp),
      backup.operationType,
      backup.totalFiles.toString(),
      formatBytes(backup.totalSize)
    ]);
  }
  
  console.log(table.toString());
  console.log('');
}
```

---

## 7. Safety Guarantees

### 7.1 Backup Guarantees

```typescript
class BackupSafetyGuard {
  // GUARANTEE 1: ALL deletions MUST be backed up
  async ensureDeletionBackup(filePath: string, backupId: string): Promise<void> {
    const backupManager = new BackupManager();
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    await backupManager.backupFile(backupId, filePath, 'delete');
  }
  
  // GUARANTEE 2: ALL moves MUST be backed up
  async ensureMoveBackup(sourcePath: string, backupId: string): Promise<void> {
    const backupManager = new BackupManager();
    
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`File does not exist: ${sourcePath}`);
    }
    
    await backupManager.backupFile(backupId, sourcePath, 'move');
  }
  
  // GUARANTEE 3: ALL overwrites MUST backup existing file
  async ensureOverwriteBackup(targetPath: string, backupId: string): Promise<void> {
    const backupManager = new BackupManager();
    
    if (await fs.pathExists(targetPath)) {
      await backupManager.backupFile(backupId, targetPath, 'overwrite');
    }
  }
  
  // GUARANTEE 4: Backups are never auto-deleted
  async ensureBackupRetention(): Promise<void> {
    // Backups can ONLY be deleted manually via explicit command
    // This is enforced by NOT having auto-cleanup logic
  }
  
  // GUARANTEE 5: All operations are reversible
  async verifyReversibility(backupId: string): Promise<boolean> {
    const restoreManager = new RestoreManager();
    const backupDir = path.join('.unvibe/backups', backupId);
    
    // Verify manifest exists
    const manifestPath = path.join(backupDir, 'manifest.json');
    if (!await fs.pathExists(manifestPath)) {
      return false;
    }
    
    // Verify all backup files exist
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    for (const entry of manifest.entries) {
      const backupPath = path.join(backupDir, entry.backupPath);
      if (!await fs.pathExists(backupPath)) {
        return false;
      }
    }
    
    return true;
  }
}
```

---

## 8. Testing

### 8.1 Backup Tests

```typescript
describe('Backup System', () => {
  test('creates backup before deletion', async () => {
    const manager = new BackupManager();
    const backupId = await manager.createBackup('cleanup', 'interactive', context);
    await manager.backupFile(backupId, '/path/to/file.js', 'delete');
    
    // Verify backup exists
    const backupPath = path.join('.unvibe/backups', backupId, 'path/to/file.js');
    expect(await fs.pathExists(backupPath)).toBe(true);
  });
  
  test('restores files correctly', async () => {
    const manager = new RestoreManager();
    await manager.restore(backupId, { skipConfirm: true });
    
    // Verify file restored
    expect(await fs.pathExists('/path/to/file.js')).toBe(true);
  });
  
  test('preserves file metadata', async () => {
    const manager = new BackupManager();
    const backupId = await manager.createBackup('test', 'interactive', context);
    await manager.backupFile(backupId, '/path/to/file.js', 'delete');
    
    const manifest = await manager['loadManifest'](
      path.join('.unvibe/backups', backupId)
    );
    
    const entry = manifest.entries[0];
    expect(entry.hash).toBeDefined();
    expect(entry.metadata.lastModified).toBeDefined();
    expect(entry.metadata.permissions).toBeDefined();
  });
  
  test('lists backups chronologically', async () => {
    const manager = new RestoreManager();
    const backups = await manager.listBackups();
    
    for (let i = 1; i < backups.length; i++) {
      expect(backups[i-1].timestamp.getTime()).toBeGreaterThanOrEqual(
        backups[i].timestamp.getTime()
      );
    }
  });
});
```

---

**Document Status:** Complete  
**Implementation Priority:** Phase 7 (Week 9)  
**Dependencies:** File Operations, Git Detection

