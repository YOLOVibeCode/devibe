import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  FileCategory,
  FileClassification,
  ICanClassifyFiles,
  ICanSuggestFileLocations,
  GitRepository,
} from './types.js';
import { AIClassifierFactory } from './ai-classifier.js';

export class FileClassifier implements ICanClassifyFiles, ICanSuggestFileLocations {
  async classify(filePath: string, content?: string): Promise<FileClassification> {
    // Try AI classification first if available
    const aiProvider = AIClassifierFactory.getPreferredProvider();
    if (aiProvider && content) {
      try {
        const ai = AIClassifierFactory.create(aiProvider);
        if (ai) {
          const result = await ai.classify(filePath, content);
          // AI succeeded, return result
          return result;
        }
      } catch (error) {
        // AI failed, fall through to heuristics
      }
    }

    // Load content if not provided and AI is available
    if (!content && AIClassifierFactory.isAvailable()) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size < 100000) { // Only read files < 100KB for AI
          content = await fs.readFile(filePath, 'utf-8');

          const aiProvider = AIClassifierFactory.getPreferredProvider();
          if (aiProvider) {
            try {
              const ai = AIClassifierFactory.create(aiProvider);
              if (ai) {
                return await ai.classify(filePath, content);
              }
            } catch (error) {
              // Fall through to heuristics
            }
          }
        }
      } catch {
        // File not readable, continue with heuristics
      }
    }

    // Fallback to heuristic classification
    const ext = path.extname(filePath);
    const basename = path.basename(filePath);
    const dirname = path.dirname(filePath);

    // Check content first (highest priority)
    if (content) {
      const contentResult = this.classifyByContent(content);
      if (contentResult) {
        return {
          path: filePath,
          category: contentResult.category,
          confidence: contentResult.confidence,
          reasoning: contentResult.reasoning,
        };
      }
    }

    // Check by filename patterns
    if (this.isTestFile(basename, dirname)) {
      return {
        path: filePath,
        category: 'test',
        confidence: 0.95,
        reasoning: 'File name/path indicates test file',
      };
    }

    // Check by extension
    const extResult = this.classifyByExtension(ext, basename);
    return {
      path: filePath,
      category: extResult.category,
      confidence: extResult.confidence,
      reasoning: extResult.reasoning,
    };
  }

  async classifyBatch(files: string[]): Promise<FileClassification[]> {
    return Promise.all(files.map((file) => this.classify(file)));
  }

  suggestLocation(
    file: FileClassification,
    repositories: GitRepository[]
  ): string | null {
    // For now, return null - this will be enhanced with AI
    // Heuristic: suggest based on file category
    const repo = repositories.find((r) => file.path.startsWith(r.path));
    if (!repo) return null;

    switch (file.category) {
      case 'documentation':
        return path.join(repo.path, 'documents', path.basename(file.path));
      case 'script':
        return path.join(repo.path, 'scripts', path.basename(file.path));
      case 'test':
        return path.join(repo.path, 'tests', path.basename(file.path));
      case 'source':
        return path.join(repo.path, 'src', path.basename(file.path));
      default:
        return null;
    }
  }

  private classifyByContent(
    content: string
  ): { category: FileCategory; confidence: number; reasoning: string } | null {
    // Check for shebang
    if (content.startsWith('#!')) {
      return {
        category: 'script',
        confidence: 0.9,
        reasoning: 'Contains shebang line',
      };
    }

    // Check for common test patterns
    if (
      content.includes('describe(') ||
      content.includes('test(') ||
      content.includes('it(')
    ) {
      return {
        category: 'test',
        confidence: 0.85,
        reasoning: 'Contains test framework functions',
      };
    }

    return null;
  }

  private isTestFile(basename: string, dirname: string): boolean {
    // Check filename
    if (
      basename.includes('.test.') ||
      basename.includes('.spec.') ||
      basename.endsWith('_test.py') ||
      basename.endsWith('_test.go')
    ) {
      return true;
    }

    // Check directory
    if (
      dirname.includes('/test/') ||
      dirname.includes('/tests/') ||
      dirname.includes('/__tests__/')
    ) {
      return true;
    }

    return false;
  }

  private classifyByExtension(
    ext: string,
    basename: string
  ): { category: FileCategory; confidence: number; reasoning: string } {
    // Documentation
    if (['.md', '.txt', '.rst', '.adoc'].includes(ext)) {
      return {
        category: 'documentation',
        confidence: 0.9,
        reasoning: 'Documentation file extension',
      };
    }

    // Configuration
    if (
      ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'].includes(ext) ||
      basename.startsWith('.')
    ) {
      return {
        category: 'config',
        confidence: 0.85,
        reasoning: 'Configuration file',
      };
    }

    // Scripts
    if (['.sh', '.bash', '.zsh', '.py', '.rb', '.pl'].includes(ext)) {
      return {
        category: 'script',
        confidence: 0.8,
        reasoning: 'Script file extension',
      };
    }

    // Source code
    if (
      [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.go',
        '.java',
        '.c',
        '.cpp',
        '.rs',
        '.swift',
      ].includes(ext)
    ) {
      return {
        category: 'source',
        confidence: 0.9,
        reasoning: 'Source code file extension',
      };
    }

    // Assets
    if (
      [
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.svg',
        '.ico',
        '.woff',
        '.woff2',
        '.ttf',
        '.eot',
      ].includes(ext)
    ) {
      return {
        category: 'asset',
        confidence: 0.95,
        reasoning: 'Asset file (image/font)',
      };
    }

    // Unknown
    return {
      category: 'unknown',
      confidence: 0.3,
      reasoning: 'Unknown file type',
    };
  }
}
