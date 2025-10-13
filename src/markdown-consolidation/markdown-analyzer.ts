/**
 * Markdown Analyzer
 * 
 * Calculates relevance scores using multi-factor analysis.
 */

import { MarkdownFile, RelevanceAnalysis, RelevanceFactors } from './types';
import * as path from 'path';

export class MarkdownAnalyzer {
  /**
   * Analyze file relevance with 4-factor scoring
   */
  analyzeRelevance(file: MarkdownFile, allFiles: MarkdownFile[]): RelevanceAnalysis {
    const factors: RelevanceFactors = {
      recency: this.scoreRecency(file),
      contentQuality: this.scoreContentQuality(file),
      connectivity: this.scoreConnectivity(file, allFiles),
      uniqueness: this.scoreUniqueness(file, allFiles)
    };
    
    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    const status = this.determineStatus(score);
    const reasoning = this.generateReasoning(factors, file);
    
    return { file, score, factors, status, reasoning };
  }
  
  /**
   * Score based on file recency (0-25 points)
   */
  private scoreRecency(file: MarkdownFile): number {
    const ageInDays = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays <= 7) return 25;      // Fresh: last week
    if (ageInDays <= 30) return 20;     // Recent: last month
    if (ageInDays <= 90) return 15;     // Aging: last quarter
    if (ageInDays <= 180) return 10;    // Old: last 6 months
    return 5;                            // Very old: 6+ months
  }
  
  /**
   * Score based on content quality (0-25 points)
   */
  private scoreContentQuality(file: MarkdownFile): number {
    let score = 0;
    const meta = file.metadata;
    
    // Word count (0-10 points)
    if (meta.wordCount >= 500) score += 10;
    else if (meta.wordCount >= 200) score += 7;
    else if (meta.wordCount >= 50) score += 4;
    else score += 1;
    
    // Structure (0-8 points)
    if (meta.headers.length >= 5) score += 8;
    else if (meta.headers.length >= 3) score += 5;
    else if (meta.headers.length >= 1) score += 3;
    
    // Code blocks (0-4 points)
    if (meta.codeBlockCount >= 3) score += 4;
    else if (meta.codeBlockCount >= 1) score += 2;
    
    // Links (0-3 points)
    if (meta.linkCount >= 5) score += 3;
    else if (meta.linkCount >= 1) score += 2;
    
    return Math.min(25, score);
  }
  
  /**
   * Score based on connectivity to other files (0-25 points)
   */
  private scoreConnectivity(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    let score = 0;
    
    // Inbound links (0-15 points)
    const inboundLinks = this.countInboundLinks(file, allFiles);
    score += Math.min(15, inboundLinks * 3);
    
    // Outbound links (0-10 points)
    const outboundLinks = this.countOutboundLinks(file, allFiles);
    score += Math.min(10, outboundLinks * 2);
    
    return Math.min(25, score);
  }
  
  /**
   * Score based on content uniqueness (0-25 points)
   */
  private scoreUniqueness(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    const similarFiles = this.findSimilarFiles(file, allFiles);
    
    if (similarFiles.length === 0) return 25;  // Completely unique
    if (similarFiles.length === 1) return 20;  // Mostly unique
    if (similarFiles.length <= 3) return 15;   // Some overlap
    if (similarFiles.length <= 5) return 10;   // Significant overlap
    return 5;                                   // Highly duplicated
  }
  
  /**
   * Count files that link to this file
   */
  private countInboundLinks(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    let count = 0;
    const fileName = path.basename(file.path);
    
    for (const other of allFiles) {
      if (other.path === file.path) continue;
      if (other.content.includes(fileName) || other.content.includes(file.relativePath)) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Count links from this file to other markdown files
   */
  private countOutboundLinks(file: MarkdownFile, allFiles: MarkdownFile[]): number {
    const linkMatches = file.content.matchAll(/\[.*?\]\((.*?)\)/g);
    const links = Array.from(linkMatches, m => m[1]);
    
    return links.filter(link => {
      // Count only local markdown links
      return link.endsWith('.md') && !link.startsWith('http');
    }).length;
  }
  
  /**
   * Find files with similar titles
   */
  private findSimilarFiles(file: MarkdownFile, allFiles: MarkdownFile[]): MarkdownFile[] {
    return allFiles.filter(f => 
      f.path !== file.path &&
      this.calculateTitleSimilarity(file.metadata.title, f.metadata.title) > 0.7
    );
  }
  
  /**
   * Calculate Jaccard similarity between titles
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.toLowerCase().split(/\s+/));
    const words2 = new Set(title2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Determine status based on score
   */
  private determineStatus(score: number): RelevanceAnalysis['status'] {
    if (score >= 75) return 'highly-relevant';
    if (score >= 50) return 'relevant';
    if (score >= 30) return 'marginal';
    return 'stale';
  }
  
  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(factors: RelevanceFactors, file: MarkdownFile): string {
    const reasons: string[] = [];
    
    // Recency
    if (factors.recency < 10) {
      reasons.push('Very old file (6+ months)');
    } else if (factors.recency >= 20) {
      reasons.push('Recently modified');
    }
    
    // Content quality
    if (factors.contentQuality < 10) {
      reasons.push('Minimal content or structure');
    } else if (factors.contentQuality >= 20) {
      reasons.push('Well-structured with good content');
    }
    
    // Connectivity
    if (factors.connectivity === 0) {
      reasons.push('Not referenced by any other files');
    } else if (factors.connectivity >= 15) {
      reasons.push('Well-connected to other documentation');
    }
    
    // Uniqueness
    if (factors.uniqueness < 10) {
      reasons.push('Content significantly duplicated elsewhere');
    } else if (factors.uniqueness >= 20) {
      reasons.push('Contains unique information');
    }
    
    return reasons.length > 0 ? reasons.join('; ') : 'Standard documentation file';
  }
}

