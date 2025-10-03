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
import type { TestOrganizer } from './test-organizer.js';
import type { UsageDetector } from './usage-detector.js';

export class OperationPlanner implements ICanPlanOperations {
  constructor(
    private gitDetector: GitDetector,
    private fileClassifier: FileClassifier,
    private usageDetector?: UsageDetector,
    private testOrganizer?: TestOrganizer
  ) {}

  async planRootFileDistribution(rootPath: string, onProgress?: (current: number, total: number, file: string) => void): Promise<OperationPlan> {
    const operations: FileOperation[] = [];
    const warnings: string[] = [];
    const gitResult = await this.gitDetector.detectRepositories(rootPath);

    if (!gitResult.rootRepo) {
      return {
        operations: [],
        backupRequired: false,
        estimatedDuration: 0,
        warnings: [],
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
        e.name !== 'tsconfig.json' &&
        e.name !== 'README.md' &&  // Keep main README at root
        e.name !== 'LICENSE' &&     // Keep license at root
        e.name !== '.gitignore'
    );

    const totalFiles = rootFiles.length;
    let currentFile = 0;

    for (const file of rootFiles) {
      currentFile++;
      if (onProgress) {
        onProgress(currentFile, totalFiles, file.name);
      }
      const filePath = path.join(rootPath, file.name);
      const ext = path.extname(file.name);

      // Fast path for markdown files - they almost always go to documents/
      if (ext === '.md') {
        const targetRepo = gitResult.rootRepo;
        operations.push({
          type: 'move',
          sourcePath: filePath,
          targetPath: path.join(targetRepo.path, 'documents', file.name),
          reason: 'Markdown documentation file',
          isReferenced: false,
        });
        continue; // Skip AI analysis
      }

      // Fast path for JSON files - categorize and handle appropriately
      if (ext === '.json') {
        const lowerName = file.name.toLowerCase();
        
        // Keep essential config files at root
        if (lowerName === 'version.json' || 
            lowerName === 'package.json' || 
            lowerName === 'tsconfig.json' ||
            lowerName.endsWith('config.json')) {
          continue; // Skip - keep at root
        }
        
        // Test output files (reports, results, dumps) - delete by default
        if (lowerName.includes('test') || 
            lowerName.includes('report') || 
            lowerName.includes('result') ||
            lowerName.includes('dump') ||
            lowerName.includes('diagnostic') ||
            lowerName.includes('analysis') ||
            lowerName.endsWith('-output.json')) {
          
          operations.push({
            type: 'delete',
            sourcePath: filePath,
            reason: `Test output/report file (pattern: *${lowerName.match(/(test|report|result|dump|diagnostic|analysis)/)?.[0]}*.json)`,
            isReferenced: false,
          });
          continue; // Skip AI analysis
        }
        
        // Other JSON files - might be fixtures or data, move to tests/fixtures/
        operations.push({
          type: 'move',
          sourcePath: filePath,
          targetPath: path.join(gitResult.rootRepo.path, 'tests', 'fixtures', file.name),
          reason: 'JSON data/fixture file',
          isReferenced: false,
        });
        continue; // Skip AI analysis
      }

      // Fast path for obvious test/utility scripts
      const lowerName = file.name.toLowerCase();
      if ((ext === '.js' || ext === '.ts') && 
          (lowerName.startsWith('test-') || lowerName.startsWith('check-') || 
           lowerName.startsWith('debug-') || lowerName.startsWith('cleanup-') ||
           lowerName.startsWith('verify-') || lowerName.startsWith('cache-') ||
           lowerName.startsWith('query-'))) {
        
        // These are utility/test scripts - offer to delete if not referenced
        let isReferenced = false;
        if (this.usageDetector) {
          try {
            const usageResult = await this.usageDetector.checkFileUsage(filePath, [rootPath]);
            isReferenced = usageResult.isReferenced;
            if (isReferenced) {
              warnings.push(`⚠️  ${file.name} is still referenced - keeping`);
            }
          } catch {}
        }
        
        if (!isReferenced) {
          operations.push({
            type: 'delete',
            sourcePath: filePath,
            reason: `Utility script (pattern: ${lowerName.split('-')[0]}-*)`,
            isReferenced: false,
          });
        } else {
          // Still referenced, move to tests/
          const targetRepo = gitResult.rootRepo;
          operations.push({
            type: 'move',
            sourcePath: filePath,
            targetPath: path.join(targetRepo.path, 'tests', file.name),
            reason: `Test/utility script still in use`,
            warning: 'Still referenced',
            isReferenced: true,
          });
        }
        continue; // Skip AI analysis
      }

      // For everything else, use normal classification
      let content: string | undefined;
      try {
        const stats = await fs.stat(filePath);
        if (stats.size < 100000) { // Only read files < 100KB
          content = await fs.readFile(filePath, 'utf-8');
        }
      } catch {
        // Can't read file, continue without content
      }

      const classification = await this.fileClassifier.classify(filePath, content);

      // Check if file is still being used (if usage detector is available)
      // Only check for files that might be deleted (utility scripts)
      let isReferenced = false;
      let usageWarning: string | undefined;
      if (this.usageDetector && this.isUtilityFile(file.name, classification)) {
        try {
          const startTime = Date.now();
          if (onProgress) {
            // Show we're checking usage
            const tempProgress = `(checking usage...)`;
          }
          const usageResult = await this.usageDetector.checkFileUsage(
            filePath,
            [rootPath] // Search entire repository
          );
          const checkTime = Date.now() - startTime;
          isReferenced = usageResult.isReferenced;
          if (isReferenced) {
            usageWarning = `Still referenced in ${usageResult.references.length} file(s)`;
            warnings.push(`⚠️  ${file.name} is still referenced - recommend keeping (check took ${checkTime}ms)`);
          }
        } catch {
          // Usage detection failed, continue
        }
      }

      // Suggest location based on file category and content (AI-powered for monorepos)
      const suggestedLocation = await this.fileClassifier.suggestLocation(
        classification,
        gitResult.repositories,
        content
      );

      // If we can suggest a location, plan the move (or delete if no location and utility)
      if (suggestedLocation && suggestedLocation !== filePath) {
        operations.push({
          type: 'move',
          sourcePath: filePath,
          targetPath: suggestedLocation,
          reason: `${classification.category} file (${classification.reasoning})`,
          warning: usageWarning,
          isReferenced,
        });
      } else if (!isReferenced && this.isUtilityFile(file.name, classification)) {
        // Utility files that aren't referenced can be deleted
        operations.push({
          type: 'delete',
          sourcePath: filePath,
          reason: `Unused ${classification.category} file (${classification.reasoning})`,
          isReferenced: false,
        });
      }
    }

    return {
      operations,
      backupRequired: operations.length > 0,
      estimatedDuration: operations.length * 50, // 50ms per operation estimate
      warnings,
    };
  }

  private isUtilityFile(fileName: string, classification: any): boolean {
    const lower = fileName.toLowerCase();
    // Utility patterns that suggest file might be temporary/debugging
    const utilityPatterns = [
      'temp-',
      'tmp-',
      'debug-',
      'test-',
      'check-',
      'cache-',
      'cleanup-',
      'verify-',
      'query-',
    ];
    return utilityPatterns.some(pattern => lower.startsWith(pattern)) ||
           (classification.category === 'script' && classification.confidence < 0.7);
  }

  async planFolderEnforcement(repoPath: string): Promise<OperationPlan> {
    const operations: FileOperation[] = [];
    const warnings: string[] = [];
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
      warnings,
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

  /**
   * Plan test file organization based on configuration
   */
  async planTestOrganization(rootPath: string): Promise<OperationPlan> {
    if (!this.testOrganizer) {
      return {
        operations: [],
        backupRequired: false,
        estimatedDuration: 0,
        warnings: [],
      };
    }

    return this.testOrganizer.planTestOrganization(rootPath);
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
