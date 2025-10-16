/**
 * Convention Configuration Loader
 *
 * Loads and merges convention rules from:
 * 1. Default preset
 * 2. User's .deviberc.json (project root)
 * 3. User's ~/.devibe/config.json (global)
 * 4. CLI flags (highest priority)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  DevibeConfig,
  ConventionRules,
  CONVENTION_PRESETS,
  DEFAULT_CONVENTION_RULES,
} from './convention-rules.js';

export class ConventionConfigLoader {
  /**
   * Load effective configuration for a project
   */
  async load(projectPath: string, cliOptions?: Partial<DevibeConfig>): Promise<DevibeConfig> {
    // Start with defaults
    let config: DevibeConfig = {
      preset: 'balanced',
      conventions: { ...DEFAULT_CONVENTION_RULES },
      autoMode: {
        applyConventions: false, // Conservative by default
        requireConfirmation: true,
      },
      excludePatterns: [],
      excludeFolders: ['node_modules', 'vendor', '.git'],
    };

    // Load global config
    const globalConfig = await this.loadGlobalConfig();
    if (globalConfig) {
      config = this.mergeConfigs(config, globalConfig);
    }

    // Load project config
    const projectConfig = await this.loadProjectConfig(projectPath);
    if (projectConfig) {
      config = this.mergeConfigs(config, projectConfig);
    }

    // Apply CLI overrides
    if (cliOptions) {
      config = this.mergeConfigs(config, cliOptions);
    }

    // Apply preset if specified
    if (config.preset && CONVENTION_PRESETS[config.preset]) {
      const presetRules = CONVENTION_PRESETS[config.preset];
      config.conventions = this.mergeConventionRules(presetRules, config.conventions || {});
    }

    return config;
  }

  /**
   * Load global config from ~/.devibe/config.json
   */
  private async loadGlobalConfig(): Promise<DevibeConfig | null> {
    const configPath = path.join(os.homedir(), '.devibe', 'config.json');
    return this.loadConfigFile(configPath);
  }

  /**
   * Load project config from .deviberc.json or .deviberc
   */
  private async loadProjectConfig(projectPath: string): Promise<DevibeConfig | null> {
    // Try .deviberc.json first
    let config = await this.loadConfigFile(path.join(projectPath, '.deviberc.json'));
    if (config) return config;

    // Try .deviberc (JSON without extension)
    config = await this.loadConfigFile(path.join(projectPath, '.deviberc'));
    if (config) return config;

    // Try package.json devibe field
    return this.loadFromPackageJson(projectPath);
  }

  /**
   * Load config from package.json "devibe" field
   */
  private async loadFromPackageJson(projectPath: string): Promise<DevibeConfig | null> {
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const pkgContent = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);

      if (pkg.devibe) {
        return pkg.devibe as DevibeConfig;
      }
    } catch {
      // No package.json or no devibe field
    }

    return null;
  }

  /**
   * Load config from file
   */
  private async loadConfigFile(filePath: string): Promise<DevibeConfig | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as DevibeConfig;
      return config;
    } catch {
      // File doesn't exist or invalid JSON
      return null;
    }
  }

  /**
   * Merge two configs (later overrides earlier)
   */
  private mergeConfigs(base: DevibeConfig, override: Partial<DevibeConfig>): DevibeConfig {
    return {
      preset: override.preset ?? base.preset,
      conventions: this.mergeConventionRules(base.conventions || {}, override.conventions || {}),
      autoMode: {
        applyConventions: override.autoMode?.applyConventions ?? base.autoMode?.applyConventions ?? false,
        requireConfirmation: override.autoMode?.requireConfirmation ?? base.autoMode?.requireConfirmation ?? true,
      },
      excludePatterns: [
        ...(base.excludePatterns || []),
        ...(override.excludePatterns || []),
      ],
      excludeFolders: [
        ...(base.excludeFolders || []),
        ...(override.excludeFolders || []),
      ],
    };
  }

  /**
   * Deep merge convention rules
   */
  private mergeConventionRules(
    base: Partial<ConventionRules>,
    override: Partial<ConventionRules>
  ): Partial<ConventionRules> {
    const merged: Partial<ConventionRules> = { ...base };

    for (const [category, rules] of Object.entries(override)) {
      if (rules && typeof rules === 'object') {
        merged[category as keyof ConventionRules] = {
          ...(merged[category as keyof ConventionRules] || {}),
          ...rules,
        } as any;
      }
    }

    return merged;
  }

  /**
   * Create example .deviberc.json file
   */
  async createExampleConfig(projectPath: string, preset: 'minimal' | 'balanced' | 'strict'): Promise<void> {
    const config: DevibeConfig = {
      preset,
      conventions: {
        // Users can customize any rule here
        // Example: disable build artifact cleanup
        // buildArtifacts: {
        //   autoCleanup: { enabled: false, severity: 'info', autofix: false }
        // }
      },
      autoMode: {
        applyConventions: preset === 'strict',
        requireConfirmation: preset !== 'strict',
      },
      excludeFolders: ['node_modules', 'vendor', '.git'],
    };

    const configPath = path.join(projectPath, '.deviberc.json');
    const content = JSON.stringify(config, null, 2);

    await fs.writeFile(configPath, content, 'utf-8');
  }

  /**
   * Validate configuration
   */
  validateConfig(config: DevibeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate preset
    if (config.preset && !CONVENTION_PRESETS[config.preset]) {
      errors.push(`Invalid preset: ${config.preset}. Must be 'minimal', 'balanced', or 'strict'.`);
    }

    // Validate convention rules
    if (config.conventions) {
      for (const [category, rules] of Object.entries(config.conventions)) {
        if (rules && typeof rules === 'object') {
          for (const [ruleName, ruleConfig] of Object.entries(rules)) {
            if (typeof ruleConfig === 'object' && 'severity' in ruleConfig) {
              const severity = (ruleConfig as any).severity;
              if (!['error', 'warning', 'info'].includes(severity)) {
                errors.push(`Invalid severity '${severity}' in ${category}.${ruleName}`);
              }
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get human-readable config summary
   */
  getSummary(config: DevibeConfig): string {
    const lines: string[] = [];

    lines.push('📋 Convention Configuration:');
    lines.push('═══════════════════════════════════════');
    lines.push('');

    lines.push(`Preset: ${config.preset || 'custom'}`);
    lines.push(`Auto-apply: ${config.autoMode?.applyConventions ? '✓' : '✗'}`);
    lines.push(`Require confirmation: ${config.autoMode?.requireConfirmation ? '✓' : '✗'}`);
    lines.push('');

    // Count enabled rules
    const counts = this.countEnabledRules(config.conventions || {});
    lines.push('Enabled Rules:');
    for (const [category, count] of Object.entries(counts)) {
      if (count > 0) {
        lines.push(`  • ${category}: ${count} rule(s)`);
      }
    }

    if (config.excludeFolders && config.excludeFolders.length > 0) {
      lines.push('');
      lines.push(`Excluded folders: ${config.excludeFolders.join(', ')}`);
    }

    lines.push('═══════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Count enabled rules per category
   */
  private countEnabledRules(conventions: Partial<ConventionRules>): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const [category, rules] of Object.entries(conventions)) {
      let count = 0;
      if (rules && typeof rules === 'object') {
        for (const ruleConfig of Object.values(rules)) {
          if (typeof ruleConfig === 'object' && 'enabled' in ruleConfig && ruleConfig.enabled) {
            count++;
          }
        }
      }
      counts[category] = count;
    }

    return counts;
  }
}

// Singleton instance
let configLoader: ConventionConfigLoader | null = null;

export function getConfigLoader(): ConventionConfigLoader {
  if (!configLoader) {
    configLoader = new ConventionConfigLoader();
  }
  return configLoader;
}
