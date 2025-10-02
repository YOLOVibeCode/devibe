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
