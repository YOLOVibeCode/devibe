/**
 * User Preferences Manager
 *
 * Stores user preferences and choices in ~/.devibe/preferences.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface UserPreferences {
  aiAnalysisPrompted?: boolean;
  aiAnalysisDeclineCount?: number;
  lastPromptDate?: string;
  apiKeyPromptDisabled?: boolean;
  apiKeyPromptDeclineCount?: number;
  version?: string;
}

export class PreferencesManager {
  private preferencesPath: string;
  private preferences: UserPreferences = {};

  constructor() {
    const configDir = path.join(os.homedir(), '.devibe');
    this.preferencesPath = path.join(configDir, 'preferences.json');
  }

  /**
   * Load preferences from disk
   */
  async load(): Promise<UserPreferences> {
    try {
      const data = await fs.readFile(this.preferencesPath, 'utf-8');
      this.preferences = JSON.parse(data);
      return this.preferences;
    } catch (error) {
      // File doesn't exist or is invalid, return empty preferences
      this.preferences = {};
      return this.preferences;
    }
  }

  /**
   * Save preferences to disk
   */
  async save(): Promise<void> {
    try {
      const configDir = path.dirname(this.preferencesPath);
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        this.preferencesPath,
        JSON.stringify(this.preferences, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Get a preference value
   */
  async get<K extends keyof UserPreferences>(
    key: K
  ): Promise<UserPreferences[K] | undefined> {
    await this.load();
    return this.preferences[key];
  }

  /**
   * Set a preference value
   */
  async set<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    await this.load();
    this.preferences[key] = value;
    await this.save();
  }

  /**
   * Check if user has been prompted for AI analysis
   */
  async hasBeenPromptedForAIAnalysis(): Promise<boolean> {
    const prompted = await this.get('aiAnalysisPrompted');
    return prompted === true;
  }

  /**
   * Check if we should ask about AI analysis
   * Returns true if we haven't asked twice yet
   */
  async shouldPromptForAIAnalysis(): Promise<boolean> {
    await this.load();
    const declineCount = this.preferences.aiAnalysisDeclineCount || 0;
    return declineCount < 2;
  }

  /**
   * Mark that user has been prompted and accepted
   */
  async markAIAnalysisAccepted(): Promise<void> {
    await this.load();
    this.preferences.aiAnalysisPrompted = true;
    await this.save();
  }

  /**
   * Increment decline count
   */
  async incrementAIAnalysisDecline(): Promise<void> {
    await this.load();
    const currentCount = this.preferences.aiAnalysisDeclineCount || 0;
    this.preferences.aiAnalysisDeclineCount = currentCount + 1;
    this.preferences.lastPromptDate = new Date().toISOString();
    await this.save();
  }

  /**
   * Reset AI analysis prompt state (for testing or user request)
   */
  async resetAIAnalysisPrompt(): Promise<void> {
    await this.load();
    delete this.preferences.aiAnalysisPrompted;
    delete this.preferences.aiAnalysisDeclineCount;
    delete this.preferences.lastPromptDate;
    await this.save();
  }

  /**
   * Check if we should prompt for API key setup
   * Returns true if user hasn't disabled it and hasn't declined twice
   */
  async shouldPromptForAPIKey(): Promise<boolean> {
    await this.load();
    if (this.preferences.apiKeyPromptDisabled) {
      return false;
    }
    const declineCount = this.preferences.apiKeyPromptDeclineCount || 0;
    return declineCount < 2;
  }

  /**
   * Increment API key prompt decline count
   */
  async incrementAPIKeyPromptDecline(): Promise<void> {
    await this.load();
    const currentCount = this.preferences.apiKeyPromptDeclineCount || 0;
    this.preferences.apiKeyPromptDeclineCount = currentCount + 1;

    // After 2 declines, disable future prompts
    if (currentCount + 1 >= 2) {
      this.preferences.apiKeyPromptDisabled = true;
    }

    await this.save();
  }

  /**
   * Disable API key prompts permanently
   */
  async disableAPIKeyPrompt(): Promise<void> {
    await this.load();
    this.preferences.apiKeyPromptDisabled = true;
    await this.save();
  }

  /**
   * Reset API key prompt state (for testing or user request)
   */
  async resetAPIKeyPrompt(): Promise<void> {
    await this.load();
    delete this.preferences.apiKeyPromptDisabled;
    delete this.preferences.apiKeyPromptDeclineCount;
    await this.save();
  }

  /**
   * Get all preferences
   */
  async getAll(): Promise<UserPreferences> {
    await this.load();
    return { ...this.preferences };
  }
}

// Singleton instance
let instance: PreferencesManager | null = null;

export function getPreferencesManager(): PreferencesManager {
  if (!instance) {
    instance = new PreferencesManager();
  }
  return instance;
}
