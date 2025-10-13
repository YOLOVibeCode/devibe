# Markdown Consolidation in Auto Mode

**Date:** October 11, 2025  
**Feature:** Integrated markdown consolidation into `devibe --auto`  
**Status:** ✅ Complete and tested

---

## Overview

Markdown consolidation is now integrated into the `devibe --auto` workflow, allowing automatic cleanup **and** documentation consolidation in a single command. Two modes are available:

1. **Safe Mode** (default) - Folder-by-folder consolidation
2. **Aggressive Mode** - AI-powered topic summarization

---

## Usage Examples

### 1. Basic Auto Mode (with Safe Consolidation)

```bash
# Default: organizes files + consolidates docs safely
devibe --auto

# Equivalent to:
devibe --auto --consolidate-docs safe
```

**What it does:**
- Organizes root files into proper folders
- Creates `documents/` directory
- Consolidates markdown files folder-by-folder
- Preserves all content (100% safe)
- Creates `DOCUMENTATION_HUB.md` for navigation

**Output Example:**
```
🤖 Quick Auto-Organize: AI will automatically organize your repository

[1/7] Detecting repositories...
[2/7] Analyzing root files...
[3/7] Classifying files...
[4/7] Creating plan...
[5/7] Executing 15 operations...
[6/7] Consolidating markdown documentation...
   Found 12 markdown files
   Plan: Merge 4 files in guides/
   Plan: Merge 5 files in specs/
   Plan: Merge 3 files in notes/
   ✓ Consolidated: GUIDES_CONSOLIDATED.md
   ✓ Consolidated: SPECS_CONSOLIDATED.md
   ✓ Consolidated: NOTES_CONSOLIDATED.md
   ✓ Created DOCUMENTATION_HUB.md
[7/7] Auto cleanup complete!

Files analyzed: 27
Operations completed: 15
Duration: 12.45s
```

---

### 2. Aggressive Mode (Summarize Everything)

```bash
# Use AI to intelligently summarize all docs
devibe --auto --consolidate-docs aggressive

# Or with yolo command
devibe yolo --consolidate-docs aggressive
```

**What it does:**
- Organizes root files into proper folders
- Uses AI to cluster markdown files by **topic** (not just folder)
- Creates AI-generated summaries
- Dramatically reduces document count
- ⚠️ **May lose details** - use with caution!

**Output Example:**
```
🤖 Quick Auto-Organize: AI will automatically organize your repository

[1/7] Detecting repositories...
[2/7] Analyzing root files...
[3/7] Classifying files...
[4/7] Creating plan...
[5/7] Executing 18 operations...
[6/7] Consolidating markdown documentation...
   Found 23 markdown files
   Found 3 topic clusters
   Plan: Summarize 12 files → Architecture
   Plan: Summarize 7 files → API Documentation
   Plan: Summarize 4 files → Development Guides
   ✓ Consolidated: ARCHITECTURE_SUMMARY.md
   ✓ Consolidated: API_DOCUMENTATION_SUMMARY.md
   ✓ Consolidated: DEVELOPMENT_GUIDES_SUMMARY.md
   ✓ Created DOCUMENTATION_HUB.md
[7/7] Auto cleanup complete!

Files analyzed: 35
Operations completed: 18
Duration: 18.23s
```

---

### 3. Auto Mode WITHOUT Consolidation

```bash
# Only organize files, don't touch docs
devibe --auto --consolidate-docs none

# Or for execute command
devibe execute --auto --consolidate-docs none
```

---

### 4. Verbose Mode (See Details)

```bash
# See exactly what's happening
devibe --auto --consolidate-docs safe --verbose

# Or aggressive with verbose
devibe --auto --consolidate-docs aggressive --verbose
```

**Verbose Output:**
```
[6/7] Consolidating markdown documentation...
   Found 15 markdown files
   
   Relevant files after analysis:
   • documents/guides/getting-started.md (score: 85)
   • documents/guides/advanced-usage.md (score: 78)
   • documents/guides/troubleshooting.md (score: 72)
   • documents/api/authentication.md (score: 90)
   • documents/api/endpoints.md (score: 88)
   
   Creating consolidation plans...
   Plan: Merge 3 files in guides/
     - getting-started.md
     - advanced-usage.md
     - troubleshooting.md
     → GUIDES_CONSOLIDATED.md
   
   Plan: Merge 2 files in api/
     - authentication.md
     - endpoints.md
     → API_CONSOLIDATED.md
   
   Executing consolidation...
   ✓ Backed up: documents/guides/getting-started.md
   ✓ Backed up: documents/guides/advanced-usage.md
   ✓ Backed up: documents/guides/troubleshooting.md
   ✓ Consolidated: GUIDES_CONSOLIDATED.md
   
   ✓ Backed up: documents/api/authentication.md
   ✓ Backed up: documents/api/endpoints.md
   ✓ Consolidated: API_CONSOLIDATED.md
   
   Generating documentation hub...
   ✓ Created DOCUMENTATION_HUB.md
```

---

## Mode Comparison

| Feature | Safe Mode | Aggressive Mode |
|---------|-----------|-----------------|
| **Strategy** | Folder-by-folder merge | AI topic clustering + summarization |
| **Content Preservation** | 100% | 70-85% (summaries may lose details) |
| **Consolidation** | Moderate (per folder) | High (across all docs) |
| **AI Usage** | Minimal (relevance only) | Heavy (clustering + summarization) |
| **Speed** | Fast | Slower (more AI calls) |
| **Risk Level** | ✅ Low | ⚠️ Medium-High |
| **Best For** | Production docs | Quick overviews, prototypes |
| **Output Files** | One per folder | One per topic cluster |

---

## Safe Mode Details

### How It Works

1. **Scan** - Finds all `.md` files in `documents/` recursively
2. **Analyze** - Calculates relevance scores (recency, quality, connectivity, uniqueness)
3. **Filter** - Removes stale files (score < 30)
4. **Group** - Groups files by immediate parent folder
5. **Consolidate** - Merges files within each folder (if 2+ files)
6. **Index** - Creates `DOCUMENTATION_HUB.md`

### Example Directory Structure

**Before:**
```
documents/
├── getting-started.md
├── advanced-guide.md
├── tips.md
├── api/
│   ├── auth.md
│   ├── endpoints.md
│   └── examples.md
└── architecture/
    ├── overview.md
    ├── components.md
    └── OLD_NOTES.md (stale)
```

**After (Safe Mode):**
```
documents/
├── CONSOLIDATED_DOCS.md        (merged: getting-started, advanced-guide, tips)
├── DOCUMENTATION_HUB.md        (navigation index)
├── api/
│   ├── API_CONSOLIDATED.md     (merged: auth, endpoints, examples)
│   └── [originals preserved]
└── architecture/
    ├── ARCHITECTURE_CONSOLIDATED.md  (merged: overview, components)
    └── [originals preserved, OLD_NOTES archived]
```

### Safe Mode Guarantees

✅ **Content Preservation** - 100% of content from relevant files  
✅ **Folder Structure** - Respects your directory organization  
✅ **Minimal Risk** - Simple concatenation, no AI summarization  
✅ **Predictable** - Same folder → same output file  
✅ **Backups** - All originals backed up before consolidation  

---

## Aggressive Mode Details

### How It Works

1. **Scan** - Finds all `.md` files in `documents/` recursively
2. **Analyze** - Calculates relevance scores
3. **Filter** - Removes stale files
4. **AI Cluster** - Uses AI to group files by **semantic topic** (ignores folder structure)
5. **Summarize** - AI creates concise summaries for each cluster
6. **Index** - Creates `DOCUMENTATION_HUB.md`

### Example Directory Structure

**Before:**
```
documents/
├── auth-overview.md
├── security-best-practices.md
├── api/
│   ├── authentication-endpoints.md
│   ├── user-management.md
│   └── data-models.md
└── guides/
    ├── auth-tutorial.md
    └── deployment.md
```

**After (Aggressive Mode):**
```
documents/
├── AUTHENTICATION_SECURITY_SUMMARY.md  (merged: auth-overview, security-best-practices,
│                                        authentication-endpoints, auth-tutorial)
├── USER_DATA_MANAGEMENT_SUMMARY.md     (merged: user-management, data-models)
├── DEPLOYMENT_SUMMARY.md               (single file, just copied)
├── DOCUMENTATION_HUB.md                (navigation index)
└── [originals preserved in backups]
```

**Notice:** Files from different folders were grouped by topic!

### Aggressive Mode Trade-offs

⚠️ **Content Reduction** - AI summaries may lose 15-30% of details  
⚠️ **Semantic Grouping** - Ignores folder structure (groups by meaning)  
⚠️ **Less Predictable** - AI clustering varies based on content  
⚠️ **Slower** - More AI API calls required  
✅ **Dramatic Consolidation** - Can reduce 30 files to 3-5 summaries  
✅ **Intelligent** - Groups related topics even if in different folders  
✅ **Backups** - All originals backed up (can restore if needed)  

---

## Real-World Examples

### Example 1: Clean Up After AI Coding Session

**Scenario:** After a 3-hour AI pair programming session, you have 47 files in root and 23 markdown docs scattered everywhere.

**Solution:**
```bash
# Quick cleanup with safe consolidation
devibe --auto

# Result:
# - 47 root files → organized into documents/, scripts/, tests/
# - 23 markdown files → consolidated into 5-7 files by folder
# - DOCUMENTATION_HUB.md created for navigation
# - All changes backed up
```

### Example 2: Prototype Documentation Cleanup

**Scenario:** You've been rapidly prototyping and have 50+ markdown notes, many outdated or redundant.

**Solution:**
```bash
# Aggressive summarization
devibe --auto --consolidate-docs aggressive --verbose

# Result:
# - Stale docs identified and excluded
# - 50 markdown files → 8 topic summaries
# - Quick overview of entire project
# - Originals backed up for reference
```

### Example 3: Safe Documentation Maintenance

**Scenario:** You want to organize documentation without risking any content loss.

**Solution:**
```bash
# Safe mode with verbose output
devibe --auto --consolidate-docs safe --verbose

# Result:
# - Folder-by-folder consolidation
# - 100% content preservation
# - Clear visibility into what's happening
# - Easy to review consolidated files
```

---

## Integration with Existing Workflows

### CI/CD Integration

```bash
# In your CI pipeline
devibe --auto --consolidate-docs safe

# Check for validation errors
if [ $? -ne 0 ]; then
  echo "Consolidation failed validation"
  devibe restore
  exit 1
fi
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Only consolidate if in documents/
if git diff --cached --name-only | grep -q '^documents/'; then
  echo "Consolidating documentation..."
  devibe consolidate documents/ --dry-run
  
  # Show what would change
  echo "Review changes above. Continue? (y/n)"
  read -r response
  if [[ "$response" != "y" ]]; then
    exit 1
  fi
fi
```

### Weekly Cron Job

```bash
# Cron: Every Monday at 9am
0 9 * * 1 cd /path/to/repo && devibe --auto --consolidate-docs safe

# Keep docs tidy without manual intervention
```

---

## Safety Features

All modes include these safety features:

1. **Automatic Backups** - Every file backed up before modification
2. **Relevance Filtering** - Stale docs (score < 30) excluded
3. **Content Validation** - Checks for excessive content loss (>30% = error)
4. **Broken Link Detection** - Warns about broken relative links
5. **Easy Rollback** - `devibe restore` reverts all changes
6. **Originals Preserved** - Files not deleted automatically
7. **Verbose Mode** - See exactly what's happening
8. **Dry-Run Support** - Preview without making changes (use standalone consolidate command)

---

## Command Reference

### Global Options

```bash
devibe --auto [options]
```

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--consolidate-docs` | `safe`, `aggressive`, `none` | `safe` | Consolidation mode |
| `--no-ai` | flag | false | Use heuristics only |
| `--verbose` | flag | false | Detailed output |
| `-p, --path` | path | `.` | Repository path |

### Other Commands with Consolidation

```bash
# Plan command (preview)
devibe plan --consolidate-docs safe

# Execute command
devibe execute --auto --consolidate-docs aggressive

# Yolo command (same as --auto)
devibe yolo --consolidate-docs safe
```

### Standalone Consolidation

```bash
# For more control, use the consolidate command directly
devibe consolidate --help

# Examples:
devibe consolidate documents/ --dry-run
devibe consolidate documents/ --recursive
devibe consolidate documents/ --auto  # Skip confirmation
```

---

## FAQ

**Q: Will aggressive mode delete my original files?**  
A: No! Originals are preserved and backed up. You must manually delete them after reviewing consolidated files.

**Q: Can I restore if I don't like the results?**  
A: Yes! Run `devibe restore` to revert all changes.

**Q: How much AI API usage does this add?**  
A: Safe mode: Minimal (just relevance scoring). Aggressive mode: Moderate (clustering + summarization, ~$0.01-0.05 per 10 files with Claude).

**Q: What if I have no documents/ folder?**  
A: Consolidation is skipped automatically (no error).

**Q: Can I consolidate a specific directory?**  
A: Use the standalone command: `devibe consolidate ./my-docs --recursive`

**Q: Does this work with other markdown locations?**  
A: Auto mode only targets `documents/`. Use standalone `devibe consolidate` for other directories.

**Q: What happens to README.md in documents/?**  
A: It's listed in DOCUMENTATION_HUB.md but not consolidated (preserved as main entry point).

**Q: Can I configure consolidation behavior?**  
A: Not yet. Currently uses sensible defaults. Configuration coming in v2.0.

---

## Best Practices

### ✅ DO

- Start with `safe` mode to get familiar
- Use `--verbose` to see what's happening
- Review consolidated files before deleting originals
- Keep backups for at least a few days
- Use `aggressive` mode for prototype/draft docs
- Run consolidation regularly (weekly/monthly)

### ❌ DON'T

- Use `aggressive` mode on critical production docs without review
- Delete originals immediately without reading consolidated versions
- Run consolidation without AI configured (required)
- Use `--auto` on >20 files without reviewing first (safe mode is OK)
- Consolidate docs with complex cross-references (check DOCUMENTATION_HUB instead)

---

## Troubleshooting

### Issue: "AI provider not available"

**Solution:**
```bash
# Configure AI key first
devibe ai-key add anthropic YOUR_KEY

# Or use environment variable
export ANTHROPIC_API_KEY=your_key_here
devibe --auto
```

### Issue: "Consolidation failed validation"

**Cause:** Content loss exceeded 30%  
**Solution:**
```bash
# Check what happened
ls documents/

# Restore if needed
devibe restore

# Try safe mode instead of aggressive
devibe --auto --consolidate-docs safe
```

### Issue: "No markdown files found"

**Cause:** No `.md` files in `documents/` directory  
**Solution:** This is normal if you have no docs. Create `documents/` and add some markdown files.

### Issue: Consolidated files are confusing

**Cause:** Aggressive mode grouped unexpectedly  
**Solution:**
```bash
# Restore and use safe mode
devibe restore
devibe --auto --consolidate-docs safe

# Or organize your folders better first
```

---

## Next Steps

1. **Try It:** `devibe --auto --consolidate-docs safe --verbose`
2. **Review Output:** Check `documents/DOCUMENTATION_HUB.md`
3. **Read Consolidated Files:** Verify content looks good
4. **Experiment:** Try `aggressive` mode on a copy of your docs
5. **Automate:** Add to your workflow once comfortable

---

**Status:** ✅ Feature complete and production-ready  
**Version:** devibe v1.6.0  
**Date:** October 11, 2025




