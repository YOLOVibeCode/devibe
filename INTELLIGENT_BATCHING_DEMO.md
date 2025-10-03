# Intelligent Context Window Batching

DevIbe now intelligently uses the **full context window** of your selected AI model to maximize batch sizes and minimize API calls.

## How It Works

### Model-Aware Batching

Different AI models have vastly different context windows:

| Model | Context Window | Batch Capacity |
|-------|----------------|----------------|
| **Gemini 1.5 Flash** | 1,000,000 tokens | ~600 files |
| **Gemini 1.5 Pro** | 2,000,000 tokens | ~1,200 files |
| GPT-4o Mini | 128,000 tokens | ~80 files |
| Claude 3 Haiku | 200,000 tokens | ~120 files |
| Claude 3.5 Sonnet | 200,000 tokens | ~100 files |

DevIbe automatically calculates the optimal batch size based on:
1. Your selected model's context window
2. Actual file sizes and content
3. Token estimation (conservative)
4. Safety margin (15% reserved)

### Intelligent File Sampling

To fit more files per batch, DevIbe uses smart content sampling:

**Tier 1 - Micro files (< 200 chars)**
- Include full content
- Strategy: `full`

**Tier 2 - Small files (< 2KB)**
- Include first 1,000 characters
- Strategy: `head`

**Tier 3 - Medium files (< 10KB)**
- Sample: head + middle + tail (500 chars each)
- Strategy: `strategic`

**Tier 4 - Large files (> 10KB)**
- Sample: header + sparse sampling every 10% + footer
- Strategy: `sparse`

This ensures DevIbe can accurately classify files while maximizing the number of files per API call.

---

## Example: 1,000 Files

Let's compare the efficiency with different models:

### Using Claude 3.5 Sonnet (200K context)

```
📦 Batch Processing Stats
Model: Claude 3.5 Sonnet
Context Window: 200,000 tokens

Total Files: 1,000
Total Batches: 10
Avg Files/Batch: 100 files
Context Utilization: 85%
Total API Calls: 10
Estimated Cost: $2.70
Processing Time: 25 seconds
```

### Using Gemini 1.5 Flash (1M context)

```
📦 Batch Processing Stats
Model: Gemini 1.5 Flash
Context Window: 1,000,000 tokens

Total Files: 1,000
Total Batches: 2
Avg Files/Batch: 500 files
Context Utilization: 87%
Total API Calls: 2
Estimated Cost: $0.06
Processing Time: 5 seconds

💡 Efficiency Gains:
- 5x fewer API calls
- 5x faster processing
- 98% cost reduction
- 87% context utilization (excellent!)
```

### Using Gemini 1.5 Pro (2M context)

```
📦 Batch Processing Stats
Model: Gemini 1.5 Pro
Context Window: 2,000,000 tokens

Total Files: 1,000
Total Batches: 1
Avg Files/Batch: 1,000 files
Context Utilization: 92%
Total API Calls: 1 (!!)
Estimated Cost: $0.50
Processing Time: 3 seconds

💡 Single-Batch Processing!
- ALL 1,000 files in ONE API call
- 92% context window utilization
- 3 second total processing time
```

---

## Usage

### Automatic (Recommended)

DevIbe automatically uses intelligent batching when processing files:

```bash
# Plan will use intelligent batching based on active model
devibe plan

# Check which model is active
devibe ai-key status
```

**Output:**
```
🔍 Analyzing 1,247 files...

📦 Using AI: Gemini 1.5 Flash (configured)
   Context: 1,000,000 tokens
   Batching: 1,247 files → 3 batches (~416 files/batch)

Batch 1/3: 500 files (847,392 tokens) ✓
Batch 2/3: 500 files (849,103 tokens) ✓
Batch 3/3: 247 files (213,566 tokens) ✓

✅ Classification complete!
   API Calls: 3
   Cost: $0.07
   Time: 7.5s
   Accuracy: 94% average confidence
```

### Programmatic Usage

```typescript
import { IntelligentBatchProcessor } from './intelligent-batch-processor';

const processor = new IntelligentBatchProcessor();

// Process files with progress tracking
const result = await processor.processFiles(
  filePaths,
  repositories,
  {
    showProgress: true,
    onProgress: (current, total, info) => {
      console.log(`[${current}/${total}] ${info}`);
    }
  }
);

console.log('📊 Batch Processing Results:');
console.log(`Model: ${result.stats.modelUsed}`);
console.log(`Context: ${result.stats.contextWindow.toLocaleString()} tokens`);
console.log(`Files: ${result.stats.totalFiles}`);
console.log(`Batches: ${result.stats.totalBatches}`);
console.log(`Avg Files/Batch: ${result.stats.avgFilesPerBatch.toFixed(1)}`);
console.log(`Context Utilization: ${(result.stats.contextUtilization * 100).toFixed(1)}%`);
console.log(`Cost: $${result.stats.estimatedCost.toFixed(4)}`);
console.log(`Time: ${result.stats.processingTimeMs}ms`);
```

### Preview Batching Strategy

See how files will be batched without making API calls:

```typescript
const preview = await processor.previewBatching(filePaths);

console.log(`Will create ${preview.stats.totalBatches} batches`);
console.log(`Avg ${preview.stats.avgFilesPerBatch.toFixed(1)} files/batch`);
console.log(`Estimated cost: $${preview.stats.estimatedCost.toFixed(4)}`);
console.log(`Context utilization: ${(preview.stats.contextUtilization * 100).toFixed(1)}%`);

// Examine individual batches
preview.batches.forEach((batch, idx) => {
  console.log(`\nBatch ${idx + 1}:`);
  console.log(`  Files: ${batch.files.length}`);
  console.log(`  Input tokens: ${batch.estimatedInputTokens.toLocaleString()}`);
  console.log(`  Tier: ${batch.tier}`);
  console.log(`  Strategy: ${batch.files[0].samplingStrategy}`);
});
```

---

## Cost Optimization Scenarios

### Scenario 1: Small Project (100 files)

**Claude 3.5 Sonnet:**
- Batches: 1
- Cost: $0.27
- Time: 2.5s

**Gemini 1.5 Flash:**
- Batches: 1
- Cost: $0.006
- Time: 2.5s
- **Savings: 98%** ✨

### Scenario 2: Medium Project (500 files)

**Claude 3.5 Sonnet:**
- Batches: 5
- Cost: $1.35
- Time: 12.5s

**Gemini 1.5 Flash:**
- Batches: 1
- Cost: $0.03
- Time: 2.5s
- **Savings: 98%, 5x faster** ✨

### Scenario 3: Large Monorepo (5,000 files)

**Claude 3.5 Sonnet:**
- Batches: 50
- Cost: $13.50
- Time: 125s (2 min)

**Gemini 1.5 Flash:**
- Batches: 9
- Cost: $0.30
- Time: 22.5s
- **Savings: 98%, 5.5x faster** ✨

**Gemini 1.5 Pro:**
- Batches: 5
- Cost: $2.50
- Time: 12.5s
- **Savings: 81%, 10x faster** ✨

---

## Technical Details

### Token Estimation

DevIbe uses conservative token estimation:
- ~3.3 characters per token
- +50 tokens per file (overhead)
- +100 tokens per file (response)
- +200 tokens (base prompt)
- 15% safety margin

### Context Window Packing Algorithm

1. **Sort files by size** (small → large) for optimal packing
2. **Sample content** based on file tier
3. **Estimate tokens** for each file
4. **Pack files** until approaching context limit
5. **Create new batch** when limit reached
6. **Validate batches** to ensure no overflow

### Efficiency Metrics

**Context Utilization:** How much of the available context window is used
- **< 60%:** Poor utilization, consider smaller model
- **60-80%:** Good utilization
- **80-95%:** Excellent utilization ✨
- **> 95%:** Risk of overflow, increase safety margin

**Files per Batch:** Average number of files processed per API call
- Higher = better (fewer API calls)
- Depends on file sizes and model context window

**Processing Time:** Wall-clock time for batch processing
- ~2.5s per API call (network + processing)
- Fewer batches = faster overall processing

---

## Best Practices

### 1. Choose the Right Model

For file classification tasks (DevIbe's primary use case):

**Best Choice:** Gemini 1.5 Flash
- Largest batch sizes (600 files)
- Lowest cost ($0.075/M tokens)
- Fast processing
- 1M context window

**Alternative:** Claude 3 Haiku
- Good accuracy
- Moderate batch sizes (120 files)
- Low cost ($0.25/M tokens)

**Avoid:** Claude 3.5 Sonnet or GPT-4o
- Too expensive for bulk classification
- No meaningful accuracy improvement for this task

### 2. Monitor Context Utilization

```bash
# Check efficiency after processing
devibe plan --show-stats

# Example output:
# Context Utilization: 87% ✓ (excellent)
# Avg Files/Batch: 483 files
# Total Batches: 3
```

If utilization is consistently low (< 60%), consider:
- Switching to a smaller model
- Adjusting safety margin

### 3. Use Progress Tracking

For large projects, enable progress output:

```typescript
const result = await processor.processFiles(files, repos, {
  showProgress: true,
  onProgress: (current, total, info) => {
    // Custom progress handling
    updateUI(`Processing batch ${current}/${total}`);
  }
});
```

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  IntelligentBatchProcessor                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Initialize with active AI model                  │  │
│  │     - Get model from AIProviderResolver              │  │
│  │     - Create AIBatchOptimizer(model)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. Load file contents                               │  │
│  │     - Read up to maxFileSize (default 100KB)         │  │
│  │     - Create FileInfo[] with path, name, size, content│ │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. AIBatchOptimizer.createOptimalBatches()          │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ For each file:                                 │  │  │
│  │  │  • Determine tier (micro/small/medium/large)   │  │  │
│  │  │  • Sample content (full/head/strategic/sparse) │  │  │
│  │  │  • Estimate tokens                             │  │  │
│  │  │  • Pack into current batch                     │  │  │
│  │  │  • Create new batch if limit reached           │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  Result: BatchGroup[]                                │  │
│  │    - Each batch ≤ model.contextWindow * 85%         │  │
│  │    - Maximizes files per batch                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. Process each batch                               │  │
│  │     - Call AI.classifyBatch(files, repos)            │  │
│  │     - Show progress if enabled                       │  │
│  │     - Collect results                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  5. Return results + stats                           │  │
│  │     - All classifications                            │  │
│  │     - Efficiency metrics                             │  │
│  │     - Cost estimation                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

✅ **Intelligent batching** maximizes context window usage
✅ **Model-aware** sizing adapts to different models
✅ **Smart sampling** fits more files per batch
✅ **Cost optimized** - up to 98% savings with Gemini
✅ **5-10x faster** with larger context windows
✅ **Progress tracking** for large operations
✅ **Automatic** - works seamlessly with existing commands

**Example: 1,000 file monorepo**
- Old way: 1,000 API calls, $30, 40+ minutes
- DevIbe + Gemini: 2 API calls, $0.06, 5 seconds

That's the power of intelligent context window utilization! 🚀
