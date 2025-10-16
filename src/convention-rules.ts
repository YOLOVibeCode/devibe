/**
 * Convention Rules Configuration
 *
 * Flexible, opt-in system for pristine repo conventions.
 * Users can customize which rules to enforce via .deviberc
 *
 * Philosophy:
 * - Analyze ALL conventions (always inform)
 * - Enforce ONLY what user enables
 * - Provide presets but allow full customization
 * - Never be restrictive by default
 */

export interface ConventionRuleConfig {
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  autofix?: boolean; // Auto-fix in --auto mode
  customConfig?: Record<string, any>;
}

export interface ConventionRules {
  // Build artifacts
  buildArtifacts?: {
    detectOutputFolders: ConventionRuleConfig;
    requireGitignore: ConventionRuleConfig;
    autoCleanup: ConventionRuleConfig;
    customOutputFolders?: string[]; // User-defined output folders
  };

  // Environment & secrets
  environmentFiles?: {
    detectEnvFiles: ConventionRuleConfig;
    requireEnvExample: ConventionRuleConfig;
    requireGitignore: ConventionRuleConfig;
    scanForSecrets: ConventionRuleConfig;
  };

  // Dependencies
  dependencies?: {
    detectNodeModules: ConventionRuleConfig;
    detectVendor: ConventionRuleConfig;
    detectVirtualEnv: ConventionRuleConfig;
    requireGitignore: ConventionRuleConfig;
  };

  // Cache & temp files
  cacheFiles?: {
    detectCacheFolders: ConventionRuleConfig;
    detectSystemFiles: ConventionRuleConfig; // .DS_Store, Thumbs.db
    autoCleanup: ConventionRuleConfig;
    customCacheFolders?: string[];
  };

  // Log files
  logFiles?: {
    detectLogFiles: ConventionRuleConfig;
    requireGitignore: ConventionRuleConfig;
    autoCleanup: ConventionRuleConfig;
    keepRecentLogs?: number; // Keep last N logs (0 = delete all)
  };

  // IDE & editor
  ideFiles?: {
    detectVSCode: ConventionRuleConfig;
    detectIDEA: ConventionRuleConfig;
    keepSharedConfigs: ConventionRuleConfig; // .vscode/settings.json for team
    keepPersonalConfigs: ConventionRuleConfig; // .vscode/launch.json personal
  };

  // Monorepo structure
  monorepo?: {
    enforcePackageStructure: ConventionRuleConfig;
    enforceSharedFolders: ConventionRuleConfig;
    perPackageDocs: ConventionRuleConfig;
  };

  // Assets & static files
  assets?: {
    enforceAssetsFolder: ConventionRuleConfig;
    detectLargeFiles: ConventionRuleConfig; // Warn on files > X MB
    maxFileSize?: number; // MB
    suggestOptimization: ConventionRuleConfig;
  };

  // Documentation
  documentation?: {
    enforceDocsFolder: ConventionRuleConfig;
    enforceRootFiles: ConventionRuleConfig; // README, etc. in root
    detectGeneratedDocs: ConventionRuleConfig;
    requireGitignoreGenerated: ConventionRuleConfig;
  };

  // CI/CD awareness
  cicd?: {
    detectGithubActions: ConventionRuleConfig;
    detectGitHooks: ConventionRuleConfig;
    preserveCIConfig: ConventionRuleConfig; // Never move CI files
  };
}

/**
 * Preset configurations for different strictness levels
 */
export const CONVENTION_PRESETS: Record<string, Partial<ConventionRules>> = {
  // Minimal: Only detect, never enforce
  minimal: {
    buildArtifacts: {
      detectOutputFolders: { enabled: true, severity: 'info', autofix: false },
      requireGitignore: { enabled: true, severity: 'info', autofix: false },
      autoCleanup: { enabled: false, severity: 'info', autofix: false },
    },
    environmentFiles: {
      detectEnvFiles: { enabled: true, severity: 'warning', autofix: false },
      requireEnvExample: { enabled: true, severity: 'info', autofix: false },
      requireGitignore: { enabled: true, severity: 'warning', autofix: false },
      scanForSecrets: { enabled: true, severity: 'warning', autofix: false },
    },
  },

  // Balanced: Detect + warn, autofix safe issues
  balanced: {
    buildArtifacts: {
      detectOutputFolders: { enabled: true, severity: 'warning', autofix: false },
      requireGitignore: { enabled: true, severity: 'warning', autofix: true },
      autoCleanup: { enabled: false, severity: 'warning', autofix: false }, // User decides
    },
    environmentFiles: {
      detectEnvFiles: { enabled: true, severity: 'error', autofix: false },
      requireEnvExample: { enabled: true, severity: 'warning', autofix: false },
      requireGitignore: { enabled: true, severity: 'error', autofix: true },
      scanForSecrets: { enabled: true, severity: 'error', autofix: false },
    },
    dependencies: {
      detectNodeModules: { enabled: true, severity: 'warning', autofix: false },
      detectVendor: { enabled: true, severity: 'warning', autofix: false },
      detectVirtualEnv: { enabled: true, severity: 'warning', autofix: false },
      requireGitignore: { enabled: true, severity: 'warning', autofix: true },
    },
    cacheFiles: {
      detectCacheFolders: { enabled: true, severity: 'info', autofix: false },
      detectSystemFiles: { enabled: true, severity: 'warning', autofix: true },
      autoCleanup: { enabled: false, severity: 'info', autofix: false },
    },
    logFiles: {
      detectLogFiles: { enabled: true, severity: 'warning', autofix: false },
      requireGitignore: { enabled: true, severity: 'warning', autofix: true },
      autoCleanup: { enabled: false, severity: 'warning', autofix: false },
    },
    ideFiles: {
      detectVSCode: { enabled: true, severity: 'info', autofix: false },
      detectIDEA: { enabled: true, severity: 'info', autofix: false },
      keepSharedConfigs: { enabled: true, severity: 'info', autofix: false },
      keepPersonalConfigs: { enabled: false, severity: 'info', autofix: false },
    },
    documentation: {
      enforceDocsFolder: { enabled: true, severity: 'info', autofix: false },
      enforceRootFiles: { enabled: true, severity: 'info', autofix: false },
      detectGeneratedDocs: { enabled: true, severity: 'info', autofix: false },
      requireGitignoreGenerated: { enabled: true, severity: 'warning', autofix: true },
    },
    cicd: {
      detectGithubActions: { enabled: true, severity: 'info', autofix: false },
      detectGitHooks: { enabled: true, severity: 'info', autofix: false },
      preserveCIConfig: { enabled: true, severity: 'error', autofix: false },
    },
  },

  // Strict: Enforce all best practices aggressively
  strict: {
    buildArtifacts: {
      detectOutputFolders: { enabled: true, severity: 'error', autofix: true },
      requireGitignore: { enabled: true, severity: 'error', autofix: true },
      autoCleanup: { enabled: true, severity: 'error', autofix: true },
    },
    environmentFiles: {
      detectEnvFiles: { enabled: true, severity: 'error', autofix: false },
      requireEnvExample: { enabled: true, severity: 'error', autofix: true },
      requireGitignore: { enabled: true, severity: 'error', autofix: true },
      scanForSecrets: { enabled: true, severity: 'error', autofix: false },
    },
    dependencies: {
      detectNodeModules: { enabled: true, severity: 'error', autofix: true },
      detectVendor: { enabled: true, severity: 'error', autofix: true },
      detectVirtualEnv: { enabled: true, severity: 'error', autofix: true },
      requireGitignore: { enabled: true, severity: 'error', autofix: true },
    },
    cacheFiles: {
      detectCacheFolders: { enabled: true, severity: 'error', autofix: true },
      detectSystemFiles: { enabled: true, severity: 'error', autofix: true },
      autoCleanup: { enabled: true, severity: 'error', autofix: true },
    },
    logFiles: {
      detectLogFiles: { enabled: true, severity: 'error', autofix: true },
      requireGitignore: { enabled: true, severity: 'error', autofix: true },
      autoCleanup: { enabled: true, severity: 'error', autofix: true },
    },
    ideFiles: {
      detectVSCode: { enabled: true, severity: 'warning', autofix: false },
      detectIDEA: { enabled: true, severity: 'warning', autofix: false },
      keepSharedConfigs: { enabled: true, severity: 'info', autofix: false },
      keepPersonalConfigs: { enabled: false, severity: 'warning', autofix: false },
    },
    assets: {
      enforceAssetsFolder: { enabled: true, severity: 'warning', autofix: false },
      detectLargeFiles: { enabled: true, severity: 'error', autofix: false },
      suggestOptimization: { enabled: true, severity: 'warning', autofix: false },
      maxFileSize: 5, // 5 MB
    },
    documentation: {
      enforceDocsFolder: { enabled: true, severity: 'warning', autofix: false },
      enforceRootFiles: { enabled: true, severity: 'error', autofix: false },
      detectGeneratedDocs: { enabled: true, severity: 'warning', autofix: true },
      requireGitignoreGenerated: { enabled: true, severity: 'error', autofix: true },
    },
    cicd: {
      detectGithubActions: { enabled: true, severity: 'info', autofix: false },
      detectGitHooks: { enabled: true, severity: 'info', autofix: false },
      preserveCIConfig: { enabled: true, severity: 'error', autofix: false },
    },
  },
};

/**
 * Default configuration (balanced approach)
 */
export const DEFAULT_CONVENTION_RULES: Partial<ConventionRules> = CONVENTION_PRESETS.balanced;

/**
 * Configuration file format (.deviberc.json)
 */
export interface DevibeConfig {
  // Use preset or custom
  preset?: 'minimal' | 'balanced' | 'strict';

  // Override specific rules
  conventions?: Partial<ConventionRules>;

  // Global settings
  autoMode?: {
    applyConventions: boolean; // Apply in --auto mode
    requireConfirmation: boolean; // Prompt before fixing
  };

  // Exclusions
  excludePatterns?: string[]; // Glob patterns to skip
  excludeFolders?: string[]; // Folders to never touch
}

/**
 * Example .deviberc.json configurations
 */
export const EXAMPLE_CONFIGS = {
  // Strict team repo
  strictTeam: {
    preset: 'strict',
    conventions: {
      environmentFiles: {
        scanForSecrets: { enabled: true, severity: 'error', autofix: false },
      },
      ideFiles: {
        keepSharedConfigs: { enabled: true, severity: 'info', autofix: false },
      },
    },
    autoMode: {
      applyConventions: true,
      requireConfirmation: false,
    },
    excludeFolders: ['vendor', 'node_modules'],
  },

  // Solo developer, flexible
  soloDev: {
    preset: 'minimal',
    conventions: {
      buildArtifacts: {
        detectOutputFolders: { enabled: true, severity: 'info', autofix: false },
      },
      environmentFiles: {
        scanForSecrets: { enabled: true, severity: 'warning', autofix: false },
      },
    },
    autoMode: {
      applyConventions: false,
      requireConfirmation: true,
    },
  },

  // Open source project
  openSource: {
    preset: 'balanced',
    conventions: {
      documentation: {
        enforceRootFiles: { enabled: true, severity: 'error', autofix: false },
        enforceDocsFolder: { enabled: true, severity: 'warning', autofix: false },
      },
      cicd: {
        preserveCIConfig: { enabled: true, severity: 'error', autofix: false },
      },
    },
    autoMode: {
      applyConventions: true,
      requireConfirmation: true,
    },
    excludeFolders: ['.github', 'docs'],
  },
};
