/**
 * Auto Consolidate Service
 *
 * Supports two modes:
 *
 * COMPRESS MODE (default):
 * - Consolidates all .md files directly from root into one consolidated file
 * - Backs up originals to .devibe/backups/
 * - Deletes original .md files after backup
 * - Respects git boundaries (each gets its own consolidated file)
 *
 * DOCUMENT-ARCHIVE MODE (--document-archive):
 * - Moves/copies files from root to ./documents/ folder
 * - AI organizes into proper subdirectories within documents/
 * - Leaves consolidated summary in root
 * - Preserves the documents folder
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  MarkdownFile,
  ConsolidationPlan,
  ConsolidationOptions,
  AutoConsolidateOptions,
  AutoConsolidateMode
} from './types.js';
import { MarkdownScanner } from './markdown-scanner.js';
import { MarkdownAnalyzer } from './markdown-analyzer.js';
import { AIContentAnalyzer } from './ai-content-analyzer.js';
import { MarkdownConsolidator } from './markdown-consolidator.js';
import { BackupManager } from '../backup-manager.js';
import { GitDetector } from '../git-detector.js';

export interface AutoConsolidateResult {
  success: boolean;
  mode: AutoConsolidateMode;
  processedFiles: number;
  consolidatedFiles: string[];
  readmeUpdated: boolean;
  backupIndexCreated: boolean;
  backupPath: string;
  repositoriesProcessed?: number;
  documentsFolder?: string;  // Only for document-archive mode
}

export class AutoConsolidateService {
  constructor(
    private scanner: MarkdownScanner,
    private analyzer: MarkdownAnalyzer,
    private aiAnalyzer: AIContentAnalyzer,
    private consolidator: MarkdownConsolidator,
    private backupManager: BackupManager
  ) {}

  /**
   * Execute the full auto-consolidate workflow
   * Respects git boundaries if enabled
   */
  async execute(options: AutoConsolidateOptions): Promise<AutoConsolidateResult> {
    const targetDir = path.resolve(options.targetDirectory);
    const mode: AutoConsolidateMode = options.mode || 'compress';

    // Route to appropriate mode implementation
    if (mode === 'document-archive') {
      return await this.executeDocumentArchive(targetDir, options);
    } else {
      return await this.executeCompress(targetDir, options);
    }
  }

  /**
   * COMPRESS MODE: Consolidate files directly from root, backup and delete originals
   */
  private async executeCompress(
    targetDir: string,
    options: AutoConsolidateOptions
  ): Promise<AutoConsolidateResult> {
    // Handle git boundaries if respectGitBoundaries is enabled (default true)
    if (options.respectGitBoundaries !== false) {
      const gitDetector = new GitDetector();
      const gitResult = await gitDetector.detectRepositories(targetDir);

      if (gitResult.repositories.length > 1 || (gitResult.repositories.length === 1 && gitResult.repositories[0].path !== targetDir)) {
        // Multiple repos or nested repos found
        if (options.recursiveCompress) {
          // Process each git boundary recursively
          return await this.executeCompressMultiple(gitResult.repositories, options);
        } else {
          // Just process the root
          return await this.executeCompressSingle(targetDir, options);
        }
      }
    }

    // Single directory (no git boundaries or disabled)
    return await this.executeCompressSingle(targetDir, options);
  }

  /**
   * Compress multiple git boundaries recursively
   */
  private async executeCompressMultiple(
    repositories: { path: string; isRoot: boolean }[],
    options: AutoConsolidateOptions
  ): Promise<AutoConsolidateResult> {
    let totalProcessedFiles = 0;
    let allConsolidatedFiles: string[] = [];
    let anyReadmeUpdated = false;
    let anyBackupIndexCreated = false;
    let backupPaths: string[] = [];

    for (const repo of repositories) {
      const repoResult = await this.executeCompressSingle(repo.path, options);

      totalProcessedFiles += repoResult.processedFiles;
      allConsolidatedFiles.push(...repoResult.consolidatedFiles);
      anyReadmeUpdated = anyReadmeUpdated || repoResult.readmeUpdated;
      anyBackupIndexCreated = anyBackupIndexCreated || repoResult.backupIndexCreated;
      if (repoResult.backupPath) {
        backupPaths.push(repoResult.backupPath);
      }
    }

    return {
      success: true,
      mode: 'compress',
      processedFiles: totalProcessedFiles,
      consolidatedFiles: allConsolidatedFiles,
      readmeUpdated: anyReadmeUpdated,
      backupIndexCreated: anyBackupIndexCreated,
      backupPath: backupPaths.join(', '),
      repositoriesProcessed: repositories.length
    };
  }

  /**
   * Compress single directory: consolidate all .md files directly from root
   */
  private async executeCompressSingle(
    targetDir: string,
    options: AutoConsolidateOptions
  ): Promise<AutoConsolidateResult> {
    const deviveBackupDir = path.join(targetDir, '.devibe', 'backups');

    // Step 1: Scan markdown files in root (non-recursive)
    const scanOptions = {
      targetDirectory: targetDir,
      recursive: false,
      excludePatterns: ['node_modules/**', '.git/**', '.devibe/**'],
      includeHidden: false
    };

    const files = await this.scanner.scan(scanOptions);
    // Exclude important root files that should never be consolidated
    let filesToProcess = files.filter(f => !this.isImportantRootFile(f.path, targetDir));

    // Step 1.5: If includeRelated enabled, scan and analyze additional files
    if (options.includeRelated && this.aiAnalyzer) {
      const relatedFiles = await this.findAndAnalyzeRelatedFiles(targetDir);
      filesToProcess = [...filesToProcess, ...relatedFiles];
    }

    if (filesToProcess.length === 0) {
      return {
        success: true,
        mode: 'compress',
        processedFiles: 0,
        consolidatedFiles: [],
        readmeUpdated: false,
        backupIndexCreated: false,
        backupPath: ''
      };
    }

    // Step 2: Consolidate files directly (no documents/ folder)
    const consolidationOptions: ConsolidationOptions = {
      maxOutputFiles: options.maxOutputFiles || 1,
      preserveOriginals: false,  // We'll handle backup separately
      createSuperReadme: false
    };

    const plans = await this.consolidator.createPlan(filesToProcess, consolidationOptions);
    const consolidatedFiles: string[] = [];

    for (const plan of plans) {
      const outputFile = await this.generateIntelligentFilename(targetDir, plan, plans.length);
      plan.outputFile = outputFile;

      const result = await this.consolidator.executePlan(plan);
      consolidatedFiles.push(result.outputFile);

      if (options.suppressToC) {
        await this.suppressTableOfContents(outputFile);
      }
    }

    // Step 3: Update README if exists
    const readmeUpdated = await this.updateReadme(targetDir, consolidatedFiles);

    // Step 4: Create BACKUP_INDEX.md in .devibe/
    const deviveDir = path.join(targetDir, '.devibe');
    await fs.mkdir(deviveDir, { recursive: true });
    const backupIndexCreated = await this.createBackupIndex(deviveDir, filesToProcess);

    // Step 5: Delete original .md files (already backed up by consolidator)
    for (const file of filesToProcess) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn(`⚠️  Could not delete ${file.path}: ${(error as Error).message}`);
      }
    }

    // Step 6: Clean up any UUID backup artifacts left in root (from old devibe versions)
    await this.cleanupBackupArtifacts(targetDir);

    return {
      success: true,
      mode: 'compress',
      processedFiles: filesToProcess.length,
      consolidatedFiles,
      readmeUpdated,
      backupIndexCreated,
      backupPath: deviveBackupDir
    };
  }

  /**
   * DOCUMENT-ARCHIVE MODE: Move files to ./documents with AI organization
   */
  private async executeDocumentArchive(
    targetDir: string,
    options: AutoConsolidateOptions
  ): Promise<AutoConsolidateResult> {
    const documentsDir = path.join(targetDir, 'documents');
    const deviveBackupDir = path.join(targetDir, '.devibe', 'backups');

    // Step 1: Scan markdown files in root (non-recursive)
    const scanOptions = {
      targetDirectory: targetDir,
      recursive: false,
      excludePatterns: ['node_modules/**', '.git/**', 'documents/**', '.devibe/**'],
      includeHidden: false
    };

    const files = await this.scanner.scan(scanOptions);
    // Exclude important root files that should never be moved
    let filesToMove = files.filter(f => !this.isImportantRootFile(f.path, targetDir));

    // Step 1.5: If includeRelated enabled, scan and analyze additional files
    if (options.includeRelated && this.aiAnalyzer) {
      const relatedFiles = await this.findAndAnalyzeRelatedFiles(targetDir);
      filesToMove = [...filesToMove, ...relatedFiles];
    }

    if (filesToMove.length === 0) {
      return {
        success: true,
        mode: 'document-archive',
        processedFiles: 0,
        consolidatedFiles: [],
        readmeUpdated: false,
        backupIndexCreated: false,
        backupPath: '',
        documentsFolder: documentsDir
      };
    }

    // Step 2: Move files to documents/ directory (except README.md which stays in root)
    await fs.mkdir(documentsDir, { recursive: true });
    const movedFiles: MarkdownFile[] = [];

    for (const file of filesToMove) {
      const destPath = path.join(documentsDir, path.basename(file.path));

      try {
        // Copy file to documents/
        await fs.copyFile(file.path, destPath);

        // Delete original from root
        await fs.unlink(file.path);

        // Update file reference
        movedFiles.push({
          ...file,
          path: destPath,
          relativePath: path.relative(targetDir, destPath)
        });
      } catch (error) {
        console.error(`Failed to move file ${file.path}:`, (error as Error).message);
        // Continue with other files
      }
    }

    // Step 3: Create consolidated summary in root (files stay in documents/)
    const consolidatedFiles: string[] = [];
    let readmeUpdated = false;

    if (movedFiles.length > 0) {
      try {
        const consolidationOptions: ConsolidationOptions = {
          maxOutputFiles: options.maxOutputFiles || 1,
          preserveOriginals: true,  // Keep files in documents/
          createSuperReadme: false
        };

        // Create consolidation plan
        const plans = await this.consolidator.createPlan(movedFiles, consolidationOptions);

        // Execute consolidation - creates summary in root
        for (const plan of plans) {
          const outputFile = await this.generateIntelligentFilename(targetDir, plan, plans.length);
          plan.outputFile = outputFile;

          const result = await this.consolidator.executePlan(plan);
          consolidatedFiles.push(result.outputFile);

          if (options.suppressToC) {
            await this.suppressTableOfContents(outputFile);
          }
        }

        // Step 4: Update README.md with summary
        readmeUpdated = await this.updateReadme(targetDir, consolidatedFiles);
      } catch (error) {
        // If consolidation fails, continue without it
        console.error(`⚠️  Consolidation failed: ${(error as Error).message}`);
        if (process.env.NODE_ENV !== 'production') {
          console.error('Stack trace:', (error as Error).stack);
        }
      }
    }

    // Step 5: Create BACKUP_INDEX.md in .devibe/
    const deviveDir = path.join(targetDir, '.devibe');
    await fs.mkdir(deviveDir, { recursive: true });
    const backupIndexCreated = await this.createBackupIndex(deviveDir, filesToMove);

    // Step 6: Clean up any UUID backup artifacts left in root (from old devibe versions)
    await this.cleanupBackupArtifacts(targetDir);

    // NOTE: In document-archive mode, we KEEP the documents/ folder

    return {
      success: true,
      mode: 'document-archive',
      processedFiles: movedFiles.length,
      consolidatedFiles,
      readmeUpdated,
      backupIndexCreated,
      backupPath: deviveBackupDir,
      documentsFolder: documentsDir
    };
  }

  /**
   * Find and analyze related files (.txt, etc.) to determine if they should be included
   */
  private async findAndAnalyzeRelatedFiles(targetDir: string): Promise<MarkdownFile[]> {
    const relatedFiles: MarkdownFile[] = [];

    try {
      // Scan for .txt files (and other text-based formats)
      const txtFiles = await fs.readdir(targetDir);
      const relevantExtensions = ['.txt', '.log'];

      for (const file of txtFiles) {
        const filePath = path.join(targetDir, file);
        const stat = await fs.stat(filePath);

        // Skip directories
        if (!stat.isFile()) continue;

        // Check if it's a relevant extension
        const ext = path.extname(file).toLowerCase();
        if (!relevantExtensions.includes(ext)) continue;

        // Skip if file is too large (> 1MB)
        if (stat.size > 1024 * 1024) continue;

        // Read content
        const content = await fs.readFile(filePath, 'utf-8');

        // Use AI to determine if this file should be included
        const shouldInclude = await this.shouldIncludeFile(file, content);

        if (shouldInclude) {
          // Convert to MarkdownFile format
          relatedFiles.push({
            path: filePath,
            relativePath: file,
            name: file,
            size: stat.size,
            lastModified: stat.mtime,
            content: content,
            metadata: {
              title: file.replace(ext, ''),
              headers: [],
              wordCount: content.split(/\s+/).length,
              linkCount: 0,
              codeBlockCount: 0,
              imageCount: 0
            }
          });
        }
      }

      if (relatedFiles.length > 0) {
        console.log(`\n🔍 AI Analysis: Including ${relatedFiles.length} related files:`);
        relatedFiles.forEach(f => console.log(`  • ${f.name}`));
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze related files: ${(error as Error).message}`);
    }

    return relatedFiles;
  }

  /**
   * Use AI to determine if a file should be included in consolidation
   */
  private async shouldIncludeFile(filename: string, content: string): Promise<boolean> {
    // If no AI analyzer, don't include
    if (!this.aiAnalyzer || !(this.aiAnalyzer as any).aiProvider) {
      return false;
    }

    try {
      const aiProvider = (this.aiAnalyzer as any).aiProvider;

      // Create analysis content with special instructions
      const analysisContent = `${content.substring(0, 500)}

---
ANALYSIS TASK: Should this file (${filename}) be included in documentation consolidation?
Consider: Is it documentation-related? (commit messages, summaries, notes, plans)`;

      // Use the classify method
      const result = await aiProvider.classify(filename, analysisContent);

      // Check if classification suggests it's documentation-related
      // Look for keywords in the reasoning or if it's classified as documentation
      const reasoning = result.reasoning?.toLowerCase() || '';
      const isDocRelated = reasoning.includes('document') ||
                          reasoning.includes('commit') ||
                          reasoning.includes('summary') ||
                          reasoning.includes('note') ||
                          reasoning.includes('plan') ||
                          reasoning.includes('overview') ||
                          reasoning.includes('valuable') ||
                          result.category === 'documentation';

      if (isDocRelated) {
        console.log(`  ✓ ${filename}: ${result.reasoning || 'documentation-related'}`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`  ⚠️  Could not analyze ${filename}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Clean up UUID backup artifacts left in root directory
   * These are from old devibe versions that wrote backups to wrong location
   */
  private async cleanupBackupArtifacts(targetDir: string): Promise<void> {
    try {
      const files = await fs.readdir(targetDir);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.json)?$/i;
      let cleaned = 0;

      for (const file of files) {
        if (uuidPattern.test(file)) {
          const filePath = path.join(targetDir, file);
          const stat = await fs.stat(filePath);

          // Only delete files, not directories
          if (stat.isFile()) {
            await fs.unlink(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} backup artifact(s) from root`);
      }
    } catch (error) {
      // Silently fail - cleanup is not critical
      console.warn(`⚠️  Could not clean backup artifacts: ${(error as Error).message}`);
    }
  }

  /**
   * Generate intelligent filename based on content analysis
   */
  private async generateIntelligentFilename(
    targetDir: string,
    plan: ConsolidationPlan,
    totalPlans: number
  ): Promise<string> {
    // Extract primary topic from the largest/most relevant file
    const primaryFile = plan.inputFiles
      .sort((a, b) => b.metadata.wordCount - a.metadata.wordCount)[0];

    // Use the primary file's title or first meaningful header
    const title = primaryFile.metadata.title ||
                  primaryFile.metadata.headers[0] ||
                  'CONSOLIDATED';

    // Sanitize and format filename
    const sanitized = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase()
      .substring(0, 50);

    // Add CONSOLIDATED_ prefix to avoid collision with original files
    // and make it clear this is a generated consolidation file
    const suffix = totalPlans > 1 ? `_${plan.strategy.split('-')[0].toUpperCase()}` : '';
    const filename = `CONSOLIDATED_${sanitized}${suffix}.md`;

    return path.join(targetDir, filename);
  }

  /**
   * Suppress Table of Contents generation in consolidated file
   */
  private async suppressTableOfContents(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Remove ToC section (identified by "## Table of Contents")
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let inToC = false;
    let skipNextSeparator = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect ToC start
      if (line.match(/^## Table of Contents$/i)) {
        inToC = true;
        skipNextSeparator = true;
        continue;
      }

      // Detect ToC end (next ## heading or separator after ToC)
      if (inToC && line.match(/^## /)) {
        inToC = false;
        filteredLines.push(line);
        continue;
      }

      // Skip content while in ToC
      if (inToC) {
        continue;
      }

      // Skip separator right after ToC
      if (skipNextSeparator && line.match(/^---$/)) {
        skipNextSeparator = false;
        continue;
      }

      filteredLines.push(line);
    }

    await fs.writeFile(filePath, filteredLines.join('\n'));
  }

  /**
   * Check if a file is an important root file that should never be consolidated
   */
  private isImportantRootFile(filePath: string, rootDir: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    const fileDir = path.dirname(filePath);

    // Only consider files in the actual root directory
    if (path.normalize(fileDir) !== path.normalize(rootDir)) {
      return false;
    }

    // Important root files (standard GitHub/GitLab conventions)
    const importantFiles = [
      'readme.md',
      'changelog.md',
      'contributing.md',
      'contributors.md',
      'license.md',
      'license', // May not have .md extension
      'code_of_conduct.md',
      'security.md',
      'support.md',
      'authors.md',
      'maintainers.md',
      'codeowners.md',
      'pull_request_template.md',
      'issue_template.md',
    ];

    return importantFiles.includes(fileName);
  }

  /**
   * Update README.md with summary index and description
   */
  private async updateReadme(
    targetDir: string,
    consolidatedFiles: string[]
  ): Promise<boolean> {
    const readmePath = path.join(targetDir, 'README.md');

    let readmeContent: string;
    let readmeExists = false;

    try {
      readmeContent = await fs.readFile(readmePath, 'utf-8');
      readmeExists = true;
    } catch {
      // Create new README if it doesn't exist
      readmeContent = `# Project Documentation\n\n`;
    }

    // Generate summary section
    const summarySection = this.generateSummarySection(targetDir, consolidatedFiles);

    // Check if summary already exists
    const summaryMarker = '<!-- AUTO-CONSOLIDATE-SUMMARY -->';
    if (readmeContent.includes(summaryMarker)) {
      // Replace existing summary
      const regex = new RegExp(
        `${summaryMarker}[\\s\\S]*?${summaryMarker}`,
        'g'
      );
      readmeContent = readmeContent.replace(regex, summarySection);
    } else {
      // Append summary at the end
      readmeContent += `\n\n${summarySection}`;
    }

    await fs.writeFile(readmePath, readmeContent);
    return true;
  }

  /**
   * Generate summary section for README
   */
  private generateSummarySection(targetDir: string, consolidatedFiles: string[]): string {
    const relativeFiles = consolidatedFiles.map(f => path.relative(targetDir, f));

    const lines = [
      '<!-- AUTO-CONSOLIDATE-SUMMARY -->',
      '',
      '## 📚 Consolidated Documentation',
      '',
      `This project uses AI-powered documentation consolidation. All markdown files have been organized and consolidated into ${consolidatedFiles.length} summary file${consolidatedFiles.length > 1 ? 's' : ''}.`,
      '',
      '### Summary Files',
      '',
      ...relativeFiles.map(f => `- [${path.basename(f, '.md')}](${f})`),
      '',
      '### Original Documentation',
      '',
      'All original markdown files have been preserved in the [`documents/`](documents/) directory.',
      '',
      `*Last updated: ${new Date().toISOString().split('T')[0]}*`,
      '',
      '<!-- AUTO-CONSOLIDATE-SUMMARY -->'
    ];

    return lines.join('\n');
  }

  /**
   * Create BACKUP_INDEX.md with date-sorted backups
   */
  private async createBackupIndex(
    backupDir: string,
    originalFiles: MarkdownFile[]
  ): Promise<boolean> {
    const indexPath = path.join(backupDir, 'BACKUP_INDEX.md');

    // Read existing backups
    let existingBackups: BackupEntry[] = [];
    try {
      const existing = await fs.readFile(indexPath, 'utf-8');
      existingBackups = this.parseExistingBackups(existing);
    } catch {
      // No existing index
    }

    // Add current backup entry
    const newEntry: BackupEntry = {
      date: new Date(),
      fileCount: originalFiles.length,
      files: originalFiles.map(f => path.basename(f.path)),
      description: 'Auto-consolidation backup'
    };

    existingBackups.unshift(newEntry); // Add to top (most recent first)

    // Generate index content
    const content = this.generateBackupIndexContent(existingBackups);
    await fs.writeFile(indexPath, content);

    return true;
  }

  /**
   * Parse existing backup entries from BACKUP_INDEX.md
   */
  private parseExistingBackups(content: string): BackupEntry[] {
    const entries: BackupEntry[] = [];
    const sections = content.split(/^## Backup:/m).slice(1);

    for (const section of sections) {
      const lines = section.trim().split('\n');
      const dateMatch = lines[0].match(/(\d{4}-\d{2}-\d{2})/);

      if (dateMatch) {
        entries.push({
          date: new Date(dateMatch[1]),
          fileCount: 0,
          files: [],
          description: ''
        });
      }
    }

    return entries;
  }

  /**
   * Generate BACKUP_INDEX.md content
   */
  private generateBackupIndexContent(backups: BackupEntry[]): string {
    const lines = [
      '# Backup Index',
      '',
      `Total backups: ${backups.length}`,
      '',
      '---',
      ''
    ];

    for (const backup of backups) {
      const dateStr = backup.date.toISOString().split('T')[0];
      const timeStr = backup.date.toISOString().split('T')[1].split('.')[0];

      lines.push(`## Backup: ${dateStr} ${timeStr}`);
      lines.push('');
      lines.push(`**Files backed up**: ${backup.fileCount}`);
      lines.push('');

      if (backup.description) {
        lines.push(`**Description**: ${backup.description}`);
        lines.push('');
      }

      if (backup.files.length > 0) {
        lines.push('**Files**:');
        backup.files.forEach(f => lines.push(`- ${f}`));
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    lines.push('');
    lines.push('*Generated by devibe auto-consolidate*');

    return lines.join('\n');
  }
}

interface BackupEntry {
  date: Date;
  fileCount: number;
  files: string[];
  description: string;
}
