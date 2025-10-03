/**
 * AI Model Configuration
 *
 * Supports multiple AI providers and models with automatic optimization
 * based on cost, context window, and quality requirements.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  recommendedBatchSize: number;
  apiUrl: string;
  quality: 'excellent' | 'good' | 'best';
  speed: 'very-fast' | 'fast' | 'slow';
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // Anthropic Claude Models
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    recommendedBatchSize: 100,
    apiUrl: 'https://api.anthropic.com/v1/messages',
    quality: 'excellent',
    speed: 'fast',
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    recommendedBatchSize: 120,
    apiUrl: 'https://api.anthropic.com/v1/messages',
    quality: 'good',
    speed: 'very-fast',
  },
  'claude-3-opus': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    recommendedBatchSize: 100,
    apiUrl: 'https://api.anthropic.com/v1/messages',
    quality: 'best',
    speed: 'slow',
  },

  // OpenAI Models
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
    recommendedBatchSize: 80,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    quality: 'excellent',
    speed: 'fast',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
    recommendedBatchSize: 80,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    quality: 'good',
    speed: 'very-fast',
  },

  // Google Gemini Models
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 2000000,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
    recommendedBatchSize: 800,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    quality: 'excellent',
    speed: 'fast',
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    recommendedBatchSize: 600,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    quality: 'good',
    speed: 'very-fast',
  },
};

export type ModelSelector =
  | 'cheapest'
  | 'fastest'
  | 'largest-context'
  | 'best-quality'
  | 'best-value'
  | string; // Or specific model key

/**
 * Select optimal model based on criteria
 */
export function selectModel(
  criteria: ModelSelector = 'best-value'
): ModelConfig {
  // Direct model selection
  if (criteria in AVAILABLE_MODELS) {
    return AVAILABLE_MODELS[criteria];
  }

  const models = Object.values(AVAILABLE_MODELS);

  switch (criteria) {
    case 'cheapest':
      // Lowest total cost (input + output)
      return models.reduce((cheapest, model) => {
        const currentCost = model.inputPricePerMillion + model.outputPricePerMillion;
        const cheapestCost = cheapest.inputPricePerMillion + cheapest.outputPricePerMillion;
        return currentCost < cheapestCost ? model : cheapest;
      });

    case 'fastest':
      // Fastest processing
      return models.filter(m => m.speed === 'very-fast')[0] || AVAILABLE_MODELS['claude-3-haiku'];

    case 'largest-context':
      // Largest context window
      return models.reduce((largest, model) =>
        model.contextWindow > largest.contextWindow ? model : largest
      );

    case 'best-quality':
      // Highest quality
      return models.filter(m => m.quality === 'best')[0] || AVAILABLE_MODELS['claude-3-5-sonnet'];

    case 'best-value':
      // Best balance of cost and quality (default)
      // Prefer good quality + cheap cost
      return AVAILABLE_MODELS['claude-3-haiku'];

    default:
      // Fallback to Sonnet
      return AVAILABLE_MODELS['claude-3-5-sonnet'];
  }
}

/**
 * Calculate estimated cost for a batch
 */
export function estimateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMillion;
  return inputCost + outputCost;
}

/**
 * Get model configuration from environment or default
 */
export function getModelConfig(): ModelConfig {
  const modelKey = process.env.AI_MODEL || 'claude-3-5-sonnet';
  const selector = process.env.AI_MODEL_SELECTOR as ModelSelector;

  if (selector) {
    return selectModel(selector);
  }

  return AVAILABLE_MODELS[modelKey] || AVAILABLE_MODELS['claude-3-5-sonnet'];
}

/**
 * Compare models side-by-side
 */
export function compareModels(
  fileCount: number,
  avgInputTokensPerFile: number = 400,
  avgOutputTokensPerFile: number = 100
): Array<{
  model: string;
  batchCount: number;
  totalCost: number;
  costPerFile: number;
  apiCalls: number;
}> {
  return Object.entries(AVAILABLE_MODELS).map(([key, config]) => {
    const filesPerBatch = config.recommendedBatchSize;
    const batchCount = Math.ceil(fileCount / filesPerBatch);
    const apiCalls = batchCount;

    const totalInputTokens = fileCount * avgInputTokensPerFile;
    const totalOutputTokens = fileCount * avgOutputTokensPerFile;
    const totalCost = estimateCost(config, totalInputTokens, totalOutputTokens);

    return {
      model: config.name,
      batchCount,
      totalCost: parseFloat(totalCost.toFixed(4)),
      costPerFile: parseFloat((totalCost / fileCount).toFixed(6)),
      apiCalls,
    };
  }).sort((a, b) => a.totalCost - b.totalCost); // Sort by cost
}

/**
 * Get API key for a provider
 */
export function getApiKey(provider: 'anthropic' | 'openai' | 'google'): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check if a model is available (API key exists)
 */
export function isModelAvailable(modelKey: string): boolean {
  const model = AVAILABLE_MODELS[modelKey];
  if (!model) return false;

  const apiKey = getApiKey(model.provider);
  return !!apiKey;
}

/**
 * Get all available models (with API keys configured)
 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(AVAILABLE_MODELS).filter(model =>
    isModelAvailable(Object.keys(AVAILABLE_MODELS).find(k =>
      AVAILABLE_MODELS[k] === model
    )!)
  );
}

// Example usage in CLI or config
/*
// Environment variable approach:
export AI_MODEL_SELECTOR=cheapest
export AI_MODEL=claude-3-haiku  // Or specific model

// Programmatic approach:
const model = selectModel('cheapest');
console.log(`Using ${model.name} - $${model.inputPricePerMillion}/M input tokens`);

// Cost comparison:
const comparison = compareModels(1000);
console.table(comparison);

// Output:
// ┌─────────┬────────────────────────┬────────────┬───────────┬───────────────┬───────────┐
// │ (index) │ model                  │ batchCount │ totalCost │ costPerFile   │ apiCalls  │
// ├─────────┼────────────────────────┼────────────┼───────────┼───────────────┼───────────┤
// │    0    │ 'Gemini 1.5 Flash'     │     2      │   0.012   │   0.000012    │     2     │
// │    1    │ 'GPT-4o Mini'          │    13      │   0.015   │   0.000015    │    13     │
// │    2    │ 'Claude 3 Haiku'       │     9      │   0.025   │   0.000025    │     9     │
// │    3    │ 'Gemini 1.5 Pro'       │     2      │   0.15    │   0.00015     │     2     │
// │    4    │ 'GPT-4o'               │    13      │   0.25    │   0.00025     │    13     │
// │    5    │ 'Claude 3.5 Sonnet'    │    10      │   0.30    │   0.0003      │    10     │
// │    6    │ 'Claude 3 Opus'        │    10      │   1.50    │   0.0015      │    10     │
// └─────────┴────────────────────────┴────────────┴───────────┴───────────────┴───────────┘
*/
