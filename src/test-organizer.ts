import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import {
  TestCategory,
  TestOrganizationConfig,
  FileOperation,
  OperationPlan,
  ICanOrganizeTests,
} from './types.js';
import { UnVibeConfig } from './config.js';

export class TestOrganizer implements ICanOrganizeTests {
  constructor(private config: TestOrganizationConfig) {}

  /**
   * Detect all test files in a directory based on configured patterns
   */
  async detectTestFiles(rootPath: string): Promise<string[]> {
    const testFiles: Set<string> = new Set();

    // Collect all patterns from global rules and technologies
    const allPatterns = new Set<string>();

    // Add global patterns
    this.config.globalRules.forEach(rule => {
      rule.patterns.forEach(pattern => allPatterns.add(pattern));
    });

    // Add technology-specific patterns
    this.config.technologies.forEach(tech => {
      tech.testPatterns.forEach(pattern => allPatterns.add(pattern));
    });

    // Search for test files using all patterns
    for (const pattern of allPatterns) {
      const matches = await glob(pattern, {
        cwd: rootPath,
        absolute: false,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**'],
        nodir: true,
      });

      matches.forEach(file => testFiles.add(file));
    }

    return Array.from(testFiles);
  }

  /**
   * Categorize a test file based on naming patterns and content
   */
  async categorizeTest(filePath: string): Promise<TestCategory> {
    const fileName = path.basename(filePath);
    const relativePath = filePath;

    // Check against global rules (more specific patterns first)
    const sortedRules = [...this.config.globalRules].sort((a, b) => {
      // Prioritize more specific patterns
      const aSpecificity = a.patterns.join('').length;
      const bSpecificity = b.patterns.join('').length;
      return bSpecificity - aSpecificity;
    });

    for (const rule of sortedRules) {
      for (const pattern of rule.patterns) {
        if (this.matchesPattern(fileName, pattern) || this.matchesPattern(relativePath, pattern)) {
          return rule.category;
        }
      }
    }

    // Default to unit tests if no specific pattern matches
    return 'unit';
  }

  /**
   * Plan test organization operations
   */
  async planTestOrganization(rootPath: string): Promise<OperationPlan> {
    if (!this.config.enabled) {
      return {
        operations: [],
        backupRequired: false,
        estimatedDuration: 0,
        warnings: [],
      };
    }

    const testFiles = await this.detectTestFiles(rootPath);
    const operations: FileOperation[] = [];

    for (const testFile of testFiles) {
      const category = await this.categorizeTest(testFile);
      const targetDir = this.getTargetDirectory(testFile, category);

      // Skip if already in correct location
      const currentDir = path.dirname(testFile);
      if (currentDir === targetDir) {
        continue;
      }

      const fileName = path.basename(testFile);
      const targetPath = path.join(targetDir, fileName);

      operations.push({
        type: 'move',
        sourcePath: path.join(rootPath, testFile),
        targetPath: path.join(rootPath, targetPath),
        reason: `Move ${category} test to ${targetDir}`,
      });
    }

    return {
      operations,
      backupRequired: operations.length > 0,
      estimatedDuration: operations.length * 100, // 100ms per file
      warnings: [],
    };
  }

  /**
   * Get target directory for a test file based on category
   */
  private getTargetDirectory(testFile: string, category: TestCategory): string {
    // Find the matching global rule
    const rule = this.config.globalRules.find(r => r.category === category);

    if (!rule) {
      // Fallback to default directory
      return path.join(this.config.baseTestDirectory, category);
    }

    return rule.targetDirectory;
  }

  /**
   * Check if a filename matches a pattern
   */
  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(fileName) || fileName.includes(pattern.replace(/\*/g, ''));
  }

  /**
   * Detect technology being used in the project
   */
  static async detectTechnology(rootPath: string): Promise<string[]> {
    const technologies: string[] = [];

    try {
      // Check for package.json (Node.js)
      const packageJsonPath = path.join(rootPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      technologies.push('nodejs');

      // Check for React
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        technologies.push('react');
      }
    } catch {
      // No package.json
    }

    try {
      // Check for requirements.txt or setup.py (Python)
      await fs.access(path.join(rootPath, 'requirements.txt'));
      technologies.push('python');
    } catch {
      // No Python files
    }

    try {
      // Check for go.mod (Go)
      await fs.access(path.join(rootPath, 'go.mod'));
      technologies.push('go');
    } catch {
      // No Go files
    }

    try {
      // Check for pom.xml or build.gradle (Java)
      const hasPom = await fs.access(path.join(rootPath, 'pom.xml')).then(() => true).catch(() => false);
      const hasGradle = await fs.access(path.join(rootPath, 'build.gradle')).then(() => true).catch(() => false);

      if (hasPom || hasGradle) {
        technologies.push('java');
      }
    } catch {
      // No Java files
    }

    try {
      // Check for .csproj, .sln, or .fsproj (.NET)
      const entries = await fs.readdir(rootPath);
      const hasCsproj = entries.some(f => f.endsWith('.csproj'));
      const hasSln = entries.some(f => f.endsWith('.sln'));
      const hasFsproj = entries.some(f => f.endsWith('.fsproj'));

      if (hasCsproj || hasSln || hasFsproj) {
        technologies.push('dotnet');
      }
    } catch {
      // No .NET files
    }

    return technologies;
  }

  /**
   * Generate a report of current test organization
   */
  async generateReport(rootPath: string): Promise<string> {
    const testFiles = await this.detectTestFiles(rootPath);
    const categoryCounts = new Map<TestCategory, number>();
    const filesByCategory = new Map<TestCategory, string[]>();

    for (const testFile of testFiles) {
      const category = await this.categorizeTest(testFile);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

      if (!filesByCategory.has(category)) {
        filesByCategory.set(category, []);
      }
      filesByCategory.get(category)!.push(testFile);
    }

    let report = '# Test Organization Report\n\n';
    report += `Total test files: ${testFiles.length}\n\n`;
    report += '## Tests by Category\n\n';

    for (const [category, count] of categoryCounts.entries()) {
      const rule = this.config.globalRules.find(r => r.category === category);
      report += `### ${category.toUpperCase()} (${count} files)\n`;
      if (rule) {
        report += `- **Target Directory:** ${rule.targetDirectory}\n`;
        report += `- **Description:** ${rule.description}\n`;
      }
      report += '\nFiles:\n';
      filesByCategory.get(category)?.forEach(file => {
        report += `- ${file}\n`;
      });
      report += '\n';
    }

    return report;
  }
}

/**
 * Create a test organizer from a UnVibe config
 */
export function createTestOrganizer(config: UnVibeConfig): TestOrganizer | null {
  if (!config.testOrganization) {
    return null;
  }

  return new TestOrganizer(config.testOrganization);
}
