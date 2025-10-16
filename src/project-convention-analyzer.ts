/**
 * Project Convention Analyzer
 *
 * Intelligently analyzes existing project structure and conventions to ensure
 * devibe respects and follows existing patterns rather than imposing new ones.
 *
 * Features:
 * - Detects existing folder structures (docs, scripts, tests, etc.)
 * - Analyzes documentation organization patterns
 * - Identifies where root files (README, CHANGELOG, etc.) are placed
 * - Uses AI to understand project-specific conventions
 * - Falls back to best practices when no conventions exist
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GitRepository } from './types.js';
import { AIClassifierFactory } from './ai-classifier.js';
import { getKeyManager } from './ai-key-manager.js';

export interface ProjectConventions {
  // Documentation conventions
  docsFolder?: {
    path: string;
    exists: boolean;
    structure?: {
      hasSpecifications?: boolean;
      hasImplementation?: boolean;
      hasGuides?: boolean;
      hasAPI?: boolean;
      customFolders?: string[];
    };
  };

  // Scripts conventions
  scriptsFolder?: {
    path: string;
    exists: boolean;
    types?: string[]; // e.g., ['build', 'deploy', 'test', 'utility']
  };

  // Root file conventions
  rootFileConventions?: {
    readmeInRoot: boolean;
    changelogInRoot: boolean;
    contributingInRoot: boolean;
    licenseInRoot: boolean;
    customRootFiles?: string[];
  };

  // Test conventions
  testConventions?: {
    location: 'colocated' | 'centralized' | 'per-package' | 'mixed';
    folderName?: string; // 'tests', '__tests__', 'test', etc.
  };

  // Best practices recommendations
  recommendations?: {
    shouldCreateDocsFolder: boolean;
    shouldCreateScriptsFolder: boolean;
    recommendedDocsStructure?: string[];
    keepFilesInRoot?: string[]; // Files that should stay in root
  };

  analyzedAt: string;
}

export class ProjectConventionAnalyzer {
  private aiAvailable: boolean = false;

  async initialize(): Promise<void> {
    this.aiAvailable = await AIClassifierFactory.isAvailable();
  }

  /**
   * Analyze project conventions comprehensively
   */
  async analyze(rootPath: string, repositories: GitRepository[]): Promise<ProjectConventions> {
    await this.initialize();

    const [docsFolder, scriptsFolder, rootFileConventions, testConventions] = await Promise.all([
      this.analyzeDocsFolder(rootPath),
      this.analyzeScriptsFolder(rootPath),
      this.analyzeRootFiles(rootPath),
      this.analyzeTestConventions(rootPath),
    ]);

    // Generate recommendations based on findings
    const recommendations = this.generateRecommendations({
      docsFolder,
      scriptsFolder,
      rootFileConventions,
      testConventions,
    });

    // Use AI to refine understanding if available
    const conventions: ProjectConventions = {
      docsFolder,
      scriptsFolder,
      rootFileConventions,
      testConventions,
      recommendations,
      analyzedAt: new Date().toISOString(),
    };

    if (this.aiAvailable) {
      await this.enhanceWithAI(conventions, rootPath);
    }

    return conventions;
  }

  /**
   * Analyze documentation folder structure
   */
  private async analyzeDocsFolder(rootPath: string): Promise<ProjectConventions['docsFolder']> {
    const possibleNames = ['docs', 'doc', 'documentation', 'documents'];

    for (const name of possibleNames) {
      const docsPath = path.join(rootPath, name);
      try {
        const stats = await fs.stat(docsPath);
        if (stats.isDirectory()) {
          const structure = await this.analyzeDocsFolderStructure(docsPath);
          return {
            path: name,
            exists: true,
            structure,
          };
        }
      } catch {
        // Folder doesn't exist, continue checking
      }
    }

    return {
      path: 'docs',
      exists: false,
    };
  }

  /**
   * Analyze the internal structure of docs folder
   */
  private async analyzeDocsFolderStructure(docsPath: string): Promise<NonNullable<ProjectConventions['docsFolder']>['structure']> {
    try {
      const entries = await fs.readdir(docsPath, { withFileTypes: true });
      const folders = entries.filter(e => e.isDirectory()).map(e => e.name.toLowerCase());

      return {
        hasSpecifications: folders.some(f => f.includes('spec') || f === 'specifications'),
        hasImplementation: folders.some(f => f.includes('implementation') || f === 'impl'),
        hasGuides: folders.some(f => f.includes('guide') || f === 'guides'),
        hasAPI: folders.some(f => f.includes('api') || f === 'reference'),
        customFolders: folders.filter(f =>
          !['spec', 'specifications', 'implementation', 'impl', 'guides', 'guide', 'api', 'reference'].includes(f)
        ),
      };
    } catch {
      return {};
    }
  }

  /**
   * Analyze scripts folder
   */
  private async analyzeScriptsFolder(rootPath: string): Promise<ProjectConventions['scriptsFolder']> {
    const possibleNames = ['scripts', 'script', 'bin', 'tools'];

    for (const name of possibleNames) {
      const scriptsPath = path.join(rootPath, name);
      try {
        const stats = await fs.stat(scriptsPath);
        if (stats.isDirectory()) {
          const types = await this.categorizeScripts(scriptsPath);
          return {
            path: name,
            exists: true,
            types,
          };
        }
      } catch {
        // Folder doesn't exist, continue checking
      }
    }

    return {
      path: 'scripts',
      exists: false,
    };
  }

  /**
   * Categorize existing scripts by type
   */
  private async categorizeScripts(scriptsPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(scriptsPath);
      const types = new Set<string>();

      for (const entry of entries) {
        const lower = entry.toLowerCase();
        if (lower.includes('build')) types.add('build');
        if (lower.includes('deploy')) types.add('deploy');
        if (lower.includes('test')) types.add('test');
        if (lower.includes('setup') || lower.includes('install')) types.add('setup');
        if (lower.includes('clean')) types.add('cleanup');
        if (lower.includes('version') || lower.includes('bump')) types.add('versioning');
      }

      return Array.from(types);
    } catch {
      return [];
    }
  }

  /**
   * Analyze root file placement conventions
   */
  private async analyzeRootFiles(rootPath: string): Promise<ProjectConventions['rootFileConventions']> {
    const rootFiles = await fs.readdir(rootPath);
    const rootFilesLower = rootFiles.map(f => f.toLowerCase());

    const commonRootFiles = [
      'readme.md', 'readme.txt', 'readme',
      'changelog.md', 'changelog.txt', 'changelog',
      'contributing.md', 'contributing.txt', 'contributing',
      'license', 'license.md', 'license.txt',
      'code_of_conduct.md', 'security.md',
    ];

    const customRootFiles = rootFiles.filter(f => {
      const lower = f.toLowerCase();
      return (
        (lower.endsWith('.md') || lower.endsWith('.txt')) &&
        !commonRootFiles.includes(lower) &&
        !lower.startsWith('.')
      );
    });

    return {
      readmeInRoot: rootFilesLower.some(f => f.startsWith('readme')),
      changelogInRoot: rootFilesLower.some(f => f.startsWith('changelog')),
      contributingInRoot: rootFilesLower.some(f => f.startsWith('contributing')),
      licenseInRoot: rootFilesLower.some(f => f.startsWith('license')),
      customRootFiles: customRootFiles.length > 0 ? customRootFiles : undefined,
    };
  }

  /**
   * Analyze test organization conventions
   */
  private async analyzeTestConventions(rootPath: string): Promise<ProjectConventions['testConventions']> {
    let location: 'colocated' | 'centralized' | 'per-package' | 'mixed' = 'centralized';
    let folderName: string | undefined;

    // Check for centralized test folder
    const testFolders = ['tests', 'test', '__tests__', 'spec'];
    for (const folder of testFolders) {
      try {
        const stats = await fs.stat(path.join(rootPath, folder));
        if (stats.isDirectory()) {
          location = 'centralized';
          folderName = folder;
          break;
        }
      } catch {
        // Continue checking
      }
    }

    // Check for colocated tests in src/
    const srcPath = path.join(rootPath, 'src');
    try {
      if (await this.hasColocatedTests(srcPath)) {
        location = folderName ? 'mixed' : 'colocated';
      }
    } catch {
      // src doesn't exist or not accessible
    }

    return {
      location,
      folderName,
    };
  }

  /**
   * Check if directory has colocated test files
   */
  private async hasColocatedTests(dir: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isFile() && this.isTestFile(entry.name)) {
          return true;
        }

        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
          if (await this.hasColocatedTests(fullPath)) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if filename indicates a test file
   */
  private isTestFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.test.ts') ||
      lower.endsWith('.test.js') ||
      lower.endsWith('.spec.ts') ||
      lower.endsWith('.spec.js') ||
      lower.endsWith('.test.tsx') ||
      lower.endsWith('.spec.tsx')
    );
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: {
    docsFolder: ProjectConventions['docsFolder'];
    scriptsFolder: ProjectConventions['scriptsFolder'];
    rootFileConventions: ProjectConventions['rootFileConventions'];
    testConventions: ProjectConventions['testConventions'];
  }): ProjectConventions['recommendations'] {
    const recommendations: ProjectConventions['recommendations'] = {
      shouldCreateDocsFolder: false,
      shouldCreateScriptsFolder: false,
      keepFilesInRoot: [],
    };

    // Don't create folders if they already exist
    if (!analysis.docsFolder?.exists) {
      recommendations.shouldCreateDocsFolder = true;
      recommendations.recommendedDocsStructure = ['specifications', 'guides'];
    }

    if (!analysis.scriptsFolder?.exists) {
      recommendations.shouldCreateScriptsFolder = true;
    }

    // Best practice: Keep these files in root
    const rootFiles = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'CODE_OF_CONDUCT.md'];
    recommendations.keepFilesInRoot = rootFiles;

    // If project already has root files, recommend keeping them
    if (analysis.rootFileConventions) {
      if (analysis.rootFileConventions.readmeInRoot) {
        recommendations.keepFilesInRoot = recommendations.keepFilesInRoot || [];
      }
      if (analysis.rootFileConventions.changelogInRoot) {
        recommendations.keepFilesInRoot.push('CHANGELOG.md');
      }
      if (analysis.rootFileConventions.contributingInRoot) {
        recommendations.keepFilesInRoot.push('CONTRIBUTING.md');
      }
    }

    return recommendations;
  }

  /**
   * Use AI to enhance convention understanding
   */
  private async enhanceWithAI(conventions: ProjectConventions, rootPath: string): Promise<void> {
    try {
      // Check if AI is available
      if (!this.aiAvailable) {
        return;
      }

      // For now, we trust our heuristic analysis
      // AI enhancement can be added in the future with more sophisticated prompting
    } catch (error) {
      // AI enhancement failed, continue with heuristic analysis
      if (process.env.VERBOSE) {
        console.warn('AI enhancement failed:', error);
      }
    }
  }

  /**
   * Build context string for AI analysis
   */
  private buildConventionsContext(conventions: ProjectConventions): string {
    const lines: string[] = [];

    lines.push('PROJECT CONVENTIONS ANALYSIS:');
    lines.push('');

    // Docs folder
    if (conventions.docsFolder?.exists) {
      lines.push(`✓ Documentation folder: ${conventions.docsFolder.path}/`);
      if (conventions.docsFolder.structure) {
        const { structure } = conventions.docsFolder;
        if (structure.hasSpecifications) lines.push('  - Has specifications/ subfolder');
        if (structure.hasImplementation) lines.push('  - Has implementation/ subfolder');
        if (structure.hasGuides) lines.push('  - Has guides/ subfolder');
        if (structure.hasAPI) lines.push('  - Has API documentation');
        if (structure.customFolders?.length) {
          lines.push(`  - Custom folders: ${structure.customFolders.join(', ')}`);
        }
      }
    } else {
      lines.push('✗ No documentation folder found');
    }

    lines.push('');

    // Scripts folder
    if (conventions.scriptsFolder?.exists) {
      lines.push(`✓ Scripts folder: ${conventions.scriptsFolder.path}/`);
      if (conventions.scriptsFolder.types?.length) {
        lines.push(`  - Script types: ${conventions.scriptsFolder.types.join(', ')}`);
      }
    } else {
      lines.push('✗ No scripts folder found');
    }

    lines.push('');

    // Root files
    if (conventions.rootFileConventions) {
      lines.push('Root file conventions:');
      const rc = conventions.rootFileConventions;
      lines.push(`  - README in root: ${rc.readmeInRoot ? '✓' : '✗'}`);
      lines.push(`  - CHANGELOG in root: ${rc.changelogInRoot ? '✓' : '✗'}`);
      lines.push(`  - CONTRIBUTING in root: ${rc.contributingInRoot ? '✓' : '✗'}`);
      lines.push(`  - LICENSE in root: ${rc.licenseInRoot ? '✓' : '✗'}`);
      if (rc.customRootFiles?.length) {
        lines.push(`  - Custom root docs: ${rc.customRootFiles.join(', ')}`);
      }
    }

    lines.push('');

    // Test conventions
    if (conventions.testConventions) {
      lines.push(`Test organization: ${conventions.testConventions.location}`);
      if (conventions.testConventions.folderName) {
        lines.push(`  - Test folder: ${conventions.testConventions.folderName}/`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get human-readable summary of conventions
   */
  getSummary(conventions: ProjectConventions): string {
    const lines: string[] = [];

    lines.push('\n📋 Project Conventions Analysis:');
    lines.push('═══════════════════════════════════════\n');

    // Documentation
    if (conventions.docsFolder?.exists) {
      lines.push(`✓ Documentation organized in [${conventions.docsFolder.path}](${conventions.docsFolder.path}/)`);
      if (conventions.docsFolder.structure) {
        const folders: string[] = [];
        if (conventions.docsFolder.structure.hasSpecifications) folders.push('specifications');
        if (conventions.docsFolder.structure.hasImplementation) folders.push('implementation');
        if (conventions.docsFolder.structure.hasGuides) folders.push('guides');
        if (folders.length > 0) {
          lines.push(`  Structure: ${folders.join(', ')}`);
        }
      }
    } else {
      lines.push('• No docs folder exists (will follow best practices)');
    }

    // Scripts
    if (conventions.scriptsFolder?.exists) {
      lines.push(`✓ Scripts organized in [${conventions.scriptsFolder.path}](${conventions.scriptsFolder.path}/)`);
    } else {
      lines.push('• No scripts folder exists (will create if needed)');
    }

    // Root files
    if (conventions.rootFileConventions) {
      const rootDocs: string[] = [];
      if (conventions.rootFileConventions.readmeInRoot) rootDocs.push('README');
      if (conventions.rootFileConventions.changelogInRoot) rootDocs.push('CHANGELOG');
      if (conventions.rootFileConventions.contributingInRoot) rootDocs.push('CONTRIBUTING');
      if (conventions.rootFileConventions.licenseInRoot) rootDocs.push('LICENSE');

      if (rootDocs.length > 0) {
        lines.push(`✓ Root documentation: ${rootDocs.join(', ')}`);
      }
    }

    // Recommendations
    if (conventions.recommendations) {
      lines.push('\n💡 Recommendations:');
      if (conventions.recommendations.shouldCreateDocsFolder) {
        lines.push(`  • Create ${conventions.docsFolder?.path || 'docs'}/ folder for documentation`);
        if (conventions.recommendations.recommendedDocsStructure?.length) {
          lines.push(`    → Suggested structure: ${conventions.recommendations.recommendedDocsStructure.join(', ')}`);
        }
      }
      if (conventions.recommendations.shouldCreateScriptsFolder) {
        lines.push(`  • Create ${conventions.scriptsFolder?.path || 'scripts'}/ folder for scripts`);
      }
      if (conventions.recommendations.keepFilesInRoot?.length) {
        lines.push(`  • Keep in root: ${conventions.recommendations.keepFilesInRoot.join(', ')}`);
      }
    }

    lines.push('═══════════════════════════════════════\n');

    return lines.join('\n');
  }

  /**
   * Check if a file should be placed in root based on conventions
   */
  shouldKeepInRoot(fileName: string, conventions: ProjectConventions): boolean {
    const lower = fileName.toLowerCase();

    // Always keep these in root (best practice)
    const alwaysInRoot = ['readme', 'changelog', 'contributing', 'license', 'code_of_conduct', 'security'];
    if (alwaysInRoot.some(name => lower.startsWith(name))) {
      return true;
    }

    // Check project-specific conventions
    if (conventions.recommendations?.keepFilesInRoot?.some(f => f.toLowerCase() === lower)) {
      return true;
    }

    return false;
  }

  /**
   * Get target folder for a file based on conventions
   */
  getTargetFolder(fileName: string, fileType: 'doc' | 'script' | 'test', conventions: ProjectConventions): string | null {
    // Check if should stay in root
    if (this.shouldKeepInRoot(fileName, conventions)) {
      return null; // null means "keep in root"
    }

    switch (fileType) {
      case 'doc':
        if (conventions.docsFolder?.exists) {
          return conventions.docsFolder.path;
        }
        return conventions.recommendations?.shouldCreateDocsFolder ? 'docs' : null;

      case 'script':
        if (conventions.scriptsFolder?.exists) {
          return conventions.scriptsFolder.path;
        }
        return conventions.recommendations?.shouldCreateScriptsFolder ? 'scripts' : null;

      case 'test':
        if (conventions.testConventions && conventions.testConventions.location === 'centralized' && conventions.testConventions.folderName) {
          return conventions.testConventions.folderName;
        }
        return 'tests';

      default:
        return null;
    }
  }

  /**
   * Save conventions to cache file
   */
  async saveToCache(rootPath: string, conventions: ProjectConventions): Promise<void> {
    const cacheDir = path.join(rootPath, '.devibe');
    const cacheFile = path.join(cacheDir, 'project-conventions.json');

    try {
      // Ensure .devibe directory exists
      await fs.mkdir(cacheDir, { recursive: true });

      // Write conventions to cache
      await fs.writeFile(cacheFile, JSON.stringify(conventions, null, 2), 'utf-8');
    } catch (error) {
      // Cache write failed, continue without caching
      if (process.env.VERBOSE) {
        console.warn('Failed to save conventions to cache:', error);
      }
    }
  }

  /**
   * Load conventions from cache if available
   */
  async loadFromCache(rootPath: string): Promise<ProjectConventions | null> {
    const cacheFile = path.join(rootPath, '.devibe', 'project-conventions.json');

    try {
      const content = await fs.readFile(cacheFile, 'utf-8');
      const conventions = JSON.parse(content) as ProjectConventions;

      // Check if cache is recent (within last 24 hours)
      const cacheAge = Date.now() - new Date(conventions.analyzedAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxAge) {
        return conventions;
      }

      // Cache is stale
      return null;
    } catch {
      // Cache doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Analyze with caching support
   */
  async analyzeWithCache(rootPath: string, repositories: GitRepository[]): Promise<ProjectConventions> {
    // Try to load from cache first
    const cached = await this.loadFromCache(rootPath);
    if (cached) {
      if (process.env.VERBOSE) {
        console.log('📦 Using cached project conventions');
      }
      return cached;
    }

    // Perform fresh analysis
    const conventions = await this.analyze(rootPath, repositories);

    // Save to cache
    await this.saveToCache(rootPath, conventions);

    return conventions;
  }
}
