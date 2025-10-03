import * as fs from 'fs/promises';
import * as path from 'path';
import type { UsageDetectionResult, UsageReference, ICanDetectUsage } from './types.js';

/**
 * Detects if a file is still being referenced/used in the codebase.
 * This helps prevent deletion of files that are actively used.
 */
export class UsageDetector implements ICanDetectUsage {
  private excludePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    'out',
    'target',
  ];

  async checkFileUsage(filePath: string, searchPaths: string[]): Promise<UsageDetectionResult> {
    const fileName = path.basename(filePath);
    const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
    const references: UsageReference[] = [];

    for (const searchPath of searchPaths) {
      try {
        const foundRefs = await this.searchForReferences(
          searchPath,
          fileName,
          fileNameWithoutExt,
          filePath
        );
        references.push(...foundRefs);
      } catch (error) {
        // Continue searching other paths even if one fails
      }
    }

    return {
      isReferenced: references.length > 0,
      references,
      recommendKeep: references.length > 0,
    };
  }

  private async searchForReferences(
    searchPath: string,
    fileName: string,
    fileNameWithoutExt: string,
    originalPath: string
  ): Promise<UsageReference[]> {
    const references: UsageReference[] = [];

    try {
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip excluded directories
        if (this.excludePatterns.includes(entry.name)) {
          continue;
        }

        const fullPath = path.join(searchPath, entry.name);

        // Don't check the file against itself
        if (fullPath === originalPath) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subRefs = await this.searchForReferences(
            fullPath,
            fileName,
            fileNameWithoutExt,
            originalPath
          );
          references.push(...subRefs);
        } else if (entry.isFile()) {
          // Search in files
          const fileRefs = await this.searchInFile(
            fullPath,
            fileName,
            fileNameWithoutExt
          );
          references.push(...fileRefs);
        }
      }
    } catch (error) {
      // Permission errors or other issues - continue
    }

    return references;
  }

  private async searchInFile(
    filePath: string,
    targetFileName: string,
    targetFileNameWithoutExt: string
  ): Promise<UsageReference[]> {
    const references: UsageReference[] = [];
    
    // Only search in text files
    const ext = path.extname(filePath);
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.go', '.java', '.rb', '.php',
      '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
      '.md', '.txt', '.sh', '.bash', '.zsh',
      '.html', '.css', '.scss', '.sass', '.less',
      '.dockerfile', '.gitignore', '.npmrc',
    ];

    if (!textExtensions.includes(ext.toLowerCase()) && !filePath.includes('Dockerfile')) {
      return references;
    }

    try {
      const stats = await fs.stat(filePath);
      
      // Skip very large files
      if (stats.size > 1024 * 1024) { // 1MB
        return references;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for various reference patterns
        if (
          line.includes(targetFileName) ||
          line.includes(targetFileNameWithoutExt) ||
          this.hasImportReference(line, targetFileName, targetFileNameWithoutExt) ||
          this.hasRequireReference(line, targetFileName, targetFileNameWithoutExt) ||
          this.hasScriptReference(line, targetFileName, targetFileNameWithoutExt)
        ) {
          references.push({
            file: filePath,
            line: i + 1,
            context: line.trim().substring(0, 100), // Limit context length
          });
        }
      }
    } catch (error) {
      // File not readable or binary, skip
    }

    return references;
  }

  private hasImportReference(line: string, fileName: string, fileNameWithoutExt: string): boolean {
    // ES6 import statements
    const importPatterns = [
      new RegExp(`import\\s+.*from\\s+['"].*${this.escapeRegex(fileNameWithoutExt)}['"]`),
      new RegExp(`import\\s+['"].*${this.escapeRegex(fileName)}['"]`),
      new RegExp(`import\\s+.*from\\s+['"].*/${this.escapeRegex(fileNameWithoutExt)}['"]`),
    ];

    return importPatterns.some(pattern => pattern.test(line));
  }

  private hasRequireReference(line: string, fileName: string, fileNameWithoutExt: string): boolean {
    // CommonJS require statements
    const requirePatterns = [
      new RegExp(`require\\s*\\(\\s*['"].*${this.escapeRegex(fileNameWithoutExt)}['"]\\s*\\)`),
      new RegExp(`require\\s*\\(\\s*['"].*${this.escapeRegex(fileName)}['"]\\s*\\)`),
      new RegExp(`require\\s*\\(\\s*['"].*/${this.escapeRegex(fileNameWithoutExt)}['"]\\s*\\)`),
    ];

    return requirePatterns.some(pattern => pattern.test(line));
  }

  private hasScriptReference(line: string, fileName: string, fileNameWithoutExt: string): boolean {
    // Script execution references (bash, package.json, etc.)
    const scriptPatterns = [
      new RegExp(`node\\s+.*${this.escapeRegex(fileName)}`),
      new RegExp(`node\\s+.*${this.escapeRegex(fileNameWithoutExt)}`),
      new RegExp(`\\./${this.escapeRegex(fileName)}`),
      new RegExp(`bash\\s+.*${this.escapeRegex(fileName)}`),
      new RegExp(`sh\\s+.*${this.escapeRegex(fileName)}`),
      new RegExp(`["'].*${this.escapeRegex(fileName)}["']`),
    ];

    return scriptPatterns.some(pattern => pattern.test(line));
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

