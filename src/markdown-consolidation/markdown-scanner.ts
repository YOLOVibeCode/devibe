/**
 * Markdown Scanner
 * 
 * Discovers markdown files and extracts metadata.
 */

import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { MarkdownFile, MarkdownMetadata, ScanOptions } from './types';

export class MarkdownScanner {
  /**
   * Scan directory for markdown files
   */
  async scan(options: ScanOptions): Promise<MarkdownFile[]> {
    const pattern = options.recursive ? '**/*.md' : '*.md';
    
    const files = await fg(pattern, {
      cwd: options.targetDirectory,
      ignore: this.buildIgnorePatterns(options),
      absolute: true,
      dot: options.includeHidden
    });
    
    return Promise.all(
      files.map(filePath => this.analyzeFile(filePath, options.targetDirectory))
    );
  }
  
  /**
   * Build ignore patterns for file scanning
   */
  private buildIgnorePatterns(options: ScanOptions): string[] {
    const defaults = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.devibe/**',
      '**/.unvibe/**',
      '**/coverage/**'
    ];
    
    return [...defaults, ...options.excludePatterns];
  }
  
  /**
   * Analyze a single markdown file
   */
  private async analyzeFile(filePath: string, baseDir: string): Promise<MarkdownFile> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = this.extractMetadata(content);
    
    return {
      path: filePath,
      relativePath: path.relative(baseDir, filePath),
      name: path.basename(filePath),
      size: stats.size,
      lastModified: stats.mtime,
      content,
      metadata
    };
  }
  
  /**
   * Extract metadata from markdown content
   */
  private extractMetadata(content: string): MarkdownMetadata {
    // Parse frontmatter
    let frontMatter: Record<string, any> | undefined;
    try {
      const parsed = matter(content);
      if (Object.keys(parsed.data).length > 0) {
        frontMatter = parsed.data;
      }
    } catch {
      // No frontmatter or invalid
    }
    
    // Extract title
    const title = frontMatter?.title || this.extractTitle(content) || 'Untitled';
    
    // Extract headers
    const headers = this.extractHeaders(content);
    
    // Count elements
    const wordCount = this.countWords(content);
    const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    
    return {
      title,
      headers,
      wordCount,
      linkCount,
      codeBlockCount,
      imageCount,
      frontMatter
    };
  }
  
  /**
   * Extract title from markdown content
   */
  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
  
  /**
   * Extract all headers from markdown content
   */
  private extractHeaders(content: string): string[] {
    const matches = content.matchAll(/^#{1,6}\s+(.+)$/gm);
    return Array.from(matches, m => m[1].trim());
  }
  
  /**
   * Count words in markdown content
   */
  private countWords(content: string): number {
    // Remove code blocks
    const withoutCode = content.replace(/```[\s\S]*?```/g, '');
    // Remove links
    const withoutLinks = withoutCode.replace(/\[.*?\]\(.*?\)/g, '');
    // Count words
    return withoutLinks.split(/\s+/).filter(w => w.length > 0).length;
  }
}




