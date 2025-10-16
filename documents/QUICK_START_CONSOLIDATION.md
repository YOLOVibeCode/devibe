# 🚀 Quick Start: Markdown Consolidation

## Try It Now!

### 1. Safe Mode (Recommended First Try)

```bash
# Organize files + consolidate docs safely
devibe --auto
```

**What happens:**
- ✅ Organizes root files into proper folders
- ✅ Consolidates markdown files folder-by-folder
- ✅ 100% content preservation
- ✅ Creates DOCUMENTATION_HUB.md
- ✅ All originals backed up

---

### 2. See the Demo

```bash
# Interactive demo showing both modes
./demo-consolidation-modes.sh
```

---

### 3. Aggressive Mode (Try on a Copy First!)

```bash
# AI-powered topic summarization
devibe --auto --consolidate-docs aggressive --verbose
```

**What happens:**
- ⚡ AI groups files by topic (ignores folders)
- ⚡ Creates AI-generated summaries
- ⚠️ May lose 15-30% of details
- ✅ Dramatically reduces file count
- ✅ All originals backed up

---

## Command Cheat Sheet

```bash
# Default (safe mode)
devibe --auto

# With details
devibe --auto --verbose

# Aggressive mode
devibe --auto --consolidate-docs aggressive

# Skip consolidation
devibe --auto --consolidate-docs none

# Quick command
devibe yolo

# Rollback if needed
devibe restore

# Standalone consolidation (more control)
devibe consolidate documents/ --dry-run
devibe consolidate documents/ --recursive
```

---

## When to Use Which Mode

| Use This | When |
|----------|------|
| **`devibe --auto`** | Regular cleanup, production docs |
| **`devibe --auto --consolidate-docs aggressive`** | Too many docs (30+), prototypes |
| **`devibe --auto --consolidate-docs none`** | Only organize files, skip docs |
| **`devibe consolidate --dry-run`** | Preview before committing |

---

## Safety Checklist

✅ All files backed up automatically  
✅ Originals preserved (not deleted)  
✅ `devibe restore` to rollback  
✅ Validation checks content preservation  
✅ Warning system for risky operations  
✅ Backups in `.devibe/backups` or `.unvibe/backups`  

---

## Documentation

- **Full Guide:** `CONSOLIDATION_AUTO_MODE.md`
- **Safety Analysis:** `CONSOLIDATION_SAFETY_IMPROVEMENTS.md`
- **Feature Summary:** `FEATURE_COMPLETE_AUTO_MODE.md`
- **This Quick Start:** `QUICK_START_CONSOLIDATION.md`

---

## Need Help?

```bash
devibe --help
devibe consolidate --help
devibe yolo --help
```

---

**Ready?** Run `devibe --auto` and watch it work! 🎉




