/**
 * Markdown Consolidator
 * 
 * Executes consolidation strategies on markdown files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownFile, ConsolidationPlan, ConsolidationResult, ConsolidationOptions } from './types';
import { BackupManager } from '../backup-manager';
import { AIContentAnalyzer } from './ai-content-analyzer';

export class MarkdownConsolidator {
  constructor(
    private aiAnalyzer: AIContentAnalyzer,
    private backupManager: BackupManager
  ) {}
  
  /**
   * Create consolidation plans from files
   */
  async createPlan(files: MarkdownFile[], options: ConsolidationOptions): Promise<ConsolidationPlan[]> {
    const clusters = await this.aiAnalyzer.clusterByTopic(files);
    const plans: ConsolidationPlan[] = [];
    
    for (const cluster of clusters.slice(0, options.maxOutputFiles)) {
      if (cluster.consolidationStrategy === 'merge') {
        plans.push({
          strategy: 'merge-by-topic',
          inputFiles: cluster.files,
          outputFile: cluster.suggestedFilename,
          preserveOriginals: options.preserveOriginals,
          confidence: 0.85,
          reasoning: `Merge ${cluster.files.length} files on topic: ${cluster.description}`
        });
      } else if (cluster.consolidationStrategy === 'summarize') {
        plans.push({
          strategy: 'summarize-cluster',
          inputFiles: cluster.files,
          outputFile: cluster.suggestedFilename,
          preserveOriginals: options.preserveOriginals,
          confidence: 0.90,
          reasoning: `Summarize ${cluster.files.length} similar files: ${cluster.description}`
        });
      }
    }
    
    return plans;
  }
  
  /**
   * Execute a consolidation plan
   */
  async executePlan(plan: ConsolidationPlan): Promise<ConsolidationResult> {
    // Backup originals
    const backupEntries = [];
    for (const file of plan.inputFiles) {
      const entry = await this.backupManager.backupFile(file.path, 'modify');
      backupEntries.push(entry);
    }
    
    // Create manifest for this consolidation
    const manifest = await this.backupManager.createManifest(backupEntries);
    
    let consolidatedContent: string;
    
    switch (plan.strategy) {
      case 'merge-by-topic':
        consolidatedContent = this.mergeByTopic(plan.inputFiles);
        break;
      case 'merge-by-folder':
        consolidatedContent = this.mergeByFolder(plan.inputFiles);
        break;
      case 'summarize-cluster':
        consolidatedContent = this.summarizeCluster(plan.inputFiles);
        break;
      default:
        throw new Error(`Unknown strategy: ${plan.strategy}`);
    }
    
    // Write consolidated file
    await fs.mkdir(path.dirname(plan.outputFile), { recursive: true });
    await fs.writeFile(plan.outputFile, consolidatedContent);
    
    return {
      success: true,
      outputFile: plan.outputFile,
      inputFiles: plan.inputFiles.length,
      action: plan.strategy,
      backupPath: manifest.id
    };
  }
  
  /**
   * Merge files by topic - combines full content
   */
  private mergeByTopic(files: MarkdownFile[]): string {
    const sorted = files.sort((a, b) => b.metadata.wordCount - a.metadata.wordCount);
    const sections: string[] = [];
    
    // Header
    sections.push(`# ${this.inferTopicTitle(files)}`);
    sections.push('');
    sections.push(`*Consolidated from ${files.length} files on ${new Date().toLocaleDateString()}*`);
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Table of contents
    sections.push('## Table of Contents');
    sections.push('');
    for (const file of sorted) {
      sections.push(`- [${file.metadata.title}](#${this.slugify(file.metadata.title)})`);
    }
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Content
    for (const file of sorted) {
      sections.push(`## ${file.metadata.title}`);
      sections.push('');
      sections.push(`*Originally from: ${file.name}*`);
      sections.push('');
      
      // Remove the file's own title if present
      let content = file.content.replace(/^#\s+.+$/m, '').trim();
      sections.push(content);
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    // Source attribution
    sections.push('## Source Files');
    sections.push('');
    sections.push('This document was consolidated from:');
    sections.push('');
    for (const file of files) {
      sections.push(`- \`${file.relativePath}\` (${file.metadata.wordCount} words, modified ${file.lastModified.toLocaleDateString()})`);
    }
    
    return sections.join('\n');
  }
  
  /**
   * Merge files by folder - creates index
   */
  private mergeByFolder(files: MarkdownFile[]): string {
    const folder = path.dirname(files[0].relativePath);
    const sections: string[] = [];
    
    sections.push(`# ${path.basename(folder)} Documentation`);
    sections.push('');
    sections.push(`*Index of ${files.length} documents*`);
    sections.push('');
    sections.push('---');
    sections.push('');
    
    for (const file of files) {
      sections.push(`## [${file.metadata.title}](./${file.name})`);
      sections.push('');
      
      // Extract first paragraph as preview
      const preview = this.extractPreview(file.content);
      if (preview) {
        sections.push(preview);
        sections.push('');
      }
      
      if (file.metadata.headers.length > 0) {
        sections.push('**Contents:**');
        for (const header of file.metadata.headers.slice(0, 5)) {
          sections.push(`- ${header}`);
        }
        sections.push('');
      }
    }
    
    return sections.join('\n');
  }
  
  /**
   * Summarize cluster - simple version (AI-powered would be better)
   */
  private summarizeCluster(files: MarkdownFile[]): string {
    const sections: string[] = [];
    
    sections.push(`# Summary: ${this.inferTopicTitle(files)}`);
    sections.push('');
    sections.push(`*Summary of ${files.length} documents*`);
    sections.push('');
    sections.push('---');
    sections.push('');
    
    sections.push('## Overview');
    sections.push('');
    sections.push(`This document summarizes key information from ${files.length} related markdown files:`);
    sections.push('');
    
    for (const file of files) {
      sections.push(`- **${file.metadata.title}**: ${this.extractPreview(file.content)}`);
    }
    
    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push('## Detailed Content');
    sections.push('');
    
    for (const file of files) {
      sections.push(`### ${file.metadata.title}`);
      sections.push('');
      sections.push(`*Source: ${file.name}*`);
      sections.push('');
      
      // Use first few paragraphs
      const paragraphs = file.content.split('\n\n').slice(0, 3);
      sections.push(paragraphs.join('\n\n'));
      sections.push('');
    }
    
    return sections.join('\n');
  }
  
  /**
   * Infer topic title from common words
   */
  private inferTopicTitle(files: MarkdownFile[]): string {
    const words = files.map(f => f.metadata.title.toLowerCase().split(/\s+/));
    const commonWords = this.findCommonWords(words);
    
    if (commonWords.length > 0) {
      return commonWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    return 'Consolidated Documentation';
  }
  
  /**
   * Find common words across titles
   */
  private findCommonWords(wordArrays: string[][]): string[] {
    const wordCounts = new Map<string, number>();
    
    for (const words of wordArrays) {
      const uniqueWords = new Set(words);
      for (const word of uniqueWords) {
        if (word.length > 3) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }
    
    const threshold = wordArrays.length / 2;
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([word, _]) => word)
      .slice(0, 3);
  }
  
  /**
   * Slugify text for anchors
   */
  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  }
  
  /**
   * Extract preview text from content
   */
  private extractPreview(content: string): string {
    // Remove title
    const withoutTitle = content.replace(/^#\s+.+$/m, '').trim();
    
    // Find first paragraph
    const paragraphs = withoutTitle.split('\n\n');
    const firstPara = paragraphs.find(p => 
      p.length > 20 && !p.startsWith('#') && !p.startsWith('-')
    );
    
    if (!firstPara) return '';
    
    // Truncate if too long
    return firstPara.length > 200 
      ? firstPara.substring(0, 200) + '...'
      : firstPara;
  }
}

