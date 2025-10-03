# AI Classification Batching Strategy

## Goal
Maximize files classified per API call while staying within context limits and optimizing token usage.

## Current Implementation Analysis

**Model**: Claude 3.5 Sonnet (200K context window)
**Current limits**:
- Single file: 2000-3000 chars content + ~300 token prompt = ~1500 tokens total
- Batch: 500 chars per file × N files + ~500 token prompt
- Max tokens response: 4000 for batch, 500 for single

**Current batching**: 500 chars per file (very conservative)

---

## Optimized Strategy

### Token Budget Calculation

**Claude 3.5 Sonnet Context**: 200,000 tokens (~150,000 words)

Estimated token usage:
- **1 character ≈ 0.3 tokens** (English text average)
- **System prompt**: ~200 tokens (minimal, reusable)
- **Per-file overhead**: ~50 tokens (filename, path, separators)
- **Response per file**: ~100 tokens (JSON classification)

### Batching Tiers

#### **Tier 1: Micro Files (< 200 chars)**
- **Content included**: Full file (200 chars max)
- **Files per batch**: 500-800 files
- **Token estimate**:
  - Input: 200 chars × 0.3 × 500 = 30K tokens
  - Overhead: 50 × 500 = 25K tokens
  - Total input: ~55K tokens
  - Response: 100 × 500 = 50K tokens
- **Use case**: Config files, small scripts, package.json

#### **Tier 2: Small Files (200-2000 chars)**
- **Content included**: First 1000 chars (adaptive)
- **Files per batch**: 100-150 files
- **Token estimate**:
  - Input: 1000 × 0.3 × 100 = 30K tokens
  - Overhead: 50 × 100 = 5K tokens
  - Total: ~35K tokens input, 10K response
- **Use case**: Most source files, documentation, tests

#### **Tier 3: Medium Files (2-10KB)**
- **Content included**:
  - First 500 chars (header/imports)
  - Middle 500 chars (main logic sample)
  - Last 500 chars (exports/footer)
  - = 1500 chars strategic sampling
- **Files per batch**: 50-80 files
- **Token estimate**:
  - Input: 1500 × 0.3 × 50 = 22.5K tokens
  - Total: ~27K input, 5K response
- **Use case**: Large source files, comprehensive docs

#### **Tier 4: Large Files (10-100KB)**
- **Content included**: Intelligent sampling
  - First 300 chars (header)
  - Every 1000th char sample (10 samples) = 300 chars
  - Last 300 chars (footer)
  - + File metadata (imports, exports if applicable)
  - = ~1200 chars
- **Files per batch**: 60-100 files
- **Token estimate**: ~36K input, 6K response
- **Use case**: Generated files, large libraries, bundle files

---

## Prompt Optimization

### Minimal Prompt Template

Instead of verbose instructions, use structured compact format:

```
CLASSIFY {N} FILES
Categories: doc|script|test|src|config|asset
Repos: {repo_list}

FILES:
{compressed_file_list}

Return JSON array:
[{fn,cat,conf,repo,why}]
```

**Token savings**: 200 tokens → 50 tokens (75% reduction)

### Compressed File Format

**Current**:
```
FILE 1: deploy.sh
Path: /root/scripts/deploy.sh
Content preview (first 500 chars):
#!/bin/bash
echo "deploying..."
---
```
**Tokens**: ~100

**Optimized**:
```
1|deploy.sh|/root/scripts/deploy.sh
#!/bin/bash
echo "deploying..."
--
```
**Tokens**: ~50 (50% reduction)

---

## Adaptive Batching Algorithm

```typescript
function calculateOptimalBatch(files: FileInfo[]): BatchGroup[] {
  const TARGET_TOKENS = 150000; // Leave 50K for response
  const batches: BatchGroup[] = [];
  let currentBatch: FileInfo[] = [];
  let currentTokens = 200; // Base prompt tokens

  // Sort by file size (small first for better packing)
  const sorted = files.sort((a, b) => a.size - b.size);

  for (const file of sorted) {
    // Calculate tokens for this file
    const contentChars = determineContentLength(file.size);
    const fileTokens = (contentChars * 0.3) + 50; // content + overhead
    const responseTokens = 100; // per file response

    if (currentTokens + fileTokens + responseTokens < TARGET_TOKENS) {
      currentBatch.push(file);
      currentTokens += fileTokens;
    } else {
      // Batch full, start new one
      batches.push({
        files: currentBatch,
        estimatedTokens: currentTokens
      });
      currentBatch = [file];
      currentTokens = 200 + fileTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push({
      files: currentBatch,
      estimatedTokens: currentTokens
    });
  }

  return batches;
}

function determineContentLength(fileSize: number): number {
  if (fileSize < 200) return fileSize; // Include full file
  if (fileSize < 2000) return 1000;    // First 1K
  if (fileSize < 10000) return 1500;   // Strategic sampling
  return 1200;                          // Large file sampling
}
```

---

## Implementation Priority

### Phase 1: Quick Win (1 hour)
- Increase `contentPreview` from 500 → 1000 chars
- Increase batch size from current to 100 files
- Compress prompt format
- **Expected gain**: 2-3x more files per call

### Phase 2: Smart Batching (2-3 hours)
- Implement adaptive content length based on file size
- Add file size sorting for optimal packing
- Implement token estimation
- **Expected gain**: 5-10x more files per call

### Phase 3: Advanced Optimization (4-6 hours)
- Strategic content sampling (header/middle/footer)
- Parallel batch processing
- Caching for similar files
- Progressive classification (quick pass → detailed pass)
- **Expected gain**: 10-20x more files per call

---

## Example: Real-World Impact

**Current Implementation**:
- 100 files to classify
- 500 chars per file × 100 = 50K chars
- Batches needed: ~20-30 batches (conservative current approach)
- API calls: 20-30
- Cost: ~$0.60-$0.90
- Time: 40-60 seconds

**Optimized Implementation**:
- 100 files to classify
- Adaptive sampling: avg 1200 chars per file
- Files per batch: 100 files (fits in 150K context)
- API calls: 1
- Cost: ~$0.03
- Time: 2-3 seconds

**Improvement**: 20-30x fewer API calls, 95% cost reduction, 20x faster

---

## Recommended Configuration

```typescript
// ai-classifier-config.ts
export const AI_BATCH_CONFIG = {
  // Context limits
  MAX_CONTEXT_TOKENS: 200000,
  TARGET_INPUT_TOKENS: 150000, // Leave space for response

  // Content sampling strategy
  TIER_MICRO: { maxSize: 200, contentChars: 200, filesPerBatch: 600 },
  TIER_SMALL: { maxSize: 2000, contentChars: 1000, filesPerBatch: 120 },
  TIER_MEDIUM: { maxSize: 10000, contentChars: 1500, filesPerBatch: 80 },
  TIER_LARGE: { maxSize: 100000, contentChars: 1200, filesPerBatch: 100 },

  // Prompt optimization
  USE_COMPRESSED_FORMAT: true,
  MINIMAL_INSTRUCTIONS: true,

  // Response limits
  MAX_TOKENS_PER_FILE: 100,
  RESPONSE_FORMAT: 'compact_json',

  // Performance
  PARALLEL_BATCHES: 3, // Send 3 batches concurrently
  CACHE_SIMILAR_FILES: true,
};
```

---

## Monitoring & Metrics

Track these metrics to optimize:
- Average tokens per file by category
- Actual batch sizes achieved
- API response time vs batch size
- Classification accuracy by batch size
- Token usage vs file count

---

## Cost Analysis

**Current approach** (conservative):
- $3 per million input tokens
- $15 per million output tokens
- Average: $0.03 per batch of 10 files = $0.003/file

**Optimized approach**:
- Same rates, but:
  - 100 files per batch instead of 10
  - $0.15 per batch of 100 files = $0.0015/file
  - **50% cost reduction per file**

**For 10,000 files**:
- Current: $30
- Optimized: $15
- **Savings: $15 (50%)**

---

## Next Steps

1. ✅ **Immediate**: Update `contentPreview` to 1000 chars and batch to 100 files
2. **Week 1**: Implement adaptive content length
3. **Week 2**: Add token estimation and optimal packing
4. **Week 3**: Implement parallel batch processing
5. **Week 4**: Add caching and similarity detection
