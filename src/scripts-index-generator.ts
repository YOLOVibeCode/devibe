/**
 * Scripts Index Generator
 *
 * Intelligently analyzes scripts folder and generates:
 * 1. INDEX.md in scripts/ folder with categorized script documentation
 * 2. AI-readable usage instructions
 * 3. Auto-detected categories (build, deploy, test, utility, etc.)
 * 4. Script descriptions and usage examples
 * 5. Updates README with link to scripts/INDEX.md
 *
 * Philosophy:
 * - Help AI understand what scripts do and how to use them
 * - Categorize by purpose (build, deploy, test, setup, etc.)
 * - Provide usage examples and parameter documentation
 * - Keep index synchronized with actual scripts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AIClassifierFactory } from './ai-classifier.js';
import type { ProjectConventions } from './project-convention-analyzer.js';
import { ReadmeAISectionManager } from './readme-ai-section-manager.js';

export interface ScriptFile {
  path: string;
  relativePath: string; // Relative to scripts folder
  name: string;
  category?: string; // build, deploy, test, utility, setup, etc.
  title?: string; // Human-readable name
  description?: string; // AI-generated or extracted description
  language?: string; // bash, python, javascript, etc.
  isExecutable: boolean;
  requiresArgs?: boolean; // Does it need command-line arguments?
  lastModified: Date;
}

export interface ScriptCategory {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  scripts: ScriptFile[];
}

export interface ScriptsIndexResult {
  indexPath: string;
  categoriesFound: number;
  scriptsIndexed: number;
  readmeUpdated: boolean;
}

export class ScriptsIndexGenerator {
  private aiAvailable: boolean = false;

  async initialize(): Promise<void> {
    this.aiAvailable = await AIClassifierFactory.isAvailable();
  }

  /**
   * Generate or update scripts index
   */
  async generate(
    rootPath: string,
    conventions?: ProjectConventions,
    dryRun: boolean = false
  ): Promise<ScriptsIndexResult> {
    await this.initialize();

    // Find scripts folder
    const scriptsFolder = await this.findScriptsFolder(rootPath, conventions);
    if (!scriptsFolder) {
      return {
        indexPath: '',
        categoriesFound: 0,
        scriptsIndexed: 0,
        readmeUpdated: false,
      };
    }

    // Scan all script files
    const scriptFiles = await this.scanScriptsFolder(scriptsFolder);
    if (scriptFiles.length === 0) {
      return {
        indexPath: '',
        categoriesFound: 0,
        scriptsIndexed: 0,
        readmeUpdated: false,
      };
    }

    // Categorize scripts
    const categories = await this.categorizeScripts(scriptFiles);

    // Generate INDEX.md content
    const indexContent = await this.generateIndexContent(categories, scriptFiles, scriptsFolder);
    const indexPath = path.join(scriptsFolder, 'INDEX.md');

    if (!dryRun) {
      await fs.writeFile(indexPath, indexContent, 'utf-8');

      // Update README with unified AI section
      await this.updateReadmeWithIndex(rootPath, scriptsFolder);
    }

    return {
      indexPath,
      categoriesFound: categories.length,
      scriptsIndexed: scriptFiles.length,
      readmeUpdated: true,
    };
  }

  /**
   * Find scripts folder based on conventions
   */
  private async findScriptsFolder(rootPath: string, conventions?: ProjectConventions): Promise<string | null> {
    if (conventions?.scriptsFolder?.exists) {
      return path.join(rootPath, conventions.scriptsFolder.path);
    }

    // Try common names
    const commonNames = ['scripts', 'script', 'bin', 'tools', 'utilities'];
    for (const name of commonNames) {
      const scriptPath = path.join(rootPath, name);
      try {
        const stats = await fs.stat(scriptPath);
        if (stats.isDirectory()) return scriptPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Scan scripts folder for script files
   */
  private async scanScriptsFolder(scriptsFolder: string): Promise<ScriptFile[]> {
    const scripts: ScriptFile[] = [];

    const entries = await fs.readdir(scriptsFolder, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() || entry.name.toLowerCase() === 'index.md') continue;

      const fullPath = path.join(scriptsFolder, entry.name);
      const stats = await fs.stat(fullPath);

      // Check if it's a script file
      if (this.isScriptFile(entry.name)) {
        const relativePath = path.relative(scriptsFolder, fullPath);
        const language = this.detectLanguage(entry.name);
        const content = await this.readScriptSafely(fullPath);

        scripts.push({
          path: fullPath,
          relativePath,
          name: entry.name,
          title: this.generateTitle(entry.name),
          description: content ? this.extractDescription(content) : undefined,
          language,
          isExecutable: !!(stats.mode & 0o111), // Check execute permission
          requiresArgs: content ? this.detectRequiredArgs(content) : false,
          lastModified: stats.mtime,
        });
      }
    }

    return scripts;
  }

  /**
   * Check if file is a script
   */
  private isScriptFile(filename: string): boolean {
    const scriptExtensions = ['.sh', '.bash', '.zsh', '.py', '.js', '.ts', '.rb', '.pl', '.ps1'];
    const ext = path.extname(filename).toLowerCase();

    // Has script extension or no extension (shell scripts)
    return scriptExtensions.includes(ext) || (!ext && !filename.includes('.'));
  }

  /**
   * Detect script language
   */
  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const languageMap: Record<string, string> = {
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.rb': 'ruby',
      '.pl': 'perl',
      '.ps1': 'powershell',
    };

    return languageMap[ext] || 'shell';
  }

  /**
   * Read script content safely
   */
  private async readScriptSafely(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Extract description from script comments
   */
  private extractDescription(content: string): string | undefined {
    const lines = content.split('\n');

    // Look for comment block at the top
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();

      // Skip shebang
      if (line.startsWith('#!')) continue;

      // Check for description comments
      const commentMatch = line.match(/^#\s*(.+)$/) || line.match(/^\/\/\s*(.+)$/);
      if (commentMatch) {
        const comment = commentMatch[1].trim();
        // Skip empty comments or common patterns
        if (comment && !comment.startsWith('=') && !comment.startsWith('-') && comment.length > 10) {
          return comment;
        }
      }
    }

    return undefined;
  }

  /**
   * Detect if script requires arguments
   */
  private detectRequiredArgs(content: string): boolean {
    // Look for common argument patterns
    return (
      content.includes('$1') ||
      content.includes('$@') ||
      content.includes('sys.argv') ||
      content.includes('process.argv') ||
      content.includes('ARGV') ||
      content.includes('getopts') ||
      content.includes('argparse')
    );
  }

  /**
   * Generate human-readable title from filename
   */
  private generateTitle(filename: string): string {
    const nameWithoutExt = path.basename(filename, path.extname(filename));

    return nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Categorize scripts by purpose
   */
  private async categorizeScripts(scripts: ScriptFile[]): Promise<ScriptCategory[]> {
    const categoryMap = new Map<string, ScriptFile[]>();

    for (const script of scripts) {
      const category = this.detectCategory(script);
      script.category = category;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(script);
    }

    // Build categories with metadata
    const categories: ScriptCategory[] = [];
    for (const [categoryName, categoryScripts] of categoryMap.entries()) {
      categories.push({
        name: categoryName,
        displayName: this.formatCategoryName(categoryName),
        description: this.getCategoryDescription(categoryName),
        icon: this.getCategoryIcon(categoryName),
        scripts: categoryScripts.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // Sort categories by priority
    return this.sortCategories(categories);
  }

  /**
   * Detect script category from name and content
   */
  private detectCategory(script: ScriptFile): string {
    const name = script.name.toLowerCase();

    // Build scripts
    if (name.includes('build') || name.includes('compile') || name.includes('webpack') || name.includes('rollup')) {
      return 'build';
    }

    // Deploy scripts
    if (name.includes('deploy') || name.includes('release') || name.includes('publish')) {
      return 'deploy';
    }

    // Test scripts
    if (name.includes('test') || name.includes('spec') || name.includes('coverage')) {
      return 'test';
    }

    // Setup/Install scripts
    if (name.includes('setup') || name.includes('install') || name.includes('init')) {
      return 'setup';
    }

    // Cleanup scripts
    if (name.includes('clean') || name.includes('reset') || name.includes('remove')) {
      return 'cleanup';
    }

    // Version/Release scripts
    if (name.includes('version') || name.includes('bump') || name.includes('tag')) {
      return 'versioning';
    }

    // Database scripts
    if (name.includes('db') || name.includes('database') || name.includes('migrate') || name.includes('seed')) {
      return 'database';
    }

    // CI/CD scripts
    if (name.includes('ci') || name.includes('cd') || name.includes('pipeline')) {
      return 'cicd';
    }

    // Default category
    return 'utility';
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(name: string): string {
    const nameMap: Record<string, string> = {
      build: 'Build Scripts',
      deploy: 'Deployment Scripts',
      test: 'Testing Scripts',
      setup: 'Setup & Installation',
      cleanup: 'Cleanup Scripts',
      versioning: 'Version Management',
      database: 'Database Scripts',
      cicd: 'CI/CD Scripts',
      utility: 'Utility Scripts',
    };

    return nameMap[name] || name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Get category description
   */
  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      build: 'Scripts for building and compiling the project',
      deploy: 'Scripts for deploying to various environments',
      test: 'Scripts for running tests and generating coverage',
      setup: 'Scripts for project setup and dependency installation',
      cleanup: 'Scripts for cleaning up build artifacts and temporary files',
      versioning: 'Scripts for version management and releases',
      database: 'Scripts for database operations, migrations, and seeding',
      cicd: 'Scripts used in CI/CD pipelines',
      utility: 'General utility and helper scripts',
    };

    return descriptions[category] || 'Miscellaneous scripts';
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      build: '🔨',
      deploy: '🚀',
      test: '🧪',
      setup: '⚙️',
      cleanup: '🧹',
      versioning: '📦',
      database: '🗄️',
      cicd: '🔄',
      utility: '🔧',
    };

    return icons[category] || '📄';
  }

  /**
   * Sort categories by priority
   */
  private sortCategories(categories: ScriptCategory[]): ScriptCategory[] {
    const priority: Record<string, number> = {
      setup: 0,
      build: 1,
      test: 2,
      deploy: 3,
      database: 4,
      versioning: 5,
      cicd: 6,
      cleanup: 7,
      utility: 99,
    };

    return categories.sort((a, b) => {
      const aPrio = priority[a.name] ?? 999;
      const bPrio = priority[b.name] ?? 999;
      return aPrio - bPrio;
    });
  }

  /**
   * Generate INDEX.md content
   */
  private async generateIndexContent(
    categories: ScriptCategory[],
    allScripts: ScriptFile[],
    scriptsFolder: string
  ): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push('# Scripts Index');
    lines.push('');
    lines.push('> 🔧 Auto-generated index of all project scripts. Last updated: ' + new Date().toLocaleDateString());
    lines.push('');

    // Quick stats
    lines.push('## 📊 Overview');
    lines.push('');
    lines.push(`- **Total Scripts**: ${allScripts.length}`);
    lines.push(`- **Categories**: ${categories.length}`);
    const executableCount = allScripts.filter(s => s.isExecutable).length;
    lines.push(`- **Executable**: ${executableCount} scripts`);
    lines.push('');

    // Table of contents
    lines.push('## 📑 Table of Contents');
    lines.push('');
    for (const category of categories) {
      lines.push(`- [${category.icon} ${category.displayName}](#${this.slugify(category.displayName)})`);
    }
    lines.push('');

    // Categories with scripts
    for (const category of categories) {
      lines.push(`## ${category.icon} ${category.displayName}`);
      lines.push('');

      if (category.description) {
        lines.push(`*${category.description}*`);
        lines.push('');
      }

      // List scripts in this category
      for (const script of category.scripts) {
        const executable = script.isExecutable ? '✓ Executable' : '✗ Not executable';
        const requiresArgs = script.requiresArgs ? '⚠️ Requires arguments' : '';

        lines.push(`### [\`${script.name}\`](${script.relativePath})`);

        if (script.description) {
          lines.push(`${script.description}`);
          lines.push('');
        }

        // Usage
        lines.push('**Usage:**');
        if (script.language === 'bash' || script.language === 'shell') {
          lines.push('```bash');
          lines.push(`./${script.name}${script.requiresArgs ? ' [arguments]' : ''}`);
          lines.push('```');
        } else if (script.language === 'python') {
          lines.push('```bash');
          lines.push(`python ${script.name}${script.requiresArgs ? ' [arguments]' : ''}`);
          lines.push('```');
        } else if (script.language === 'javascript' || script.language === 'typescript') {
          lines.push('```bash');
          lines.push(`node ${script.name}${script.requiresArgs ? ' [arguments]' : ''}`);
          lines.push('```');
        }
        lines.push('');

        // Metadata
        const meta: string[] = [];
        meta.push(`Language: ${script.language}`);
        meta.push(executable);
        if (requiresArgs) meta.push(requiresArgs);

        lines.push(`*${meta.join(' • ')}*`);
        lines.push('');
      }
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*This index is automatically generated by devibe. Do not edit manually.*');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Slugify text for anchor links
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Update README.md with unified index section
   */
  private async updateReadmeWithIndex(rootPath: string, scriptsFolder: string): Promise<void> {
    const scriptsRelative = path.relative(rootPath, scriptsFolder);
    const scriptsIndexPath = `${scriptsRelative}/INDEX.md`.replace(/\\/g, '/');

    // Get current index info from README
    const manager = new ReadmeAISectionManager();
    const currentInfo = await manager.getCurrentIndexInfo(rootPath);

    // Update with scripts index
    await manager.updateReadme(rootPath, {
      ...currentInfo,
      scriptsIndex: scriptsIndexPath,
    });
  }

  /**
   * Get a preview of what would be generated (for dry-run)
   */
  async preview(rootPath: string, conventions?: ProjectConventions): Promise<string> {
    const result = await this.generate(rootPath, conventions, true);

    if (result.scriptsIndexed === 0) {
      return 'ℹ️  No scripts folder found or no script files to index.';
    }

    return `🔧 Scripts Index Preview:

  • Would create: scripts/INDEX.md
  • Categories found: ${result.categoriesFound}
  • Scripts to index: ${result.scriptsIndexed}
  • README.md would be updated with link to scripts/INDEX.md
`;
  }
}
