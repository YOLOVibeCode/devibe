// Public API exports
export { GitDetector } from './git-detector.js';
export { SecretScanner } from './secret-scanner.js';
export { BUILT_IN_PATTERNS } from './secret-patterns.js';
export type {
  GitRepository,
  GitDetectionResult,
  SecretFinding,
  SecretScanResult,
  SecretPattern,
  SecretSeverity,
  ICanDetectGitRepositories,
  ICanValidateGitBoundaries,
  ICanScanForSecrets,
  ICanMatchSecretPatterns,
  ICanAnalyzeEntropy,
} from './types.js';
