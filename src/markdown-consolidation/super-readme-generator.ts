/**
 * Super README Generator
 * 
 * Creates documentation hub with categorized navigation.
 */

import { MarkdownFile } from './types';

export class SuperReadmeGenerator {
  /**
   * Generate super README with categorized navigation
   */
  async generate(files: MarkdownFile[], existingReadme?: MarkdownFile): Promise<string> {
    const sections: string[] = [];
    
    sections.push('# Documentation Hub');
    sections.push('');
    sections.push('*Consolidated navigation for all project documentation*');
    sections.push('');
    sections.push('---');
    sections.push('');
    
    if (existingReadme) {
      sections.push('## Main Documentation');
      sections.push('');
      sections.push('📖 [Project README](./README.md) - Start here for overview');
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    const categorized = this.categorizeFiles(files);
    
    for (const [categoryName, categoryFiles] of Object.entries(categorized)) {
      if (categoryFiles.length === 0) continue;
      
      const icon = this.getCategoryIcon(categoryName);
      sections.push(`## ${icon} ${categoryName}`);
      sections.push('');
      
      for (const file of categoryFiles) {
        sections.push(`### [${file.metadata.title}](${file.relativePath})`);
        sections.push('');
        sections.push(`*${file.metadata.wordCount} words · ${this.formatDate(file.lastModified)}*`);
        sections.push('');
      }
    }
    
    sections.push('---');
    sections.push('');
    sections.push(`*This index was automatically generated on ${new Date().toLocaleDateString()}*`);
    
    return sections.join('\n');
  }
  
  /**
   * Categorize files into logical groups
   */
  private categorizeFiles(files: MarkdownFile[]): Record<string, MarkdownFile[]> {
    const categories: Record<string, MarkdownFile[]> = {
      'Architecture & Design': [],
      'Guides & Tutorials': [],
      'API Reference': [],
      'Development': [],
      'Planning & Notes': [],
      'Other': []
    };
    
    for (const file of files) {
      const category = this.determineCategory(file);
      categories[category].push(file);
    }
    
    return categories;
  }
  
  /**
   * Determine category for a file
   */
  private determineCategory(file: MarkdownFile): string {
    const title = file.metadata.title.toLowerCase();
    const pathLower = file.relativePath.toLowerCase();
    
    if (pathLower.includes('/specs/') || title.includes('architecture') || title.includes('design')) {
      return 'Architecture & Design';
    }
    if (pathLower.includes('/guides/') || title.includes('guide') || title.includes('tutorial')) {
      return 'Guides & Tutorials';
    }
    if (pathLower.includes('/api/') || title.includes('api') || title.includes('reference')) {
      return 'API Reference';
    }
    if (title.includes('development') || title.includes('coding')) {
      return 'Development';
    }
    if (title.includes('note') || title.includes('planning')) {
      return 'Planning & Notes';
    }
    
    return 'Other';
  }
  
  /**
   * Get icon for category
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Architecture & Design': '🏗️',
      'Guides & Tutorials': '📚',
      'API Reference': '🔌',
      'Development': '💻',
      'Planning & Notes': '📝',
      'Other': '📄'
    };
    return icons[category] || '📄';
  }
  
  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  }
}




