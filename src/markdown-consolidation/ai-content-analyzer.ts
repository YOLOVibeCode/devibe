/**
 * AI Content Analyzer
 * 
 * Uses AI to cluster files by topic and detect relevance.
 */

import { AIProvider } from '../ai-classifier';
import { MarkdownFile, TopicCluster } from './types';

export class AIContentAnalyzer {
  constructor(private aiProvider: AIProvider | null) {}
  
  /**
   * Cluster files by topic using AI
   */
  async clusterByTopic(files: MarkdownFile[]): Promise<TopicCluster[]> {
    if (!this.aiProvider) {
      return this.fallbackClustering(files);
    }

    const prompt = this.buildClusteringPrompt(files);

    try {
      // Use suggestRepository method creatively for clustering
      const response = await this.aiProvider.suggestRepository(
        'markdown-clustering-request',
        prompt,
        [] // No repositories needed for clustering
      );

      return this.parseClusteringResponse(response.reasoning, files);
    } catch (error) {
      console.warn('AI clustering failed:', (error as Error).message);
      return this.fallbackClustering(files);
    }
  }
  
  /**
   * Build AI prompt for topic clustering
   */
  private buildClusteringPrompt(files: MarkdownFile[]): string {
    return `
Analyze these markdown files and group them into logical topic clusters.
Goal: Consolidate ${files.length} files into 3-5 coherent documents.

Files to analyze:
${files.map((f, i) => `
${i + 1}. ${f.name} (${f.metadata.wordCount} words)
   Title: ${f.metadata.title}
   Age: ${this.formatAge(f.lastModified)}
   Headers: ${f.metadata.headers.slice(0, 3).join(', ')}${f.metadata.headers.length > 3 ? '...' : ''}
   Content preview: ${f.content.substring(0, 200)}...
`).join('\n')}

Respond with JSON:
{
  "clusters": [
    {
      "name": "cluster-name",
      "description": "what this cluster represents",
      "fileIndices": [1, 3, 5],
      "suggestedFilename": "consolidated-name.md",
      "consolidationStrategy": "merge|summarize|link-only",
      "reasoning": "why these files belong together"
    }
  ],
  "staleFiles": [2, 7],
  "standaloneFiles": [4]
}

Strategies:
- "merge": Combine full content (complementary topics)
- "summarize": Extract key points (similar topics)
- "link-only": Keep separate but reference in README (distinct topics)
`;
  }
  
  /**
   * Format file age for display
   */
  private formatAge(date: Date): string {
    const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 7) return `${Math.floor(days)} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  }
  
  /**
   * Parse AI clustering response
   */
  private parseClusteringResponse(responseText: string, files: MarkdownFile[]): TopicCluster[] {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const data = JSON.parse(jsonMatch[0]);
      
      return data.clusters.map((cluster: any) => ({
        name: cluster.name,
        description: cluster.description,
        files: cluster.fileIndices.map((i: number) => files[i - 1]).filter((f: MarkdownFile) => f !== undefined),
        suggestedFilename: cluster.suggestedFilename,
        consolidationStrategy: cluster.consolidationStrategy
      }));
    } catch (error) {
      console.warn('Failed to parse AI response:', (error as Error).message);
      return this.fallbackClustering(files);
    }
  }
  
  /**
   * Fallback clustering when AI fails (directory-based)
   */
  private fallbackClustering(files: MarkdownFile[]): TopicCluster[] {
    // Simple fallback: cluster by directory
    const clusters = new Map<string, MarkdownFile[]>();
    
    for (const file of files) {
      const dir = file.relativePath.includes('/') 
        ? file.relativePath.split('/')[0]
        : 'root';
      
      if (!clusters.has(dir)) {
        clusters.set(dir, []);
      }
      clusters.get(dir)!.push(file);
    }
    
    return Array.from(clusters.entries()).map(([name, clusterFiles]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: `Files from ${name} directory`,
      files: clusterFiles,
      suggestedFilename: `${name.toUpperCase()}.md`,
      consolidationStrategy: 'merge' as const
    }));
  }
}

