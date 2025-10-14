# UnVibe (devibe) 🧹

**Repository cleanup utility for vibe coding sessions**

Stop the chaos after intense AI-assisted coding sessions. UnVibe intelligently organizes your repositories, respects git boundaries, and keeps your monorepos clean.

## 🎉 What's New in v2.0.0

### 🚀 Two Consolidation Modes + AI File Selection (NEW in v2.0.0!)

Choose your workflow: **Compress** (clean everything) or **Document-Archive** (organize and preserve).

```bash
# COMPRESS MODE (default): Consolidate + clean up
devibe consolidate:auto
# → Clean root with only consolidated file + README

# WITH AI FILE SELECTION: Include .txt, .log files automatically
devibe consolidate:auto --include-related
# → AI analyzes and includes commit messages, summaries, etc.

# DOCUMENT-ARCHIVE MODE: Organize into folders
devibe consolidate:auto --document-archive
# → Files moved to ./documents/, summary in root

# Recursive compress: Process all git boundaries
devibe consolidate:auto --recursive-compress
```

**Features:**
- 🗜️ **Compress Mode**: Consolidates all .md files into one, backs up, deletes originals
- 📦 **Archive Mode**: Moves files to `./documents/` with AI organization, preserves originals
- 🤖 **AI File Selection**: `--include-related` lets AI decide which .txt/.log files to include
- 🔄 **Recursive Processing**: `--recursive-compress` for nested git boundaries
- 🎯 **Smart Defaults**: Compress = 1 file, Archive = organized folders
- 💾 **Full Safety**: All originals backed up in `.devibe/backups/`
- 📊 **BACKUP_INDEX.md**: Track what was changed for easy restoration

### 🤖 Auto-Consolidate Features

Fully automated markdown consolidation workflow that respects git repository boundaries!

```bash
# Auto-consolidate current directory (respects git boundaries)
devibe consolidate:auto

# Process monorepo - each nested repo processed independently
devibe consolidate:auto /path/to/monorepo

# With options
devibe consolidate:auto --max-output 3 --suppress-toc
```

**Key Features:**
- 🔍 **Git-aware** - Automatically detects and processes each git repo independently
- 🎯 **Monorepo support** - Handles nested repositories like a pro
- 📊 **Multi-repo reporting** - Shows count of repositories processed
- 📂 **Automated workflow** - Moves files, consolidates, updates README automatically
- 🏷️ **Intelligent naming** - Output files named based on content topics
- 📝 **README integration** - Auto-updates README.md with summary index
- 💾 **Backup tracking** - Creates date-sorted BACKUP_INDEX.md in `.devibe/`
- 🤖 **AI optional** - Works with or without AI configuration
- 🛡️ **100% safe** - All originals preserved, full rollback capability

**Perfect for:**
- Repository cleanup after AI coding sessions
- Weekly/sprint documentation snapshots
- Monorepo documentation management
- Preparing consolidated docs for AI assistants

[See full documentation →](#devibe-consolidateauto)

---

## 📝 Markdown Consolidation

Advanced AI-powered markdown consolidation for interactive workflows.

[See documentation →](#devibe-consolidate)

---

## Features

### 🚀 Core Capabilities
✅ **Mono-repo friendly** - Respects multiple `.git` boundaries  
✅ **Secret detection** - Scans for 31 types of hardcoded secrets (API keys, tokens, credentials)  
✅ **100% reversible** - All operations backed up automatically with restore capability  
✅ **Build validation** - Ensures cleanup doesn't break builds (Node.js, Docker, Python, Go)  
✅ **Dry-run mode** - Preview changes before applying across all commands  

### 🤖 AI-Powered Intelligence
✅ **Multi-provider AI** - Support for Anthropic Claude, OpenAI GPT, Google Gemini (7 models)  
✅ **90% accuracy** - AI-powered file classification with context awareness  
✅ **Learning system** - Learns from corrections and improves over time  
✅ **Cost optimization** - 98% savings with smart model selection (Gemini Flash vs Claude Sonnet)  
✅ **Secure keys** - AES-256 encrypted API key storage in `~/.devibe/`  

### ⚡ Automation & Workflows
✅ **Auto mode** - One-command cleanup: `devibe --auto` or `devibe yolo`  
✅ **Intelligent classification** - Multi-stage: learning → structure → dependencies → AI  
✅ **GitIgnore management** - Auto-excludes `.devibe/` and `.unvibe/` directories  
✅ **GitHub integration** - Pre-push hooks and Actions for CI/CD  
✅ **Progress tracking** - Real-time feedback with detailed status updates  

### 🧪 Test Organization
✅ **8 test categories** - unit, integration, e2e, tdd, functional, performance, acceptance, contract  
✅ **6 technology stacks** - Node.js, React, Python, Go, Java, .NET/C#  
✅ **Smart detection** - Automatic pattern matching and categorization  
✅ **Organization reports** - Detailed breakdown by category and technology  

### 📊 Quality & Standards
✅ **Best practices analyzer** - 40+ automated checks across 8 categories  
✅ **Rule packs** - Shareable directory structure standards (YAML/JSON)  
✅ **Weighted scoring** - 0-100 quality score with severity levels  
✅ **Auto-fix detection** - Identifies issues that can be automatically resolved  
✅ **CI/CD ready** - JSON output for automation pipelines  

### 📝 Documentation Management (NEW in v1.7.0)
✅ **Markdown consolidation** - AI-powered doc organization with topic clustering  
✅ **Relevance analysis** - Multi-factor scoring (recency, quality, connectivity)  
✅ **Smart strategies** - Merge, summarize, archive, or create navigation hub  
✅ **Content preservation** - Validation and backup with rollback capability  

### 🔧 Developer Experience
✅ **Non-intrusive UX** - Smart prompting (max 2 times, then silent)  
✅ **Folder enforcement** - Maintains `scripts/` and `documents/` structure  
✅ **Helpful recommendations** - Context-aware suggestions for improvements  
✅ **Comprehensive docs** - 20+ guides covering all features and workflows

## Installation

### From npm (Recommended)

```bash
# Install globally
npm install -g devibe

# Or use with npx (no installation)
npx devibe
```

### Verify Installation

```bash
devibe --version
# Should show: 1.8.7

devibe --help
# Shows all available commands
```

**NPM Package**: [https://www.npmjs.com/package/devibe](https://www.npmjs.com/package/devibe)

## Quick Start

```bash
# Quick auto-organize (recommended!)
devibe --auto
# or
devibe yolo

# Show repository status
devibe

# Scan for secrets before commit
devibe scan

# Plan file distribution
devibe plan

# Execute with backup
devibe execute

# Enforce folder structure
devibe enforce

# Validate builds
devibe validate

# Check repository best practices
devibe best-practices

# Validate a rule pack file
devibe validate-rulepack my-pack.json

# Consolidate markdown documentation (NEW in v1.7.0!)
devibe consolidate ./docs --dry-run
```

## Commands

### `devibe` or `devibe status`
Show repository status and suggested next actions.

### `devibe detect`
List all git repositories in the current directory.

### `devibe scan`
Scan for hardcoded secrets (API keys, passwords, tokens).

**Detects 31 types:** AWS, Google, Azure, Stripe, GitHub, Slack, Discord, Anthropic, OpenAI, SendGrid, Twilio, Heroku, Firebase, NPM, Docker, Cloudflare, Datadog, and more. Plus JWT tokens, private keys, webhooks, and database credentials.

### `devibe plan`
Plan root file distribution (shows what would be done).

### `devibe execute`
Execute planned file operations with automatic backup.

```bash
devibe execute --dry-run  # Preview without making changes
```

### `devibe enforce`
Enforce folder structure (`scripts/`, `documents/`).

### `devibe validate`
Detect and validate build systems (Node.js, Docker, Python, Go).

### `devibe backups`
List all available backups.

### `devibe restore <id>`
Restore from a backup.

### `devibe yolo` or `devibe --auto`
Quick auto-organize: Run full cleanup workflow automatically.

**These commands are equivalent** - use whichever you prefer!

**What `--auto` does:**
- 🔍 **Git-aware scanning** - Detects and processes each git repository independently (perfect for monorepos)
- 🤖 **AI-powered classification** - Intelligently categorizes files using AI or heuristics fallback
- 📂 **Automated organization** - Plans and executes file distribution to proper folders
- 🔒 **Secret detection** - Scans for 31 types of hardcoded credentials before organizing
- 📝 **GitIgnore management** - Automatically updates `.gitignore` to exclude `.devibe/` directories
- 💾 **100% reversible** - All operations backed up automatically with full rollback capability
- ⚡ **One command cleanup** - Complete repository organization in seconds

**Perfect for:**
- Post-coding session cleanup
- Repository maintenance before commits
- Preparing repos for team collaboration
- Cleaning up after AI-assisted coding sessions

**AI Key Handling:**
- If no AI key is configured, you'll be prompted to add one (first 2 times only)
- After declining twice, the tool will silently use heuristics to avoid being annoying
- You can continue with heuristics (65% accuracy) or add a key for AI (90% accuracy)
- Use `devibe ai-key add <provider> <key>` to configure AI
- Re-enable prompts with: `devibe ai-key reset-prompt`

⚠️ **Note:** This mode makes automatic changes but always creates backups first.

### Auto Mode Variants

**Quick commands:**
```bash
devibe --auto           # Quick auto-organize (same as yolo)
devibe yolo             # Quick auto-organize (same as --auto)
devibe --auto --no-ai   # Force heuristics only (skip AI prompt)
```

**Advanced commands:**
```bash
devibe plan --auto              # Preview AI organization
devibe execute --auto           # Execute AI organization
devibe execute --auto --no-ai   # Execute with heuristics only
```

**When to use:**
- 🤖 `devibe --auto` or `devibe yolo`: Quick cleanup with AI (recommended)
- ⚡ `devibe --auto --no-ai`: Fast cleanup without AI prompts
- 📋 `devibe plan --auto`: Preview before executing
- See [AI Auto Mode Guide](./documents/AI_AUTO_MODE_GUIDE.md) for details

### `devibe init`
Initialize UnVibe configuration file.

### `devibe organize-tests`
Organize test files by category (unit, integration, e2e, etc.).

```bash
devibe organize-tests              # Move tests to organized directories
devibe organize-tests --dry-run    # Preview changes
devibe organize-tests --report     # Generate organization report
```0

### `devibe detect-tests`
List all test files and their categories.

### `devibe best-practices`
Analyze repository against industry best practices (40+ automated checks).

```bash
devibe best-practices              # Run analysis
devibe best-practices --json       # Output JSON for CI/CD
```

**Checks include:**
- 📚 Documentation (README, CHANGELOG, API docs)
- 🔧 Git (.gitignore, .gitattributes)
- 🔒 Security (.env management, lockfiles, SECURITY.md)
- 📁 Structure (src/, tests/, no root files)
- 📦 Dependencies (engines, no wildcards)
- 🚀 CI/CD (GitHub Actions, pre-commit hooks)
- ⚖️ Licensing (LICENSE file, package.json)
- ✨ Quality (ESLint, Prettier, TypeScript, EditorConfig)

**Scoring:** Weighted 0-100 score with severity levels (critical, high, medium, low)

### `devibe validate-rulepack`
Validate a rule pack file against the specification.

```bash
devibe validate-rulepack my-pack.json
```

Provides clear, helpful error messages with:
- JSONPath location (`$.metadata.name`)
- Expected format with examples
- Error codes for automation
- Warnings for best practices

### `devibe consolidate`

Consolidate markdown documentation using AI-powered semantic analysis.

```bash
# Preview consolidation (RECOMMENDED FIRST!)
devibe consolidate ./docs --dry-run

# Interactive consolidation
devibe consolidate ./docs -r

# Auto-consolidate with AI
devibe consolidate ./docs --auto -r --max-output 5

# Exclude patterns
devibe consolidate ./docs -r --exclude '**/archive/**' --exclude '**/old/**'
```

**How it works:**
1. 📂 **Scans** directory for markdown files
2. 📊 **Analyzes** relevance (recency, quality, connectivity, uniqueness)
3. 🤖 **Clusters** files by semantic similarity using AI
4. 📋 **Creates plan** with consolidation strategies
5. 💾 **Backs up** originals automatically
6. ✅ **Validates** content preservation (max 30% loss allowed)
7. 📚 **Generates** `DOCUMENTATION_HUB.md` navigation hub

**Consolidation Strategies:**
- **merge-by-topic** - Combine files on same topic
- **merge-by-folder** - Combine files in same directory  
- **summarize-cluster** - Create AI-powered summaries
- **create-super-readme** - Generate navigation hub
- **archive-stale** - Move outdated files to archive

**Relevance Scoring:**
- **Highly Relevant (70-100)** - Recent, high-quality, well-connected
- **Relevant (50-69)** - Good quality, some connections
- **Marginal (30-49)** - Consider consolidating or archiving
- **Stale (0-29)** - Old, low quality, candidates for archiving

**Safety Features:**
- 🛡️ Always run with `--dry-run` first to preview
- 💾 Automatic backups before any changes
- ✅ Content preservation validation
- 🔍 Broken link detection
- 🔄 Full rollback with `devibe restore`

**Options:**
- `-r, --recursive` - Process subdirectories
- `--max-output <number>` - Maximum consolidated files (default: 5)
- `--dry-run` - Preview without changes (RECOMMENDED)
- `--auto` - Auto-approve plan (use with caution)
- `--exclude <pattern>` - Exclude file patterns (repeatable)

⚠️ **Important:** Requires AI to be enabled. Run `devibe ai-key add <provider> <key>` first.

### `devibe consolidate:auto`

**NEW in v2.0.0** Two powerful modes for markdown organization!

#### **Compress Mode** (Default) - Clean Up Everything

Consolidates all .md files into one, backs them up, and deletes originals. Perfect for cleaning up doc clutter.

```bash
# Default compress mode - consolidates and cleans up
devibe consolidate:auto

# Process all git boundaries recursively
devibe consolidate:auto --recursive-compress

# With options
devibe consolidate:auto --max-output 1 --suppress-toc
```

**Workflow:**
1. 📊 **Consolidates** all `*.md` files directly from root into one file
2. 💾 **Backs up** originals to `.devibe/backups/`
3. 🗑️ **Deletes** original .md files (safely backed up)
4. 📝 **Updates** README.md with summary
5. 🏷️ **Creates** BACKUP_INDEX.md for restoration tracking

**Result:**
- Clean root with only consolidated file + README.md
- All originals safely backed up
- Respects git boundaries (each repo processed independently)

#### **Document-Archive Mode** - Organize Into Folders

Moves files to `./documents/` with AI organization. Perfect for archiving scattered docs.

```bash
# Archive mode - move and organize
devibe consolidate:auto --document-archive

# With options
devibe consolidate:auto --document-archive --max-output 3
```

**Workflow:**
1. 📂 **Moves** all `*.md` files from root → `./documents/`
2. 🤖 **Organizes** with AI into proper subdirectories (if enabled)
3. ✍️ **Creates** consolidated summary in root
4. 📝 **Updates** README.md
5. ✅ **Preserves** documents folder (not deleted)

**Result:**
- Original files preserved in organized `./documents/` folder
- Summary file in root for quick reference
- README updated with documentation index

---

**Git-Aware:**
- 🔍 Automatically detects git repository boundaries
- 🎯 Processes each git repo independently
- ✅ Respects monorepo structures with nested repos
- 🔄 `--recursive-compress` processes ALL boundaries recursively

**Safety:**
- ✅ All original files backed up in `.devibe/backups/`
- ✅ Automatic BACKUP_INDEX.md for tracking
- ✅ README.md safely updated with HTML markers
- ✅ Full rollback with `devibe restore`

**Options:**
- `--document-archive` - Archive mode (preserves documents/ folder)
- `--recursive-compress` - Compress mode: process all git boundaries
- `--include-related` - **NEW!** Use AI to analyze and include related files (.txt, .log)
- `--max-output <number>` - Maximum output files (default: 1 compress, 5 archive)
- `--suppress-toc` - Suppress Table of Contents generation

**🤖 AI-Powered File Selection (--include-related)**

Let AI decide which additional files should be included in consolidation:

```bash
# Include related documentation files (commit messages, summaries, etc.)
devibe consolidate:auto --include-related
```

**What it does:**
- 🔍 Scans for `.txt`, `.log` files in root directory
- 🤖 Uses AI to analyze each file's content
- ✅ Automatically includes documentation-related files
- 📝 Shows AI reasoning for each inclusion

**Example output:**
```
  ✓ COMMIT_MESSAGE.txt: detailed commit message with features
  ✓ WEEK_4_SUMMARY.txt: project summary and accomplishments
  ✓ PHASE_2_SUMMARY.txt: phase completion documentation

🔍 AI Analysis: Including 8 related files
```

**Use Cases:**
- **Compress**: Weekly cleanup, preparing AI context, milestone snapshots
- **Archive**: Long-term organization, documentation hub, knowledge base

🔧 **AI Optional:** Works with or without AI (uses smart fallback clustering)

### AI Management Commands

Manage AI providers, keys, and cost optimization.

#### `devibe ai-key add <provider> <key>`
Add an AI API key (encrypted with AES-256).

```bash
devibe ai-key add anthropic sk-ant-...
devibe ai-key add openai sk-...
devibe ai-key add google AIza...
```

#### `devibe ai-key status`
Show current AI configuration and cost recommendations.

```bash
devibe ai-key status
# Shows active provider, model, and potential savings
```

#### `devibe ai-key clear`
Revert to environment variables (removes configured keys).

```bash
devibe ai-key clear
# Falls back to ANTHROPIC_API_KEY or OPENAI_API_KEY
```

#### `devibe ai-analyze`
Compare AI models and costs for your repository.

```bash
devibe ai-analyze              # Analyze current directory
devibe ai-analyze -f 5000      # Analyze for 5000 files
```

Shows cost comparison across 7 AI models:
- Gemini 1.5 Flash (cheapest - $0.06/1K files)
- GPT-4o Mini
- Claude 3 Haiku
- Claude 3.5 Sonnet
- Gemini 1.5 Pro
- GPT-4o
- Claude 3.5 Opus (premium)

#### `devibe ai-models`
List all available AI models with pricing and context windows.

```bash
devibe ai-models
```

## Test Organization

DeVibe can automatically organize your tests into logical categories:

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── tdd/              # TDD specs
├── functional/       # Functional tests
├── performance/      # Performance tests
├── acceptance/       # Acceptance tests
└── contract/         # Contract tests
```

**Supports 6 technologies:**
- Node.js/TypeScript (`.test.ts`, `.spec.ts`)
- React (`.test.tsx`, `__tests__/`)
- Python (`test_*.py`, `*_test.py`)
- Go (`*_test.go`)
- Java (`*Test.java`, `*IT.java`)
- .NET/C# (`*Tests.cs`, `*Test.cs`, xUnit/NUnit/MSTest)

## Rule Packs

Share and reuse directory structure standards across projects and teams.

### Using Rule Packs

```bash
# Install official rule pack
devibe rulepack install @devibe/nodejs-standard

# Use in your project
devibe --rulepack @devibe/nodejs-standard

# Or in .devibe.config.js
module.exports = {
  rulepacks: ['@devibe/nodejs-standard']
};
```

### Official Rule Packs

- `@devibe/nodejs-standard` - Standard Node.js structure
- `@devibe/react-standard` - React/Next.js conventions
- `@devibe/nodejs-monorepo` - NX/Turborepo monorepo structure
- `@devibe/python-standard` - Python best practices
- `@devibe/go-standard` - Go standard project layout

### Creating Custom Rule Packs

Create your own shareable standards:

```yaml
# my-company-standard.yaml
schema: "devibe-rulepack/v1"
metadata:
  name: "@mycompany/engineering-standard"
  version: "1.0.0"

structure:
  requiredFolders:
    - path: "src"
    - path: "tests"
    - path: "docs"

testOrganization:
  enabled: true
  categories:
    - name: "unit"
      patterns: ["**/*.test.ts"]
      targetDirectory: "tests/unit"
```

See [RULE_PACK_SPEC.md](./RULE_PACK_SPEC.md) for complete specification.

## Configuration

Create `.unvibe.config.js` in your repository root:

```javascript
module.exports = {
  secretScan: {
    excludePatterns: ['node_modules/**', '.git/**'],
  },
  folderStructure: {
    requiredFolders: ['scripts', 'documents'],
  },
  ai: {
    enabled: false,
    provider: 'anthropic', // or 'openai'
  },
  backup: {
    enabled: true,
    retentionDays: 30,
  }
};
```

## AI Integration (Optional)

For better file classification (90% vs 65%):

```bash
export ANTHROPIC_API_KEY=your-key-here
# or
export OPENAI_API_KEY=your-key-here
```

UnVibe automatically detects AI availability and provides helpful recommendations when features are unavailable.

## Intelligent Recommendations

UnVibe provides smart, context-aware recommendations for common issues:

### Missing Build Scripts
```bash
$ devibe validate
✓ nodejs: PASSED (0ms)
   ⚠️  No build script found in package.json
   Skipping build validation (not blocking)
   To enable: Add "build": "tsc" or your build command to package.json scripts
```

### Build Failures
```bash
$ devibe validate
✗ nodejs: FAILED (499ms)
   💡 Build failed. Possible fixes:
   • Run "npm install" to ensure dependencies are installed
   • Check for TypeScript errors if using tsc
   • Review build script in package.json
   • Run "npm run build" manually to see full error
```

### AI Unavailability
```bash
$ devibe plan
⚠️  AI classification unavailable - using heuristics (65% accuracy)
   For better results: Set ANTHROPIC_API_KEY or OPENAI_API_KEY
```

### Status Command
```bash
$ devibe status
📊 UnVibe Status

AI Classification:
  ⚠️  AI unavailable - using heuristics (65% accuracy)
     To enable: Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable

Build Configuration:
  ⚠️  No build script found
     To enable validation: Add "build" script to package.json
```

The app **never blocks** on missing optional features - it provides helpful guidance while continuing to work.

## Safety Guarantees

1. **Git boundaries respected** - Never moves files between sibling repos
2. **All operations backed up** - 100% reversible
3. **Secrets are truncated** - Never logged in full
4. **Dry-run available** - Test before applying
5. **Build validation** - Ensures code still works
6. **Permission preserved** - File modes maintained

## Architecture

- **TDD** - Test-Driven Development
- **ISP** - Interface Segregation Principle
- **86 passing tests** - E2E coverage
- **TypeScript** - Fully typed
- **Zero runtime dependencies**

## GitHub Integration

UnVibe integrates with GitHub to keep your `main` branch clean:

```bash
# Setup git hooks (auto-runs on push)
devibe setup-hooks

# Check before pushing
devibe check-pr
```

**Features:**
- ✅ Pre-push hooks block critical secrets
- ✅ GitHub Actions validate PRs
- ✅ Automated PR comments with results
- ✅ Prevents broken builds on main

See [GITHUB-INTEGRATION.md](./documents/GITHUB-INTEGRATION.md) for full guide.

## Documentation

All comprehensive documentation has been organized into the [`documents/`](./documents/) directory:

📚 **[View Full Documentation Index →](./documents/README.md)**

### Quick Links

- **AI & Setup:**
  - [AI Setup Guide](./documents/AI_SETUP_GUIDE.md) - Get started with AI features
  - [AI Auto Mode Guide](./documents/AI_AUTO_MODE_GUIDE.md) - Automatic organization  
  - [Auto Mode Quick Reference](./documents/AUTO_MODE_QUICK_REF.md) - Quick commands

- **Architecture:**
  - [Architecture Overview](./documents/ARCHITECTURE.md) - System design
  - [Specifications](./documents/SPECIFICATIONS.md) - Technical specs
  - [Requirements](./documents/REQUIREMENTS.md) - Feature requirements

- **Reference:**
  - [Quick Reference](./documents/QUICK_REFERENCE.md) - Command cheat sheet
  - [Changelog](./documents/CHANGELOG.md) - Version history
  - [Rule Pack Spec](./documents/RULE_PACK_SPEC.md) - Custom rule packs

**💡 Tip:** The `documents/` folder contains 20+ guides. Check [`documents/README.md`](./documents/README.md) for the complete organized index.

## Development

```bash
npm install
npm test
npm run build
```

## License

ISC License

---

**UnVibe** - Because every vibe coding session deserves a clean ending. 🚀

Made with [Claude Code](https://claude.com/claude-code)
