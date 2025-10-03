import * as fs from 'fs/promises';
import * as path from 'path';

import { TestOrganizationConfig } from './types.js';

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

  // Test organization
  testOrganization?: TestOrganizationConfig;

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
    testOrganization: {
      enabled: true,
      baseTestDirectory: 'tests',
      preserveStructure: false,
      groupByTechnology: false,
      globalRules: [
        {
          category: 'unit',
          patterns: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js'],
          targetDirectory: 'tests/unit',
          description: 'Unit tests - isolated component testing'
        },
        {
          category: 'integration',
          patterns: ['*.integration.test.ts', '*.integration.spec.ts', '*integration*.test.ts'],
          targetDirectory: 'tests/integration',
          description: 'Integration tests - testing component interactions'
        },
        {
          category: 'e2e',
          patterns: ['*.e2e.ts', '*.e2e-spec.ts', 'e2e/**/*.ts'],
          targetDirectory: 'tests/e2e',
          description: 'End-to-end tests - full user flow testing'
        },
        {
          category: 'tdd',
          patterns: ['*.tdd.ts', '*.tdd.test.ts'],
          targetDirectory: 'tests/tdd',
          description: 'TDD tests - test-driven development specs'
        },
        {
          category: 'functional',
          patterns: ['*.functional.test.ts', '*.func.test.ts'],
          targetDirectory: 'tests/functional',
          description: 'Functional tests - business logic validation'
        },
        {
          category: 'performance',
          patterns: ['*.perf.test.ts', '*.benchmark.ts', '*.load.test.ts'],
          targetDirectory: 'tests/performance',
          description: 'Performance tests - benchmarking and load testing'
        },
        {
          category: 'acceptance',
          patterns: ['*.acceptance.test.ts', '*.acceptance.spec.ts'],
          targetDirectory: 'tests/acceptance',
          description: 'Acceptance tests - user acceptance criteria'
        },
        {
          category: 'contract',
          patterns: ['*.contract.test.ts', '*.pact.test.ts'],
          targetDirectory: 'tests/contract',
          description: 'Contract tests - API contract validation'
        }
      ],
      technologies: [
        {
          technology: 'nodejs',
          testPatterns: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
          defaultTestDirectory: 'tests',
          categories: [
            {
              category: 'unit',
              patterns: ['*.test.ts', '*.test.js'],
              targetDirectory: 'tests/unit',
              description: 'Node.js unit tests'
            },
            {
              category: 'integration',
              patterns: ['*.integration.test.ts'],
              targetDirectory: 'tests/integration',
              description: 'Node.js integration tests'
            }
          ]
        },
        {
          technology: 'react',
          testPatterns: ['**/*.test.jsx', '**/*.test.tsx', '**/*.spec.jsx', '**/*.spec.tsx'],
          defaultTestDirectory: '__tests__',
          categories: [
            {
              category: 'unit',
              patterns: ['*.test.tsx', '*.test.jsx'],
              targetDirectory: 'tests/unit/components',
              description: 'React component unit tests'
            },
            {
              category: 'integration',
              patterns: ['*.integration.test.tsx'],
              targetDirectory: 'tests/integration',
              description: 'React integration tests'
            }
          ]
        },
        {
          technology: 'python',
          testPatterns: ['**/test_*.py', '**/*_test.py'],
          defaultTestDirectory: 'tests',
          categories: [
            {
              category: 'unit',
              patterns: ['test_*.py', '*_test.py'],
              targetDirectory: 'tests/unit',
              description: 'Python unit tests'
            },
            {
              category: 'integration',
              patterns: ['test_*_integration.py'],
              targetDirectory: 'tests/integration',
              description: 'Python integration tests'
            }
          ]
        },
        {
          technology: 'go',
          testPatterns: ['**/*_test.go'],
          defaultTestDirectory: '.',
          categories: [
            {
              category: 'unit',
              patterns: ['*_test.go'],
              targetDirectory: 'tests/unit',
              description: 'Go unit tests'
            },
            {
              category: 'integration',
              patterns: ['*_integration_test.go'],
              targetDirectory: 'tests/integration',
              description: 'Go integration tests'
            }
          ]
        },
        {
          technology: 'java',
          testPatterns: ['**/src/test/**/*.java'],
          defaultTestDirectory: 'src/test/java',
          categories: [
            {
              category: 'unit',
              patterns: ['*Test.java'],
              targetDirectory: 'src/test/java/unit',
              description: 'Java unit tests (JUnit)'
            },
            {
              category: 'integration',
              patterns: ['*IT.java', '*IntegrationTest.java'],
              targetDirectory: 'src/test/java/integration',
              description: 'Java integration tests'
            }
          ]
        },
        {
          technology: 'dotnet',
          testPatterns: ['**/*Tests.cs', '**/*Test.cs', '**/*.Tests/**/*.cs'],
          defaultTestDirectory: 'tests',
          categories: [
            {
              category: 'unit',
              patterns: ['*Tests.cs', '*Test.cs', '!*Integration*', '!*E2E*'],
              targetDirectory: 'tests/UnitTests',
              description: '.NET unit tests (xUnit/NUnit/MSTest)'
            },
            {
              category: 'integration',
              patterns: ['*IntegrationTests.cs', '*Integration.Tests.cs'],
              targetDirectory: 'tests/IntegrationTests',
              description: '.NET integration tests'
            },
            {
              category: 'e2e',
              patterns: ['*E2ETests.cs', '*EndToEnd.Tests.cs'],
              targetDirectory: 'tests/E2ETests',
              description: '.NET end-to-end tests'
            }
          ]
        }
      ]
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

  // Test organization
  testOrganization: {
    enabled: true,
    baseTestDirectory: 'tests',
    preserveStructure: false,  // Keep original directory structure
    groupByTechnology: false,  // Organize by technology (nodejs, react, etc.)

    // Global test categorization rules
    globalRules: [
      {
        category: 'unit',
        patterns: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js'],
        targetDirectory: 'tests/unit',
        description: 'Unit tests - isolated component testing'
      },
      {
        category: 'integration',
        patterns: ['*.integration.test.ts', '*.integration.spec.ts', '*integration*.test.ts'],
        targetDirectory: 'tests/integration',
        description: 'Integration tests - testing component interactions'
      },
      {
        category: 'e2e',
        patterns: ['*.e2e.ts', '*.e2e-spec.ts', 'e2e/**/*.ts'],
        targetDirectory: 'tests/e2e',
        description: 'End-to-end tests - full user flow testing'
      }
      // Add more categories as needed: tdd, functional, performance, acceptance, contract
    ],

    // Technology-specific configurations
    technologies: [
      {
        technology: 'nodejs',
        testPatterns: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
        defaultTestDirectory: 'tests',
        categories: [
          {
            category: 'unit',
            patterns: ['*.test.ts', '*.test.js'],
            targetDirectory: 'tests/unit',
            description: 'Node.js unit tests'
          }
        ]
      }
      // Add more technologies: react, python, go, java
    ]
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
