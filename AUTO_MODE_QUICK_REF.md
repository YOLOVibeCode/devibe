# Auto Mode Quick Reference

Fast reference for D-Vibe's automatic organization modes.

## Commands

```bash
# With AI (90% accuracy)
devibe plan --auto              # Preview
devibe execute --auto           # Execute

# Without AI (65% accuracy, no API keys)
devibe plan --auto --no-ai      # Preview
devibe execute --auto --no-ai   # Execute
```

## Comparison

| Mode | Accuracy | Speed | Cost | API Key |
|------|----------|-------|------|---------|
| `--auto` | 90% | Fast | ~$0.06/1K files | ✅ Required |
| `--auto --no-ai` | 65% | Very Fast | Free | ❌ Not needed |

## What Gets Organized

| File Type | Destination | Example |
|-----------|-------------|---------|
| `.md` docs | `documents/` | `API.md` → `documents/API.md` |
| `.sh` scripts | `scripts/` | `deploy.sh` → `scripts/deploy.sh` |
| `.test.ts` | `tests/unit/` | `auth.test.ts` → `tests/unit/auth.test.ts` |
| Source code | `src/` | `utils.ts` → `src/utils.ts` |

**Never moved:** `README.md`, `LICENSE`, `package.json`, `.gitignore`, `tsconfig.json`

## Setup

### With AI

```bash
# 1. Add API key (one time)
devibe ai-key add google YOUR_GEMINI_KEY

# 2. Run
devibe execute --auto
```

### Without AI

```bash
# No setup needed!
devibe execute --auto --no-ai
```

## Safety

✅ **100% reversible** - All operations backed up  
✅ **Restore anytime** - `devibe restore <backup-id>`  
✅ **Dry-run available** - `devibe execute --auto --dry-run`  
✅ **Git boundaries respected** - Never cross repo boundaries

## Full Documentation

- [AI Auto Mode Guide](./AI_AUTO_MODE_GUIDE.md) - Complete guide
- [AI Setup Guide](./AI_SETUP_GUIDE.md) - AI configuration
- [Main README](./README.md) - All features

