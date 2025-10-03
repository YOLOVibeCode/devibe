// Core type definitions following ISP

export interface GitRepository {
  path: string;
  rootPath: string;
  isRoot: boolean;
}

export interface GitDetectionResult {
  repositories: GitRepository[];
  rootRepo?: GitRepository;
  hasMultipleRepos: boolean;
}

export interface ICanDetectGitRepositories {
  detectRepositories(path: string): Promise<GitDetectionResult>;
}

export interface ICanValidateGitBoundaries {
  isWithinRepository(filePath: string, repoPath: string): boolean;
  canMoveFile(
    sourcePath: string,
    targetPath: string,
    repositories: GitRepository[]
  ): boolean;
}

// Secret Detection Types

export type SecretSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecretFinding {
  file: string;
  line: number;
  column: number;
  type: string;
  pattern: string;
  severity: SecretSeverity;
  context: string;
  recommendation: string;
  confidence: number;
}

export interface SecretScanResult {
  filesScanned: number;
  secretsFound: number;
  duration: number;
  findings: SecretFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: SecretSeverity;
  category: string;
  recommendation: string;
}

export interface ICanScanForSecrets {
  scanFiles(files: string[]): Promise<SecretScanResult>;
}

export interface ICanMatchSecretPatterns {
  matchPatterns(content: string): SecretFinding[];
}

export interface ICanAnalyzeEntropy {
  hasHighEntropy(value: string): boolean;
  calculateEntropy(value: string): number;
}

// Backup & Restore Types

export interface BackupEntry {
  id: string;
  timestamp: Date;
  operation: 'move' | 'delete' | 'modify';
  sourcePath: string;
  targetPath?: string;
  content?: string;
  metadata: {
    size: number;
    mode: number;
  };
}

export interface BackupManifest {
  id: string;
  timestamp: Date;
  operations: BackupEntry[];
  reversible: boolean;
}

export interface ICanBackupFiles {
  backupFile(filePath: string, operation: 'move' | 'delete' | 'modify'): Promise<BackupEntry>;
  createManifest(operations: BackupEntry[]): Promise<BackupManifest>;
}

export interface ICanRestoreFiles {
  restore(manifestId: string): Promise<void>;
  listBackups(): Promise<BackupManifest[]>;
}

// Build Validation Types

export type BuildTechnology = 'nodejs' | 'docker' | 'python' | 'go' | 'generic';

export interface BuildValidator {
  technology: BuildTechnology;
  canValidate(path: string): Promise<boolean>;
  runBuild(path: string): Promise<BuildResult>;
}

export interface BuildResult {
  success: boolean;
  exitCode: number;
  duration: number;
  stdout: string;
  stderr: string;
  recommendation?: string;
}

export interface ICanDetectBuildSystem {
  detect(path: string): Promise<BuildTechnology[]>;
}

export interface ICanValidateBuilds {
  validateBuild(path: string, technology: BuildTechnology): Promise<BuildResult>;
  validateAllBuilds(path: string): Promise<Map<BuildTechnology, BuildResult>>;
}

// File Classification Types

export type FileCategory = 'source' | 'config' | 'documentation' | 'script' | 'test' | 'asset' | 'unknown';

export interface FileClassification {
  path: string;
  category: FileCategory;
  confidence: number;
  suggestedLocation?: string;
  reasoning: string;
}

export interface ICanClassifyFiles {
  classify(filePath: string, content?: string): Promise<FileClassification>;
  classifyBatch(files: string[]): Promise<FileClassification[]>;
}

export interface ICanSuggestFileLocations {
  suggestLocation(
    file: FileClassification,
    repositories: GitRepository[],
    content?: string
  ): Promise<string | null>;
}

// Usage Detection Types
export interface UsageReference {
  file: string;
  line: number;
  context: string;
}

export interface UsageDetectionResult {
  isReferenced: boolean;
  references: UsageReference[];
  recommendKeep: boolean;
}

export interface ICanDetectUsage {
  checkFileUsage(filePath: string, searchPaths: string[]): Promise<UsageDetectionResult>;
}

// Script Classification Types

export type ScriptType = 'build' | 'test' | 'deploy' | 'utility' | 'migration' | 'unknown';

export interface ScriptClassification {
  path: string;
  type: ScriptType;
  confidence: number;
  reasoning: string;
}

export interface ICanClassifyScripts {
  classifyScript(scriptPath: string): Promise<ScriptClassification>;
}

// File Operations Types

export interface FileOperation {
  type: 'move' | 'delete' | 'create';
  sourcePath: string;
  targetPath?: string;
  reason: string;
  warning?: string;  // Warning if file still referenced
  isReferenced?: boolean;  // True if file is still being used
}

export interface OperationPlan {
  operations: FileOperation[];
  backupRequired: boolean;
  estimatedDuration: number;
  warnings: string[];  // Warnings about referenced files
}

export interface ICanPlanOperations {
  planRootFileDistribution(
    rootPath: string, 
    onProgress?: (current: number, total: number, file: string) => void
  ): Promise<OperationPlan>;
  planFolderEnforcement(repoPath: string): Promise<OperationPlan>;
}

export interface ICanExecuteOperations {
  execute(plan: OperationPlan, dryRun: boolean): Promise<ExecutionResult>;
}

export interface ExecutionResult {
  success: boolean;
  operationsCompleted: number;
  operationsFailed: number;
  errors: string[];
  backupManifestId?: string;
}

// Test Organization Types

export type TestCategory = 'unit' | 'integration' | 'e2e' | 'tdd' | 'functional' | 'performance' | 'acceptance' | 'contract';

export interface TestOrganizationRule {
  category: TestCategory;
  patterns: string[];
  targetDirectory: string;
  description: string;
}

export interface TechnologyTestConfig {
  technology: string;
  testPatterns: string[];
  defaultTestDirectory: string;
  categories: TestOrganizationRule[];
}

export interface TestOrganizationConfig {
  enabled: boolean;
  baseTestDirectory: string;
  technologies: TechnologyTestConfig[];
  globalRules: TestOrganizationRule[];
  preserveStructure: boolean;
  groupByTechnology: boolean;
}

export interface ICanOrganizeTests {
  detectTestFiles(rootPath: string): Promise<string[]>;
  categorizeTest(filePath: string): Promise<TestCategory>;
  planTestOrganization(rootPath: string): Promise<OperationPlan>;
}
