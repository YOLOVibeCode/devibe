/**
 * Auto Consolidate Service
 *
 * Automated workflow for consolidating markdown files with intelligent organization.
 *
 * Workflow:
 * 1. Copy all *.md in root → <root>/documents/
 * 2. Cluster files by semantic similarity (AI)
 * 3. Create consolidation plan (merge-by-topic strategy)
 * 4. Merge content with source attributions
 * 5. Intelligently name output files
 * 6. Update README.md with summary index + description
 * 7. Create .devibe/backups/BACKUP_INDEX.md (date-sorted)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownFile, ConsolidationPlan, ConsolidationOptions } from './types';
import { MarkdownScanner } from './markdown-scanner';
import { MarkdownAnalyzer } from './markdown-analyzer';
import { AIContentAnalyzer } from './ai-content-analyzer';
import { MarkdownConsolidator } from './markdown-consolidator';
import { BackupManager } from '../backup-manager';

export interface AutoConsolidateOptions {
  targetDirectory: string;
  maxOutputFiles?: number;
  suppressToC?: boolean;
  excludePatterns?: string[];
}

export interface AutoConsolidateResult {
  success: boolean;
  movedFiles: number;
  consolidatedFiles: string[];
  readmeUpdated: boolean;
  backupIndexCreated: boolean;
  backupPath: string;
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
   */
  async execute(options: AutoConsolidateOptions): Promise<AutoConsolidateResult> {
    const targetDir = path.resolve(options.targetDirectory);
    const documentsDir = path.join(targetDir, 'documents');
    const deviveBackupDir = path.join(targetDir, '.devibe', 'backups');

    // Step 1: Scan markdown files in root (non-recursive)
    const scanOptions = {
      targetDirectory: targetDir,
      recursive: false,
      excludePatterns: options.excludePatterns || ['node_modules/**', '.git/**', 'documents/**', '.devibe/**'],
      includeHidden: false
    };

    const files = await this.scanner.scan(scanOptions);

    if (files.length === 0) {
      return {
        success: true,
        movedFiles: 0,
        consolidatedFiles: [],
        readmeUpdated: false,
        backupIndexCreated: false,
        backupPath: ''
      };
    }

    // Step 2: Copy files to documents/ directory
    await fs.mkdir(documentsDir, { recursive: true });
    const movedFiles: MarkdownFile[] = [];

    for (const file of files) {
      const destPath = path.join(documentsDir, path.basename(file.path));
      await fs.copyFile(file.path, destPath);

      // Update file reference
      movedFiles.push({
        ...file,
        path: destPath,
        relativePath: path.relative(targetDir, destPath)
      });
    }

    // Step 3: Analyze and cluster files (optional - for logging/reporting)
    const relevanceAnalyses = movedFiles.map(file =>
      this.analyzer.analyzeRelevance(file, movedFiles)
    );

    const consolidationOptions: ConsolidationOptions = {
      maxOutputFiles: options.maxOutputFiles || 5,
      preserveOriginals: true,
      createSuperReadme: false
    };

    // Step 4: Create consolidation plan
    const plans = await this.consolidator.createPlan(movedFiles, consolidationOptions);

    // Step 5: Execute consolidation with intelligent naming
    const consolidatedFiles: string[] = [];
    for (const plan of plans) {
      // Generate intelligent output filename
      const outputFile = await this.generateIntelligentFilename(targetDir, plan, plans.length);
      plan.outputFile = outputFile;

      const result = await this.consolidator.executePlan(plan);

      // Optionally suppress ToC
      if (options.suppressToC) {
        await this.suppressTableOfContents(outputFile);
      }

      consolidatedFiles.push(result.outputFile);
    }

    // Step 6: Update README.md with summary index
    const readmeUpdated = await this.updateReadmeWithSummary(targetDir, consolidatedFiles);

    // Step 7: Create BACKUP_INDEX.md in .devibe/backups/
    await fs.mkdir(deviveBackupDir, { recursive: true });
    const backupIndexCreated = await this.createBackupIndex(deviveBackupDir, files);

    return {
      success: true,
      movedFiles: movedFiles.length,
      consolidatedFiles,
      readmeUpdated,
      backupIndexCreated,
      backupPath: deviveBackupDir
    };
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

    // If multiple plans, add index
    const suffix = totalPlans > 1 ? `_${plan.strategy.split('-')[0].toUpperCase()}` : '';
    const filename = `${sanitized}${suffix}.md`;

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
   * Update README.md with summary index and description
   */
  private async updateReadmeWithSummary(
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
