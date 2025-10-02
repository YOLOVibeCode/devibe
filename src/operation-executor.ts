import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  FileOperation,
  OperationPlan,
  ExecutionResult,
  ICanPlanOperations,
  ICanExecuteOperations,
  GitRepository,
} from './types.js';
import type { GitDetector } from './git-detector.js';
import type { FileClassifier } from './file-classifier.js';
import type { BackupManager } from './backup-manager.js';

export class OperationPlanner implements ICanPlanOperations {
  constructor(
    private gitDetector: GitDetector,
    private fileClassifier: FileClassifier
  ) {}

  async planRootFileDistribution(rootPath: string): Promise<OperationPlan> {
    const operations: FileOperation[] = [];
    const gitResult = await this.gitDetector.detectRepositories(rootPath);

    if (!gitResult.rootRepo) {
      return {
        operations: [],
        backupRequired: false,
        estimatedDuration: 0,
      };
    }

    // Find root-level files (excluding common system files)
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const rootFiles = entries.filter(
      (e) =>
        e.isFile() &&
        !e.name.startsWith('.') &&
        e.name !== 'package.json' &&
        e.name !== 'package-lock.json' &&
        e.name !== 'tsconfig.json'
    );

    for (const file of rootFiles) {
      const filePath = path.join(rootPath, file.name);
      const classification = await this.fileClassifier.classify(filePath);

      // Suggest location based on file category
      const suggestedLocation = this.fileClassifier.suggestLocation(
        classification,
        gitResult.repositories
      );

      // If we can suggest a location, plan the move
      if (suggestedLocation && suggestedLocation !== filePath) {
        operations.push({
          type: 'move',
          sourcePath: filePath,
          targetPath: suggestedLocation,
          reason: `${classification.category} file (${classification.reasoning})`,
        });
      }
    }

    return {
      operations,
      backupRequired: operations.length > 0,
      estimatedDuration: operations.length * 50, // 50ms per operation estimate
    };
  }

  async planFolderEnforcement(repoPath: string): Promise<OperationPlan> {
    const operations: FileOperation[] = [];
    const requiredFolders = ['scripts', 'documents'];

    // Check which folders need to be created
    for (const folder of requiredFolders) {
      const folderPath = path.join(repoPath, folder);
      const exists = await this.pathExists(folderPath);

      if (!exists) {
        operations.push({
          type: 'create',
          sourcePath: folderPath,
          reason: `Enforce repository structure: ${folder}/ folder`,
        });
      }
    }

    // Find scripts in root and plan to move them
    const entries = await fs.readdir(repoPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && this.isScript(entry.name)) {
        const sourcePath = path.join(repoPath, entry.name);
        const targetPath = path.join(repoPath, 'scripts', entry.name);

        operations.push({
          type: 'move',
          sourcePath,
          targetPath,
          reason: 'Move script to scripts/ folder',
        });
      }
    }

    return {
      operations,
      backupRequired: operations.some((op) => op.type === 'move'),
      estimatedDuration: operations.length * 50,
    };
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private isScript(filename: string): boolean {
    return (
      filename.endsWith('.sh') ||
      filename.endsWith('.bash') ||
      filename.endsWith('.py') ||
      filename.endsWith('.rb')
    );
  }
}

export class OperationExecutor implements ICanExecuteOperations {
  constructor(private backupManager: BackupManager) {}

  async execute(
    plan: OperationPlan,
    dryRun: boolean
  ): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: true,
      operationsCompleted: 0,
      operationsFailed: 0,
      errors: [],
    };

    if (dryRun) {
      // In dry-run, just report what would be done
      result.operationsCompleted = plan.operations.length;
      return result;
    }

    // Create backups if needed
    const backupEntries = [];
    if (plan.backupRequired) {
      for (const op of plan.operations) {
        if (op.type === 'move' || op.type === 'delete') {
          try {
            const exists = await this.fileExists(op.sourcePath);
            if (exists) {
              const entry = await this.backupManager.backupFile(
                op.sourcePath,
                op.type
              );
              backupEntries.push(entry);
            }
          } catch (error: any) {
            result.errors.push(`Backup failed for ${op.sourcePath}: ${error.message}`);
          }
        }
      }

      if (backupEntries.length > 0) {
        const manifest = await this.backupManager.createManifest(backupEntries);
        result.backupManifestId = manifest.id;
      }
    }

    // Execute operations
    for (const op of plan.operations) {
      try {
        await this.executeOperation(op);
        result.operationsCompleted++;
      } catch (error: any) {
        result.operationsFailed++;
        result.errors.push(`${op.type} ${op.sourcePath}: ${error.message}`);
        result.success = false;
      }
    }

    return result;
  }

  private async executeOperation(op: FileOperation): Promise<void> {
    switch (op.type) {
      case 'move':
        if (!op.targetPath) {
          throw new Error('Target path required for move operation');
        }
        await this.moveFile(op.sourcePath, op.targetPath);
        break;

      case 'delete':
        await fs.unlink(op.sourcePath);
        break;

      case 'create':
        await fs.mkdir(op.sourcePath, { recursive: true });
        break;
    }
  }

  private async moveFile(source: string, target: string): Promise<void> {
    // Ensure target directory exists
    const targetDir = path.dirname(target);
    await fs.mkdir(targetDir, { recursive: true });

    // Move the file
    await fs.rename(source, target);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
