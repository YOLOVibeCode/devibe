/**
 * Tests for MarkdownScanner
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { MarkdownScanner } from '../../../src/markdown-consolidation/markdown-scanner';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('MarkdownScanner', () => {
  const scanner = new MarkdownScanner();
  const testDir = path.join(process.cwd(), 'test-fixtures', 'markdown-scanner-test');
  
  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files
    await fs.writeFile(
      path.join(testDir, 'test1.md'),
      '# Test Document\n\nThis is a test with 10 words in it here now.'
    );
    
    await fs.writeFile(
      path.join(testDir, 'test2.md'),
      '---\ntitle: Custom Title\n---\n\n## Section\n\nContent here with some words.'
    );
    
    await fs.writeFile(
      path.join(testDir, 'test3.md'),
      '# Document with Links\n\n[Link 1](./test1.md)\n\n```typescript\nconst x = 1;\n```'
    );
    
    // Create subdirectory
    await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'subdir', 'nested.md'),
      '# Nested Document\n\nContent in subdirectory.'
    );
  });
  
  afterAll(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  test('should scan directory and find markdown files', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every(f => f.name.endsWith('.md'))).toBe(true);
  });
  
  test('should scan recursively when option enabled', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: true,
      excludePatterns: [],
      includeHidden: false
    });
    
    expect(result.length).toBeGreaterThanOrEqual(4);
    const nestedFile = result.find(f => f.name === 'nested.md');
    expect(nestedFile).toBeDefined();
  });
  
  test('should extract title from content', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    const test1 = result.find(f => f.name === 'test1.md');
    expect(test1?.metadata.title).toBe('Test Document');
  });
  
  test('should extract title from frontmatter', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    const test2 = result.find(f => f.name === 'test2.md');
    expect(test2?.metadata.title).toBe('Custom Title');
    expect(test2?.metadata.frontMatter?.title).toBe('Custom Title');
  });
  
  test('should count words correctly', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    const test1 = result.find(f => f.name === 'test1.md');
    expect(test1?.metadata.wordCount).toBeGreaterThan(5);
  });
  
  test('should extract headers', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    const test2 = result.find(f => f.name === 'test2.md');
    expect(test2?.metadata.headers).toContain('Section');
  });
  
  test('should count links and code blocks', async () => {
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: false,
      excludePatterns: [],
      includeHidden: false
    });
    
    const test3 = result.find(f => f.name === 'test3.md');
    expect(test3?.metadata.linkCount).toBe(1);
    expect(test3?.metadata.codeBlockCount).toBe(1);
  });
  
  test('should respect exclusion patterns', async () => {
    await fs.mkdir(path.join(testDir, 'excluded'), { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'excluded', 'excluded.md'),
      '# Excluded'
    );
    
    const result = await scanner.scan({
      targetDirectory: testDir,
      recursive: true,
      excludePatterns: ['**/excluded/**'],
      includeHidden: false
    });
    
    const excludedFile = result.find(f => f.name === 'excluded.md');
    expect(excludedFile).toBeUndefined();
  });
});




