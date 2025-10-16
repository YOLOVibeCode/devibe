/**
 * README AI Section Manager
 *
 * Manages the unified "AI Navigation Guide" section in README.md
 * Both DocsIndexGenerator and ScriptsIndexGenerator coordinate through this
 * to maintain a single, comprehensive AI instruction section.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface IndexInfo {
  docsIndex?: string; // e.g., "docs/INDEX.md"
  scriptsIndex?: string; // e.g., "scripts/INDEX.md"
}

export class ReadmeAISectionManager {
  private readonly marker = '<!-- AUTO-INDEX-SECTION -->';

  /**
   * Update or create the unified AI navigation section
   */
  async updateReadme(rootPath: string, indexInfo: IndexInfo): Promise<void> {
    const readmePath = path.join(rootPath, 'README.md');

    let readmeContent: string;
    try {
      readmeContent = await fs.readFile(readmePath, 'utf-8');
    } catch {
      // README doesn't exist, create minimal one
      readmeContent = await this.createMinimalReadme(indexInfo);
      await fs.writeFile(readmePath, readmeContent, 'utf-8');
      return;
    }

    // Remove old separate sections if they exist
    readmeContent = this.removeOldSections(readmeContent);

    // Generate the unified section
    const unifiedSection = this.generateUnifiedSection(indexInfo);

    if (readmeContent.includes(this.marker)) {
      // Replace existing section
      const regex = new RegExp(`${this.marker}[\\s\\S]*?${this.marker}`, 'g');
      readmeContent = readmeContent.replace(regex, unifiedSection);
    } else {
      // Add section after first heading or at the end
      readmeContent = this.insertSection(readmeContent, unifiedSection);
    }

    await fs.writeFile(readmePath, readmeContent, 'utf-8');
  }

  /**
   * Remove old separate AUTO-DOCS-INDEX and AUTO-SCRIPTS-INDEX sections
   */
  private removeOldSections(content: string): string {
    // Remove old docs section
    content = content.replace(/<!-- AUTO-DOCS-INDEX -->[\s\S]*?<!-- AUTO-DOCS-INDEX -->/g, '');

    // Remove old scripts section
    content = content.replace(/<!-- AUTO-SCRIPTS-INDEX -->[\s\S]*?<!-- AUTO-SCRIPTS-INDEX -->/g, '');

    // Clean up multiple empty lines
    content = content.replace(/\n{3,}/g, '\n\n');

    return content;
  }

  /**
   * Get current index information from README
   */
  async getCurrentIndexInfo(rootPath: string): Promise<IndexInfo> {
    const readmePath = path.join(rootPath, 'README.md');

    try {
      const content = await fs.readFile(readmePath, 'utf-8');

      // Extract existing index links (check various folder names)
      const docsMatch = content.match(/(docs?|documents?)\/INDEX\.md/i);
      const scriptsMatch = content.match(/(scripts?|bin|tools)\/INDEX\.md/i);

      return {
        docsIndex: docsMatch ? docsMatch[0] : undefined,
        scriptsIndex: scriptsMatch ? scriptsMatch[0] : undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Generate unified AI navigation section
   */
  private generateUnifiedSection(indexInfo: IndexInfo): string {
    const { docsIndex, scriptsIndex } = indexInfo;

    const lines: string[] = [];
    lines.push(this.marker);
    lines.push('<!--');
    lines.push('🤖 AI ASSISTANT - PROJECT NAVIGATION GUIDE');
    lines.push('============================================');
    lines.push('');
    lines.push('To fully understand and work with this project, follow this systematic approach:');
    lines.push('');

    // Step 1: Documentation
    if (docsIndex) {
      lines.push(`📚 STEP 1 - READ DOCUMENTATION: ${docsIndex}`);
      lines.push('   This is your PRIMARY source for understanding the project:');
      lines.push('   • Complete index of ALL project documentation');
      lines.push('   • Organized by category (specifications, guides, architecture, etc.)');
      lines.push('   • Read specifications FIRST to understand system design');
      lines.push('   • Then read guides for implementation details');
      lines.push('   • Every document is indexed with descriptions and word counts');
      lines.push('   • This is the authoritative source - do not search randomly');
      lines.push('');
    }

    // Step 2: Scripts
    if (scriptsIndex) {
      lines.push(`🔧 STEP 2 - UNDERSTAND AVAILABLE SCRIPTS: ${scriptsIndex}`);
      lines.push('   This index shows you ALL tools and automation:');
      lines.push('   • Categorized by purpose (setup, build, test, deploy, etc.)');
      lines.push('   • Includes usage examples and requirements');
      lines.push('   • Marked with executable status and required arguments');
      lines.push('   • Shows which language each script uses');
      lines.push('');
      lines.push('   ⚡ SCRIPT EXECUTION ORDER:');
      lines.push('   1. Setup scripts - Run FIRST for project initialization');
      lines.push('   2. Build scripts - Compile/build the project');
      lines.push('   3. Test scripts - Verify functionality');
      lines.push('   4. Deploy scripts - Deploy to environments');
      lines.push('');
    }

    // Combined navigation
    if (docsIndex && scriptsIndex) {
      lines.push('🎯 COMPLETE WORKFLOW:');
      lines.push(`   1. Read ${docsIndex} to understand WHAT the project does`);
      lines.push(`   2. Read ${scriptsIndex} to understand HOW to work with it`);
      lines.push('   3. Follow specifications → guides → implementation order');
      lines.push('   4. Use scripts in order: setup → build → test → deploy');
      lines.push('');
    }

    // Additional tips
    lines.push('💡 KEY PRINCIPLES:');
    lines.push('   • Both indexes are auto-generated and always up-to-date');
    lines.push('   • Never search randomly - use the indexes as navigation');
    lines.push('   • Read documentation before writing code');
    lines.push('   • Check scripts before running manual commands');
    lines.push('   • Word counts help prioritize what to read first');
    lines.push('');

    // After reading
    lines.push('✅ AFTER READING BOTH INDEXES:');
    lines.push('   You will have complete knowledge of:');
    lines.push('   • System architecture and design decisions');
    lines.push('   • Implementation details and best practices');
    lines.push('   • All available automation and tooling');
    lines.push('   • Proper setup, build, test, and deployment procedures');
    lines.push('');
    lines.push('============================================');
    lines.push('-->');
    lines.push('');

    // Human-visible section
    lines.push('## 📚 Documentation & Scripts');
    lines.push('');

    if (docsIndex && scriptsIndex) {
      lines.push('**Quick Links:**');
      lines.push(`- 📖 **[Documentation Index](${docsIndex})** - Complete project documentation`);
      lines.push(`- 🔧 **[Scripts Index](${scriptsIndex})** - All available scripts and tools`);
    } else if (docsIndex) {
      lines.push(`Browse the complete **[Documentation Index](${docsIndex})** for all project documentation.`);
    } else if (scriptsIndex) {
      lines.push(`Browse the complete **[Scripts Index](${scriptsIndex})** for all available scripts.`);
    }

    lines.push('');
    lines.push(this.marker);

    return lines.join('\n');
  }

  /**
   * Create minimal README with index links
   */
  private async createMinimalReadme(indexInfo: IndexInfo): Promise<string> {
    const unifiedSection = this.generateUnifiedSection(indexInfo);

    return `# Project\n\n${unifiedSection}\n`;
  }

  /**
   * Insert section into README at appropriate location
   */
  private insertSection(content: string, section: string): string {
    const lines = content.split('\n');
    let insertIndex = -1;

    // Find first heading
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^#\s+/)) {
        // Insert after first heading and any immediate content
        insertIndex = i + 1;
        // Skip empty lines
        while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
          insertIndex++;
        }
        // Skip first paragraph if exists
        while (insertIndex < lines.length && lines[insertIndex].trim() !== '') {
          insertIndex++;
        }
        break;
      }
    }

    if (insertIndex === -1) {
      // No heading found, append at end
      return content + `\n\n${section}`;
    } else {
      lines.splice(insertIndex, 0, '', section, '');
      return lines.join('\n');
    }
  }
}
