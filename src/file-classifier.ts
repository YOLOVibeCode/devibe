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
    const aiProvider = await AIClassifierFactory.getPreferredProvider();
    if (aiProvider && content) {
      try {
        const ai = await AIClassifierFactory.create();
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
    if (!content && await AIClassifierFactory.isAvailable()) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size < 100000) { // Only read files < 100KB for AI
          content = await fs.readFile(filePath, 'utf-8');

          const aiProvider = await AIClassifierFactory.getPreferredProvider();
          if (aiProvider) {
            try {
              const ai = await AIClassifierFactory.create();
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
    // Check if AI is available for batch processing
    const aiProvider = await AIClassifierFactory.getPreferredProvider();
    if (!aiProvider || files.length === 0) {
      // Fall back to individual classification
      return Promise.all(files.map((file) => this.classify(file)));
    }

    try {
      // Use intelligent batch processing with AI
      const ai = await AIClassifierFactory.create();
      if (ai && ai.classifyBatch) {
        // Note: This simplified version doesn't have repository context
        // For full batch processing, use IntelligentBatchProcessor instead
        const batchFiles = await Promise.all(
          files.map(async (filePath) => {
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              return {
                fileName: path.basename(filePath),
                filePath,
                contentPreview: content.substring(0, 500),
              };
            } catch {
              return null;
            }
          })
        );

        const validFiles = batchFiles.filter((f): f is NonNullable<typeof f> => f !== null);
        if (validFiles.length === 0) {
          return Promise.all(files.map((file) => this.classify(file)));
        }

        const results = await ai.classifyBatch(validFiles, []);

        // Convert batch results to FileClassification format
        return results.map((result) => ({
          path: result.fileName, // Will be the file path from batchFiles
          category: result.category,
          confidence: result.confidence,
          reasoning: result.reasoning,
        }));
      }
    } catch (error) {
      // AI batch failed, fall through
    }

    // Fallback to sequential processing
    return Promise.all(files.map((file) => this.classify(file)));
  }

  async suggestLocation(
    file: FileClassification,
    repositories: GitRepository[],
    content?: string
  ): Promise<string | null> {
    // Find which repository this file currently belongs to
    const currentRepo = repositories.find((r) => file.path.startsWith(r.path));
    if (!currentRepo) return null;

    // Determine target repository (might be different in monorepo)
    let targetRepo = currentRepo;

    // If monorepo and AI available, try to determine the right sub-repo
    if (repositories.length > 1 && await AIClassifierFactory.isAvailable()) {
      const suggestedRepo = await this.suggestTargetRepository(
        file,
        repositories,
        content
      );
      if (suggestedRepo) {
        targetRepo = suggestedRepo;
      }
    }

    // Suggest location within target repository
    switch (file.category) {
      case 'documentation':
        return path.join(targetRepo.path, 'documents', path.basename(file.path));
      case 'script': {
        // Check if this is a test script
        const basename = path.basename(file.path).toLowerCase();
        if (basename.startsWith('test-') || basename.includes('-test') || 
            basename.startsWith('check-') || basename.startsWith('debug-')) {
          // Test scripts go to tests directory
          return path.join(targetRepo.path, 'tests', path.basename(file.path));
        }
        // Regular scripts go to scripts directory
        return path.join(targetRepo.path, 'scripts', path.basename(file.path));
      }
      case 'test':
        return path.join(targetRepo.path, 'tests', path.basename(file.path));
      case 'source':
        return path.join(targetRepo.path, 'src', path.basename(file.path));
      default:
        return null;
    }
  }

  private async suggestTargetRepository(
    file: FileClassification,
    repositories: GitRepository[],
    content?: string
  ): Promise<GitRepository | null> {
    // Load file content if not provided
    if (!content) {
      try {
        const stats = await fs.stat(file.path);
        if (stats.size < 100000) {
          content = await fs.readFile(file.path, 'utf-8');
        } else {
          return null; // File too large
        }
      } catch {
        return null;
      }
    }

    // Use AI to analyze which repository this file belongs to
    const aiProvider = await AIClassifierFactory.getPreferredProvider();
    if (!aiProvider) return null;

    try {
      const ai = await AIClassifierFactory.create();
      if (!ai) return null;

      // Build context about available repositories
      const repoNames = repositories.map(r => ({
        name: path.basename(r.path),
        path: r.path,
        isRoot: r.isRoot
      }));

      const result = await ai.suggestRepository(
        file.path,
        content,
        repoNames
      );

      // Find matching repository
      const targetRepo = repositories.find(
        r => path.basename(r.path) === result.repositoryName ||
             r.path === result.repositoryName
      );

      return targetRepo || null;
    } catch {
      return null; // AI analysis failed, use current repo
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
