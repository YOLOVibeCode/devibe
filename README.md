# UnVibe (devibe) 🧹

**Repository cleanup utility for vibe coding sessions**

Stop the chaos after intense AI-assisted coding sessions. UnVibe intelligently organizes your repositories, respects git boundaries, and keeps your monorepos clean.

## Features

✅ **Auto Mode (NEW)** - AI automatically cleans up your repo, no prompts needed
✅ **Intelligent Learning** - Gets smarter from your corrections over time
✅ **Mono-repo friendly** - Respects multiple `.git` boundaries
✅ **Secret detection** - Scans for 31 types of hardcoded secrets
✅ **100% reversible** - All operations backed up automatically
✅ **Build validation** - Ensures cleanup doesn't break builds
✅ **Dry-run mode** - Preview changes before applying
✅ **AI-powered classification** - 90% accuracy with Anthropic/OpenAI
✅ **Folder enforcement** - Maintains `scripts/` and `documents/` structure
✅ **Test organization** - Organize tests by category (unit, e2e, integration)
✅ **Rule packs** - Shareable directory structure standards
✅ **YOLO mode** - Aggressive auto-cleanup for the brave

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

### Auto Mode (Hands-Free AI Cleanup) 🤖

```bash
# AI automatically analyzes and cleans up your repo
devibe execute --auto

# Preview what AI would do first
devibe plan --auto

# See detailed progress
devibe execute --auto --verbose
```

**[Read the Auto Mode Guide →](./AUTO_MODE.md)**

### Manual Mode (Step-by-Step)

```bash
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

# YOLO mode (aggressive cleanup)
devibe yolo

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

```bash
devibe plan              # Manual mode with heuristics
devibe plan --auto       # Auto mode with AI (no prompts)
devibe plan --verbose    # Show detailed progress
```

### `devibe execute`
Execute planned file operations with automatic backup.

```bash
devibe execute --dry-run     # Preview without making changes
devibe execute --auto        # AI automatically executes everything
devibe execute --auto -v     # Auto mode with detailed progress
```

**Auto Mode Features:**
- AI analyzes all files intelligently
- No manual confirmation needed
- Automatic backups before execution
- Learns from your corrections
- Perfect for CI/CD pipelines

### `devibe enforce`
Enforce folder structure (`scripts/`, `documents/`).

### `devibe validate`
Detect and validate build systems (Node.js, Docker, Python, Go).

### `devibe backups`
List all available backups.

### `devibe restore <id>`
Restore from a backup.

### `devibe yolo`
YOLO mode: Run full cleanup workflow automatically.

**What it does:**
1. Scans for secrets (stops if critical found)
2. Plans and executes root file distribution
3. Enforces folder structure
4. Validates builds
5. Creates backups automatically

⚠️ **Use with caution!** This mode makes automatic changes.

### `devibe init`
Initialize UnVibe configuration file.

### `devibe organize-tests`
Organize test files by category (unit, integration, e2e, etc.).

```bash
devibe organize-tests              # Move tests to organized directories
devibe organize-tests --dry-run    # Preview changes
devibe organize-tests --report     # Generate organization report
```

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

See [GITHUB-INTEGRATION.md](GITHUB-INTEGRATION.md) for full guide.

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
