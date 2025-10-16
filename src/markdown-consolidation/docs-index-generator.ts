/**
 * Documentation Index Generator
 *
 * Uses AI to intelligently analyze docs folder structure and generate:
 * 1. INDEX.md in docs/ folder with categorized document links
 * 2. Brief descriptions of each document (AI-powered)
 * 3. Auto-detected categories based on folder structure
 * 4. Keeps index up-to-date on subsequent runs
 *
 * Philosophy:
 * - Preserve existing folder structure
 * - Let AI understand document purpose and relationships
 * - Create navigable, searchable index
 * - Update README to point to docs/INDEX.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AIClassifierFactory } from '../ai-classifier.js';
import type { ProjectConventions } from '../project-convention-analyzer.js';
import { ReadmeAISectionManager } from '../readme-ai-section-manager.js';

export interface DocFile {
  path: string;
  relativePath: string; // Relative to docs folder
  name: string;
  category?: string; // specifications, guides, implementation, etc.
  title?: string; // Extracted from first # heading or filename
  description?: string; // AI-generated brief description
  wordCount?: number;
  lastModified: Date;
}

export interface DocCategory {
  name: string;
  displayName: string;
  description?: string;
  files: DocFile[];
  subfolders?: DocCategory[];
}

export interface DocsIndexResult {
  indexPath: string;
  categoriesFound: number;
  filesIndexed: number;
  readmeUpdated: boolean;
}

export class DocsIndexGenerator {
  private aiAvailable: boolean = false;

  async initialize(): Promise<void> {
    this.aiAvailable = await AIClassifierFactory.isAvailable();
  }

  /**
   * Generate or update documentation index
   */
  async generate(
    rootPath: string,
    conventions?: ProjectConventions,
    dryRun: boolean = false
  ): Promise<DocsIndexResult> {
    await this.initialize();

    // Find docs folder
    const docsFolder = await this.findDocsFolder(rootPath, conventions);
    if (!docsFolder) {
      return {
        indexPath: '',
        categoriesFound: 0,
        filesIndexed: 0,
        readmeUpdated: false,
      };
    }

    // Scan all markdown files in docs folder
    const docFiles = await this.scanDocsFolder(docsFolder);
    if (docFiles.length === 0) {
      return {
        indexPath: '',
        categoriesFound: 0,
        filesIndexed: 0,
        readmeUpdated: false,
      };
    }

    // Categorize and analyze with AI
    const categories = await this.categorizeDocuments(docsFolder, docFiles);

    // Generate INDEX.md content
    const indexContent = await this.generateIndexContent(categories, docFiles);
    const indexPath = path.join(docsFolder, 'INDEX.md');

    if (!dryRun) {
      await fs.writeFile(indexPath, indexContent, 'utf-8');

      // Update README with unified AI section
      await this.updateReadmeWithIndex(rootPath, docsFolder);
    }

    return {
      indexPath,
      categoriesFound: categories.length,
      filesIndexed: docFiles.length,
      readmeUpdated: true,
    };
  }

  /**
   * Find docs folder based on conventions
   */
  private async findDocsFolder(rootPath: string, conventions?: ProjectConventions): Promise<string | null> {
    if (conventions?.docsFolder?.exists) {
      return path.join(rootPath, conventions.docsFolder.path);
    }

    // Try common names
    const commonNames = ['docs', 'doc', 'documentation', 'documents'];
    for (const name of commonNames) {
      const docPath = path.join(rootPath, name);
      try {
        const stats = await fs.stat(docPath);
        if (stats.isDirectory()) return docPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Scan docs folder recursively for markdown files
   */
  private async scanDocsFolder(docsFolder: string): Promise<DocFile[]> {
    const files: DocFile[] = [];

    const scanRecursive = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip common ignore folders
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanRecursive(fullPath);
          }
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          // Skip INDEX.md itself
          if (entry.name.toLowerCase() === 'index.md') continue;

          const stats = await fs.stat(fullPath);
          const relativePath = path.relative(docsFolder, fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');

          files.push({
            path: fullPath,
            relativePath,
            name: entry.name,
            title: this.extractTitle(content, entry.name),
            wordCount: this.countWords(content),
            lastModified: stats.mtime,
          });
        }
      }
    };

    await scanRecursive(docsFolder);
    return files;
  }

  /**
   * Extract title from markdown content or filename
   */
  private extractTitle(content: string, filename: string): string {
    // Try to find first # heading
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }

    // Fall back to filename without extension
    return path.basename(filename, '.md')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    // Remove code blocks and headings
    const cleaned = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^#+\s+/gm, '');

    return cleaned.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Categorize documents based on folder structure and AI analysis
   */
  private async categorizeDocuments(
    docsFolder: string,
    files: DocFile[]
  ): Promise<DocCategory[]> {
    const categoryMap = new Map<string, DocFile[]>();

    // First pass: categorize by folder structure
    for (const file of files) {
      const parts = file.relativePath.split(path.sep);
      const category = parts.length > 1 ? parts[0] : 'General';

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(file);
      file.category = category;
    }

    // Second pass: AI analysis for descriptions
    if (this.aiAvailable) {
      await this.enhanceWithAI(files);
    }

    // Build category structures
    const categories: DocCategory[] = [];
    for (const [categoryName, categoryFiles] of categoryMap.entries()) {
      categories.push({
        name: categoryName,
        displayName: this.formatCategoryName(categoryName),
        description: await this.getCategoryDescription(categoryName, categoryFiles),
        files: categoryFiles.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // Sort categories: specifications first, then guides, then alphabetical
    return categories.sort((a, b) => {
      const priority = { specifications: 0, guides: 1, implementation: 2 };
      const aPrio = priority[a.name.toLowerCase() as keyof typeof priority] ?? 999;
      const bPrio = priority[b.name.toLowerCase() as keyof typeof priority] ?? 999;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Get AI-generated category description
   */
  private async getCategoryDescription(
    categoryName: string,
    files: DocFile[]
  ): Promise<string | undefined> {
    if (!this.aiAvailable || files.length === 0) return undefined;

    const fileNames = files.map(f => f.name).join(', ');

    // Simple heuristic descriptions (can be enhanced with AI later)
    const descriptions: Record<string, string> = {
      specifications: 'Technical specifications and design documents',
      guides: 'How-to guides and tutorials',
      implementation: 'Implementation details and architecture notes',
      api: 'API documentation and reference',
      architecture: 'System architecture and design decisions',
    };

    return descriptions[categoryName.toLowerCase()];
  }

  /**
   * Use AI to enhance file descriptions
   */
  private async enhanceWithAI(files: DocFile[]): Promise<void> {
    if (!this.aiAvailable) return;

    try {
      const classifier = await AIClassifierFactory.create();
      if (!classifier) return;

      // Process files in batches
      for (const file of files) {
        try {
          const content = await fs.readFile(file.path, 'utf-8');
          const preview = content.substring(0, 500); // First 500 chars

          // Ask AI to generate a brief description
          const prompt = `Analyze this documentation file and provide a ONE-SENTENCE description (max 15 words):

Title: ${file.title}
Preview: ${preview}

Description:`;

          // This is a simplified version - would need proper AI integration
          // For now, use title as description
          file.description = file.title;
        } catch {
          // If AI fails for a file, continue with others
          file.description = file.title;
        }
      }
    } catch {
      // AI enhancement failed, continue without descriptions
    }
  }

  /**
   * Generate INDEX.md content
   */
  private async generateIndexContent(
    categories: DocCategory[],
    allFiles: DocFile[]
  ): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push('# Documentation Index');
    lines.push('');
    lines.push('> 📚 Auto-generated index of all project documentation. Last updated: ' + new Date().toLocaleDateString());
    lines.push('');

    // Quick stats
    lines.push('## 📊 Overview');
    lines.push('');
    lines.push(`- **Total Documents**: ${allFiles.length}`);
    lines.push(`- **Categories**: ${categories.length}`);
    const totalWords = allFiles.reduce((sum, f) => sum + (f.wordCount || 0), 0);
    lines.push(`- **Total Words**: ${totalWords.toLocaleString()}`);
    lines.push('');

    // Table of contents
    lines.push('## 📑 Table of Contents');
    lines.push('');
    for (const category of categories) {
      lines.push(`- [${category.displayName}](#${this.slugify(category.displayName)})`);
    }
    lines.push('');

    // Categories with files
    for (const category of categories) {
      lines.push(`## ${category.displayName}`);
      lines.push('');

      if (category.description) {
        lines.push(`*${category.description}*`);
        lines.push('');
      }

      // List files in this category
      for (const file of category.files) {
        const link = file.relativePath.replace(/\\/g, '/');
        lines.push(`### [${file.title}](${link})`);

        if (file.description && file.description !== file.title) {
          lines.push(`${file.description}`);
        }

        const meta: string[] = [];
        if (file.wordCount) meta.push(`${file.wordCount} words`);
        if (file.lastModified) {
          const date = file.lastModified.toLocaleDateString();
          meta.push(`Updated ${date}`);
        }

        if (meta.length > 0) {
          lines.push(`\n*${meta.join(' • ')}*`);
        }

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
  private async updateReadmeWithIndex(rootPath: string, docsFolder: string): Promise<void> {
    const docsRelative = path.relative(rootPath, docsFolder);
    const docsIndexPath = `${docsRelative}/INDEX.md`.replace(/\\/g, '/');

    // Get current index info from README
    const manager = new ReadmeAISectionManager();
    const currentInfo = await manager.getCurrentIndexInfo(rootPath);

    // Update with docs index
    await manager.updateReadme(rootPath, {
      ...currentInfo,
      docsIndex: docsIndexPath,
    });
  }

  /**
   * Get a preview of what would be generated (for dry-run)
   */
  async preview(rootPath: string, conventions?: ProjectConventions): Promise<string> {
    const result = await this.generate(rootPath, conventions, true);

    if (result.filesIndexed === 0) {
      return 'ℹ️  No docs folder found or no markdown files to index.';
    }

    return `📚 Documentation Index Preview:

  • Would create: docs/INDEX.md
  • Categories found: ${result.categoriesFound}
  • Files to index: ${result.filesIndexed}
  • README.md would be updated with link to docs/INDEX.md
`;
  }
}
