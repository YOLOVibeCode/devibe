/**
 * AI API Key Manager
 *
 * Securely stores API keys in user's home directory (.devibe/keys.json)
 * Never commits keys to git, encrypted at rest.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface StoredKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

export class AIKeyManager {
  private keysPath: string;
  private encryptionKey: Buffer;

  constructor() {
    // Store in user's home directory, never in project
    const configDir = path.join(os.homedir(), '.devibe');
    this.keysPath = path.join(configDir, 'ai-keys.enc');

    // Use machine-specific key for encryption
    const machineId = this.getMachineId();
    this.encryptionKey = crypto.scryptSync(machineId, 'salt', 32);
  }

  /**
   * Get a pseudo-unique machine identifier
   */
  private getMachineId(): string {
    return os.hostname() + os.userInfo().username;
  }

  /**
   * Encrypt data
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    const dir = path.dirname(this.keysPath);
    try {
      await fs.mkdir(dir, { recursive: true });
      // Set restrictive permissions (owner only)
      await fs.chmod(dir, 0o700);
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Load all stored keys
   */
  async loadKeys(): Promise<StoredKeys> {
    try {
      const encrypted = await fs.readFile(this.keysPath, 'utf8');
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      // File doesn't exist or can't be read
      return {};
    }
  }

  /**
   * Save all keys
   */
  private async saveKeys(keys: StoredKeys): Promise<void> {
    await this.ensureConfigDir();
    const json = JSON.stringify(keys, null, 2);
    const encrypted = this.encrypt(json);
    await fs.writeFile(this.keysPath, encrypted, { mode: 0o600 }); // Owner read/write only
  }

  /**
   * Add or update an API key
   */
  async setKey(provider: 'anthropic' | 'openai' | 'google', apiKey: string): Promise<void> {
    const keys = await this.loadKeys();
    keys[provider] = apiKey;
    await this.saveKeys(keys);
  }

  /**
   * Get a specific API key
   */
  async getKey(provider: 'anthropic' | 'openai' | 'google'): Promise<string | undefined> {
    const keys = await this.loadKeys();
    return keys[provider];
  }

  /**
   * Remove an API key
   */
  async removeKey(provider: 'anthropic' | 'openai' | 'google'): Promise<void> {
    const keys = await this.loadKeys();
    delete keys[provider];
    await this.saveKeys(keys);
  }

  /**
   * Check which providers have keys configured
   */
  async getConfiguredProviders(): Promise<Array<'anthropic' | 'openai' | 'google'>> {
    const keys = await this.loadKeys();
    return Object.keys(keys).filter(k => keys[k as keyof StoredKeys]) as Array<'anthropic' | 'openai' | 'google'>;
  }

  /**
   * Validate an API key format (basic check)
   */
  validateKeyFormat(provider: 'anthropic' | 'openai' | 'google', key: string): boolean {
    switch (provider) {
      case 'anthropic':
        // sk-ant-api03-...
        return key.startsWith('sk-ant-') && key.length > 20;
      case 'openai':
        // sk-...
        return key.startsWith('sk-') && key.length > 20;
      case 'google':
        // AIza...
        return key.startsWith('AIza') && key.length > 30;
      default:
        return false;
    }
  }

  /**
   * Mask API key for display (show first/last 4 chars)
   */
  maskKey(key: string): string {
    if (key.length < 16) return '***';
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  }

  /**
   * Get storage location (for user info)
   */
  getStorageLocation(): string {
    return this.keysPath;
  }

  /**
   * Check if keys file exists
   */
  async hasStoredKeys(): Promise<boolean> {
    try {
      await fs.access(this.keysPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all keys (for testing or user request)
   */
  async clearAllKeys(): Promise<void> {
    try {
      await fs.unlink(this.keysPath);
    } catch {
      // File doesn't exist, nothing to do
    }
  }

  /**
   * Get key from environment or stored config
   */
  async getKeyWithFallback(provider: 'anthropic' | 'openai' | 'google'): Promise<string | undefined> {
    // First check environment variables
    const envKey = this.getKeyFromEnv(provider);
    if (envKey) return envKey;

    // Then check stored keys
    return await this.getKey(provider);
  }

  /**
   * Get key from environment variable
   */
  private getKeyFromEnv(provider: 'anthropic' | 'openai' | 'google'): string | undefined {
    switch (provider) {
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'google':
        return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    }
  }
}

// Singleton instance
let keyManagerInstance: AIKeyManager | null = null;

export function getKeyManager(): AIKeyManager {
  if (!keyManagerInstance) {
    keyManagerInstance = new AIKeyManager();
  }
  return keyManagerInstance;
}
