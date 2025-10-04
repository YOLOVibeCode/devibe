/**
 * Dependency Analyzer
 *
 * Analyzes file imports and dependencies to understand
 * relationships and make smarter placement decisions.
 */

import * as fs from 'fs/promises';

export interface DependencyInfo {
  imports: string[];
  requires: string[];
  packages: string[]; // External package names
  internalPaths: string[]; // Relative imports
  hasReact: boolean;
  hasNode: boolean;
  hasTest: boolean;
  framework?: string;
}

export class DependencyAnalyzer {
  /**
   * Analyze file dependencies
   */
  async analyze(filePath: string, content?: string): Promise<DependencyInfo> {
    if (!content) {
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        return this.emptyResult();
      }
    }

    const imports: string[] = [];
    const requires: string[] = [];
    const packages = new Set<string>();
    const internalPaths: string[] = [];

    // Extract ES6 imports
    const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      imports.push(importPath);

      if (this.isExternalPackage(importPath)) {
        packages.add(this.extractPackageName(importPath));
      } else if (importPath.startsWith('.')) {
        internalPaths.push(importPath);
      }
    }

    // Extract CommonJS requires
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      requires.push(requirePath);

      if (this.isExternalPackage(requirePath)) {
        packages.add(this.extractPackageName(requirePath));
      } else if (requirePath.startsWith('.')) {
        internalPaths.push(requirePath);
      }
    }

    // Detect specific technologies
    const packageArray = Array.from(packages);
    const hasReact = packageArray.some(p => p === 'react' || p.startsWith('react-'));
    const hasNode = packageArray.some(p =>
      ['express', 'fastify', 'koa', 'nest', 'http', 'fs', 'path'].includes(p)
    );
    const hasTest = packageArray.some(p =>
      ['vitest', 'jest', 'mocha', 'chai', '@testing-library'].some(test => p.includes(test))
    ) || content.includes('describe(') || content.includes('test(') || content.includes('it(');

    const framework = this.detectFramework(packageArray, content);

    return {
      imports,
      requires,
      packages: packageArray,
      internalPaths,
      hasReact,
      hasNode,
      hasTest,
      framework,
    };
  }

  /**
   * Check if import is an external package
   */
  private isExternalPackage(importPath: string): boolean {
    // Not external if it starts with . or /
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      return false;
    }

    // External if it's a scoped package or normal package name
    return true;
  }

  /**
   * Extract package name from import path
   */
  private extractPackageName(importPath: string): string {
    // Handle scoped packages (@scope/package/subpath)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return `${parts[0]}/${parts[1]}`;
    }

    // Handle regular packages (package/subpath)
    const parts = importPath.split('/');
    return parts[0];
  }

  /**
   * Detect framework from packages and content
   */
  private detectFramework(packages: string[], content: string): string | undefined {
    if (packages.includes('react-native')) return 'React Native';
    if (packages.includes('next')) return 'Next.js';
    if (packages.includes('@angular/core')) return 'Angular';
    if (packages.includes('vue')) return 'Vue.js';
    if (packages.includes('svelte')) return 'Svelte';
    if (packages.includes('express')) return 'Express';
    if (packages.includes('fastify')) return 'Fastify';
    if (packages.includes('@nestjs/core')) return 'NestJS';

    // Check content for Swift/iOS indicators
    if (content.includes('import UIKit') || content.includes('import SwiftUI')) {
      return 'iOS (Swift)';
    }

    // Check content for Android indicators
    if (content.includes('import android.') || content.includes('package com.')) {
      return 'Android (Kotlin/Java)';
    }

    return undefined;
  }

  /**
   * Find which repository a file likely belongs to based on dependencies
   */
  suggestRepository(
    dependencies: DependencyInfo,
    repositories: Array<{ name: string; technology?: string }>
  ): { name: string; confidence: number; reasoning: string } | null {
    const suggestions: Array<{ name: string; score: number; reasons: string[] }> = [];

    for (const repo of repositories) {
      let score = 0;
      const reasons: string[] = [];

      if (!repo.technology) continue;

      const tech = repo.technology.toLowerCase();

      // Match framework/technology
      if (dependencies.framework) {
        const framework = dependencies.framework.toLowerCase();
        if (tech.includes(framework) || framework.includes(tech)) {
          score += 50;
          reasons.push(`Uses ${dependencies.framework} which matches repository technology`);
        }
      }

      // Match React
      if (dependencies.hasReact && tech.includes('react')) {
        score += 40;
        reasons.push('Uses React framework');
      }

      // Match Node.js backend
      if (dependencies.hasNode && (tech.includes('node') || tech.includes('express') || tech.includes('api'))) {
        score += 40;
        reasons.push('Uses Node.js server packages');
      }

      // Match mobile
      if (tech.includes('ios') && dependencies.framework?.includes('iOS')) {
        score += 50;
        reasons.push('iOS-specific imports detected');
      }

      if (tech.includes('android') && dependencies.framework?.includes('Android')) {
        score += 50;
        reasons.push('Android-specific imports detected');
      }

      // Match by package names
      for (const pkg of dependencies.packages) {
        if (repo.name.toLowerCase().includes(pkg.toLowerCase()) ||
            pkg.toLowerCase().includes(repo.name.toLowerCase())) {
          score += 20;
          reasons.push(`Package ${pkg} matches repository name`);
        }
      }

      if (score > 0) {
        suggestions.push({ name: repo.name, score, reasons });
      }
    }

    if (suggestions.length === 0) return null;

    // Sort by score and return best match
    suggestions.sort((a, b) => b.score - a.score);
    const best = suggestions[0];

    // Normalize confidence (0-1)
    const confidence = Math.min(0.95, best.score / 100);

    return {
      name: best.name,
      confidence,
      reasoning: best.reasons.join('; '),
    };
  }

  /**
   * Analyze multiple files to find relationships
   */
  async analyzeRelationships(
    filePaths: string[]
  ): Promise<Map<string, string[]>> {
    const relationships = new Map<string, string[]>();

    for (const filePath of filePaths) {
      try {
        const deps = await this.analyze(filePath);
        const relatedFiles: string[] = [];

        // Find files that import this file or are imported by this file
        for (const importPath of deps.internalPaths) {
          relatedFiles.push(importPath);
        }

        if (relatedFiles.length > 0) {
          relationships.set(filePath, relatedFiles);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return relationships;
  }

  /**
   * Build a context prompt for AI based on dependencies
   */
  buildDependencyPrompt(dependencies: DependencyInfo): string {
    const lines: string[] = [];

    if (dependencies.packages.length > 0) {
      lines.push(`External packages: ${dependencies.packages.slice(0, 5).join(', ')}`);
    }

    if (dependencies.framework) {
      lines.push(`Framework: ${dependencies.framework}`);
    }

    if (dependencies.hasTest) {
      lines.push('Contains test code (test framework detected)');
    }

    if (dependencies.hasReact) {
      lines.push('React component or hook');
    }

    if (dependencies.hasNode) {
      lines.push('Node.js server-side code');
    }

    if (dependencies.internalPaths.length > 0) {
      lines.push(`Internal imports: ${dependencies.internalPaths.slice(0, 3).join(', ')}`);
    }

    return lines.length > 0 ? `DEPENDENCIES:\n${lines.join('\n')}` : '';
  }

  /**
   * Empty result
   */
  private emptyResult(): DependencyInfo {
    return {
      imports: [],
      requires: [],
      packages: [],
      internalPaths: [],
      hasReact: false,
      hasNode: false,
      hasTest: false,
    };
  }
}
