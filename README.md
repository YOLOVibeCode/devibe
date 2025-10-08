# UnVibe (devibe) 🧹

**Repository cleanup utility for vibe coding sessions**

Stop the chaos after intense AI-assisted coding sessions. UnVibe intelligently organizes your repositories, respects git boundaries, and keeps your monorepos clean.

## Features

✅ **Mono-repo friendly** - Respects multiple `.git` boundaries
✅ **Secret detection** - Scans for 31 types of hardcoded secrets
✅ **100% reversible** - All operations backed up automatically
✅ **Build validation** - Ensures cleanup doesn't break builds
✅ **Dry-run mode** - Preview changes before applying
✅ **AI-powered classification** - 90% accuracy with Anthropic/OpenAI
✅ **Folder enforcement** - Maintains `scripts/` and `documents/` structure
✅ **Test organization** - Organize tests by category (unit, e2e, integration)
✅ **Rule packs** - Shareable directory structure standards
✅ **Auto mode** - Quick auto-organize with AI or heuristics (`devibe --auto` or `devibe yolo`)

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
# Should show: 1.2.0

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

**What it does:**
1. Uses AI classification (or heuristics if no API key)
2. Plans and executes file organization
3. Updates .gitignore files
4. Creates backups automatically
5. Generates documentation index

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
