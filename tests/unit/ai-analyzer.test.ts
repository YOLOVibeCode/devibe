/**
 * Tests for AIContentAnalyzer
 */

import { describe, test, expect, vi } from 'vitest';
import { AIContentAnalyzer } from '../../../src/markdown-consolidation/ai-content-analyzer';
import { MarkdownFile } from '../../../src/markdown-consolidation/types';
import { AIProvider } from '../../../src/ai-provider-resolver';

describe('AIContentAnalyzer', () => {
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
  
  const createMockAIProvider = (response: any = {}): AIProvider => ({
    name: 'mock',
    classify: vi.fn(),
    classifyBatch: vi.fn(),
    suggestRepository: vi.fn().mockResolvedValue({
      repository: '',
      subdirectory: '',
      confidence: 0.9,
      reasoning: JSON.stringify(response)
    })
  });
  
  test('should cluster files using AI', async () => {
    const mockResponse = {
      clusters: [
        {
          name: 'Documentation',
          description: 'Documentation files',
          fileIndices: [1, 2],
          suggestedFilename: 'DOCUMENTATION.md',
          consolidationStrategy: 'merge',
          reasoning: 'These are all docs'
        }
      ],
      staleFiles: [],
      standaloneFiles: []
    };
    
    const mockAI = createMockAIProvider(mockResponse);
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile({ name: 'doc1.md', path: '/test/doc1.md' });
    const file2 = createMockFile({ name: 'doc2.md', path: '/test/doc2.md' });
    
    const result = await analyzer.clusterByTopic([file1, file2]);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Documentation');
    expect(result[0].files).toHaveLength(2);
    expect(result[0].consolidationStrategy).toBe('merge');
  });
  
  test('should return multiple clusters when AI suggests them', async () => {
    const mockResponse = {
      clusters: [
        {
          name: 'Architecture',
          description: 'Architecture docs',
          fileIndices: [1],
          suggestedFilename: 'ARCHITECTURE.md',
          consolidationStrategy: 'merge',
          reasoning: 'Architecture'
        },
        {
          name: 'API',
          description: 'API docs',
          fileIndices: [2],
          suggestedFilename: 'API.md',
          consolidationStrategy: 'summarize',
          reasoning: 'API'
        }
      ],
      staleFiles: [],
      standaloneFiles: []
    };
    
    const mockAI = createMockAIProvider(mockResponse);
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile({ name: 'arch.md' });
    const file2 = createMockFile({ name: 'api.md' });
    
    const result = await analyzer.clusterByTopic([file1, file2]);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Architecture');
    expect(result[1].name).toBe('API');
  });
  
  test('should fallback to directory-based clustering when AI fails', async () => {
    const mockAI = createMockAIProvider();
    mockAI.analyzeFileAllocation = vi.fn().mockRejectedValue(new Error('AI failed'));
    
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile({
      name: 'doc1.md',
      relativePath: 'docs/doc1.md'
    });
    const file2 = createMockFile({
      name: 'doc2.md',
      relativePath: 'docs/doc2.md'
    });
    
    const result = await analyzer.clusterByTopic([file1, file2]);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Docs');
    expect(result[0].files).toHaveLength(2);
  });
  
  test('should fallback when AI response is invalid JSON', async () => {
    const mockAI = createMockAIProvider();
    mockAI.suggestRepository = vi.fn().mockResolvedValue({
      repository: '',
      subdirectory: '',
      confidence: 0.9,
      reasoning: 'Not valid JSON'
    });
    
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile({ relativePath: 'root.md' });
    
    const result = await analyzer.clusterByTopic([file1]);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Root');
  });
  
  test('should handle files in root directory in fallback', async () => {
    const mockAI = createMockAIProvider();
    mockAI.suggestRepository = vi.fn().mockRejectedValue(new Error('AI failed'));
    
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile({ relativePath: 'README.md' });
    const file2 = createMockFile({ relativePath: 'CONTRIBUTING.md' });
    
    const result = await analyzer.clusterByTopic([file1, file2]);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Root');
    expect(result[0].files).toHaveLength(2);
  });
  
  test('should group files by directory in fallback', async () => {
    const mockAI = createMockAIProvider();
    mockAI.analyzeFileAllocation = vi.fn().mockRejectedValue(new Error('AI failed'));
    
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile({ relativePath: 'docs/guide.md' });
    const file2 = createMockFile({ relativePath: 'specs/spec.md' });
    
    const result = await analyzer.clusterByTopic([file1, file2]);
    
    expect(result).toHaveLength(2);
    const docCluster = result.find(c => c.name === 'Docs');
    const specCluster = result.find(c => c.name === 'Specs');
    
    expect(docCluster).toBeDefined();
    expect(specCluster).toBeDefined();
    expect(docCluster?.files).toHaveLength(1);
    expect(specCluster?.files).toHaveLength(1);
  });
  
  test('should handle edge case with invalid file indices from AI', async () => {
    const mockResponse = {
      clusters: [
        {
          name: 'Test',
          description: 'Test cluster',
          fileIndices: [1, 999], // 999 doesn't exist
          suggestedFilename: 'TEST.md',
          consolidationStrategy: 'merge',
          reasoning: 'Test'
        }
      ],
      staleFiles: [],
      standaloneFiles: []
    };
    
    const mockAI = createMockAIProvider(mockResponse);
    const analyzer = new AIContentAnalyzer(mockAI);
    
    const file1 = createMockFile();
    
    const result = await analyzer.clusterByTopic([file1]);
    
    expect(result).toHaveLength(1);
    expect(result[0].files).toHaveLength(1); // Should filter out undefined
  });
});

