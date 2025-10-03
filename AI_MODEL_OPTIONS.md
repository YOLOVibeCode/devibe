# AI Model Options: Cost vs Context Comparison

## Anthropic Claude Models

### Claude 3.5 Sonnet (Current) ⭐
- **Model ID**: `claude-3-5-sonnet-20241022`
- **Context Window**: 200,000 tokens
- **Pricing**:
  - Input: $3 / 1M tokens
  - Output: $15 / 1M tokens
- **Speed**: Fast (~2-3s for batch)
- **Quality**: Excellent
- **Best for**: Production, complex classification
- **Cost for 1000 files**: ~$0.30

### Claude 3 Haiku 💰 CHEAPEST
- **Model ID**: `claude-3-haiku-20240307`
- **Context Window**: 200,000 tokens (same!)
- **Pricing**:
  - Input: $0.25 / 1M tokens (12x cheaper!)
  - Output: $1.25 / 1M tokens (12x cheaper!)
- **Speed**: Very fast (~1-2s for batch)
- **Quality**: Good (simpler tasks)
- **Best for**: High-volume, simple classification
- **Cost for 1000 files**: ~$0.025 (96% cheaper!)

### Claude 3 Opus 💎 HIGHEST QUALITY
- **Model ID**: `claude-3-opus-20240229`
- **Context Window**: 200,000 tokens
- **Pricing**:
  - Input: $15 / 1M tokens (5x more expensive)
  - Output: $75 / 1M tokens (5x more expensive)
- **Speed**: Slower (~5-8s for batch)
- **Quality**: Best
- **Best for**: Critical decisions, complex reasoning
- **Cost for 1000 files**: ~$1.50

---

## OpenAI Models (Alternative Provider)

### GPT-4o 🆕 LATEST
- **Model ID**: `gpt-4o`
- **Context Window**: 128,000 tokens (smaller than Claude)
- **Pricing**:
  - Input: $2.50 / 1M tokens
  - Output: $10 / 1M tokens
- **Speed**: Fast
- **Quality**: Excellent
- **Cost for 1000 files**: ~$0.25

### GPT-4o Mini 💰 CHEAP ALTERNATIVE
- **Model ID**: `gpt-4o-mini`
- **Context Window**: 128,000 tokens
- **Pricing**:
  - Input: $0.15 / 1M tokens (20x cheaper than Sonnet!)
  - Output: $0.60 / 1M tokens (25x cheaper!)
- **Speed**: Very fast
- **Quality**: Good
- **Cost for 1000 files**: ~$0.015 (98% cheaper!)

### GPT-3.5 Turbo 💸 ULTRA CHEAP (Legacy)
- **Model ID**: `gpt-3.5-turbo`
- **Context Window**: 16,000 tokens (much smaller)
- **Pricing**:
  - Input: $0.50 / 1M tokens
  - Output: $1.50 / 1M tokens
- **Speed**: Very fast
- **Quality**: Decent
- **Cost for 1000 files**: ~$0.05
- **⚠️ Limited context**: Only ~30-40 files per batch

---

## Gemini Models (Google)

### Gemini 1.5 Pro 🌟 MASSIVE CONTEXT
- **Model ID**: `gemini-1.5-pro`
- **Context Window**: 2,000,000 tokens (10x Claude!)
- **Pricing**:
  - Input: $1.25 / 1M tokens (<128K), $2.50 / 1M (>128K)
  - Output: $5 / 1M tokens (<128K), $10 / 1M (>128K)
- **Speed**: Fast
- **Quality**: Excellent
- **Best for**: Massive batches (1000+ files at once!)
- **Cost for 1000 files**: ~$0.15
- **🚀 Batch potential**: 800-1000 files per call

### Gemini 1.5 Flash ⚡ FAST & CHEAP
- **Model ID**: `gemini-1.5-flash`
- **Context Window**: 1,000,000 tokens (5x Claude!)
- **Pricing**:
  - Input: $0.075 / 1M tokens (<128K), $0.15 / 1M (>128K)
  - Output: $0.30 / 1M tokens (<128K), $0.60 / 1M (>128K)
- **Speed**: Very fast
- **Quality**: Good
- **Best for**: High-volume, fast processing
- **Cost for 1000 files**: ~$0.012 (98% cheaper!)
- **🚀 Batch potential**: 500-800 files per call

---

## Recommended Configuration by Use Case

### 🎯 Best Overall: Claude 3.5 Sonnet (Current)
- Balanced cost, quality, and speed
- Great for production
- 200K context = ~100-150 files/batch

### 💰 Best Budget: Gemini 1.5 Flash or GPT-4o Mini
- **Gemini 1.5 Flash**: $0.012 per 1000 files + 1M context
- **GPT-4o Mini**: $0.015 per 1000 files + good quality
- 95-98% cost savings vs Sonnet

### 🚀 Best for Massive Batches: Gemini 1.5 Pro
- 2M context = 800-1000 files per call
- Only 2-3 API calls for 2000 files
- Reasonable pricing: $0.15 per 1000 files

### 🏆 Best Quality: Claude 3 Opus
- For critical classification decisions
- Most expensive but most reliable
- Use sparingly for edge cases

---

## Cost Comparison Table

| Model | Cost per 1K files | Files per batch | API calls for 10K files | Total cost for 10K |
|-------|-------------------|-----------------|-------------------------|-------------------|
| Claude 3 Opus | $1.50 | 100 | 100 | $15.00 |
| **Claude 3.5 Sonnet** | **$0.30** | **100** | **100** | **$3.00** |
| Claude 3 Haiku | $0.025 | 100 | 100 | $0.25 |
| GPT-4o | $0.25 | 80 | 125 | $2.50 |
| GPT-4o Mini | $0.015 | 80 | 125 | $0.15 |
| Gemini 1.5 Pro | $0.15 | 800 | 13 | $1.50 |
| **Gemini 1.5 Flash** | **$0.012** | **600** | **17** | **$0.12** |

**Winner: Gemini 1.5 Flash** - 96% cheaper + massive context!

---

## How to Configure

### Option 1: Environment Variable
```bash
# In your .env or shell
export AI_MODEL=claude-3-haiku-20240307
export AI_PROVIDER=anthropic

# Or for Gemini
export AI_MODEL=gemini-1.5-flash
export AI_PROVIDER=google
export GOOGLE_API_KEY=your_key_here
```

### Option 2: Config File
```typescript
// config/ai-models.ts
export const AI_CONFIG = {
  // Provider: 'anthropic' | 'openai' | 'google'
  provider: process.env.AI_PROVIDER || 'anthropic',

  // Model selection
  model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',

  // Fallback models (if primary fails or rate limited)
  fallbacks: [
    'claude-3-haiku-20240307',
    'gemini-1.5-flash',
    'gpt-4o-mini',
  ],

  // Context limits by model
  contextLimits: {
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-3-opus-20240229': 200000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gemini-1.5-pro': 2000000,
    'gemini-1.5-flash': 1000000,
  },
};
```

### Option 3: Runtime Selection
```typescript
import { AIClassifierFactory } from './ai-classifier.js';

// Override model at runtime
const classifier = AIClassifierFactory.create('anthropic', {
  model: 'claude-3-haiku-20240307'
});

// Or use Gemini for massive batches
const geminiClassifier = AIClassifierFactory.create('google', {
  model: 'gemini-1.5-flash',
  apiKey: process.env.GOOGLE_API_KEY
});
```

---

## Implementation: Multi-Model Support

```typescript
// src/ai-model-config.ts
export interface ModelConfig {
  id: string;
  provider: 'anthropic' | 'openai' | 'google';
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  recommendedBatchSize: number;
}

export const MODELS: Record<string, ModelConfig> = {
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    recommendedBatchSize: 100,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    contextWindow: 200000,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    recommendedBatchSize: 120,
  },
  'gemini-flash': {
    id: 'gemini-1.5-flash',
    provider: 'google',
    contextWindow: 1000000,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
    recommendedBatchSize: 600,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    contextWindow: 128000,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
    recommendedBatchSize: 80,
  },
};

// Auto-select best model based on criteria
export function selectOptimalModel(
  criteria: 'cheapest' | 'fastest' | 'largest-context' | 'best-quality'
): ModelConfig {
  switch (criteria) {
    case 'cheapest':
      return MODELS['gemini-flash'];
    case 'fastest':
      return MODELS['claude-3-haiku'];
    case 'largest-context':
      return MODELS['gemini-flash']; // 1M context
    case 'best-quality':
      return MODELS['claude-3-5-sonnet'];
    default:
      return MODELS['claude-3-5-sonnet'];
  }
}
```

---

## My Recommendation 🎯

**For your use case (maximize batches, minimize cost):**

1. **Production**: Use **Gemini 1.5 Flash**
   - 1M context = 600 files per batch
   - $0.012 per 1000 files (96% cheaper!)
   - Still excellent quality
   - Fewer API calls = faster processing

2. **Development/Testing**: Use **Claude 3 Haiku**
   - $0.025 per 1000 files
   - Same 200K context as Sonnet
   - 12x cheaper than current Sonnet
   - Already supported (Anthropic)

3. **Critical Tasks**: Use **Claude 3.5 Sonnet** (current)
   - Keep for final validation or edge cases
   - Best balance of quality and context

**Migration Path:**
- Week 1: Add Haiku support → instant 12x cost reduction
- Week 2: Add Gemini support → 25x cost reduction + bigger batches
- Week 3: Implement smart model selection (cheap for simple, expensive for complex)

Want me to implement the multi-model support?
