/**
 * Intelligent Classifier
 *
 * Enhanced file classifier that uses:
 * 1. Learning from user corrections
 * 2. Project structure analysis
 * 3. Dependency/import analysis
 *
 * This makes AI classification significantly smarter over time.
 */

import type { FileClassification, GitRepository } from './types.js';
import { FileClassifier } from './file-classifier.js';
import { getLearningDatabase } from './ai-learning-database.js';
import { ProjectStructureAnalyzer } from './project-structure-analyzer.js';
import { DependencyAnalyzer } from './dependency-analyzer.js';
import { AIClassifierFactory } from './ai-classifier.js';
import type { ProjectConventions } from './project-convention-analyzer.js';
import * as fs from 'fs/promises';

export class IntelligentClassifier extends FileClassifier {
  private learningDb = getLearningDatabase();
  private structureAnalyzer = new ProjectStructureAnalyzer();
  private dependencyAnalyzer = new DependencyAnalyzer();
  private projectConventions?: ProjectConventions;

  /**
   * Set project conventions to use for classification
   */
  setProjectConventions(conventions: ProjectConventions): void {
    this.projectConventions = conventions;
  }

  /**
   * Classify with intelligence enhancements
   */
  async classify(filePath: string, content?: string): Promise<FileClassification> {
    // Load content if not provided
    if (!content) {
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        // Can't read file, fall back to base classifier
        return super.classify(filePath);
      }
    }

    // Step 1: Check learned patterns first
    const fileName = filePath.split('/').pop() || filePath;
    const dependencies = await this.dependencyAnalyzer.analyze(filePath, content);
    const learnedPatterns = await this.learningDb.getPatternsForFile(
      fileName,
      content,
      [...dependencies.imports, ...dependencies.requires]
    );

    // If we have high-confidence learned patterns, use them
    if (learnedPatterns.length > 0 && learnedPatterns[0].confidence > 0.8) {
      const pattern = learnedPatterns[0];
      const category = this.extractCategoryFromRule(pattern.rule);

      if (category) {
        return {
          path: filePath,
          category: category as any,
          confidence: pattern.confidence,
          reasoning: `Learned pattern: ${pattern.rule} (${pattern.usageCount} uses)`,
        };
      }
    }

    // Step 2: Use AI with enhanced context
    const aiAvailable = await AIClassifierFactory.isAvailable();

    if (aiAvailable) {
      const ai = await AIClassifierFactory.create();
      if (ai) {
        // Build enhanced prompt with project structure and dependencies
        const projectStructure = await this.learningDb.getProjectStructure();
        let enhancedPrompt = '';

        if (projectStructure) {
          enhancedPrompt += this.structureAnalyzer.buildContextPrompt(projectStructure);
          enhancedPrompt += '\n\n';
        }

        // Add project conventions to context
        if (this.projectConventions) {
          enhancedPrompt += this.buildConventionsContext(this.projectConventions);
          enhancedPrompt += '\n\n';
        }

        const depPrompt = this.dependencyAnalyzer.buildDependencyPrompt(dependencies);
        if (depPrompt) {
          enhancedPrompt += depPrompt;
          enhancedPrompt += '\n\n';
        }

        if (learnedPatterns.length > 0) {
          enhancedPrompt += 'LEARNED PATTERNS:\n';
          enhancedPrompt += learnedPatterns
            .slice(0, 3)
            .map(p => `- ${p.pattern}: ${p.rule} (confidence: ${(p.confidence * 100).toFixed(0)}%)`)
            .join('\n');
          enhancedPrompt += '\n\n';
        }

        enhancedPrompt += `File: ${fileName}\nContent:\n${content}`;

        try {
          const result = await ai.classify(filePath, enhancedPrompt);
          return {
            ...result,
            reasoning: `AI (enhanced): ${result.reasoning}`,
          };
        } catch (error) {
          // AI failed, fall through
        }
      }
    }

    // Step 3: Fall back to base classifier
    return super.classify(filePath, content);
  }

  /**
   * Classify batch with intelligence
   */
  async classifyBatch(
    files: string[],
    repositories?: GitRepository[]
  ): Promise<FileClassification[]> {
    // Analyze project structure first (cached)
    if (repositories && repositories.length > 0) {
      let projectStructure = await this.learningDb.getProjectStructure();

      if (!projectStructure) {
        projectStructure = await this.structureAnalyzer.analyze(
          repositories[0].path,
          repositories
        );
        await this.learningDb.storeProjectStructure(projectStructure);
      }
    }

    // Use base batch classification but with enhanced context
    return super.classifyBatch(files);
  }

  /**
   * Suggest repository with dependency analysis
   */
  async suggestRepositoryIntelligent(
    filePath: string,
    content: string,
    repositories: GitRepository[]
  ): Promise<{ repositoryName: string; confidence: number; reasoning: string } | null> {
    // Analyze dependencies
    const dependencies = await this.dependencyAnalyzer.analyze(filePath, content);

    // Get project structure
    const projectStructure = await this.learningDb.getProjectStructure();

    // Use dependency analyzer for suggestion
    const depSuggestion = this.dependencyAnalyzer.suggestRepository(
      dependencies,
      projectStructure?.repositories || repositories.map(r => ({
        name: r.path.split('/').pop() || r.path,
        technology: undefined,
      }))
    );

    if (depSuggestion && depSuggestion.confidence > 0.7) {
      return {
        repositoryName: depSuggestion.name,
        confidence: depSuggestion.confidence,
        reasoning: `Dependency analysis: ${depSuggestion.reasoning}`,
      };
    }

    // Fall back to AI suggestion
    return super.suggestLocation(
      { path: filePath, category: 'source', confidence: 0.5, reasoning: '' },
      repositories,
      content
    ).then(location => {
      if (!location) return null;
      const repoName = location.split('/')[0];
      return {
        repositoryName: repoName,
        confidence: 0.6,
        reasoning: 'AI suggestion based on content',
      };
    });
  }

  /**
   * Record a user correction for learning
   */
  async recordCorrection(
    filePath: string,
    aiSuggestion: {
      category: string;
      repository?: string;
      targetPath: string;
    },
    userCorrection: {
      category: string;
      repository?: string;
      targetPath: string;
    }
  ): Promise<void> {
    const fileName = filePath.split('/').pop() || filePath;

    // Read file content and dependencies
    let content: string | undefined;
    let imports: string[] | undefined;

    try {
      content = await fs.readFile(filePath, 'utf-8');
      const dependencies = await this.dependencyAnalyzer.analyze(filePath, content);
      imports = [...dependencies.imports, ...dependencies.requires];
      content = content.substring(0, 1000); // First 1000 chars
    } catch {
      // Continue without content
    }

    await this.learningDb.addCorrection({
      filePath,
      fileName,
      aiSuggestion,
      userCorrection,
      timestamp: new Date().toISOString(),
      fileContent: content,
      imports,
    });
  }

  /**
   * Get learning statistics
   */
  async getLearningStats() {
    return this.learningDb.getStats();
  }

  /**
   * Extract category from learned rule
   */
  private extractCategoryFromRule(rule: string): string | null {
    const categories = ['documentation', 'script', 'test', 'source', 'config', 'asset'];

    for (const category of categories) {
      if (rule.toLowerCase().includes(category)) {
        return category as any;
      }
    }

    return null;
  }

  /**
   * Build conventions context for AI prompt
   */
  private buildConventionsContext(conventions: ProjectConventions): string {
    const lines: string[] = [];

    lines.push('PROJECT CONVENTIONS (must respect):');

    // Docs conventions
    if (conventions.docsFolder?.exists) {
      lines.push(`✓ Documentation folder: ${conventions.docsFolder.path}/`);
      if (conventions.docsFolder.structure?.hasSpecifications) {
        lines.push(`  - Specifications go to ${conventions.docsFolder.path}/specifications/`);
      }
      if (conventions.docsFolder.structure?.hasImplementation) {
        lines.push(`  - Implementation docs go to ${conventions.docsFolder.path}/implementation/`);
      }
      if (conventions.docsFolder.structure?.hasGuides) {
        lines.push(`  - Guides go to ${conventions.docsFolder.path}/guides/`);
      }
    } else {
      lines.push(`→ No docs folder exists yet (will use: ${conventions.docsFolder?.path || 'docs'}/)`);
    }

    // Scripts conventions
    if (conventions.scriptsFolder?.exists) {
      lines.push(`✓ Scripts folder: ${conventions.scriptsFolder.path}/`);
      lines.push(`  → All scripts must go to ${conventions.scriptsFolder.path}/`);
    } else {
      lines.push(`→ No scripts folder exists yet (will use: ${conventions.scriptsFolder?.path || 'scripts'}/)`);
    }

    // Root file conventions
    if (conventions.rootFileConventions) {
      const rootFiles: string[] = [];
      if (conventions.rootFileConventions.readmeInRoot) rootFiles.push('README');
      if (conventions.rootFileConventions.changelogInRoot) rootFiles.push('CHANGELOG');
      if (conventions.rootFileConventions.contributingInRoot) rootFiles.push('CONTRIBUTING');
      if (conventions.rootFileConventions.licenseInRoot) rootFiles.push('LICENSE');

      if (rootFiles.length > 0) {
        lines.push(`✓ Files that MUST stay in root: ${rootFiles.join(', ')}`);
      }
    }

    // Recommendations
    if (conventions.recommendations?.keepFilesInRoot?.length) {
      lines.push(`⚠️  NEVER move these files: ${conventions.recommendations.keepFilesInRoot.join(', ')}`);
    }

    return lines.join('\n');
  }
}
