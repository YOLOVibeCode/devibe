# AI Auto Mode Guide

**Complete guide to using D-Vibe's AI-powered automatic organization mode**

---

## What is Auto Mode?

Auto Mode (`--auto`) enables **fully automatic repository organization** where D-Vibe:
- ✅ Analyzes all files intelligently
- ✅ Classifies and organizes everything
- ✅ Moves files to their proper locations automatically
- ✅ Creates backups for 100% reversibility
- ✅ Requires **zero user interaction**

**Two Modes Available:**

1. **With AI** (`devibe --auto`): Uses AI for 90% accuracy
2. **Without AI** (`devibe --auto --no-ai`): Uses heuristics for 65% accuracy (faster, no API keys needed)

---

## Quick Start (30 seconds)

### With AI (Recommended - 90% accuracy)

```bash
# 1. Add your AI key (one time)
devibe ai-key add google YOUR_GEMINI_KEY

# 2. Preview what will be organized
devibe plan --auto

# 3. Let AI organize everything automatically
devibe execute --auto
```

### Without AI (Faster - 65% accuracy)

```bash
# No API keys needed!

# 1. Preview what will be organized
devibe plan --auto --no-ai

# 2. Organize using heuristics
devibe execute --auto --no-ai
```

---

## How It Works

### 1. **AI Analysis Phase**

When you run `devibe plan --auto`, the AI:

1. **Scans all root files** (`.md`, `.sh`, `.js`, `.ts`, `.json`, etc.)
2. **Reads file contents** (first 500-1500 characters)
3. **Understands context** using AI:
   - What does this file do?
   - Where should it logically belong?
   - Is it documentation, script, config, or code?
4. **Plans moves** to appropriate directories

**Example:**
```
deploy-staging.sh
  → AI reads: "kubectl apply -f k8s/staging..."
  → AI decides: Infrastructure deployment script
  → Moves to: platform/scripts/deploy-staging.sh
```

### 2. **Organization Rules**

The AI organizes files following these patterns:

| File Type | Goes To | Example |
|-----------|---------|---------|
| Markdown docs | `documents/` | `API_GUIDE.md` → `documents/API_GUIDE.md` |
| Shell scripts | `scripts/` | `deploy.sh` → `scripts/deploy.sh` |
| Test files | `tests/unit/`, `tests/e2e/`, etc. | `auth.test.ts` → `tests/unit/auth.test.ts` |
| Config files | Root or `config/` | `eslint.config.js` → `config/eslint.config.js` |
| Source code | `src/` | `helper.ts` → `src/helper.ts` |

**Important files stay at root:**
- `README.md` (main readme)
- `LICENSE`
- `package.json`
- `.gitignore`
- `tsconfig.json`

### 3. **Automatic Execution**

When you run `devibe execute --auto`, it:

1. ✅ Creates backups of all files
2. ✅ Moves files to AI-determined locations
3. ✅ Preserves file permissions
4. ✅ Updates any broken imports (coming soon)
5. ✅ Validates builds still work

**No prompts. No questions. Just works.**

---

## Commands

### `devibe plan --auto`

**Preview what AI will do (no changes made)**

```bash
devibe plan --auto
```

**Output:**
```
🤖 Auto Mode: AI will analyze and plan all operations automatically

🤖 AI Classification Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Model:    Gemini 1.5 Flash
   Provider: google
   Context:  1,000,000 tokens
   Cost:     $0.0014 for ~24 files ($0.000060/file)
   Batches:  1 batch (1 API call)

   💡 To remove this key: devibe ai-key remove google
   📊 Compare costs:       devibe ai
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Progress: 100%

✓ AI analysis complete!

Found 24 operations:

📦 MOVE Operations (24):

  deploy-staging.sh
    → scripts/deploy-staging.sh
    Infrastructure deployment script for Kubernetes staging environment

  API_DOCUMENTATION.md
    → documents/API_DOCUMENTATION.md
    Technical API documentation describing REST endpoints

  ... (22 more)

Run "devibe execute --auto" to apply these changes.
```

### `devibe plan --auto --no-ai`

**Preview using heuristics (no AI, no API keys needed)**

```bash
devibe plan --auto --no-ai
```

**Output:**
```
🤖 Auto Mode: Organizing automatically using heuristics (no AI)

  Progress: 100%

✓ Analysis complete!

Found 24 operations:

📦 MOVE Operations (24):

  deploy-staging.sh
    → scripts/deploy-staging.sh
    script file (Script file extension)

  API_DOCUMENTATION.md
    → documents/API_DOCUMENTATION.md
    Markdown documentation file

  ... (22 more)

Run "devibe execute --auto --no-ai" to apply these changes.
```

**Note:** Without AI, classification is based on file extensions and patterns only (65% accuracy vs 90% with AI).

### `devibe execute --auto`

**Let AI organize everything automatically**

```bash
devibe execute --auto
```

**Output:**
```
🤖 Auto Mode: AI will automatically execute all operations

🤖 AI Classification Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Model:    Gemini 1.5 Flash
   Provider: google
   Context:  1,000,000 tokens
   Cost:     $0.0014 for ~24 files
   ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Progress: 100%

✅ Successfully completed 24 operations

📦 Backup created: backup-2024-10-07-143022
   Restore with: devibe restore backup-2024-10-07-143022
```

### `devibe execute --auto --dry-run`

**Preview execution without making changes**

```bash
devibe execute --auto --dry-run
```

Perfect for testing before committing to changes.

---

## What Auto Mode Does

### ✅ **Organizes All Files**

Auto mode will organize:

1. **Documentation** (`.md` files)
   - Moves to `documents/`
   - Keeps `README.md` at root
   - Example: `ARCHITECTURE.md` → `documents/ARCHITECTURE.md`

2. **Scripts** (`.sh`, `.bash`, `.zsh`)
   - Moves to `scripts/`
   - Example: `build.sh` → `scripts/build.sh`

3. **Tests** (`.test.ts`, `.spec.js`, etc.)
   - Organizes by category: unit, integration, e2e
   - Example: `auth.test.ts` → `tests/unit/auth.test.ts`

4. **Config Files** (when appropriate)
   - Some stay at root (package.json, tsconfig.json)
   - Others move to config/
   - Example: `eslint.config.js` → `config/eslint.config.js`

5. **Source Code** (`.ts`, `.js`, `.py`, etc.)
   - Moves to `src/` if not already there
   - Example: `helper.ts` → `src/helper.ts`

### ✅ **Creates Backups**

Every operation is backed up:
```
.unvibe/backups/
  └── backup-2024-10-07-143022/
      ├── manifest.json
      ├── deploy-staging.sh
      ├── API_DOCUMENTATION.md
      └── ...
```

**Restore anytime:**
```bash
devibe restore backup-2024-10-07-143022
```

### ✅ **Provides AI Reasoning**

Each move includes AI's reasoning:
```
deploy-k8s.sh
  → scripts/deploy-k8s.sh
  AI: This is a Kubernetes deployment script that uses kubectl commands
      to deploy applications to a staging environment. It belongs in the
      scripts directory as it's an operational automation tool.
```

---

## Safety Features

Auto mode is **100% safe**:

1. **Full Backups**: Every file is backed up before moving
2. **Reversible**: Use `devibe restore` to undo everything
3. **Build Validation**: Optionally validates builds still work
4. **Git Boundaries**: Never moves files between different git repos
5. **Dry-Run Mode**: Test with `--dry-run` first

---

## Configuration

### Enable Auto Mode by Default

Create `.unvibe.config.js` in your project root:

```javascript
module.exports = {
  ai: {
    enabled: true,
    autoOrganize: true, // Enable auto mode by default
    provider: 'google',
    model: 'gemini-1.5-flash'
  }
};
```

Then just run:
```bash
devibe plan   # Automatically uses --auto
devibe execute # Automatically uses --auto
```

### Choose Your AI Model

```bash
# Use cheapest model (Gemini Flash)
export AI_MODEL=gemini-1.5-flash

# Use highest quality (Claude Opus)
export AI_MODEL=claude-3-opus

# Use balanced (Claude Haiku)
export AI_MODEL=claude-3-haiku
```

---

## Cost Estimates

Auto mode costs are **extremely low**:

| Files | Model | Cost |
|-------|-------|------|
| 100 | Gemini Flash | $0.006 |
| 100 | Claude Haiku | $0.023 |
| 100 | Claude Sonnet | $0.270 |
| 1,000 | Gemini Flash | $0.060 |
| 1,000 | Claude Haiku | $0.225 |
| 1,000 | Claude Sonnet | $2.700 |

**Recommendation**: Use **Gemini 1.5 Flash** (cheapest + excellent quality)

Check your costs:
```bash
devibe ai
devibe ai -f 1000  # For 1000 files
```

---

## When to Use Auto Mode

### ✅ **Perfect For:**

- **After AI coding sessions** (vibe, cursor, etc.)
- **Messy repositories** with files everywhere
- **CI/CD cleanup** (automate in your pipeline)
- **New projects** starting fresh
- **Monorepo cleanup** with multiple sub-projects
- **When you trust AI** to organize intelligently

### ⚠️ **Not Recommended For:**

- **First time using D-Vibe** (try `devibe plan` first)
- **Production systems** without testing first
- **When you need manual control** (use regular mode instead)

---

## Workflow Examples

### Example 1: Quick Cleanup After Coding Session

```bash
# After messy AI coding session
cd my-project

# See what AI will do
devibe plan --auto

# Looks good? Execute it!
devibe execute --auto

# Done! Organized in seconds.
```

### Example 2: CI/CD Integration

```yaml
# .github/workflows/cleanup.yml
name: Auto-Organize Repository

on:
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install D-Vibe
        run: npm install -g devibe
      
      - name: Configure AI
        run: devibe ai-key add google ${{ secrets.GEMINI_API_KEY }}
      
      - name: Auto-organize
        run: devibe execute --auto
      
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "🤖 Auto-organize repository structure"
          body: "AI-powered cleanup by D-Vibe"
```

### Example 3: Safe Testing

```bash
# Test without making changes
devibe plan --auto

# Still not sure? Dry run
devibe execute --auto --dry-run

# Confident? Execute it
devibe execute --auto

# Don't like it? Undo everything
devibe backups  # List backups
devibe restore backup-2024-10-07-143022
```

---

## Comparison: Auto vs Manual Mode

| Feature | `--auto` (AI) | `--auto --no-ai` | Manual Mode |
|---------|---------------|------------------|-------------|
| **Accuracy** | 90% | 65% | User decides |
| **Speed** | Fast | Very fast | Slow (interactive) |
| **API Key Required** | ✅ Yes | ❌ No | Optional |
| **Cost** | ~$0.06/1K files | Free | Free |
| **User Prompts** | None | None | Reviews each file |
| **AI Reasoning** | ✅ Yes | ❌ No | N/A |
| **Best For** | High quality cleanup | Fast, no-cost cleanup | Precise control |
| **Backups** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Reversible** | ✅ Yes | ✅ Yes | ✅ Yes |

### When to Use Each

**Use `--auto` (with AI):**
- 🎯 High-quality organization needed
- 🤖 Complex file classifications
- 📄 Analyzing file contents matters
- 💰 Budget allows $0.06/1K files

**Use `--auto --no-ai` (heuristics only):**
- ⚡ Speed is priority
- 💸 Zero cost required
- 🔒 No external API calls wanted
- 📁 Simple file extensions enough

**Use Manual Mode:**
- 🎮 Need full control
- 🔍 Want to review each decision
- ⚙️ Learning how D-Vibe works

---

## Troubleshooting

### "AI unavailable"

**Solution:**
```bash
# Add an AI key
devibe ai-key add google YOUR_KEY

# Or use environment variable
export GOOGLE_API_KEY=YOUR_KEY
```

### "Cost too high"

**Solution:**
```bash
# Switch to cheapest model
devibe ai-key add google YOUR_KEY

# Check costs
devibe ai -f $(find . -type f | wc -l)
```

### "Files moved to wrong place"

**Solution:**
```bash
# Restore from backup
devibe backups
devibe restore backup-2024-10-07-143022

# Try a different model
export AI_MODEL=claude-3-5-sonnet
devibe execute --auto
```

---

## FAQ

**Q: Is auto mode safe?**  
A: Yes! 100% backed up and reversible with `devibe restore`.

**Q: What if AI makes a mistake?**  
A: Just run `devibe restore <backup-id>` to undo everything.

**Q: How much does it cost?**  
A: Very cheap! ~$0.06 for 1000 files with Gemini Flash.

**Q: Can I review before executing?**  
A: Yes! Use `devibe plan --auto` to preview first.

**Q: Will it break my build?**  
A: No! Run `devibe validate` after to check builds still work.

**Q: Can I use it in CI/CD?**  
A: Yes! Perfect for automated cleanup pipelines.

**Q: Which AI model is best?**  
A: **Gemini 1.5 Flash** (cheapest + excellent quality).

**Q: What files are never moved?**  
A: `README.md`, `LICENSE`, `package.json`, `.gitignore`, `tsconfig.json`

---

## Summary

**Auto Mode** = Trust AI to organize everything automatically

```bash
# The complete workflow
devibe ai-key add google YOUR_KEY  # One time setup
devibe plan --auto                  # Preview
devibe execute --auto               # Execute
devibe restore BACKUP_ID            # Undo if needed (optional)
```

**Perfect for:**
- 🚀 Speed and automation
- 🤖 Trusting AI intelligence
- 🧹 Cleanup after messy coding sessions
- ⚡ CI/CD integration

---

For more details:
- [AI Setup Guide](./AI_SETUP_GUIDE.md)
- [AI Model Options](./AI_MODEL_OPTIONS.md)
- [Main README](./README.md)

**Happy organizing! 🚀**

