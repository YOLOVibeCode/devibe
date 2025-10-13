/**
 * Consolidation Validator
 * 
 * Validates safety and content preservation during consolidation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MarkdownFile, ValidationResult } from './types';

export class ConsolidationValidator {
  /**
   * Validate consolidation results
   */
  async validate(
    originalFiles: MarkdownFile[],
    consolidatedFiles: string[]
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check files exist
    for (const file of consolidatedFiles) {
      try {
        await fs.access(file);
      } catch {
        errors.push(`Consolidated file not created: ${file}`);
      }
    }
    
    // Check content preservation
    const originalWordCount = originalFiles.reduce(
      (sum, f) => sum + f.metadata.wordCount,
      0
    );
    
    let consolidatedWordCount = 0;
    for (const file of consolidatedFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        consolidatedWordCount += content.split(/\s+/).length;
      } catch {
        // File doesn't exist, already logged above
      }
    }
    
    const loss = (originalWordCount - consolidatedWordCount) / originalWordCount;
    if (loss > 0.3) {
      errors.push(`Significant content loss: ${Math.round(loss * 100)}%`);
    } else if (loss > 0.1) {
      warnings.push(`Moderate content reduction: ${Math.round(loss * 100)}%`);
    }
    
    // Check links
    for (const file of consolidatedFiles) {
      const brokenLinks = await this.findBrokenLinks(file);
      if (brokenLinks.length > 0) {
        warnings.push(`Broken links in ${path.basename(file)}: ${brokenLinks.length} found`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Find broken links in a file
   */
  private async findBrokenLinks(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const links = Array.from(content.matchAll(/\[.*?\]\((.*?)\)/g), m => m[1]);
      const brokenLinks: string[] = [];
      const dir = path.dirname(filePath);
      
      for (const link of links) {
        if (link.startsWith('http') || link.startsWith('#')) {
          continue;
        }
        
        const targetPath = path.resolve(dir, link);
        try {
          await fs.access(targetPath);
        } catch {
          brokenLinks.push(link);
        }
      }
      
      return brokenLinks;
    } catch {
      return [];
    }
  }
}




