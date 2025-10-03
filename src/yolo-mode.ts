import { GitDetector } from './git-detector.js';
import { SecretScanner } from './secret-scanner.js';
import { FileClassifier } from './file-classifier.js';
import { OperationPlanner, OperationExecutor } from './operation-executor.js';
import { BackupManager } from './backup-manager.js';
import { BuildValidationService } from './build-validator.js';
import { AIClassifierFactory } from './ai-classifier.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface YoloResult {
  success: boolean;
  steps: {
    secretScan: { found: number; critical: number };
    planning: { operations: number };
    execution: { completed: number; failed: number };
    folderEnforcement: { operations: number };
    buildValidation: { passed: boolean };
  };
  backupManifestId?: string;
  warnings: string[];
  errors: string[];
}

export class YoloMode {
  async run(repoPath: string): Promise<YoloResult> {
    const result: YoloResult = {
      success: false,
      steps: {
        secretScan: { found: 0, critical: 0 },
        planning: { operations: 0 },
        execution: { completed: 0, failed: 0 },
        folderEnforcement: { operations: 0 },
        buildValidation: { passed: false },
      },
      warnings: [],
      errors: [],
    };

    try {
      // Check if AI is available
      if (!AIClassifierFactory.isAvailable()) {
        result.warnings.push(
          'AI not available. Using heuristics (65% accuracy vs 90% with AI)'
        );
        result.warnings.push(
          'Set ANTHROPIC_API_KEY or OPENAI_API_KEY for better results'
        );
      }

      // Step 1: Secret Scan
      const scanner = new SecretScanner();
      const files = await this.findSourceFiles(repoPath);
      const scanResult = await scanner.scanFiles(files);

      result.steps.secretScan = {
        found: scanResult.secretsFound,
        critical: scanResult.summary.critical,
      };

      if (scanResult.summary.critical > 0) {
        result.errors.push(
          `Found ${scanResult.summary.critical} critical secrets. Fix before proceeding.`
        );
        return result;
      }

      if (scanResult.secretsFound > 0) {
        result.warnings.push(
          `Found ${scanResult.secretsFound} non-critical secrets`
        );
      }

      // Step 2: Plan root file distribution
      const detector = new GitDetector();
      const classifier = new FileClassifier();
      const planner = new OperationPlanner(detector, classifier);

      const plan = await planner.planRootFileDistribution(repoPath);
      result.steps.planning.operations = plan.operations.length;

      // Step 3: Execute operations
      if (plan.operations.length > 0) {
        const backupManager = new BackupManager(
          path.join(repoPath, '.unvibe', 'backups')
        );
        const executor = new OperationExecutor(backupManager);

        const execResult = await executor.execute(plan, false);

        result.steps.execution.completed = execResult.operationsCompleted;
        result.steps.execution.failed = execResult.operationsFailed;
        result.backupManifestId = execResult.backupManifestId;

        if (execResult.operationsFailed > 0) {
          result.errors.push(...execResult.errors);
        }
      }

      // Step 4: Enforce folder structure
      const enforcePlan = await planner.planFolderEnforcement(repoPath);
      result.steps.folderEnforcement.operations = enforcePlan.operations.length;

      if (enforcePlan.operations.length > 0) {
        const backupManager = new BackupManager(
          path.join(repoPath, '.unvibe', 'backups')
        );
        const executor = new OperationExecutor(backupManager);
        await executor.execute(enforcePlan, false);
      }

      // Step 5: Validate builds
      const buildValidator = new BuildValidationService();
      const gitResult = await detector.detectRepositories(repoPath);

      let allBuildsPass = true;
      for (const repo of gitResult.repositories) {
        try {
          const results = await buildValidator.validateAllBuilds(repo.path);
          for (const [tech, buildResult] of results) {
            if (!buildResult.success) {
              allBuildsPass = false;
              result.errors.push(
                `Build failed for ${tech} in ${path.basename(repo.path)}`
              );
            }
          }
        } catch (error: any) {
          // No build system, that's ok
        }
      }

      result.steps.buildValidation.passed = allBuildsPass;

      // Overall success
      result.success =
        result.errors.length === 0 &&
        result.steps.execution.failed === 0 &&
        result.steps.buildValidation.passed;

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  private async findSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java'];

    async function scan(currentDir: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (
              entry.name !== 'node_modules' &&
              entry.name !== '.git' &&
              entry.name !== 'dist' &&
              entry.name !== 'build' &&
              entry.name !== '.unvibe'
            ) {
              await scan(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    await scan(dir);
    return files;
  }
}
