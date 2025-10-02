// Public API exports
export { GitDetector } from './git-detector.js';
export { SecretScanner } from './secret-scanner.js';
export { BUILT_IN_PATTERNS } from './secret-patterns.js';
export { BackupManager } from './backup-manager.js';
export {
  BuildDetector,
  BuildValidationService,
  NodeJSBuildValidator,
  DockerBuildValidator,
  PythonBuildValidator,
  GoBuildValidator,
} from './build-validator.js';
export { FileClassifier } from './file-classifier.js';
export { ScriptClassifier } from './script-classifier.js';
export { OperationPlanner, OperationExecutor } from './operation-executor.js';
export type {
  GitRepository,
  GitDetectionResult,
  SecretFinding,
  SecretScanResult,
  SecretPattern,
  SecretSeverity,
  BackupEntry,
  BackupManifest,
  BuildTechnology,
  BuildValidator,
  BuildResult,
  FileCategory,
  FileClassification,
  ScriptType,
  ScriptClassification,
  FileOperation,
  OperationPlan,
  ExecutionResult,
  ICanDetectGitRepositories,
  ICanValidateGitBoundaries,
  ICanScanForSecrets,
  ICanMatchSecretPatterns,
  ICanAnalyzeEntropy,
  ICanBackupFiles,
  ICanRestoreFiles,
  ICanDetectBuildSystem,
  ICanValidateBuilds,
  ICanClassifyFiles,
  ICanSuggestFileLocations,
  ICanClassifyScripts,
  ICanPlanOperations,
  ICanExecuteOperations,
} from './types.js';
