import * as fs from 'fs/promises';
import * as path from 'path';
import type { ScriptType, ScriptClassification, ICanClassifyScripts } from './types.js';

export class ScriptClassifier implements ICanClassifyScripts {
  private buildKeywords = ['build', 'compile', 'webpack', 'tsc', 'make', 'maven', 'gradle'];
  private testKeywords = ['test', 'spec', 'jest', 'mocha', 'vitest', 'pytest', 'rspec'];
  private deployKeywords = ['deploy', 'release', 'publish', 'kubectl', 'docker push', 'heroku', 'aws s3', 'rsync'];
  private migrationKeywords = ['migration', 'migrate', 'ALTER TABLE', 'CREATE TABLE', 'DROP TABLE'];

  async classifyScript(scriptPath: string): Promise<ScriptClassification> {
    const basename = path.basename(scriptPath);
    const content = await fs.readFile(scriptPath, 'utf-8');

    // Check filename first
    const filenameResult = this.classifyByFilename(basename);
    if (filenameResult.type !== 'unknown' && filenameResult.confidence > 0.7) {
      return {
        path: scriptPath,
        ...filenameResult,
      };
    }

    // Check content
    const contentResult = this.classifyByContent(content);
    if (contentResult.type !== 'unknown') {
      return {
        path: scriptPath,
        ...contentResult,
      };
    }

    // Default to utility, but preserve shebang info if found
    const lines = content.split('\n');
    const hasShebang = lines[0].startsWith('#!');

    return {
      path: scriptPath,
      type: 'utility',
      confidence: 0.5,
      reasoning: hasShebang
        ? `Script with shebang: ${lines[0]} - No specific patterns detected, classified as utility`
        : 'No specific patterns detected, classified as utility',
    };
  }

  private classifyByFilename(
    filename: string
  ): { type: ScriptType; confidence: number; reasoning: string } {
    const lower = filename.toLowerCase();

    if (lower.includes('build')) {
      return {
        type: 'build',
        confidence: 0.8,
        reasoning: 'Filename contains "build"',
      };
    }

    if (lower.includes('test')) {
      return {
        type: 'test',
        confidence: 0.8,
        reasoning: 'Filename contains "test"',
      };
    }

    if (lower.includes('deploy')) {
      return {
        type: 'deploy',
        confidence: 0.8,
        reasoning: 'Filename contains "deploy"',
      };
    }

    if (lower.match(/\d{3,}_.*\.(sql|js|py)/)) {
      return {
        type: 'migration',
        confidence: 0.9,
        reasoning: 'Filename matches migration pattern',
      };
    }

    return { type: 'unknown', confidence: 0.3, reasoning: 'No filename match' };
  }

  private classifyByContent(
    content: string
  ): { type: ScriptType; confidence: number; reasoning: string } {
    const lower = content.toLowerCase();
    const lines = content.split('\n');

    // Check shebang
    let reasoning = '';
    if (lines[0].startsWith('#!')) {
      reasoning = `Script with shebang: ${lines[0]}`;
    }

    // Count keyword matches
    const buildMatches = this.countKeywordMatches(lower, this.buildKeywords);
    const testMatches = this.countKeywordMatches(lower, this.testKeywords);
    const deployMatches = this.countKeywordMatches(lower, this.deployKeywords);
    const migrationMatches = this.countKeywordMatches(lower, this.migrationKeywords);

    const max = Math.max(buildMatches, testMatches, deployMatches, migrationMatches);

    if (max === 0) {
      return { type: 'unknown', confidence: 0.3, reasoning: 'No keyword matches' };
    }

    if (buildMatches === max) {
      return {
        type: 'build',
        confidence: Math.min(0.9, 0.6 + buildMatches * 0.1),
        reasoning: `${reasoning} Build keywords: ${buildMatches}`,
      };
    }

    if (testMatches === max) {
      return {
        type: 'test',
        confidence: Math.min(0.9, 0.6 + testMatches * 0.1),
        reasoning: `${reasoning} Test keywords: ${testMatches}`,
      };
    }

    if (deployMatches === max) {
      return {
        type: 'deploy',
        confidence: Math.min(0.9, 0.6 + deployMatches * 0.1),
        reasoning: `${reasoning} Deploy keywords: ${deployMatches}`,
      };
    }

    if (migrationMatches === max) {
      return {
        type: 'migration',
        confidence: Math.min(0.9, 0.6 + migrationMatches * 0.1),
        reasoning: `${reasoning} Migration keywords: ${migrationMatches}`,
      };
    }

    return { type: 'unknown', confidence: 0.3, reasoning };
  }

  private countKeywordMatches(content: string, keywords: string[]): number {
    return keywords.filter((keyword) => content.includes(keyword.toLowerCase())).length;
  }
}
