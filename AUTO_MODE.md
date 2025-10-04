# Auto Mode - AI-Powered Automatic Repository Cleanup

## Overview

Auto Mode allows devibe to automatically analyze and clean up your repository using AI, without requiring manual confirmation for each file operation. This is perfect for:

- Large repositories with many files to organize
- Trusted AI classification where you want hands-free operation
- CI/CD pipelines that need automated cleanup
- Bulk organization tasks

## How It Works

Auto Mode combines three intelligent systems:

1. **Learning Database** - Uses patterns from previous corrections
2. **Project Structure Analysis** - Understands your monorepo/framework setup
3. **Dependency Analysis** - Parses imports to determine file relationships
4. **AI Classification** - Uses Claude or GPT-4 to intelligently classify files

The system automatically:
- Detects all git repositories
- Analyzes project structure (NX, Turborepo, Lerna, etc.)
- Classifies all root files using AI
- Creates a comprehensive execution plan
- Executes all operations with automatic backup

## Usage

### Preview Mode (Safe)

See what Auto Mode would do without making changes:

```bash
# Preview AI-powered cleanup plan
devibe plan --auto

# Verbose output with detailed progress
devibe plan --auto --verbose
```

**Output:**
```
🤖 Auto Mode: AI will analyze and plan all operations automatically

  Progress: 100% - Analyzing files...

✓ AI analysis complete!

Found 15 operations:

📦 MOVE Operations (12):

  config.json
    → packages/backend/config/config.json
    AI classification: Configuration file for backend service

  test-utils.ts
    → packages/shared/utils/test-utils.ts
    AI classification: Shared utility for testing

...

Estimated duration: 2500ms

Run "devibe execute --auto" to apply these changes.
```

### Execute Mode (Make Changes)

Automatically clean up the repository:

```bash
# Execute AI-powered cleanup
devibe execute --auto

# Dry run (shows what would happen)
devibe execute --auto --dry-run

# Verbose output
devibe execute --auto --verbose
```

**Output:**
```
🤖 Auto Mode: AI will automatically execute all operations

  Progress: 100% - Executing operations...

✅ Auto cleanup complete!

Files analyzed: 15
Operations completed: 15
Duration: 3.2s

📦 Backup created: backup-20250104-091500
   Restore with: devibe restore backup-20250104-091500
```

## Requirements

Auto Mode requires AI classification to be available:

```bash
# Set up API key (one-time)
devibe ai-key add

# Or use environment variable
export ANTHROPIC_API_KEY="sk-ant-..."
# OR
export OPENAI_API_KEY="sk-..."
```

Without an API key, Auto Mode will error:
```
❌ Error: AI classification is required for auto mode. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.
```

## Safety Features

### 1. Automatic Backups

Every execution creates a backup that can be reversed:

```bash
# Restore from backup if needed
devibe restore backup-20250104-091500
```

### 2. Dry Run Mode

Test before making changes:

```bash
devibe execute --auto --dry-run
```

### 3. Learning System

The AI gets smarter over time. If it makes a mistake, teach it:

```bash
# Correct an AI decision
devibe ai-correct path/to/file.ts packages/correct/location/file.ts

# The AI will learn and avoid this mistake in the future
```

### 4. Project Structure Analysis

Auto Mode analyzes your project once and caches the results:

```bash
# Manually analyze project structure (optional)
devibe ai-analyze-project

# View learning statistics
devibe ai-learn
```

## Examples

### Example 1: Clean Up After AI Coding Session

```bash
# You just finished a coding session with AI
# Your root directory is messy with new files

# Step 1: Preview what AI would do
devibe plan --auto

# Step 2: Review the plan
# Step 3: Execute if you're happy
devibe execute --auto
```

### Example 2: Monorepo Organization

```bash
# Large monorepo with multiple packages
# AI will intelligently distribute files to the right packages

devibe execute --auto --verbose

# Output shows AI reasoning:
# - "Dependency analysis: imports from @myapp/backend"
# - "Project structure: NX monorepo detected"
# - "Learned pattern: Files ending in .service.ts go to backend"
```

### Example 3: CI/CD Integration

```bash
#!/bin/bash
# In your CI pipeline

# Run auto cleanup before deployment
devibe scan  # Check for secrets first
devibe execute --auto --dry-run  # Preview changes

# Only proceed if no secrets found
if [ $? -eq 0 ]; then
  devibe execute --auto  # Apply changes
  git add .
  git commit -m "chore: automated cleanup"
fi
```

## Comparison: Manual vs Auto Mode

### Manual Mode (Default)

```bash
devibe plan        # AI classifies files
devibe execute     # You confirm each operation
```

**Pros:**
- Full control over each decision
- Good for learning how devibe works
- Safe for first-time users

**Cons:**
- Time-consuming for many files
- Requires manual confirmation
- Not suitable for CI/CD

### Auto Mode

```bash
devibe execute --auto   # AI does everything
```

**Pros:**
- Hands-free operation
- Perfect for trusted environments
- Fast bulk operations
- CI/CD friendly
- Gets smarter over time with learning

**Cons:**
- Less control (but backups are automatic)
- Requires AI API key
- May need corrections initially (which improve future runs)

## Best Practices

### 1. Start with Preview

Always run `devibe plan --auto` first to see what will happen:

```bash
devibe plan --auto | less  # Review carefully
```

### 2. Use Dry Run for New Projects

First time on a project? Use dry run:

```bash
devibe execute --auto --dry-run
```

### 3. Teach the AI

When the AI makes mistakes, teach it:

```bash
devibe ai-correct wrong/location.ts correct/location.ts
```

### 4. Analyze Project Structure

For best results, analyze your project structure first:

```bash
devibe ai-analyze-project
```

This helps the AI understand:
- Framework (NX, Turborepo, Lerna, etc.)
- Technologies (React, Node.js, Python, etc.)
- Test strategy (colocated vs centralized)
- Package organization

### 5. Review Backups

Keep track of backups in case you need to restore:

```bash
ls -la .unvibe/backups/
```

## Troubleshooting

### "AI classification is required"

**Problem:** No API key set

**Solution:**
```bash
devibe ai-key add
# Follow the prompts to add your key
```

### "No git repositories found"

**Problem:** Not in a git repository

**Solution:**
```bash
git init
# OR
cd path/to/your/git/repo
```

### AI Makes Wrong Decisions

**Problem:** AI moves files to wrong locations

**Solution:** Teach the AI:
```bash
# Correct the decision
devibe ai-correct wrong/path.ts correct/path.ts

# The AI will learn this pattern
# Future runs will use this knowledge
```

### Too Slow

**Problem:** Auto mode is taking too long

**Solution:**
```bash
# Skip usage detection for speed
devibe execute --auto --no-usage-check

# Or use cost optimization
devibe ai-analyze  # Choose a faster/cheaper model
```

## Under the Hood

Auto Mode uses the `IntelligentClassifier` which follows this pipeline:

```
1. Check learned patterns (>80% confidence)
   ↓ (if no match)
2. Analyze file dependencies (imports, requires)
   ↓
3. Load project structure (cached)
   ↓
4. Build enhanced AI prompt with context
   ↓
5. Call AI with enhanced prompt
   ↓
6. Return classification with high confidence
```

This multi-layered approach ensures:
- Fast decisions for known patterns
- Context-aware AI classification
- Continuous learning from corrections
- High accuracy over time

## API

Auto Mode can be used programmatically:

```typescript
import { AutoExecutor } from 'devibe';

const executor = new AutoExecutor();

// Preview
const preview = await executor.preview({
  path: process.cwd(),
  onProgress: (current, total, message) => {
    console.log(`${current}/${total}: ${message}`);
  },
});

console.log(`Found ${preview.operations.length} operations`);

// Execute
const result = await executor.execute({
  path: process.cwd(),
  dryRun: false,
  onProgress: (current, total, message) => {
    console.log(`${current}/${total}: ${message}`);
  },
});

if (result.success) {
  console.log(`Cleaned up ${result.filesMovedOrDeleted} files`);
  console.log(`Backup: ${result.backupManifestId}`);
}
```

## Related Commands

- `devibe ai-learn` - View learning statistics
- `devibe ai-correct` - Teach AI corrections
- `devibe ai-analyze-project` - Analyze project structure
- `devibe ai-analyze` - Compare AI models and costs
- `devibe restore` - Restore from backup

## Feedback

Auto Mode is a powerful feature that combines AI intelligence with hands-free operation. If you encounter issues or have suggestions:

1. Check the [GitHub Issues](https://github.com/YOLOVibeCode/devibe/issues)
2. Use `devibe ai-correct` to teach the AI
3. Review backups in `.unvibe/backups/`

Remember: Auto Mode gets smarter with use! Each correction teaches the AI, making future runs more accurate.
