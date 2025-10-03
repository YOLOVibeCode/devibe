# AI Model Setup Guide

Complete guide to setting up and using AI models with DevIbe for intelligent file classification.

## Quick Start (30 seconds)

```bash
# 1. Analyze your options
devibe ai

# 2. Add the recommended key
devibe ai-key add google YOUR_API_KEY_HERE

# 3. Done! AI classification is now enabled
```

---

## Why Use AI Classification?

**Problem**: When organizing large monorepos, it's hard to know where files should go.

**Solution**: AI analyzes file content and intelligently suggests the best location.

**Example**:
```
deploy-ios.sh → Should go to ios-app/scripts/ (not web-app/scripts/)
api-types.ts  → Should go to api/src/types/ (not frontend/types/)
README-Auth.md → Should go to api/documents/ (discusses API auth)
```

---

## Step 1: Choose Your Model

Run the analysis command to see all options:

```bash
devibe ai-analyze
# or shorter
devibe ai
```

**Output:**
```
🤖 AI Model Cost Analysis

💰 Cost Comparison for 1,000 Files:

┌────────────────────────┬─────────────┬──────────────┬────────────┐
│ Model                  │ Total Cost  │ Cost/File    │ API Calls  │
├────────────────────────┼─────────────┼──────────────┼────────────┤
│ Gemini 1.5 Flash       │ $0.0600     │ $0.000060    │          2 │
│ GPT-4o Mini            │ $0.1200     │ $0.000120    │         13 │
│ Claude 3 Haiku         │ $0.2250     │ $0.000225    │          9 │
│ Claude 3.5 Sonnet      │ $2.7000     │ $0.002700    │         10 │
└────────────────────────┴─────────────┴──────────────┴────────────┘

🎯 Recommendation: Gemini 1.5 Flash
   • 97.8% cheaper than Claude Sonnet
   • 600 files per batch (1M token context!)
   • Only 2 API calls for 1000 files
```

### For Different Workloads

Check cost for your specific file count:

```bash
# Small project (100 files)
devibe ai -f 100

# Large project (10,000 files)
devibe ai -f 10000

# Massive monorepo (100,000 files)
devibe ai -f 100000
```

---

## Step 2: Get Your API Key

### Option A: Gemini (Recommended - Cheapest + Largest Context)

1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

**Pros:**
- ✅ **1M token context** (600 files per batch!)
- ✅ **$0.06 per 1000 files** (98% cheaper)
- ✅ **Fast** and reliable
- ✅ **Free tier** available

### Option B: Claude (Easy to Start)

1. Visit: https://console.anthropic.com/settings/keys
2. Create an API key
3. Copy the key (starts with `sk-ant-...`)

**Models:**
- **Claude 3 Haiku**: $0.23/1K files (12x cheaper than Sonnet)
- **Claude 3.5 Sonnet**: $2.70/1K files (best quality)
- **Claude 3 Opus**: $13.50/1K files (highest quality)

### Option C: OpenAI

1. Visit: https://platform.openai.com/api-keys
2. Create an API key
3. Copy the key (starts with `sk-...`)

**Models:**
- **GPT-4o Mini**: $0.12/1K files (very cheap)
- **GPT-4o**: $2.00/1K files (excellent quality)

---

## Step 3: Add Your Key

**Important**: Keys are stored securely in `~/.devibe/` (NOT in your project)

### Add Key

```bash
devibe ai-key add google YOUR_KEY_HERE
# or
devibe ai-key add anthropic YOUR_KEY_HERE
# or
devibe ai-key add openai YOUR_KEY_HERE
```

**Output:**
```
✅ google API key saved securely

   Location: /Users/you/.devibe/ai-keys.enc
   Encrypted: Yes
   Git-ignored: Yes (stored in ~/.devibe/)

✨ You can now use:
   • Gemini 1.5 Flash (good quality, 1,000,000 tokens)
   • Gemini 1.5 Pro (excellent quality, 2,000,000 tokens)
```

### Verify Keys

```bash
# List configured providers
devibe ai-key list

# Output:
# 🔑 Configured API Keys:
#    ✓ google        AIzaSyXX...fYZ4
#    ✓ anthropic     sk-ant-a...xY8Q
```

### Remove Key

```bash
devibe ai-key remove google
```

---

## Step 4: Use AI Classification

Once you have a key configured, AI classification is **automatic** in these commands:

### Plan File Organization (with AI)

```bash
devibe plan
```

The planner will:
1. Detect your monorepo structure
2. Find messy root files
3. **Use AI** to analyze each file's content
4. Suggest intelligent moves based on context

**Example AI analysis:**
```
File: deploy-staging.sh
AI Analysis:
  - Detected: Kubernetes deployment script
  - Keywords: kubectl, staging, rollout
  - Suggestion: platform/scripts/deploy-staging.sh
  - Reason: Infrastructure deployment, belongs in platform repo
```

### Execute Organization (with AI)

```bash
devibe execute
```

Same as `plan` but actually moves files after creating backups.

---

## Advanced: Choose Specific Model

### Via Environment Variable

```bash
# Use cheapest model
export AI_MODEL=gemini-1.5-flash

# Use highest quality
export AI_MODEL=claude-3-opus

# Use good balance
export AI_MODEL=claude-3-haiku

# Now run any command
devibe plan
```

### Via Config File

Create `.devibe.config.json` in your project:

```json
{
  "ai": {
    "model": "gemini-1.5-flash",
    "provider": "google"
  }
}
```

---

## Security & Privacy

### Where Keys Are Stored

```
~/.devibe/ai-keys.enc
```

- ✅ **NOT in your project** (can't be committed to git)
- ✅ **Encrypted** with AES-256
- ✅ **Owner-only permissions** (chmod 600)
- ✅ **Machine-specific** encryption key

### Check Storage Location

```bash
devibe ai-key show

# Output:
# 🔑 API Key Storage:
#    Location: /Users/you/.devibe/ai-keys.enc
#    Encrypted: Yes (AES-256)
#    Git-safe: Yes (stored in ~/.devibe/)
#    Permissions: 600 (owner only)
```

### What Gets Sent to AI

Only file content **you explicitly classify**:
- File name
- First 500-1500 chars of content (depending on file size)
- Repository context (names only, no code)

**NOT sent:**
- Git history
- Environment variables
- Secrets (secret scanner runs first)
- Full file contents (only samples)

---

## Cost Management

### Track Spending

Set budget alerts in your provider:
- [Anthropic Console](https://console.anthropic.com/settings/billing)
- [OpenAI Usage](https://platform.openai.com/usage)
- [Google Cloud Console](https://console.cloud.google.com/billing)

### Estimate Before Running

```bash
# Check cost for your repository size
devibe ai -f $(find . -type f | wc -l)
```

### Use Cheaper Models for Testing

```bash
# Development: use cheapest
export AI_MODEL=gemini-1.5-flash

# Production: use best
export AI_MODEL=claude-3-5-sonnet
```

---

## Troubleshooting

### "No API key configured"

```bash
# Check if key exists
devibe ai-key list

# Add key if missing
devibe ai-key add <provider> <your-key>
```

### "Invalid API key format"

Keys must match the expected format:
- **Anthropic**: `sk-ant-api03-...` (50+ chars)
- **OpenAI**: `sk-...` (40+ chars)
- **Google**: `AIza...` (39 chars)

### "API rate limit exceeded"

Use a cheaper model with larger context:

```bash
# Gemini 1.5 Flash has generous rate limits
export AI_MODEL=gemini-1.5-flash
devibe plan
```

### AI classification not working

Check if AI is enabled:

```bash
# Should show configured providers
devibe ai-key list

# Should show available models with ✓
devibe ai-models
```

---

## Best Practices

### 1. Start with Cheapest Model

```bash
devibe ai-key add google YOUR_KEY
export AI_MODEL=gemini-1.5-flash
```

Only upgrade if quality isn't good enough.

### 2. Test on Small Subset First

```bash
# Test on 10 files first
devibe plan --limit 10

# If results look good, run full
devibe execute
```

### 3. Use Multiple Keys for Redundancy

```bash
# Add primary
devibe ai-key add google PRIMARY_KEY

# Add backup
devibe ai-key add anthropic BACKUP_KEY
```

If one fails, DevIbe will try the fallback.

### 4. Review Before Execute

```bash
# Always review plan first
devibe plan

# Only execute if it looks correct
devibe execute
```

---

## FAQ

**Q: Do I need AI classification?**
A: No! DevIbe works without AI using heuristics. AI just makes suggestions smarter.

**Q: Which model should I use?**
A: Start with **Gemini 1.5 Flash** (cheapest + largest context).

**Q: How much will it cost?**
A: For 1000 files: ~$0.06 with Gemini, ~$0.23 with Claude Haiku, ~$2.70 with Claude Sonnet.

**Q: Are my keys safe?**
A: Yes! Encrypted in `~/.devibe/`, never committed to git.

**Q: Can I use multiple providers?**
A: Yes! Add keys for all providers, DevIbe will use the best available.

**Q: What if I don't want AI?**
A: Don't add any keys. DevIbe works great with heuristics alone.

**Q: Can I see what AI suggests before moving files?**
A: Yes! Run `devibe plan` to preview all moves with reasoning.

---

## Quick Reference

```bash
# Analysis & recommendations
devibe ai                           # Analyze models
devibe ai -f 5000                   # Analyze for 5000 files
devibe ai-models                    # List all models

# Key management
devibe ai-key add <provider> <key>  # Add key
devibe ai-key list                  # List keys
devibe ai-key remove <provider>     # Remove key
devibe ai-key show                  # Show storage info

# Use AI classification
devibe plan                         # Preview with AI
devibe execute                      # Execute with AI
export AI_MODEL=gemini-1.5-flash   # Set specific model
```

---

## Next Steps

1. ✅ Run `devibe ai` to see recommendations
2. ✅ Get free API key from recommended provider
3. ✅ Add key with `devibe ai-key add`
4. ✅ Test with `devibe plan`
5. ✅ Execute with `devibe execute`

**Happy organizing! 🚀**
