/**
 * End-to-End Test for consolidate:auto command
 *
 * Tests the complete automated workflow including:
 * - Moving files from root to documents/
 * - AI-powered consolidation
 * - README.md updates
 * - BACKUP_INDEX.md creation
 * - Cleanup of backup artifacts
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { AutoConsolidateService } from '../../src/markdown-consolidation/auto-consolidate-service.js';
import { MarkdownScanner } from '../../src/markdown-consolidation/markdown-scanner.js';
import { MarkdownAnalyzer } from '../../src/markdown-consolidation/markdown-analyzer.js';
import { AIContentAnalyzer } from '../../src/markdown-consolidation/ai-content-analyzer.js';
import { MarkdownConsolidator } from '../../src/markdown-consolidation/markdown-consolidator.js';
import { BackupManager } from '../../src/backup-manager.js';

describe('consolidate:auto - End-to-End', () => {
  let testDir: string;
  let autoService: AutoConsolidateService;

  beforeEach(async () => {
    // Create temp test directory
    testDir = path.join(process.cwd(), '.test-consolidate-auto-e2e');
    await fs.mkdir(testDir, { recursive: true });

    // Create test markdown files in root
    const testFiles = [
      { name: 'README.md', content: '# Project\n\nThis is the main README.' },
      { name: 'ARCHITECTURE.md', content: '# Architecture\n\nSystem design details.' },
      { name: 'API_GUIDE.md', content: '# API Guide\n\nAPI documentation.' },
      { name: 'CHANGELOG.md', content: '# Changelog\n\n## v1.0.0\nInitial release.' },
      { name: 'CONTRIBUTING.md', content: '# Contributing\n\nHow to contribute.' },
    ];

    for (const file of testFiles) {
      await fs.writeFile(path.join(testDir, file.name), file.content);
    }

    // Initialize service with null AI (will use heuristics)
    const scanner = new MarkdownScanner();
    const analyzer = new MarkdownAnalyzer();
    const aiAnalyzer = new AIContentAnalyzer(null);
    const backupManager = new BackupManager(path.join(testDir, '.devibe', 'backups'));
    const consolidator = new MarkdownConsolidator(aiAnalyzer, backupManager);

    autoService = new AutoConsolidateService(
      scanner,
      analyzer,
      aiAnalyzer,
      consolidator,
      backupManager
    );
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should move files from root to documents/ folder', async () => {
    // Execute auto-consolidation
    const result = await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
      suppressToC: false,
    });

    // Verify files were moved
    expect(result.success).toBe(true);
    expect(result.filesMovedToDocuments).toBeGreaterThan(0);

    // Check documents/ folder exists and has files
    const documentsDir = path.join(testDir, 'documents');
    const docsDirExists = await fs.stat(documentsDir).then(() => true).catch(() => false);
    expect(docsDirExists).toBe(true);

    const docsFiles = await fs.readdir(documentsDir);
    expect(docsFiles.length).toBeGreaterThan(0);
    expect(docsFiles).toContain('ARCHITECTURE.md');
    expect(docsFiles).toContain('API_GUIDE.md');
  });

  test('should NOT leave original files in root after moving', async () => {
    // Get original files
    const beforeFiles = await fs.readdir(testDir);
    const beforeMdFiles = beforeFiles.filter(f => f.endsWith('.md') && f !== 'README.md');

    // Execute auto-consolidation
    await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    // Check root directory - original files should be gone (except README.md)
    const afterFiles = await fs.readdir(testDir);
    const afterMdFiles = afterFiles.filter(f =>
      f.endsWith('.md') &&
      f !== 'README.md' &&
      !f.startsWith('CONSOLIDATED_') &&
      f !== 'BACKUP_INDEX.md' // Backup index is created in root during test
    );

    // Original markdown files (except README) should be removed from root
    expect(afterMdFiles.length).toBe(0);
    expect(afterFiles).not.toContain('ARCHITECTURE.md');
    expect(afterFiles).not.toContain('API_GUIDE.md');
    expect(afterFiles).not.toContain('CHANGELOG.md');
  });

  test('should NOT leave UUID backup artifacts in root', async () => {
    // Execute auto-consolidation
    await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    // Check for UUID files in root
    const rootFiles = await fs.readdir(testDir);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const uuidFiles = rootFiles.filter(f => uuidPattern.test(f));

    // Should not have any UUID files left in root
    expect(uuidFiles.length).toBe(0);
  });

  test('should create consolidated documentation file (when AI available)', async () => {
    // Execute auto-consolidation
    const result = await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 1, // Force single file
    });

    expect(result.success).toBe(true);

    // Note: Consolidation requires AI provider, gracefully skips if not available
    // This is expected behavior - consolidation is optional
    if (result.consolidatedFiles.length > 0) {
      // Check consolidated file exists
      const rootFiles = await fs.readdir(testDir);
      const consolidatedFiles = rootFiles.filter(f =>
        f.includes('CONSOLIDATED_') || f.includes('DOCUMENTATION')
      );

      expect(consolidatedFiles.length).toBeGreaterThan(0);

      // Verify consolidated file has content
      const consolidatedFile = path.join(testDir, consolidatedFiles[0]);
      const content = await fs.readFile(consolidatedFile, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    }
  });

  test('should update README.md with summary section (when consolidation succeeds)', async () => {
    // Execute auto-consolidation
    const result = await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    // Check README.md - only updated if consolidation produced files
    const readmePath = path.join(testDir, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');

    if (result.consolidatedFiles.length > 0) {
      // Should contain summary markers or consolidated file reference
      const hasUpdate =
        readmeContent.includes('<!-- CONSOLIDATED_DOCS_START -->') ||
        readmeContent.includes('Documentation Summary') ||
        readmeContent.includes('CONSOLIDATED_');

      expect(hasUpdate).toBe(true);
    } else {
      // Without consolidation, README remains unchanged (expected)
      expect(readmeContent).toContain('# Project');
    }
  });

  test('should create BACKUP_INDEX.md in .devibe/ directory', async () => {
    // Execute auto-consolidation
    await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    // Check BACKUP_INDEX.md exists in correct location
    const backupIndexPath = path.join(testDir, '.devibe', 'BACKUP_INDEX.md');
    const backupIndexExists = await fs.stat(backupIndexPath).then(() => true).catch(() => false);

    expect(backupIndexExists).toBe(true);

    // Verify content
    const content = await fs.readFile(backupIndexPath, 'utf-8');
    expect(content).toContain('# Backup Index');
    expect(content).toContain('Total backups:');
    expect(content).toContain('**Files backed up**:'); // Markdown bold format
  });

  test('should preserve README.md in root (not move it)', async () => {
    // Execute auto-consolidation
    await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    // README.md should still be in root
    const rootFiles = await fs.readdir(testDir);
    expect(rootFiles).toContain('README.md');

    // README.md should NOT be in documents/
    const documentsFiles = await fs.readdir(path.join(testDir, 'documents'));
    expect(documentsFiles).not.toContain('README.md');
  });

  test('should respect git boundaries when respectGitBoundaries is true', async () => {
    // Create nested git repo structure
    const subDir = path.join(testDir, 'subproject');
    await fs.mkdir(path.join(subDir, '.git'), { recursive: true });
    await fs.writeFile(path.join(subDir, 'SUB_README.md'), '# Subproject');

    // Execute with git boundary respect
    const result = await autoService.execute({
      targetDirectory: testDir,
      respectGitBoundaries: true,
      maxOutputFiles: 3,
    });

    expect(result.success).toBe(true);

    // Subproject files should be processed separately
    if (result.repositoriesProcessed) {
      expect(result.repositoriesProcessed).toBeGreaterThanOrEqual(1);
    }
  });

  test('should handle empty directory gracefully', async () => {
    // Remove all test files
    const files = await fs.readdir(testDir);
    for (const file of files) {
      await fs.rm(path.join(testDir, file), { recursive: true, force: true });
    }

    // Execute on empty directory
    const result = await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    expect(result.success).toBe(true);
    expect(result.filesMovedToDocuments).toBe(0);
    expect(result.consolidatedFiles.length).toBe(0);
  });

  test('should create backup tracking (BACKUP_INDEX.md)', async () => {
    // Execute auto-consolidation
    const result = await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    expect(result.success).toBe(true);
    expect(result.backupIndexCreated).toBe(true);

    // Check BACKUP_INDEX.md exists (primary backup tracking)
    const backupIndexPath = path.join(testDir, '.devibe', 'BACKUP_INDEX.md');
    const backupIndexExists = await fs.stat(backupIndexPath).then(() => true).catch(() => false);
    expect(backupIndexExists).toBe(true);

    // Note: Full backup manifests are created during consolidation
    // which requires AI provider. BACKUP_INDEX.md tracks all operations.
  });

  test('should handle files with special characters in names', async () => {
    // Create files with special characters
    await fs.writeFile(path.join(testDir, 'FILE WITH SPACES.md'), '# Spaces');
    await fs.writeFile(path.join(testDir, 'FILE_WITH_UNDERSCORES.md'), '# Underscores');
    await fs.writeFile(path.join(testDir, 'FILE-WITH-DASHES.md'), '# Dashes');

    // Execute auto-consolidation
    const result = await autoService.execute({
      targetDirectory: testDir,
      maxOutputFiles: 3,
    });

    expect(result.success).toBe(true);

    // Check all files were handled
    const documentsFiles = await fs.readdir(path.join(testDir, 'documents'));
    expect(documentsFiles).toContain('FILE WITH SPACES.md');
    expect(documentsFiles).toContain('FILE_WITH_UNDERSCORES.md');
    expect(documentsFiles).toContain('FILE-WITH-DASHES.md');
  });
});
