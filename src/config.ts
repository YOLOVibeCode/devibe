import * as fs from 'fs/promises';
import * as path from 'path';

export interface UnVibeConfig {
  // Secret scanning
  secretScan?: {
    excludePatterns?: string[];
    customPatterns?: Array<{
      id: string;
      name: string;
      pattern: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
  };

  // File classification
  fileClassification?: {
    excludeFiles?: string[];
    customCategories?: Record<string, string[]>; // extension -> category
  };

  // Folder structure
  folderStructure?: {
    requiredFolders?: string[];
    scriptsFolderName?: string;
    documentsFolderName?: string;
  };

  // AI settings
  ai?: {
    enabled?: boolean;
    provider?: 'anthropic' | 'openai';
    model?: string;
  };

  // Backup settings
  backup?: {
    enabled?: boolean;
    retentionDays?: number;
    maxBackups?: number;
  };
}

export class ConfigManager {
  private static DEFAULT_CONFIG: UnVibeConfig = {
    secretScan: {
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
    },
    folderStructure: {
      requiredFolders: ['scripts', 'documents'],
      scriptsFolderName: 'scripts',
      documentsFolderName: 'documents',
    },
    ai: {
      enabled: false,
      provider: 'anthropic',
    },
    backup: {
      enabled: true,
      retentionDays: 30,
      maxBackups: 100,
    },
  };

  static async load(repoPath: string): Promise<UnVibeConfig> {
    const configPath = path.join(repoPath, '.unvibe.config.js');

    try {
      await fs.access(configPath);
      // Config exists, but we can't dynamically import in this context
      // For now, return default config
      return this.DEFAULT_CONFIG;
    } catch {
      // No config file, use defaults
      return this.DEFAULT_CONFIG;
    }
  }

  static async create(repoPath: string): Promise<void> {
    const configPath = path.join(repoPath, '.unvibe.config.js');

    const template = `module.exports = {
  // Secret scanning configuration
  secretScan: {
    excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
    customPatterns: [
      // {
      //   id: 'custom-api-key',
      //   name: 'My Custom API Key',
      //   pattern: 'myapi_[a-zA-Z0-9]{32}',
      //   severity: 'high'
      // }
    ]
  },

  // File classification
  fileClassification: {
    excludeFiles: [],
    customCategories: {
      // '.custom': 'config'
    }
  },

  // Folder structure
  folderStructure: {
    requiredFolders: ['scripts', 'documents'],
    scriptsFolderName: 'scripts',
    documentsFolderName: 'documents'
  },

  // AI settings
  ai: {
    enabled: false,  // Set to true when you have API keys
    provider: 'anthropic', // or 'openai'
    model: 'claude-3-5-sonnet-20241022' // or 'gpt-4'
  },

  // Backup settings
  backup: {
    enabled: true,
    retentionDays: 30,
    maxBackups: 100
  }
};
`;

    await fs.writeFile(configPath, template);
  }

  static getDefault(): UnVibeConfig {
    return this.DEFAULT_CONFIG;
  }
}
