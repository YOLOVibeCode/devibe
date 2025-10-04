/**
 * GitIgnore Manager
 *
 * Automatically manages .gitignore files to exclude devibe directories
 * (.devibe and .unvibe) from version control.
 *
 * Features:
 * - Adds .devibe and .unvibe to .gitignore in all repositories
 * - Creates .gitignore if it doesn't exist
 * - Avoids duplicate entries
 * - Preserves existing .gitignore content
 * - Works with both root and sub-repositories
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GitRepository } from './types.js';

export interface GitIgnoreUpdateResult {
  updated: string[];
  created: string[];
  skipped: string[];
  errors: Array<{ path: string; error: string }>;
}

export class GitIgnoreManager {
  private readonly entriesToAdd = ['.devibe', '.unvibe'];

  /**
   * Update .gitignore files in all repositories
   */
  async updateAllRepositories(repositories: GitRepository[]): Promise<GitIgnoreUpdateResult> {
    const result: GitIgnoreUpdateResult = {
      updated: [],
      created: [],
      skipped: [],
      errors: [],
    };

    for (const repo of repositories) {
      try {
        const gitignorePath = path.join(repo.path, '.gitignore');
        const updateResult = await this.updateGitIgnore(gitignorePath);

        switch (updateResult) {
          case 'created':
            result.created.push(repo.path);
            break;
          case 'updated':
            result.updated.push(repo.path);
            break;
          case 'skipped':
            result.skipped.push(repo.path);
            break;
        }
      } catch (error) {
        result.errors.push({
          path: repo.path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Update a single .gitignore file
   */
  async updateGitIgnore(gitignorePath: string): Promise<'created' | 'updated' | 'skipped'> {
    // Check if .gitignore exists
    const exists = await this.fileExists(gitignorePath);

    if (!exists) {
      // Create new .gitignore with devibe entries
      await this.createGitIgnore(gitignorePath);
      return 'created';
    }

    // Read existing .gitignore
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content.split('\n');

    // Check if entries already exist
    const missingEntries = this.entriesToAdd.filter(
      entry => !this.hasEntry(lines, entry)
    );

    if (missingEntries.length === 0) {
      return 'skipped'; // Already up to date
    }

    // Add missing entries
    const updatedContent = this.addEntries(content, missingEntries);
    await fs.writeFile(gitignorePath, updatedContent, 'utf-8');

    return 'updated';
  }

  /**
   * Create a new .gitignore file with devibe entries
   */
  private async createGitIgnore(gitignorePath: string): Promise<void> {
    const content = this.generateGitIgnoreContent();
    await fs.writeFile(gitignorePath, content, 'utf-8');
  }

  /**
   * Generate .gitignore content with devibe entries
   */
  private generateGitIgnoreContent(): string {
    return [
      '# devibe/unvibe directories',
      '# These directories contain backups and temporary files from devibe',
      '.devibe/',
      '.unvibe/',
      '',
    ].join('\n');
  }

  /**
   * Add entries to existing .gitignore content
   */
  private addEntries(content: string, entries: string[]): string {
    // Ensure content ends with newline
    let updated = content;
    if (!updated.endsWith('\n')) {
      updated += '\n';
    }

    // Add blank line before devibe section if content is not empty
    if (content.trim().length > 0) {
      updated += '\n';
    }

    // Add devibe section
    updated += '# devibe/unvibe directories\n';
    updated += '# These directories contain backups and temporary files from devibe\n';

    for (const entry of entries) {
      updated += `${entry}/\n`;
    }

    return updated;
  }

  /**
   * Check if an entry exists in .gitignore
   */
  private hasEntry(lines: string[], entry: string): boolean {
    // Check for exact match or with trailing slash
    return lines.some(line => {
      const trimmed = line.trim();
      return trimmed === entry || trimmed === `${entry}/` || trimmed === `/${entry}/`;
    });
  }

  /**
   * Check if a file exists
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
   * Get a summary message for the update result
   */
  static formatResult(result: GitIgnoreUpdateResult): string {
    const messages: string[] = [];

    if (result.created.length > 0) {
      messages.push(`Created .gitignore in ${result.created.length} repositories`);
    }

    if (result.updated.length > 0) {
      messages.push(`Updated .gitignore in ${result.updated.length} repositories`);
    }

    if (result.skipped.length > 0) {
      messages.push(`Skipped ${result.skipped.length} repositories (already configured)`);
    }

    if (result.errors.length > 0) {
      messages.push(`Failed to update ${result.errors.length} repositories`);
    }

    return messages.join(', ');
  }
}
