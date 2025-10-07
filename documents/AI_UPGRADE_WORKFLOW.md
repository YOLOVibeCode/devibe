# AI Key Upgrade Workflow

Complete walkthrough of the user experience from environment variable to optimized setup.

---

## 🎬 Complete User Journey

### Starting Point: User Has ANTHROPIC_API_KEY

```bash
# User already has Claude Sonnet key in environment
export ANTHROPIC_API_KEY=sk-ant-api03-XXX...

# Run devibe for first time
$ devibe ai-key status

🤖 AI Configuration Status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 DevIbe Keys (Primary):

   No keys configured

🔑 Environment Variables (Fallback):

   ✓ ANTHROPIC_API_KEY

📊 Active Configuration:

   🔑 Using: Claude 3.5 Sonnet
   Provider: anthropic
   Source: Environment
   Context: 200,000 tokens
   Cost: $3/M input

💡 Cost Optimization Available:

   Switch to Gemini 1.5 Flash and save 98%
   From: $3/M → To: $0.075/M

   devibe ai-key add google <your-api-key>

   Get your key: https://makersuite.google.com/app/apikey
```

---

### Step 1: User Sees the Upgrade Suggestion

**DevIbe notices** they're using an expensive environment key and suggests cheaper options.

```bash
# See detailed analysis
$ devibe ai

🤖 AI Model Cost Analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configured Providers:

   🔑 anthropic (environment variable)

💰 Cost Comparison for 1,000 Files:

┌────────────────────────┬─────────────┬──────────────┬────────────┐
│ Model                  │ Total Cost  │ Cost/File    │ API Calls  │
├────────────────────────┼─────────────┼──────────────┼────────────┤
│ Gemini 1.5 Flash       │ $0.0600     │ $0.000060    │          2 │ ⭐
│ GPT-4o Mini            │ $0.1200     │ $0.000120    │         13 │
│ Claude 3 Haiku         │ $0.2250     │ $0.000225    │          9 │
│ Claude 3.5 Sonnet      │ $2.7000     │ $0.002700    │         10 │ ← Current
└────────────────────────┴─────────────┴──────────────┴────────────┘

🎯 Recommendation:

   Use: Gemini 1.5 Flash
   Provider: google
   Context: 1,000,000 tokens (5x larger!)
   Batch size: 600 files per call
   Cost: $0.0600 (save $2.6400 or 98%)

⚡ Quick Setup:

   devibe ai-key add google <your-api-key>

   Get your key: https://makersuite.google.com/app/apikey
```

---

### Step 2: User Adds Optimized Key

```bash
# Get Google API key from https://makersuite.google.com/app/apikey
# Add it to devibe

$ devibe ai-key add google AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

✅ google API key saved securely

   Location: /Users/you/.devibe/ai-keys.enc
   Encrypted: Yes
   Git-ignored: Yes (stored in ~/.devibe/)

✨ You can now use:
   • Gemini 1.5 Flash (good quality, 1,000,000 tokens)
   • Gemini 1.5 Pro (excellent quality, 2,000,000 tokens)
```

---

### Step 3: DevIbe Now Uses The Better Key

```bash
$ devibe plan

Detecting repositories...
   ℹ️  Using AI: Gemini 1.5 Flash (configured)
                ↑ Shows it's using devibe key, not env!

Planning file organization...
```

**Key Points:**
- ✅ **Env key still works** (not deleted/disabled)
- ✅ **DevIbe key takes priority**
- ✅ **Always shows which one is active**
- ✅ **98% cost savings automatically**

---

### Step 4: Check Status Anytime

```bash
$ devibe ai-key status

🤖 AI Configuration Status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 DevIbe Keys (Primary):

   ✓ google        AIzaSyXX...fYZ4

   Stored at: /Users/you/.devibe/ai-keys.enc

🔑 Environment Variables (Fallback):

   ✓ ANTHROPIC_API_KEY

📊 Active Configuration:

   🔧 Using: Gemini 1.5 Flash
   Provider: google
   Source: DevIbe key              ← Clearly shows source!
   Context: 1,000,000 tokens
   Cost: $0.075/M input

🔄 To Revert to Environment Variables:

   devibe ai-key clear              ← Easy way to go back!
```

---

### Step 5: User Can Easily Revert

```bash
# If they want to go back to environment variable for any reason
$ devibe ai-key clear

✅ Cleared 1 devibe-configured key(s)

   DevIbe will now use environment variables (if set):

   • ANTHROPIC_API_KEY
   • OPENAI_API_KEY
   • GOOGLE_API_KEY

   Environment variables found:
   ✓ ANTHROPIC_API_KEY
```

**Now using environment key again:**

```bash
$ devibe plan

Detecting repositories...
   ℹ️  Using AI: Claude 3.5 Sonnet (env)
                ↑ Back to environment!

Planning file organization...
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User State: Has ANTHROPIC_API_KEY in environment            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
             ┌────────────────────────────┐
             │  devibe ai-key status      │
             │  Shows: Using Claude (env) │
             │  Suggests: Gemini (98% off)│
             └────────────────────────────┘
                           │
                           ▼
            ┌─────────────────────────────────┐
            │ User runs:                       │
            │ devibe ai-key add google KEY     │
            └─────────────────────────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │ NOW USING:                │
              │ Gemini (devibe key) ✓    │
              │ Environment key = backup │
              └──────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
         Want to revert?        Happy with it?
                  │                 │
                  ▼                 ▼
        ┌──────────────────┐   ┌─────────────┐
        │ devibe ai-key    │   │   Keep using│
        │     clear        │   │   Saves 98% │
        └──────────────────┘   └─────────────┘
                  │
                  ▼
          ┌───────────────────┐
          │ Back to Claude    │
          │ (environment key) │
          └───────────────────┘
```

---

## 🎯 Key Features

### 1. **Non-Destructive**
✅ Adding devibe key doesn't remove environment key
✅ Environment key remains as fallback
✅ Can switch back anytime

### 2. **Always Visible**
✅ Every command shows which key is active
✅ Source is clearly labeled (configured vs env)
✅ Easy to check status: `devibe ai-key status`

### 3. **Smart Suggestions**
✅ Detects when using expensive environment key
✅ Calculates exact savings
✅ Provides direct link to get cheaper key

### 4. **Easy Management**
✅ `devibe ai-key add` - Upgrade
✅ `devibe ai-key status` - Check config
✅ `devibe ai-key clear` - Revert
✅ `devibe ai-key list` - Quick view

---

## 📊 Use Cases

### Use Case 1: Developer With Existing Claude Key

**Before:**
- Using ANTHROPIC_API_KEY
- Paying $3/M tokens
- 200K context window

**After:**
- Adds Google Gemini key via devibe
- Paying $0.075/M tokens (98% less!)
- 1M context window (5x larger!)
- Can revert anytime

### Use Case 2: Team Standardization

**Team has:**
- Mixed environment variables (some Claude, some OpenAI)
- Different cost profiles
- No consistency

**Solution:**
```bash
# Everyone runs
devibe ai-key add google TEAM_SHARED_KEY

# Now everyone uses:
# - Same provider (Gemini)
# - Same model (Flash)
# - Same cost structure
# - But keeps personal keys as fallback
```

### Use Case 3: Cost Testing

**Scenario:** Want to test if cheaper model is good enough

```bash
# Current: Using Claude Opus (env)
devibe plan  # → Claude Opus ($15/M)

# Test: Add cheaper key
devibe ai-key add google KEY
devibe plan  # → Gemini Flash ($0.075/M)

# If quality is bad, revert
devibe ai-key clear
devibe plan  # → Back to Claude Opus
```

---

## 🔧 Commands Reference

```bash
# Status & Analysis
devibe ai-key status                    # Complete configuration status
devibe ai                                # Cost analysis & recommendations

# Add/Manage Keys
devibe ai-key add google KEY            # Add Google Gemini
devibe ai-key add anthropic KEY         # Add Anthropic Claude
devibe ai-key add openai KEY            # Add OpenAI GPT-4

# View Configuration
devibe ai-key list                      # List configured providers
devibe ai-models                        # Show all available models
devibe ai-key show                      # Show storage details

# Revert to Environment
devibe ai-key clear                     # Remove all devibe keys
devibe ai-key remove google             # Remove specific provider

# Check What's Active
devibe plan                             # Shows "Using AI: [Model] ([Source])"
devibe status                           # Shows AI availability
```

---

## ❓ FAQ

**Q: What happens to my ANTHROPIC_API_KEY when I add a Google key?**
A: Nothing! It stays in your environment and works as fallback.

**Q: How do I know which key is being used?**
A: Every command shows: `Using AI: [Model Name] (configured|env)`

**Q: Can I switch back easily?**
A: Yes! Run `devibe ai-key clear` to use environment variables again.

**Q: What if I have multiple devibe keys?**
A: DevIbe uses the cheapest one. Override with `AI_MODEL` env var.

**Q: Is the upgrade worth it?**
A: Gemini Flash vs Claude Sonnet:
- 98% cheaper ($0.075/M vs $3/M)
- 5x larger context (1M vs 200K tokens)
- Still excellent quality
- 600 files per batch vs 100

**Q: What if Gemini quality isn't good enough?**
A: `devibe ai-key clear` → back to your original setup in 2 seconds.

---

## 🚀 Best Practices

1. **Start with environment variable** (you probably already have one)
2. **Run `devibe ai-key status`** to see if there's a better option
3. **Try the recommended cheaper key** (usually Gemini Flash)
4. **Test quality** on a few files
5. **Keep both keys** - devibe key for regular use, env as fallback
6. **Use `devibe ai-key status`** periodically to check for better options

---

## 💡 Pro Tips

### Tip 1: Test Before Committing
```bash
# Add new key (doesn't remove old one)
devibe ai-key add google KEY

# Test it
devibe plan --dry-run

# If good, keep it. If not:
devibe ai-key clear
```

### Tip 2: Per-Project Keys
```bash
# Work project: use company Claude key (env)
cd ~/work
devibe plan  # Uses ANTHROPIC_API_KEY

# Personal project: use your Gemini key (devibe)
cd ~/personal
devibe plan  # Uses devibe-stored Google key
```

### Tip 3: Cost Tracking
```bash
# Before upgrade
devibe ai -f 10000
# Claude Sonnet: $27.00

# After upgrade
devibe ai -f 10000
# Gemini Flash: $0.60

# Savings: $26.40 per 10K files!
```

---

## 🎉 Summary

**The Workflow:**
1. User has environment key → DevIbe uses it
2. DevIbe suggests cheaper option with exact savings
3. User adds optimized key → DevIbe uses new one
4. Environment key becomes fallback
5. Can revert anytime with one command

**Always knows what's active. Always non-destructive. Always optimizing for cost.**
