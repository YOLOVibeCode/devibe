/**
 * Project Structure Analyzer
 *
 * Analyzes the entire project structure to understand:
 * - Monorepo vs single repo
 * - Framework (NX, Turborepo, Lerna, etc.)
 * - Technologies used (React, Node.js, iOS, etc.)
 * - Test strategy
 *
 * This context helps AI make smarter decisions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GitRepository } from './types.js';
import type { ProjectStructure } from './ai-learning-database.js';

export class ProjectStructureAnalyzer {
  /**
   * Analyze project structure
   */
  async analyze(rootPath: string, repositories: GitRepository[]): Promise<ProjectStructure> {
    const type = repositories.length > 1 ? 'monorepo' : 'single-repo';
    const framework = await this.detectFramework(rootPath);
    const testStrategy = await this.detectTestStrategy(rootPath);

    // Analyze each repository
    const repoDetails = await Promise.all(
      repositories.map(async (repo) => {
        const technology = await this.detectTechnology(repo.path);
        return {
          name: path.basename(repo.path),
          path: repo.path,
          technology,
          isRoot: repo.isRoot,
        };
      })
    );

    return {
      type,
      framework,
      repositories: repoDetails,
      testStrategy,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect monorepo framework
   */
  private async detectFramework(rootPath: string): Promise<string | undefined> {
    try {
      // Check for NX
      if (await this.fileExists(path.join(rootPath, 'nx.json'))) {
        return 'nx';
      }

      // Check for Turborepo
      if (await this.fileExists(path.join(rootPath, 'turbo.json'))) {
        return 'turborepo';
      }

      // Check for Lerna
      if (await this.fileExists(path.join(rootPath, 'lerna.json'))) {
        return 'lerna';
      }

      // Check for pnpm workspace
      if (await this.fileExists(path.join(rootPath, 'pnpm-workspace.yaml'))) {
        return 'pnpm-workspace';
      }

      // Check for Yarn workspaces
      const pkgPath = path.join(rootPath, 'package.json');
      if (await this.fileExists(pkgPath)) {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return 'yarn-workspaces';
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Detect technology stack for a repository
   */
  private async detectTechnology(repoPath: string): Promise<string | undefined> {
    try {
      const pkgPath = path.join(repoPath, 'package.json');

      if (await this.fileExists(pkgPath)) {
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Check for specific frameworks/technologies
        if (deps['react-native']) return 'React Native';
        if (deps['react']) return 'React';
        if (deps['next']) return 'Next.js';
        if (deps['@angular/core']) return 'Angular';
        if (deps['vue']) return 'Vue.js';
        if (deps['express']) return 'Express (Node.js)';
        if (deps['fastify']) return 'Fastify (Node.js)';
        if (deps['nest']) return 'NestJS';
      }

      // Check for iOS
      if (await this.fileExists(path.join(repoPath, 'Podfile'))) {
        return 'iOS (Swift/Objective-C)';
      }

      // Check for Android
      if (await this.fileExists(path.join(repoPath, 'build.gradle'))) {
        return 'Android (Kotlin/Java)';
      }

      // Check for Python
      if (await this.fileExists(path.join(repoPath, 'requirements.txt')) ||
          await this.fileExists(path.join(repoPath, 'pyproject.toml'))) {
        return 'Python';
      }

      // Check for Go
      if (await this.fileExists(path.join(repoPath, 'go.mod'))) {
        return 'Go';
      }

      // Check for Rust
      if (await this.fileExists(path.join(repoPath, 'Cargo.toml'))) {
        return 'Rust';
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Detect test strategy
   */
  private async detectTestStrategy(rootPath: string): Promise<'colocated' | 'centralized' | 'per-package' | undefined> {
    try {
      // Check for centralized tests directory
      const hasCentralizedTests = await this.directoryExists(path.join(rootPath, 'tests')) ||
                                   await this.directoryExists(path.join(rootPath, 'test'));

      if (hasCentralizedTests) {
        return 'centralized';
      }

      // Check for per-package tests (common in monorepos)
      const dirs = await fs.readdir(rootPath, { withFileTypes: true });
      const packages = dirs.filter(d => d.isDirectory() && !d.name.startsWith('.'));

      let hasPerPackageTests = 0;
      for (const pkg of packages.slice(0, 5)) { // Check first 5 packages
        const pkgPath = path.join(rootPath, pkg.name);
        if (await this.directoryExists(path.join(pkgPath, 'tests')) ||
            await this.directoryExists(path.join(pkgPath, 'test')) ||
            await this.directoryExists(path.join(pkgPath, '__tests__'))) {
          hasPerPackageTests++;
        }
      }

      if (hasPerPackageTests >= 2) {
        return 'per-package';
      }

      // Check for colocated tests (*.test.ts, *.spec.ts next to source)
      const srcDir = path.join(rootPath, 'src');
      if (await this.directoryExists(srcDir)) {
        const hasColocatedTests = await this.hasTestFilesInDirectory(srcDir);
        if (hasColocatedTests) {
          return 'colocated';
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if directory has test files
   */
  private async hasTestFilesInDirectory(dir: string): Promise<boolean> {
    try {
      const files = await fs.readdir(dir);
      return files.some(f =>
        f.endsWith('.test.ts') ||
        f.endsWith('.test.js') ||
        f.endsWith('.spec.ts') ||
        f.endsWith('.spec.js')
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get project context as a prompt string for AI
   */
  buildContextPrompt(structure: ProjectStructure): string {
    const lines: string[] = [];

    lines.push('PROJECT CONTEXT:');
    lines.push(`Type: ${structure.type}`);

    if (structure.framework) {
      lines.push(`Framework: ${structure.framework}`);
    }

    if (structure.repositories.length > 0) {
      lines.push('\nRepositories:');
      for (const repo of structure.repositories) {
        const tech = repo.technology ? ` (${repo.technology})` : '';
        const root = repo.isRoot ? ' [ROOT]' : '';
        lines.push(`  - ${repo.name}${tech}${root}`);
      }
    }

    if (structure.testStrategy) {
      lines.push(`\nTest Strategy: ${structure.testStrategy}`);
      if (structure.testStrategy === 'colocated') {
        lines.push('  → Test files should be placed next to source files');
      } else if (structure.testStrategy === 'centralized') {
        lines.push('  → Test files should go to /tests directory');
      } else if (structure.testStrategy === 'per-package') {
        lines.push('  → Test files should go to package-specific /tests directories');
      }
    }

    return lines.join('\n');
  }
}
