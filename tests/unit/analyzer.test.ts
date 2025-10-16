/**
 * Tests for MarkdownAnalyzer
 */

import { describe, test, expect } from 'vitest';
import { MarkdownAnalyzer } from '../../../src/markdown-consolidation/markdown-analyzer';
import { MarkdownFile } from '../../../src/markdown-consolidation/types';

describe('MarkdownAnalyzer', () => {
  const analyzer = new MarkdownAnalyzer();
  
  const createMockFile = (overrides: Partial<MarkdownFile> = {}): MarkdownFile => ({
    path: '/test/file.md',
    relativePath: 'file.md',
    name: 'file.md',
    size: 1000,
    lastModified: new Date(),
    content: '# Test\n\nContent here.',
    metadata: {
      title: 'Test',
      headers: ['Test'],
      wordCount: 100,
      linkCount: 0,
      codeBlockCount: 0,
      imageCount: 0
    },
    ...overrides
  });
  
  describe('Recency Scoring', () => {
    test('should give 25 points for files modified within 7 days', () => {
      const file = createMockFile({
        lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.recency).toBe(25);
    });
    
    test('should give 20 points for files modified within 30 days', () => {
      const file = createMockFile({
        lastModified: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.recency).toBe(20);
    });
    
    test('should give 5 points for very old files (>180 days)', () => {
      const file = createMockFile({
        lastModified: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // 200 days ago
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.recency).toBe(5);
    });
  });
  
  describe('Content Quality Scoring', () => {
    test('should score high-quality content (>500 words, 5+ headers)', () => {
      const file = createMockFile({
        metadata: {
          title: 'High Quality',
          headers: ['H1', 'H2', 'H3', 'H4', 'H5'],
          wordCount: 600,
          linkCount: 6,
          codeBlockCount: 3,
          imageCount: 0
        }
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.contentQuality).toBe(25);
    });
    
    test('should score low-quality content (<50 words, no headers)', () => {
      const file = createMockFile({
        metadata: {
          title: 'Low Quality',
          headers: [],
          wordCount: 30,
          linkCount: 0,
          codeBlockCount: 0,
          imageCount: 0
        }
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.contentQuality).toBeLessThan(10);
    });
    
    test('should consider code blocks in quality score', () => {
      const file = createMockFile({
        metadata: {
          title: 'With Code',
          headers: ['Header'],
          wordCount: 250,
          linkCount: 2,
          codeBlockCount: 5,
          imageCount: 0
        }
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.contentQuality).toBeGreaterThan(15);
    });
  });
  
  describe('Connectivity Scoring', () => {
    test('should score well-connected files', () => {
      const file1 = createMockFile({
        name: 'file1.md',
        path: '/test/file1.md',
        content: '# File 1\n\n[Link to file2](./file2.md)'
      });
      
      const file2 = createMockFile({
        name: 'file2.md',
        path: '/test/file2.md',
        content: '# File 2\n\nReference to file1.md here'
      });
      
      const result = analyzer.analyzeRelevance(file1, [file1, file2]);
      expect(result.factors.connectivity).toBeGreaterThan(0);
    });
    
    test('should score isolated files with 0 connectivity', () => {
      const file = createMockFile({
        content: '# Isolated\n\nNo links to other files.'
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.factors.connectivity).toBe(0);
    });
  });
  
  describe('Uniqueness Scoring', () => {
    test('should give high score for unique files', () => {
      const file1 = createMockFile({
        metadata: {
          ...createMockFile().metadata,
          title: 'Completely Unique Title'
        }
      });
      
      const file2 = createMockFile({
        metadata: {
          ...createMockFile().metadata,
          title: 'Different Title'
        }
      });
      
      const result = analyzer.analyzeRelevance(file1, [file1, file2]);
      expect(result.factors.uniqueness).toBe(25);
    });
    
    test('should give lower score for similar files', () => {
      const file1 = createMockFile({
        metadata: {
          ...createMockFile().metadata,
          title: 'API Documentation Guide'
        }
      });
      
      const file2 = createMockFile({
        path: '/test/file2.md',
        metadata: {
          ...createMockFile().metadata,
          title: 'API Documentation Guide'
        }
      });
      
      const file3 = createMockFile({
        path: '/test/file3.md',
        metadata: {
          ...createMockFile().metadata,
          title: 'API Guide Documentation'
        }
      });
      
      const result = analyzer.analyzeRelevance(file1, [file1, file2, file3]);
      expect(result.factors.uniqueness).toBeLessThan(25);
    });
  });
  
  describe('Status Classification', () => {
    test('should classify highly-relevant files (score >= 75)', () => {
      const file = createMockFile({
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        metadata: {
          title: 'High Quality Document',
          headers: ['H1', 'H2', 'H3', 'H4', 'H5'],
          wordCount: 800,
          linkCount: 10,
          codeBlockCount: 5,
          imageCount: 2
        }
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.status).toBe('highly-relevant');
      expect(result.score).toBeGreaterThanOrEqual(75);
    });
    
    test('should classify stale files (score < 30)', () => {
      // Create a stale file with duplicates to lower uniqueness score
      const file1 = createMockFile({
        path: '/test/old1.md',
        lastModified: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000), // 250 days ago
        metadata: {
          title: 'Old Document',
          headers: [],
          wordCount: 20,
          linkCount: 0,
          codeBlockCount: 0,
          imageCount: 0
        }
      });
      
      // Create similar files to reduce uniqueness
      const file2 = createMockFile({
        path: '/test/old2.md',
        metadata: {
          title: 'Old Document',
          headers: [],
          wordCount: 20,
          linkCount: 0,
          codeBlockCount: 0,
          imageCount: 0
        }
      });
      
      const file3 = createMockFile({
        path: '/test/old3.md',
        metadata: {
          title: 'Old Document',
          headers: [],
          wordCount: 20,
          linkCount: 0,
          codeBlockCount: 0,
          imageCount: 0
        }
      });
      
      const result = analyzer.analyzeRelevance(file1, [file1, file2, file3]);
      expect(result.status).toBe('stale');
      expect(result.score).toBeLessThan(30);
    });
    
    test('should classify relevant files (50-74 score)', () => {
      const file = createMockFile({
        lastModified: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        metadata: {
          title: 'Medium Quality',
          headers: ['H1', 'H2'],
          wordCount: 250,
          linkCount: 2,
          codeBlockCount: 1,
          imageCount: 0
        }
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.status).toBe('relevant');
    });
  });
  
  describe('Reasoning Generation', () => {
    test('should generate meaningful reasoning', () => {
      const file = createMockFile({
        lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: {
          title: 'Test',
          headers: ['H1', 'H2', 'H3', 'H4'],
          wordCount: 500,
          linkCount: 5,
          codeBlockCount: 2,
          imageCount: 0
        }
      });
      
      const result = analyzer.analyzeRelevance(file, [file]);
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });
  
  describe('Overall Score Calculation', () => {
    test('should calculate total score correctly', () => {
      const file = createMockFile();
      const result = analyzer.analyzeRelevance(file, [file]);
      
      const manualTotal = 
        result.factors.recency +
        result.factors.contentQuality +
        result.factors.connectivity +
        result.factors.uniqueness;
      
      expect(result.score).toBe(manualTotal);
    });
    
    test('should have score between 0 and 100', () => {
      const file = createMockFile();
      const result = analyzer.analyzeRelevance(file, [file]);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});

