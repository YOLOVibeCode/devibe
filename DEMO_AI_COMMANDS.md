# AI Commands Demo

Visual walkthrough of the new AI model analysis and key management features.

## 📊 Command: `devibe ai` (Analysis)

### What It Does
Analyzes all available AI models, compares costs, and recommends the best option for your workload.

### Example Output

```
$ devibe ai

🤖 AI Model Cost Analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configured Providers:

   ⚠️  No API keys configured yet

💰 Cost Comparison for 1,000 Files:

┌────────────────────────┬─────────────┬──────────────┬────────────┐
│ Model                  │ Total Cost  │ Cost/File    │ API Calls  │
├────────────────────────┼─────────────┼──────────────┼────────────┤
│ Gemini 1.5 Flash       │ $0.0600     │ $0.000060    │          2 │
│ GPT-4o Mini            │ $0.1200     │ $0.000120    │         13 │
│ Claude 3 Haiku         │ $0.2250     │ $0.000225    │          9 │
│ Gemini 1.5 Pro         │ $1.0000     │ $0.001000    │          2 │
│ GPT-4o                 │ $2.0000     │ $0.002000    │         13 │
│ Claude 3.5 Sonnet      │ $2.7000     │ $0.002700    │         10 │
│ Claude 3 Opus          │ $13.5000    │ $0.013500    │         10 │
└────────────────────────┴─────────────┴──────────────┴────────────┘

🎯 Recommendation:

   Use: Gemini 1.5 Flash
   Provider: google
   Context: 1,000,000 tokens
   Batch size: 600 files per call
   Cost: $0.0600 (save $2.6400 or 97.8%)

⚡ Quick Setup:

   To use Gemini 1.5 Flash, add your google API key:

   devibe ai-key add google <your-api-key>

   Get your key: https://makersuite.google.com/app/apikey

📊 Other Options:

   • Largest context:  devibe ai-key add google <key>  (Gemini: 1M-2M tokens)
   • Best quality:     devibe ai-key add anthropic <key>  (Claude Opus)
   • Easy to try:      devibe ai-key add anthropic <key>  (Claude Haiku - 12x cheaper)

📖 Learn More:

   • View all models:  devibe ai-models
   • Manage keys:      devibe ai-key list
   • Set default:      export AI_MODEL=gemini-1.5-flash
```

### With Custom File Count

```bash
$ devibe ai -f 10000

💰 Cost Comparison for 10,000 Files:

┌────────────────────────┬─────────────┬──────────────┬────────────┐
│ Model                  │ Total Cost  │ Cost/File    │ API Calls  │
├────────────────────────┼─────────────┼──────────────┼────────────┤
│ Gemini 1.5 Flash       │ $0.6000     │ $0.000060    │         17 │
│ GPT-4o Mini            │ $1.2000     │ $0.000120    │        125 │
│ Claude 3 Haiku         │ $2.2500     │ $0.000225    │         84 │
│ Gemini 1.5 Pro         │ $10.0000    │ $0.001000    │         13 │
│ GPT-4o                 │ $20.0000    │ $0.002000    │        125 │
│ Claude 3.5 Sonnet      │ $27.0000    │ $0.002700    │        100 │
│ Claude 3 Opus          │ $135.0000   │ $0.013500    │        100 │
└────────────────────────┴─────────────┴──────────────┴────────────┘

🎯 Recommendation: Gemini 1.5 Flash
   Cost: $0.60 (save $26.40 or 97.8%)
```

---

## 🔑 Command: `devibe ai-key add`

### Adding a Key

```bash
$ devibe ai-key add google AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

✅ google API key saved securely

   Location: /Users/you/.devibe/ai-keys.enc
   Encrypted: Yes
   Git-ignored: Yes (stored in ~/.devibe/)

✨ You can now use:
   • Gemini 1.5 Flash (good quality, 1,000,000 tokens)
   • Gemini 1.5 Pro (excellent quality, 2,000,000 tokens)
```

### Adding Multiple Providers

```bash
$ devibe ai-key add anthropic sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXX

✅ anthropic API key saved securely

   Location: /Users/you/.devibe/ai-keys.enc
   Encrypted: Yes
   Git-ignored: Yes (stored in ~/.devibe/)

✨ You can now use:
   • Claude 3.5 Sonnet (excellent quality, 200,000 tokens)
   • Claude 3 Haiku (good quality, 200,000 tokens)
   • Claude 3 Opus (best quality, 200,000 tokens)
```

### Error Handling - Invalid Format

```bash
$ devibe ai-key add google invalid-key-123

❌ Error: Invalid google API key format

Expected format for google:
  AIzaSy...
```

### Error Handling - Missing Arguments

```bash
$ devibe ai-key add

❌ Error: Missing provider or key

Usage: devibe ai-key add <provider> <api-key>

Providers: anthropic, openai, google

Examples:
  devibe ai-key add anthropic sk-ant-api03-xxx...
  devibe ai-key add google AIzaSyXXX...
  devibe ai-key add openai sk-xxx...
```

---

## 📋 Command: `devibe ai-key list`

### With Keys Configured

```bash
$ devibe ai-key list

🔑 Configured API Keys:

   ✓ google        AIzaSyXX...fYZ4
   ✓ anthropic     sk-ant-a...xY8Q

   Stored at: /Users/you/.devibe/ai-keys.enc
```

### No Keys Yet

```bash
$ devibe ai-key list

🔑 Configured API Keys:

   No API keys configured yet

   Add a key: devibe ai-key add <provider> <api-key>
```

---

## 🔍 Command: `devibe ai-key show`

```bash
$ devibe ai-key show

🔑 API Key Storage:

   Location: /Users/you/.devibe/ai-keys.enc
   Encrypted: Yes (AES-256)
   Git-safe: Yes (stored in ~/.devibe/)
   Permissions: 600 (owner only)

   Providers: google, anthropic
```

---

## 🗑️ Command: `devibe ai-key remove`

```bash
$ devibe ai-key remove google

✅ google API key removed
```

---

## 📚 Command: `devibe ai-models`

### Full List

```bash
$ devibe ai-models

🤖 Available AI Models

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Claude 3.5 Sonnet
   Provider: anthropic
   Context: 200,000 tokens
   Price: $3/M input, $15/M output
   Batch: ~100 files/call
   Quality: excellent, Speed: fast
   Command: export AI_MODEL=claude-3-5-sonnet

✓ Claude 3 Haiku
   Provider: anthropic
   Context: 200,000 tokens
   Price: $0.25/M input, $1.25/M output
   Batch: ~120 files/call
   Quality: good, Speed: very-fast
   Command: export AI_MODEL=claude-3-haiku

✓ Claude 3 Opus
   Provider: anthropic
   Context: 200,000 tokens
   Price: $15/M input, $75/M output
   Batch: ~100 files/call
   Quality: best, Speed: slow
   Command: export AI_MODEL=claude-3-opus

○ GPT-4o
   Provider: openai
   Context: 128,000 tokens
   Price: $2.5/M input, $10/M output
   Batch: ~80 files/call
   Quality: excellent, Speed: fast
   Command: export AI_MODEL=gpt-4o

○ GPT-4o Mini
   Provider: openai
   Context: 128,000 tokens
   Price: $0.15/M input, $0.60/M output
   Batch: ~80 files/call
   Quality: good, Speed: very-fast
   Command: export AI_MODEL=gpt-4o-mini

✓ Gemini 1.5 Pro
   Provider: google
   Context: 2,000,000 tokens
   Price: $1.25/M input, $5/M output
   Batch: ~800 files/call
   Quality: excellent, Speed: fast
   Command: export AI_MODEL=gemini-1.5-pro

✓ Gemini 1.5 Flash
   Provider: google
   Context: 1,000,000 tokens
   Price: $0.075/M input, $0.30/M output
   Batch: ~600 files/call
   Quality: good, Speed: very-fast
   Command: export AI_MODEL=gemini-1.5-flash

Legend: ✓ = configured, ○ = needs API key
```

---

## 🎬 Complete Workflow Example

### 1. First Time User

```bash
# Step 1: Analyze options
$ devibe ai
# Shows cost comparison, recommends Gemini 1.5 Flash

# Step 2: Get key from https://makersuite.google.com/app/apikey
# (Returns: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)

# Step 3: Add key
$ devibe ai-key add google AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# ✅ Key saved securely

# Step 4: Verify
$ devibe ai-key list
# ✓ google configured

# Step 5: Use it!
$ devibe plan
# AI now analyzes files intelligently
```

### 2. Add Multiple Providers

```bash
# Add Google (cheapest)
$ devibe ai-key add google AIza...

# Add Anthropic (backup)
$ devibe ai-key add anthropic sk-ant-...

# Add OpenAI (if needed)
$ devibe ai-key add openai sk-...

# Check status
$ devibe ai
# Shows all 3 providers configured ✓
```

### 3. Switch Between Models

```bash
# Use cheapest
$ export AI_MODEL=gemini-1.5-flash
$ devibe plan

# Use best quality
$ export AI_MODEL=claude-3-opus
$ devibe plan

# Use good balance
$ export AI_MODEL=claude-3-haiku
$ devibe plan
```

---

## 💡 Tips & Tricks

### Quick Analyze for Current Repo

```bash
# Count your files and analyze
$ devibe ai -f $(find . -type f -name "*.ts" -o -name "*.js" | wc -l)
```

### Copy-Paste Ready Commands

```bash
# Gemini (cheapest + largest context)
devibe ai-key add google YOUR_KEY_HERE

# Claude Haiku (12x cheaper than Sonnet)
devibe ai-key add anthropic YOUR_KEY_HERE

# GPT-4o Mini (good quality, cheap)
devibe ai-key add openai YOUR_KEY_HERE
```

### Check Cost Before Running

```bash
# See cost estimate
$ devibe ai -f 5000

# If acceptable, add key and run
$ devibe ai-key add google YOUR_KEY
$ devibe plan
```

---

## 🚀 What Users Experience

**Before** (without AI):
- Heuristic-based classification
- Files organized by extension/name patterns
- Works well but sometimes misses context

**After** (with AI):
- Content-aware classification
- Understands what files actually do
- Places files based on their purpose
- Detects framework/tech mentions (iOS → ios-app/, React → web-app/)

**Example Improvement:**
```
File: database-migration.sql

Without AI:
  → documents/database-migration.sql (it's not code, must be docs?)

With AI:
  → api/migrations/database-migration.sql (detects SQL migration syntax)
```

---

## 📊 Success Metrics

After adding keys, users will see:
- ✅ Smarter file placement suggestions
- ✅ 95-98% cost savings (vs Claude Sonnet)
- ✅ Fewer manual moves needed
- ✅ Better monorepo organization
- ✅ Context-aware reasoning in plan output
