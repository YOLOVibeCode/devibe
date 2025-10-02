import * as fs from 'fs/promises';
import type {
  SecretFinding,
  SecretScanResult,
  ICanScanForSecrets,
  ICanMatchSecretPatterns,
  ICanAnalyzeEntropy,
} from './types.js';
import { BUILT_IN_PATTERNS } from './secret-patterns.js';

export class SecretScanner
  implements ICanScanForSecrets, ICanMatchSecretPatterns, ICanAnalyzeEntropy
{
  async scanFiles(files: string[]): Promise<SecretScanResult> {
    const startTime = Date.now();
    const allFindings: SecretFinding[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const findings = this.matchPatterns(content, file);
      allFindings.push(...findings);
    }

    const summary = {
      critical: allFindings.filter((f) => f.severity === 'critical').length,
      high: allFindings.filter((f) => f.severity === 'high').length,
      medium: allFindings.filter((f) => f.severity === 'medium').length,
      low: allFindings.filter((f) => f.severity === 'low').length,
    };

    return {
      filesScanned: files.length,
      secretsFound: allFindings.length,
      duration: Date.now() - startTime,
      findings: allFindings,
      summary,
    };
  }

  matchPatterns(content: string, file: string = ''): SecretFinding[] {
    const findings: SecretFinding[] = [];
    const lines = content.split('\n');

    for (const pattern of BUILT_IN_PATTERNS) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
        let match;

        while ((match = regex.exec(line)) !== null) {
          const matchedText = match[0];
          const context = this.truncateContext(line, matchedText);

          findings.push({
            file,
            line: lineIndex + 1,
            column: match.index + 1,
            type: pattern.name,
            pattern: pattern.id,
            severity: pattern.severity,
            context,
            recommendation: pattern.recommendation,
            confidence: 0.9,
          });
        }
      }
    }

    return findings;
  }

  private truncateContext(line: string, secret: string): string {
    const maxLength = 80;
    const replacement = '****';

    // Replace the secret with asterisks
    let truncated = line.replace(secret, secret.substring(0, 8) + replacement);

    // Truncate if too long
    if (truncated.length > maxLength) {
      truncated = truncated.substring(0, maxLength) + '...';
    }

    return truncated.trim();
  }

  hasHighEntropy(value: string): boolean {
    const entropy = this.calculateEntropy(value);
    return entropy > 4.0;
  }

  calculateEntropy(value: string): number {
    if (value.length === 0) return 0;

    const frequencies = new Map<string, number>();

    // Count character frequencies
    for (const char of value) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    // Calculate Shannon entropy
    let entropy = 0;
    const length = value.length;

    for (const count of frequencies.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }
}
