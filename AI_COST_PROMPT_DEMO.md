# AI Cost Optimization Prompt - User Experience

## Overview

DevIbe now intelligently prompts users about cost optimization when they're using an expensive AI model. The prompt:
- Only appears **once or twice** (user can decline twice max)
- Only shows when using an **expensive model** (>80% potential savings)
- Explains the **significant cost savings** available
- Saves the user's preference so they're not repeatedly asked

## User Flow

### Scenario 1: User with Claude 3.5 Sonnet (First Time)

```bash
$ devibe plan

📋 Planning root file distribution...

💡 Cost Optimization Opportunity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're currently using: Claude 3.5 Sonnet
Estimated cost for 1,000 files: $2.7000

We can help you switch to: Gemini 1.5 Flash
Estimated cost for 1,000 files: $0.0600

💰 Potential savings: 98% ($2.6400 per 1,000 files)

Would you like to run an AI model analysis to find the best option?

Run AI analysis now? (y/n):
```

**If user types "y":**

```
📊 AI Model Cost Analysis

Comparing costs for 1,000 files:

┌─────────────────────────────────────────────────────────────────────────┐
│ Model                   │ Batches │ Cost      │ Cost/File │ Context    │
├─────────────────────────────────────────────────────────────────────────┤
│ ⭐ Gemini 1.5 Flash     │       2 │  $0.0600  │ $0.000060 │ 2 calls    │
│    GPT-4o Mini          │      13 │  $0.0750  │ $0.000075 │ 13 calls   │
│    Claude 3 Haiku       │       9 │  $0.1250  │ $0.000125 │ 9 calls    │
│    Gemini 1.5 Pro       │       2 │  $0.6250  │ $0.000625 │ 2 calls    │
│    GPT-4o               │      13 │  $1.2500  │ $0.001250 │ 13 calls   │
│    Claude 3.5 Sonnet    │      10 │  $2.7000  │ $0.002700 │ 10 calls   │
│    Claude 3 Opus        │      10 │  $7.5000  │ $0.007500 │ 10 calls   │
└─────────────────────────────────────────────────────────────────────────┘

⭐ Recommended: Gemini 1.5 Flash
   • Lowest cost: $0.0600 for 1,000 files
   • 2 batches (efficient!)

To switch to this model:
   devibe ai-key add google <your-api-key>

For more details, run: devibe ai-models

✓ AI classification enabled (this may take a few minutes for 158 files)

[... continues with normal plan output ...]
```

**If user types "n" (first decline):**

```
📊 Just so you know:
   • Current model: Claude 3.5 Sonnet costs ~$2.7000/1K files
   • Optimized model: Gemini 1.5 Flash costs ~$0.0600/1K files
   • For a 10,000 file project, that's $26.40 in savings!

   Run `devibe ai-analyze` anytime to see the full comparison.
   We'll ask you one more time the next time you use AI.

✓ AI classification enabled (this may take a few minutes for 158 files)

[... continues with normal plan output ...]
```

### Scenario 2: Second Decline

Next time the user runs `devibe plan`:

```bash
$ devibe plan

📋 Planning root file distribution...

💡 Cost Optimization Opportunity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're currently using: Claude 3.5 Sonnet
Estimated cost for 1,000 files: $2.7000

We can help you switch to: Gemini 1.5 Flash
Estimated cost for 1,000 files: $0.0600

💰 Potential savings: 98% ($2.6400 per 1,000 files)

Would you like to run an AI model analysis to find the best option?

⚠️  This is your last chance! Saying no will save this preference.
   You could save substantial money by optimizing your AI model choice.

Run AI analysis now? (y/n):
```

**If user types "n" again:**

```
   No problem! We won't ask again.
   You can always run `devibe ai-analyze` to optimize your costs.

✓ AI classification enabled (this may take a few minutes for 158 files)

[... continues with normal plan output ...]
```

### Scenario 3: Third Time and Beyond

```bash
$ devibe plan

📋 Planning root file distribution...

✓ AI classification enabled (this may take a few minutes for 158 files)

[... continues with normal plan output - NO PROMPT ...]
```

The user is never prompted again! Their preference is saved.

### Scenario 4: User Already Using Cheap Model (Gemini Flash)

```bash
$ devibe plan

📋 Planning root file distribution...

✓ AI classification enabled (this may take a few minutes for 158 files)

[... continues with normal plan output - NO PROMPT ...]
```

No prompt because savings would be <80% (already optimized).

---

## Technical Details

### Preferences Storage

User preferences are stored in `~/.devibe/preferences.json`:

```json
{
  "aiAnalysisPrompted": true,
  "aiAnalysisDeclineCount": 2,
  "lastPromptDate": "2025-10-03T20:30:00.000Z",
  "version": "1.2.0"
}
```

### Prompt Triggers

The prompt appears when ALL conditions are met:
1. **AI is available** (API key configured)
2. **User hasn't been prompted before** OR **declined only once**
3. **Potential savings >= 80%** (expensive model detected)
4. **Command uses AI** (`plan`, `execute` with AI enabled)

### Prompt Limits

- **Maximum prompts:** 2 times total
- **After accepting:** Never prompted again
- **After 2nd decline:** Never prompted again
- **Manual override:** User can run `devibe ai-analyze` anytime

### Manual Reset (for testing)

Users can reset the prompt state with:

```bash
# Delete preferences file
rm ~/.devibe/preferences.json

# Or programmatically (future feature)
devibe reset-preferences
```

---

## User Benefits

### 1. Cost Awareness
Users are informed about potential savings without being intrusive

### 2. Respect for Choice
- Maximum 2 prompts total
- Clear explanation of benefits
- Easy to decline
- Preference is remembered

### 3. Educational
Each decline includes:
- Current cost breakdown
- Optimized cost breakdown
- Real-world example (10K files)
- Manual command to run analysis later

### 4. Non-Blocking
The prompt:
- Doesn't interrupt workflow
- Appears before AI processing
- Allows quick yes/no response
- Continues normally after choice

---

## Example Scenarios

### Scenario: Small Startup Using Claude Sonnet

**Monthly Usage:** 50,000 files classified

**Current Cost (Claude Sonnet):**
- $2.70 per 1,000 files
- 50,000 files = $135/month

**After Prompt & Switch (Gemini Flash):**
- $0.06 per 1,000 files
- 50,000 files = $3/month
- **Savings: $132/month ($1,584/year)**

### Scenario: Large Enterprise Using Claude Opus

**Monthly Usage:** 500,000 files classified

**Current Cost (Claude Opus):**
- $7.50 per 1,000 files
- 500,000 files = $3,750/month

**After Prompt & Switch (Gemini Flash):**
- $0.06 per 1,000 files
- 500,000 files = $30/month
- **Savings: $3,720/month ($44,640/year)**

---

## Implementation Files

### New Files Created

1. **`src/user-preferences.ts`**
   - Manages user preferences in `~/.devibe/preferences.json`
   - Tracks prompt state and decline count
   - Provides singleton instance

2. **`src/ai-cost-advisor.ts`**
   - Analyzes cost savings potential
   - Prompts user interactively
   - Shows AI analysis when accepted
   - Handles decline tracking

### Modified Files

1. **`src/cli.ts`**
   - Integrated prompt into `plan` command (line ~210)
   - Integrated prompt into `execute` command (line ~337)
   - Checks before AI operations

---

## Future Enhancements

### Potential Improvements

1. **Smarter Timing**
   - Only prompt on first large operation (>100 files)
   - Skip for small operations

2. **Usage-Based Prompts**
   - Track actual usage and costs
   - Prompt when costs exceed threshold

3. **Model Comparison in Status**
   - Show current vs optimal in `devibe ai-key status`
   - Periodic reminders (e.g., monthly)

4. **A/B Testing**
   - Test different prompt messages
   - Optimize conversion rate

5. **Analytics**
   - Track acceptance rate
   - Measure cost savings achieved
   - User satisfaction surveys

---

## Testing the Feature

### Manual Testing

```bash
# 1. Set up expensive model
export ANTHROPIC_API_KEY=your-key

# 2. Run plan (should prompt)
devibe plan

# 3. Decline first time

# 4. Run plan again (should prompt with "last chance")
devibe plan

# 5. Decline second time

# 6. Run plan again (should NOT prompt)
devibe plan

# 7. Reset and test acceptance
rm ~/.devibe/preferences.json
devibe plan
# Type 'y' - should show analysis
```

### Expected Behavior

✅ First prompt: Friendly, informative
✅ First decline: Explains benefits, says "one more time"
✅ Second prompt: Emphasizes "last chance"
✅ Second decline: Confirms "won't ask again"
✅ Third+ runs: No prompt
✅ Acceptance: Shows full analysis, marks as accepted

---

## Summary

This feature strikes the perfect balance:
- **Helpful:** Saves users significant money
- **Respectful:** Maximum 2 prompts, preference remembered
- **Educational:** Clear cost breakdowns and examples
- **Non-intrusive:** Doesn't block workflow
- **Effective:** 98% potential savings for many users

The prompt helps users make informed decisions about AI costs without being annoying or repetitive.
