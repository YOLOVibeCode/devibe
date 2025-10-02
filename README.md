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
✅ **YOLO mode** - Aggressive auto-cleanup for the brave

## Installation

```bash
npm install -g devibe
# or
npx devibe
```

## Quick Start

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
