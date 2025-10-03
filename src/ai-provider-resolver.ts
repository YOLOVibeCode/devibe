/**
 * AI Provider Resolver
 *
 * Determines which AI provider and model to use based on:
 * 1. Explicitly configured devibe AI key (primary)
 * 2. Environment variables (fallback)
 * 3. Model selection (AI_MODEL env var or config)
 */

import { getKeyManager } from './ai-key-manager.js';
import { AVAILABLE_MODELS, type ModelConfig } from './ai-model-config.js';

export interface ResolvedProvider {
  provider: 'anthropic' | 'openai' | 'google';
  model: ModelConfig;
  apiKey: string;
  source: 'devibe-config' | 'environment' | 'default';
}

export class AIProviderResolver {
  /**
   * Resolve which provider and model to use
   * Returns null if no API keys are available
   */
  async resolve(): Promise<ResolvedProvider | null> {
    const keyManager = getKeyManager();

    // Step 1: Check if user explicitly set AI_MODEL
    const explicitModel = process.env.AI_MODEL;
    if (explicitModel && explicitModel in AVAILABLE_MODELS) {
      const model = AVAILABLE_MODELS[explicitModel];

      // Try devibe-stored key first
      let apiKey = await keyManager.getKey(model.provider);
      let source: 'devibe-config' | 'environment' = 'devibe-config';

      // Fallback to environment
      if (!apiKey) {
        apiKey = this.getEnvKey(model.provider);
        source = 'environment';
      }

      if (apiKey) {
        return { provider: model.provider, model, apiKey, source };
      }
    }

    // Step 2: Check devibe-configured keys (primary source)
    const configuredProviders = await keyManager.getConfiguredProviders();

    if (configuredProviders.length > 0) {
      // Prioritize: Google (cheapest) > Anthropic > OpenAI
      const preferredOrder: Array<'google' | 'anthropic' | 'openai'> = ['google', 'anthropic', 'openai'];

      for (const provider of preferredOrder) {
        if (configuredProviders.includes(provider)) {
          const apiKey = await keyManager.getKey(provider);
          if (apiKey) {
            // Get best model for this provider
            const model = this.getBestModelForProvider(provider);
            return { provider, model, apiKey, source: 'devibe-config' };
          }
        }
      }
    }

    // Step 3: Fallback to environment variables
    const envProviders: Array<'anthropic' | 'openai' | 'google'> = ['anthropic', 'openai', 'google'];

    for (const provider of envProviders) {
      const apiKey = this.getEnvKey(provider);
      if (apiKey) {
        const model = this.getBestModelForProvider(provider);
        return { provider, model, apiKey, source: 'environment' };
      }
    }

    // Step 4: No keys available
    return null;
  }

  /**
   * Get environment variable for provider
   */
  private getEnvKey(provider: 'anthropic' | 'openai' | 'google'): string | undefined {
    switch (provider) {
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'google':
        return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    }
  }

  /**
   * Get the best (cheapest good quality) model for a provider
   */
  private getBestModelForProvider(provider: string): ModelConfig {
    const providerModels = Object.values(AVAILABLE_MODELS).filter(m => m.provider === provider);

    // Sort by price (cheapest first) but exclude "best" quality (too expensive)
    const affordable = providerModels.filter(m => m.quality !== 'best');
    affordable.sort((a, b) => a.inputPricePerMillion - b.inputPricePerMillion);

    // Return cheapest affordable model, or first available
    return affordable[0] || providerModels[0];
  }

  /**
   * Check if any AI provider is available
   */
  async isAvailable(): Promise<boolean> {
    const resolved = await this.resolve();
    return resolved !== null;
  }

  /**
   * Get a human-readable description of the resolved provider
   */
  async getProviderDescription(): Promise<string | null> {
    const resolved = await this.resolve();
    if (!resolved) return null;

    const sourceLabel = resolved.source === 'devibe-config'
      ? 'configured in devibe'
      : 'from environment variable';

    return `${resolved.model.name} (${sourceLabel})`;
  }

  /**
   * Log which provider/model is being used (for debugging)
   */
  async logProviderInfo(verbose: boolean = false): Promise<void> {
    const resolved = await this.resolve();

    if (!resolved) {
      if (verbose) {
        console.log('   ℹ️  AI classification: Not available (no API keys)');
      }
      return;
    }

    if (verbose) {
      const sourceIcon = resolved.source === 'devibe-config' ? '🔧' : '🔑';
      console.log(`   ${sourceIcon} AI: ${resolved.model.name}`);
      console.log(`      Provider: ${resolved.provider}`);
      console.log(`      Source: ${resolved.source === 'devibe-config' ? 'DevIbe config' : 'Environment variable'}`);
      console.log(`      Context: ${resolved.model.contextWindow.toLocaleString()} tokens`);
      console.log(`      Cost: $${resolved.model.inputPricePerMillion}/M input`);
    } else {
      const sourceLabel = resolved.source === 'devibe-config' ? '(configured)' : '(env)';
      console.log(`   ℹ️  Using AI: ${resolved.model.name} ${sourceLabel}`);
    }
  }
}

// Singleton instance
let resolverInstance: AIProviderResolver | null = null;

export function getAIResolver(): AIProviderResolver {
  if (!resolverInstance) {
    resolverInstance = new AIProviderResolver();
  }
  return resolverInstance;
}
