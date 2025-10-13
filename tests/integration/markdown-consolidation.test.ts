import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownScanner } from '../../src/markdown-consolidation/markdown-scanner.js';
import { MarkdownAnalyzer } from '../../src/markdown-consolidation/markdown-analyzer.js';
import { AIContentAnalyzer } from '../../src/markdown-consolidation/ai-content-analyzer.js';
import { MarkdownConsolidator } from '../../src/markdown-consolidation/markdown-consolidator.js';
import { SuperReadmeGenerator } from '../../src/markdown-consolidation/super-readme-generator.js';
import { ConsolidationValidator } from '../../src/markdown-consolidation/consolidation-validator.js';
import { BackupManager } from '../../src/backup-manager.js';
import { AIProvider } from '../../src/ai-classifier.js';
import { MarkdownFile, ConsolidationPlan } from '../../src/markdown-consolidation/types.js';

describe('Markdown Consolidation - Integration', () => {
  let testDir: string;
  let backupDir: string;

  beforeEach(async () => {
    // Create temp test directory
    testDir = path.join(process.cwd(), '.test-markdown-integration');
    backupDir = path.join(testDir, '.devibe', 'backups');
    
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'guides'), { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const createMockAIProvider = (): AIProvider => ({
    name: 'mock',
    classify: vi.fn(),
    classifyBatch: vi.fn(),
    suggestRepository: vi.fn().mockResolvedValue({
      repository: '',
      subdirectory: '',
      confidence: 0.9,
      reasoning: JSON.stringify({
        clusters: [
          {
            id: 'cluster-1',
            name: 'Documentation',
            fileIndices: [0, 1, 2, 3],
            summary: 'General documentation files',
            keywords: ['docs', 'readme', 'guide'],
            consolidationStrategy: 'merge'
          }
        ]
      })
    })
  });

  test('Full workflow: scan → analyze → cluster → consolidate → validate', async () => {
    // Setup test files
    await fs.writeFile(
      path.join(testDir, 'docs', 'README.md'),
      '# Documentation\n\nMain documentation file.\n\n## Features\n\n- Feature 1\n- Feature 2',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(testDir, 'docs', 'SETUP.md'),
      '# Setup Guide\n\nHow to set up the project.\n\n## Prerequisites\n\n- Node.js 18+\n- npm',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(testDir, 'guides', 'API.md'),
      '# API Reference\n\nAPI documentation.\n\n## Endpoints\n\n- GET /api/users\n- POST /api/users',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(testDir, 'OLD_NOTES.md'),
      '# Old\n\nShort.',
      'utf-8'
    );
    
    // Create duplicates to lower uniqueness
    await fs.writeFile(
      path.join(testDir, 'OLD_NOTES2.md'),
      '# Old\n\nShort.',
      'utf-8'
    );

    // Backdate old files
    const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    await fs.utimes(path.join(testDir, 'OLD_NOTES.md'), oldDate, oldDate);
    await fs.utimes(path.join(testDir, 'OLD_NOTES2.md'), oldDate, oldDate);

    // Initialize components
    const scanner = new MarkdownScanner();
    const analyzer = new MarkdownAnalyzer();
    const mockAI = createMockAIProvider();
    const aiAnalyzer = new AIContentAnalyzer(mockAI);
    const backupManager = new BackupManager(backupDir);
    const consolidator = new MarkdownConsolidator(aiAnalyzer, backupManager);
    const readmeGenerator = new SuperReadmeGenerator();
    const validator = new ConsolidationValidator();

    // Step 1: Scan
    const files = await scanner.scan({
      targetDirectory: testDir,
      recursive: true,
      excludePatterns: ['node_modules', '.git'],
      includeHidden: false
    });

    expect(files).toHaveLength(5);
    expect(files.some(f => f.name === 'README.md')).toBe(true);
    expect(files.some(f => f.name === 'OLD_NOTES.md')).toBe(true);

    // Step 2: Analyze relevance
    const analysisResults = files.map(file => analyzer.analyzeRelevance(file, files));
    
    const staleFiles = analysisResults.filter(r => r.status === 'stale');
    expect(staleFiles.length).toBeGreaterThan(0);
    
    const relevantFiles = analysisResults.filter(r => r.status !== 'stale');
    expect(relevantFiles.length).toBeGreaterThan(0);

    // Step 3: Cluster by topic
    const clusters = await aiAnalyzer.clusterByTopic(files.filter(f => 
      analysisResults.find(r => r.file.path === f.path)?.status !== 'stale'
    ));

    expect(clusters.length).toBeGreaterThan(0);

    // Step 4: Create consolidation plan
    const plan: ConsolidationPlan = {
      strategy: 'merge-by-topic',
      inputFiles: clusters[0].files,
      outputFile: path.join(testDir, 'CONSOLIDATED_DOCS.md'),
      topic: clusters[0].name
    };

    // Step 5: Execute plan (in memory for testing)
    const result = await consolidator.executePlan(plan);

    expect(result.success).toBe(true);
    expect(result.outputFile).toBe(plan.outputFile);
    expect(result.inputFiles).toBe(plan.inputFiles.length);
    expect(result.backupPath).toBeDefined();

    // Verify output file exists
    const outputExists = await fs.access(result.outputFile).then(() => true).catch(() => false);
    expect(outputExists).toBe(true);

    // Step 6: Generate super README
    const superReadmeContent = await readmeGenerator.generate(files);
    
    expect(superReadmeContent).toBeDefined();
    expect(superReadmeContent).toContain('Documentation Hub');

    // Write super README
    const superReadmePath = path.join(testDir, 'DOCUMENTATION_HUB.md');
    await fs.writeFile(superReadmePath, superReadmeContent, 'utf-8');

    // Step 7: Validate consolidation
    const validation = await validator.validate(
      plan.inputFiles,
      [result.outputFile]
    );

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('Should preserve originals with backups', async () => {
    await fs.writeFile(
      path.join(testDir, 'TEST.md'),
      '# Test\n\nOriginal content.',
      'utf-8'
    );

    const scanner = new MarkdownScanner();
    const files = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });

    const mockAI = createMockAIProvider();
    const aiAnalyzer = new AIContentAnalyzer(mockAI);
    const backupManager = new BackupManager(backupDir);
    const consolidator = new MarkdownConsolidator(aiAnalyzer, backupManager);

    const plan: ConsolidationPlan = {
      strategy: 'merge-by-topic',
      inputFiles: files,
      outputFile: path.join(testDir, 'MERGED.md'),
      topic: 'Test'
    };

    const result = await consolidator.executePlan(plan);

    expect(result.success).toBe(true);
    expect(result.backupPath).toBeDefined();

    // Verify backup directory exists
    const backupDirExists = await fs.access(backupDir).then(() => true).catch(() => false);
    expect(backupDirExists).toBe(true);
  });

  test('Should handle dry-run without making changes', async () => {
    await fs.writeFile(
      path.join(testDir, 'DRY.md'),
      '# Dry Run Test',
      'utf-8'
    );

    const scanner = new MarkdownScanner();
    const files = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });

    const mockAI = createMockAIProvider();
    const aiAnalyzer = new AIContentAnalyzer(mockAI);

    const clusters = await aiAnalyzer.clusterByTopic(files);
    
    expect(clusters.length).toBeGreaterThan(0);
    
    // In a real dry-run, we'd skip executePlan
    // Just verify clustering works without side effects
    const entries = await fs.readdir(testDir);
    const mdFiles = entries.filter(e => e.endsWith('.md'));
    expect(mdFiles.length).toBe(1); // Only original file exists
  });

  test('Should detect and report broken links', async () => {
    await fs.writeFile(
      path.join(testDir, 'BROKEN.md'),
      '# Broken Links\n\n[Missing](./nonexistent.md)\n[Also Missing](./gone.md)',
      'utf-8'
    );

    const scanner = new MarkdownScanner();
    const files = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });

    const validator = new ConsolidationValidator();
    const validation = await validator.validate(files, [files[0].path]);

    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings.some(w => w.includes('Broken link'))).toBe(true);
  });

  test('Should categorize files by status correctly', async () => {
    // Recent file
    await fs.writeFile(
      path.join(testDir, 'RECENT.md'),
      '# Recent Document\n\nThis is a comprehensive recent document with lots of content and details about the project. It includes multiple sections, detailed explanations, and valuable information.\n\n## Section 1\n\nDetailed content here.\n\n## Section 2\n\nMore detailed content.\n\n## Section 3\n\nEven more content with code examples and explanations.',
      'utf-8'
    );

    // Old file with duplicate content to lower uniqueness score
    await fs.writeFile(
      path.join(testDir, 'ANCIENT.md'),
      '# Old\n\nShort.',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(testDir, 'ANCIENT2.md'),
      '# Old\n\nShort.',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(testDir, 'ANCIENT3.md'),
      '# Old\n\nShort.',
      'utf-8'
    );

    const ancientDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    await fs.utimes(path.join(testDir, 'ANCIENT.md'), ancientDate, ancientDate);
    await fs.utimes(path.join(testDir, 'ANCIENT2.md'), ancientDate, ancientDate);
    await fs.utimes(path.join(testDir, 'ANCIENT3.md'), ancientDate, ancientDate);

    const scanner = new MarkdownScanner();
    const files = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });

    expect(files.length).toBeGreaterThanOrEqual(4);

    const analyzer = new MarkdownAnalyzer();
    const results = files.map(file => analyzer.analyzeRelevance(file, files));

    const recent = results.find(r => r.file.name === 'RECENT.md');
    const ancient = results.find(r => r.file.name === 'ANCIENT.md');

    expect(recent).toBeDefined();
    expect(ancient).toBeDefined();
    expect(recent!.status).not.toBe('stale');
    expect(ancient!.status).toBe('stale');
  });
});

