# UnVibe - Repository Cleanup Utility

## Requirements Document v1.6

**Last Updated:** 2025-10-02

---

## 1. Executive Summary

**UnVibe** is a CLI utility designed to intelligently clean up repositories after intense vibe coding sessions. It specializes in monorepo environments where AI-assisted coding often results in files being created in the wrong locations. The tool uses AI-powered analysis (strongly recommended) to:

1. Distribute misplaced root-level files to their correct sub-repositories
2. Organize loose scripts and documentation into standardized folders
3. Identify and remove stale utility scripts
4. Detect potential secrets before they're committed to version control
5. Ensure builds continue to work after cleanup

**Key Principle:** Safety first - all operations are backed up and reversible, with optional aggressive "YOLO" mode for experienced users.

---

## 2. Core Problem Statement

During vibe coding sessions (rapid development with AI assistance), developers often experience:

- Files created at monorepo root that belong to specific sub-repositories
- Loose scripts scattered throughout the repository
- AI-generated markdown documentation without proper organization
- Stale temporary/debug scripts accumulating over time
- Missing standardized `scripts/` and `documents/` folders per repository
- Accidentally created files with hardcoded secrets, API keys, or credentials

**UnVibe solves this** by intelligently analyzing files and organizing them while respecting git boundaries, flagging potential secrets, and ensuring builds remain functional.

---

## 3. System Architecture

### 3.1 Core Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│                    UNVIBE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Git Repo   │──────│  Monorepo    │                   │
│  │   Detection  │      │  Analysis    │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                           │
│         ▼                      ▼                           │
│  ┌──────────────────────────────────────┐                 │
│  │      Secret Detection Engine         │                 │
│  │  (Flag API keys, tokens, passwords)  │                 │
│  └──────────────────────────────────────┘                 │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────────────────────────────┐                 │
│  │    Root File Distribution Engine     │                 │
│  │  (AI-Powered or Heuristic-Based)     │                 │
│  └──────────────────────────────────────┘                 │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────────────────────────────┐                 │
│  │   Script Classification Engine       │                 │
│  │   (Utility vs. Critical vs. Stale)   │                 │
│  └──────────────────────────────────────┘                 │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────────────────────────────┐                 │
│  │   Folder Structure Enforcement       │                 │
│  │   (scripts/ + documents/ per repo)   │                 │
│  └──────────────────────────────────────┘                 │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────────────────────────────┐                 │
│  │   Build Validation & Auto-Restore    │                 │
│  └──────────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Working Directory Structure

```
.unvibe/
├── inventory/              # Scan results and file listings
│   ├── scan-{timestamp}.json
│   └── latest.json
├── distribution/           # Root file distribution plans
│   ├── distribution-{timestamp}.json
│   └── current.json
├── plans/                  # Cleanup operation plans
│   ├── plan-{timestamp}.json
│   └── current.json
├── backups/                # Backed up files before deletion
│   └── {timestamp}/
│       ├── root/
│       ├── api/
│       └── web/
├── logs/                   # Operation logs
│   └── {timestamp}.log
├── cache/                  # AI classification cache
│   ├── script-classifications.json
│   └── file-allocations.json
├── secrets/                # Secret detection reports
│   ├── secrets-{timestamp}.json
│   └── latest.json
└── config/                 # User configuration
    ├── rules.js            # Default rules
    ├── yolo-rules.js       # YOLO mode overrides
    └── settings.json       # API keys, preferences
```

---

## 4. Functional Requirements

### 4.1 Git Repository Detection

**FR-1.1: Multi-Repository Detection**
- MUST detect all `.git` directories within the working tree
- MUST identify monorepo vs. single-repo structure
- MUST treat directories with `.git` as independent repository boundaries
- MUST support git submodules (`.git` file pointing to parent)

**FR-1.2: Fallback Behavior**
- If NO `.git` detected: Treat working directory as single repository
- If ONE `.git` at root: Single repository mode
- If MULTIPLE `.git`: Monorepo mode with root file distribution

**FR-1.3: Boundary Enforcement**
- MUST NEVER move files between sub-repositories
- MAY move files from root → sub-repository (distribution)
- MUST NEVER move files from sub-repository → root
- MUST respect git boundaries for all operations except distribution

### 4.2 Secret Detection

**FR-2.1: Pre-Commit Secret Scanning**

During vibe coding sessions, developers may accidentally create files with hardcoded secrets. The system MUST scan for potential secrets before any operations:

- **Scan Timing**: After inventory, before distribution/cleanup operations
- **Blocking Behavior**: Warn user, do NOT block operations (advisory only)
- **Report Generation**: Create `.unvibe/secrets/secrets-{timestamp}.json`

**FR-2.2: Secret Detection Patterns**

The system SHOULD detect common secret patterns:

1. **API Keys & Tokens**
   - AWS keys: `AKIA[0-9A-Z]{16}`
   - Generic API keys: `api[_-]?key["\s:=]+[a-zA-Z0-9]{20,}`
   - Bearer tokens: `Bearer\s+[a-zA-Z0-9\-._~+/]+=*`
   - OAuth tokens: `oauth[_-]?token["\s:=]+[a-zA-Z0-9]+`

2. **Private Keys**
   - RSA private keys: `-----BEGIN RSA PRIVATE KEY-----`
   - SSH private keys: `-----BEGIN OPENSSH PRIVATE KEY-----`
   - PGP private keys: `-----BEGIN PGP PRIVATE KEY BLOCK-----`

3. **Passwords & Credentials**
   - Password patterns: `password["\s:=]+[^\s"]{8,}`
   - Database URLs: `postgres://`, `mysql://`, `mongodb://` with credentials
   - SMTP credentials: `smtp://user:pass@`

4. **Cloud Provider Secrets**
   - AWS Secret Access Key: `[A-Za-z0-9/+=]{40}`
   - Google Cloud keys: `"type": "service_account"`
   - Azure connection strings: `AccountKey=[a-zA-Z0-9+/=]{88}`
   - Slack tokens: `xox[baprs]-[0-9a-zA-Z]{10,}`

5. **Generic High-Entropy Strings**
   - Base64-encoded secrets (>32 chars, high entropy)
   - Hex-encoded secrets (>40 chars)

**FR-2.3: File Type Scanning**

Scan the following file types:
- Source code: `.js`, `.ts`, `.py`, `.go`, `.java`, `.rb`, `.php`
- Configuration: `.json`, `.yaml`, `.yml`, `.env`, `.ini`, `.conf`
- Scripts: `.sh`, `.bash`, `.ps1`, `.bat`
- Notebooks: `.ipynb`
- Documentation: `.md` (may contain example API keys)

**FR-2.4: Exclusions**

Do NOT scan:
- Files in `.gitignore` already (likely intentionally excluded)
- Binary files
- `node_modules/`, `vendor/`, `dist/`, `build/`
- Test fixture files (if clearly marked)
- Files in `.unvibe/` itself

**FR-2.5: Secret Detection Report**

Generate report with:
```json
{
  "timestamp": "2025-10-02T10:30:00Z",
  "scanDuration": "1.2s",
  "filesScanned": 47,
  "secretsFound": 3,
  "findings": [
    {
      "file": "./api/config.js",
      "line": 12,
      "type": "API Key",
      "pattern": "Generic API key pattern",
      "severity": "high",
      "context": "  apiKey: 'sk-abc123...'",
      "recommendation": "Move to environment variable"
    },
    {
      "file": "./scripts/deploy.sh",
      "line": 5,
      "type": "AWS Access Key",
      "pattern": "AWS Access Key ID",
      "severity": "critical",
      "context": "export AWS_ACCESS_KEY_ID=AKIAI...",
      "recommendation": "Use AWS credentials file or IAM roles"
    }
  ]
}
```

**FR-2.6: User Notification**

When secrets detected:

**Default Mode:**
```
⚠️  SECRET DETECTION WARNING
─────────────────────────────────────────

Found 3 potential secrets in 2 files:

  CRITICAL: ./scripts/deploy.sh:5
    • AWS Access Key ID detected
    • Recommendation: Use AWS credentials file or IAM roles

  HIGH: ./api/config.js:12
    • Generic API key pattern
    • Recommendation: Move to environment variable

📝 Full report: .unvibe/secrets/secrets-20251002-103045.json

Actions:
  [c] Continue anyway (not recommended)
  [r] Review secrets report
  [a] Abort cleanup

Choose [c/r/a]:
```

**YOLO Mode:**
```
⚠️  SECRET DETECTION: 3 potential secrets found

  CRITICAL: ./scripts/deploy.sh:5 - AWS Access Key
  HIGH: ./api/config.js:12 - API Key

📝 Report: .unvibe/secrets/latest.json

Continuing with cleanup (YOLO mode)...
```

**FR-2.7: Integration with Workflow**

Secret scanning integrates as:
1. Scan repository (includes secret detection)
2. Show secret warnings if found
3. User decides to continue or abort (default mode)
4. YOLO mode: Log warnings, continue automatically
5. Proceed with distribution/cleanup

**FR-2.8: False Positive Handling**

Support ignoring false positives:

`.unvibe/config/rules.js`:
```javascript
module.exports = {
  secrets: {
    enabled: true,
    ignorePatterns: [
      'example_api_key',    // Example/placeholder values
      'your_api_key_here',
      'TODO: add key'
    ],
    ignorePaths: [
      'test/fixtures/**',   // Test data
      'examples/**'
    ],
    customPatterns: [
      // User-defined secret patterns
      {
        name: 'Custom Token',
        pattern: 'CUSTOM_[A-Z0-9]{32}',
        severity: 'high'
      }
    ]
  }
};
```

**FR-2.9: Privacy & Security**

- Secret values MUST be truncated in reports (show first/last 4 chars only)
- Reports MUST NOT be committed to git (auto-add to .gitignore)
- Reports stored locally only (`.unvibe/secrets/`)
- No secret data sent to AI providers (pattern matching only)

### 4.3 Root File Distribution (Monorepo Mode)

**FR-3.1: File Allocation Analysis**

The system MUST analyze root-level files using the following priority:

1. **Explicit Naming Patterns** (Confidence: 95%+)
   - Files matching `api-*`, `*-api.*` → `./api`
   - Files matching `web-*`, `*-frontend.*` → `./web`
   - Files matching `mobile-*`, `*-app.*` → `./mobile`
   - User-configurable patterns in `rules.js`

2. **AI Content Analysis** (Confidence: 85-95%, STRONGLY RECOMMENDED)
   - Analyze file imports/dependencies
   - Detect framework patterns (Express routes, React components, etc.)
   - Match technology stack to sub-repository
   - Identify referenced paths within file
   - Suggest appropriate subdirectory (e.g., `src/controllers/`)

3. **Heuristic Analysis** (Confidence: 60-75%, Fallback)
   - File extension matching (`.js` + nodejs repo)
   - Import statement parsing (detect `require('express')`)
   - Path reference detection (file mentions `./api`)
   - Lower confidence, more conservative

**FR-2.2: Allocation Decision Rules**

- Files with confidence ≥70% (YOLO) or ≥85% (default): Auto-allocate
- Files with confidence <70%: Keep at root
- Global utilities (build-all scripts, root docs): Always keep at root
- Protected files (package.json, .gitignore, CI configs): Never distribute

**FR-2.3: Conflict Handling**

If distributed file conflicts with existing file:
- **Default mode**: Prompt user (overwrite/rename/skip/diff)
- **YOLO mode**: Auto-rename with timestamp (`file-20251002.ext`)
- MUST backup existing file before any overwrite
- MUST log conflict resolution strategy

**FR-2.4: Subdirectory Placement**

System SHOULD suggest appropriate subdirectories:
- Controllers → `src/controllers/`
- Components → `src/components/`
- Hooks → `src/hooks/`
- Models → `src/models/`
- Scripts → `scripts/`
- Docs → `documents/`
- Tests → `tests/` or `__tests__/`

### 4.4 Script Classification

**FR-4.1: Script Type Detection**

Classify scripts as:
- **Utility**: Temporary, debugging, testing scripts (candidates for deletion)
- **Build**: Build automation, deployment scripts (keep, move to `scripts/`)
- **Critical**: Referenced in package.json, Dockerfile, CI (never touch)
- **Test**: Test scripts (organize appropriately)

**FR-3.2: Classification Factors**

- Filename patterns: `temp-*`, `debug-*`, `quick-*` → Utility
- Git tracking: Untracked → likely utility
- File age: Last accessed >30 days (>14 days YOLO) → Stale
- References: Used in package.json/Dockerfile → Critical
- Shebang + executable → Potentially important
- AI content analysis (recommended): Analyze script purpose

**FR-3.3: AI-Generated Content Detection**

Identify AI-generated files by:
- Comments: "AI generated", "Claude", "GPT", "Copilot"
- Frontmatter: `generated_by: AI`
- Generic names + recent creation + no git history
- AI analysis of content patterns

**FR-3.4: Staleness Detection**

```
Fresh:  Modified ≤7 days OR accessed ≤14 days  → Keep
Aging:  Modified 7-30 days, accessed ≤30 days  → Prompt (or move in YOLO)
Stale:  Not accessed in 30+ days (14+ in YOLO) → Recommend deletion
```

### 4.5 Folder Structure Enforcement

**FR-5.1: Required Folders**

Each repository root (including monorepo root) MUST have:
- `scripts/` - Build scripts, utilities, automation
- `documents/` - Documentation, specs, AI-generated notes

**FR-4.2: Folder Creation**

- Create missing folders during execution stage
- Preserve existing folder contents
- Log all folder creation operations

**FR-4.3: File Organization**

- Loose scripts → `scripts/`
- Loose markdown → `documents/`
- AI-generated docs → `documents/`
- Maintain subdirectory organization when logical

**FR-4.4: Merge Strategy**

When folders exist:
- **Default**: Prompt user (merge/skip/review)
- **YOLO**: Auto-merge with timestamp conflict resolution

### 4.6 Build Validation

**FR-6.1: Technology Detection**

Detect technology by presence of:
- Node.js: `package.json`
- Python: `requirements.txt`, `setup.py`, `pyproject.toml`
- Docker: `Dockerfile`, `docker-compose.yml`
- Go: `go.mod`
- Rust: `Cargo.toml`
- Java: `pom.xml`, `build.gradle`
- Ruby: `Gemfile`
- PHP: `composer.json`

**FR-5.2: Build Test Execution**

- **Pre-cleanup** (optional, skip in YOLO): Baseline build test
- **Post-distribution** (monorepo): Verify distribution didn't break builds
- **Post-cleanup**: Ensure builds still work
- **Docker**: Validate from-scratch builds work

**FR-5.3: Critical Path Detection**

Preserve paths referenced in:
- Dockerfile `COPY`/`ADD` commands
- Webpack/build tool entry points
- package.json `main`, `bin` fields
- Build scripts

**FR-5.4: Auto-Restore on Failure**

If build fails after operations:
- **Default mode**: Prompt user, suggest restore command
- **YOLO mode**: Automatically restore from backup, log failure

### 4.7 Backup and Restore

**FR-7.1: Backup Strategy**

- ALL deletions MUST be backed up first (non-negotiable)
- Backups stored in `.unvibe/backups/{timestamp}/`
- Maintain last N sessions (default: 5, configurable)
- Per-repository backup isolation

**FR-6.2: Backup Contents**

Must backup:
- Deleted files
- Moved files (before distribution)
- Overwritten files (conflict resolution)

**FR-6.3: Restore Capabilities**

Support restore of:
- Last operation (`--last`)
- Specific timestamp (`--from {timestamp}`)
- Specific repository (`--repo ./api`)
- Distribution only (`--distribution`)
- Last YOLO session (`--yolo-last`)

**FR-6.4: Backup Pruning**

- Manual pruning only (explicit command required)
- Never auto-delete backups
- Configurable retention count

### 4.8 AI Integration

**FR-8.1: AI Provider Support**

Must support:
- Anthropic Claude (primary, recommended)
- OpenAI GPT-4 (secondary)
- Local LLM endpoints (custom)
- Heuristics-only mode (fallback, no API required)

**FR-7.2: AI API Key Management**

- Store in `.unvibe/config/settings.json`
- Support environment variables (precedence over config file)
- Mask when displaying (`sk-ant-***...***abc`)
- Auto-add settings.json to .gitignore

**FR-7.3: AI Recommendation System**

System MUST recommend AI configuration at:
1. First run (no `.unvibe/` exists)
2. `devibe` command (status shows AI disabled)
3. `devibe scan` (before scanning)
4. Distribution planning (show AI vs. heuristic comparison)
5. Script classification (before analyzing)
6. YOLO mode (STRONG warning if AI disabled)
7. Post-operation (show what AI would have improved)

**FR-7.4: AI vs. Heuristic Comparison**

When AI not configured, MUST show:
- Expected accuracy difference (AI: ~90%, Heuristics: ~65%)
- Number of files that would be allocated differently
- Confidence score differences
- Example file analysis comparison
- Setup instructions

**FR-7.5: Graceful Degradation**

Without AI:
- Use heuristic-only analysis
- Show warnings about reduced accuracy
- More conservative decisions (higher thresholds)
- More files kept at root
- Lower confidence scores
- Still functional, just less accurate

**FR-7.6: AI Caching**

- Cache AI responses to avoid redundant API calls
- Cache invalidation: File hash changes
- Configurable cache duration (default: 24 hours)
- Cache location: `.unvibe/cache/`

---

## 5. Operational Modes

### 5.1 Default Mode (Interactive)

**Workflow:**
1. Scan repositories
2. Create distribution plan (monorepo)
3. Show AI-powered or heuristic analysis
4. Prompt user for decisions
5. Create cleanup plan
6. Show plan for review
7. Execute with user confirmation
8. Validate builds
9. Report results

**Characteristics:**
- Safe, guided, user-controlled
- Shows reasoning for all decisions
- Requires API key for best results (not mandatory)
- Suitable for first-time users

### 5.2 YOLO Mode (Aggressive)

**Workflow:**
1. Scan repositories
2. Auto-distribute files (confidence >70% with AI, >80% without)
3. Auto-classify scripts
4. Auto-delete stale utilities
5. Auto-merge into existing folders
6. Skip all prompts
7. Execute cleanup
8. Validate builds
9. Auto-restore on failure
10. Report results

**Characteristics:**
- Fast, automated, aggressive
- AI STRONGLY RECOMMENDED (show critical warning without)
- Auto-restore safety net
- Suitable for experienced users who trust the tool

**YOLO without AI:**
- Show critical warning before proceeding
- More conservative (fewer files distributed)
- Higher auto-accept threshold (>80% vs >70%)
- More files stay at root
- Still backed up and reversible

### 5.3 Dry-Run Mode

**Workflow:**
- Execute full analysis
- Generate all plans
- Show what WOULD happen
- DO NOT execute any file operations
- DO NOT create backups

**Characteristics:**
- Safe preview
- No system changes
- Test before committing

---

## 6. Command-Line Interface

### 6.1 Primary Commands

```bash
devibe                      # Contextual help and status
devibe scan                 # Scan and create inventory (includes secret detection)
devibe distribute           # Review/execute root file distribution
devibe plan                 # Create cleanup plan
devibe review               # Review current plan
devibe secrets              # View secret detection report
devibe execute              # Execute distribution + cleanup
devibe yolo                 # Full auto-cleanup (AI recommended)
devibe restore              # Restore from backup
devibe status               # Show repo and AI status
devibe config               # Configuration management
```

### 6.2 Configuration Commands

```bash
devibe config show                          # Display configuration
devibe config set-api-key                   # Interactive API setup
devibe config set-api-key --provider anthropic --key sk-xxx
devibe config get-api-key                   # Show masked key
devibe config remove-api-key                # Remove API key
devibe config init                          # Create default configs
devibe config edit                          # Edit in $EDITOR
devibe config validate                      # Validate configs
```

### 6.3 Flags

```bash
# Mode flags
--yolo                  # Enable YOLO mode
--yolo-confirm          # YOLO but confirm before execute
--interactive           # Prompt for decisions (default)
--dry-run               # Simulate without changes

# AI flags
--no-ai                 # Use heuristics only
--no-ai-warnings        # Suppress AI recommendations
--ai-provider <name>    # anthropic | openai | local
--ai-confidence <n>     # Min confidence threshold (0.0-1.0)

# Repository flags
--mono-repo             # Force monorepo mode
--no-git-detect         # Treat as single repo
--skip-distribution     # Skip root file distribution

# Validation flags
--no-build-test         # Skip build validation
--docker-only           # Only validate Docker builds
--post-build-only       # Skip pre-build tests

# Auto-decision flags
--auto-yes              # Accept all recommendations
--auto-merge            # Auto-merge into folders
--auto-delete-stale     # Auto-delete stale scripts
--auto-distribute       # Auto-accept high-confidence

# Secret scanning flags
--no-secret-scan        # Skip secret detection
--secrets-only          # Run secret scan only (no cleanup)
--ignore-secrets        # Continue even if secrets found (YOLO default)

# Output flags
--verbose               # Detailed output with reasoning
--quiet                 # Minimal output
--no-color              # Disable colors
```

### 6.4 Contextual Help

When `devibe` is run without arguments, show:
- Repository status (monorepo/single, sub-repo count)
- AI configuration status (enabled/disabled with recommendations)
- Root files requiring distribution
- Secret detection status (if last scan found secrets)
- Last cleanup timestamp
- Suggested next steps based on state
- Quick command reference

**AI Status Display:**
- ⚠️ Not Configured → Show benefits and setup command
- ✓ Enabled → Show provider and confidence in system

---

## 7. Configuration System

### 7.1 Configuration Files

**`.unvibe/config/rules.js`** (Default rules)
```javascript
module.exports = {
  ignore: ['node_modules', '.git', 'dist'],

  distribution: {
    enabled: true,
    explicitPatterns: {
      'api-*': './api',
      'web-*': './web'
    },
    keepAtRoot: ['README.md', 'LICENSE'],
    highConfidence: 0.85,
    lowConfidence: 0.60
  },

  scripts: {
    forceUtility: ['temp-*', 'debug-*'],
    forceCritical: ['deploy.sh', 'init.sh'],
    stalenessThreshold: { fresh: 7, aging: 30, stale: 60 }
  },

  ai: {
    enabled: true,
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    useForDistribution: true,
    cacheResults: true,
    cacheDuration: 86400
  },

  technologies: {
    nodejs: {
      preservePaths: ['public', 'src', 'www'],
      buildCommand: 'npm run build',
      dockerValidation: true
    }
  }
};
```

**`.unvibe/config/yolo-rules.js`** (YOLO overrides)
```javascript
module.exports = {
  extends: './rules.js',

  yolo: {
    distribution: {
      autoAcceptConfidence: 0.70,
      conflictResolution: 'rename'
    },
    staleness: {
      staleThreshold: 14,
      deleteStale: true
    },
    autoMerge: {
      scripts: true,
      documents: true
    },
    skipPreBuildTest: true,
    autoRestoreOnFailure: true
  }
};
```

**`.unvibe/config/settings.json`** (User settings)
```json
{
  "version": "1.0",
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-xxx",
    "enabled": true
  },
  "preferences": {
    "defaultMode": "interactive",
    "alwaysBackup": true,
    "backupRetention": 5
  }
}
```

### 7.2 Protected Paths

Never touch:
- `.git/` directories
- `.env` files with credentials
- Certificate/key files (`*.pem`, `*.key`, `*.crt`)
- Database files (`*.db`, `*.sqlite`)
- Root monorepo configs (`package.json`, `lerna.json`, `pnpm-workspace.yaml`)
- CI/CD configs (`.github/`, `.gitlab-ci.yml`)
- Files in `.unvibe-preserve` file

---

## 8. Safety Requirements

### 8.1 Critical Safety Rules

**S-1: Git Boundary Protection**
- MUST NEVER cross git boundaries (except root→sub distribution)
- MUST detect all `.git` locations before any operations
- MUST abort if git boundaries change during operation

**S-2: Backup Requirements**
- MUST backup ALL deleted files (no exceptions)
- MUST backup ALL moved files before moving
- MUST backup ALL overwritten files
- Backups are NON-NEGOTIABLE even in YOLO mode

**S-3: Build Integrity**
- MUST validate builds after distribution (if technology detected)
- MUST validate builds after cleanup
- SHOULD baseline builds before operations (optional in YOLO)
- MUST offer restore if build fails

**S-4: Protected File Enforcement**
- MUST NEVER delete protected files
- MUST NEVER distribute root monorepo configs
- MUST NEVER move files to wrong repositories

**S-5: Reversibility**
- ALL operations MUST be reversible via restore command
- Backups MUST include enough information to restore exact state
- Restore MUST be documented and easy to execute

### 8.2 Auto-Restore Logic (YOLO Mode)

```
try {
  executeDistribution();
  validateBuilds();
  executeCleanup();
  validateBuilds();
} catch (BuildFailure) {
  logError("Build failed after operations");
  restoreFromBackup();
  revalidateBuilds();
  if (stillFailing) {
    alertUser("Manual intervention required");
  } else {
    logSuccess("Auto-restore successful");
  }
}
```

---

## 9. Non-Functional Requirements

### 9.1 Performance

- **NFR-1**: Scan 1000+ files in <10 seconds
- **NFR-2**: Distribution planning for 100 files in <30 seconds (with AI)
- **NFR-3**: Parallel sub-repo processing where possible
- **NFR-4**: AI response caching to minimize API calls
- **NFR-5**: Backup operations should not significantly impact runtime

### 9.2 Usability

- **NFR-6**: First-time user can complete workflow in <5 minutes
- **NFR-7**: API key setup takes <60 seconds
- **NFR-8**: All prompts have clear default actions
- **NFR-9**: Error messages include solution suggestions
- **NFR-10**: Help output fits in standard terminal (24 lines)

### 9.3 Reliability

- **NFR-11**: 99.9% of operations must be safely reversible
- **NFR-12**: Zero data loss in default mode
- **NFR-13**: Graceful handling of permission errors
- **NFR-14**: Resume after interruption (ctrl-c during scan)

### 9.4 Compatibility

- **NFR-15**: Support Node.js 18+
- **NFR-16**: Work on Linux, macOS, Windows
- **NFR-17**: Handle symlinks gracefully
- **NFR-18**: Support git submodules
- **NFR-19**: Handle monorepo tools: Lerna, pnpm workspaces, Nx, Turborepo

### 9.5 Maintainability

- **NFR-20**: 85%+ test coverage
- **NFR-21**: Modular architecture (easy to add new technologies)
- **NFR-22**: Plugin system for custom rules (future)
- **NFR-23**: Clear separation: AI vs. heuristic logic

---

## 10. Success Criteria

### 10.1 Core Functionality

- ✅ Detect monorepo structure with 100% accuracy
- ✅ Allocate files with >90% accuracy (with AI)
- ✅ Allocate files with >65% accuracy (heuristics only)
- ✅ Zero incorrect file deletions
- ✅ All operations reversible via restore
- ✅ Builds work after cleanup (when they worked before)

### 10.2 AI Integration

- ✅ Clear value proposition for API key
- ✅ Graceful degradation without API key
- ✅ Users understand accuracy difference
- ✅ Setup process is quick and obvious
- ✅ YOLO mode strongly discourages no-AI usage

### 10.3 User Experience

- ✅ Contextual help guides next steps
- ✅ Dry-run shows accurate preview
- ✅ Interactive mode feels safe and controlled
- ✅ YOLO mode is fast (<30 seconds typical repo)
- ✅ Error messages are helpful, not cryptic

### 10.4 Safety

- ✅ Zero user reports of accidental file loss
- ✅ Auto-restore works 100% of time when triggered
- ✅ Protected files never touched
- ✅ Git boundaries never crossed incorrectly

---

## 11. Out of Scope

The following are explicitly NOT in scope for v1.0:

❌ Code refactoring or optimization
❌ Git operations (commit, push, merge)
❌ Dependency updates or management
❌ Code formatting or linting
❌ Security scanning
❌ File content modification (only moves/deletes)
❌ Cross-repository refactoring
❌ Automated code generation

---

## 12. Testing Strategy

### 12.1 Test Levels

**Unit Tests (70% of suite):**
- Allocation algorithms
- Classification logic
- Git detection
- Heuristic scoring
- Configuration parsing
- Safety checks

**Integration Tests (20% of suite):**
- Distribution workflows
- Cleanup workflows
- Build validation
- Backup/restore
- AI vs. heuristic comparison

**End-to-End Tests (10% of suite):**
- Full CLI workflows
- Interactive prompts
- YOLO mode
- Error recovery
- Real-world scenarios

### 12.2 Test Fixtures

Create comprehensive mock repositories:
- `monorepo-complex`: 3 sub-repos, 50+ root files, various scenarios
- `monorepo-simple`: 2 sub-repos, basic test case
- `single-repo`: Non-monorepo case
- `no-git`: No git repositories
- `edge-cases`: Nested monorepos, submodules, symlinks, permissions

### 12.3 Test Data

Each test scenario includes:
- Expected distribution targets
- Expected confidence scores
- Expected cleanup actions
- Expected build validation results
- Snapshot testing for outputs

### 12.4 Accuracy Validation

- Validate AI allocation accuracy >85%
- Validate heuristic accuracy >65%
- Compare AI vs. heuristics on same dataset
- Test against real-world repositories manually

### 12.5 Coverage Goals

- Overall: 85%+
- Safety features: 100%
- Allocation algorithms: 95%+
- Classification: 95%+
- CLI commands: 80%+

---

## 13. Technology Stack

### 13.1 Runtime & Core

- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js
- **File Operations**: fs-extra, fast-glob
- **Pattern Matching**: minimatch, micromatch
- **Git Operations**: simple-git

### 13.2 AI Integration

- **Primary**: Anthropic SDK (`@anthropic-ai/sdk`)
- **Secondary**: OpenAI SDK (optional)
- **Caching**: node-cache or filesystem JSON
- **Batching**: p-queue for parallel operations

### 13.3 Testing

- **Test Framework**: Vitest
- **E2E Testing**: Playwright
- **API Mocking**: MSW (Mock Service Worker)
- **Coverage**: c8

### 13.4 UI/UX

- **Colors**: chalk
- **Boxes**: boxen
- **Tables**: cli-table3
- **Spinners**: ora
- **Progress**: cli-progress
- **Prompts**: inquirer

---

## 14. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- CLI foundation & argument parsing
- Contextual help system
- Configuration management
- API key setup flow
- Status command

### Phase 2: Git & Scanning (Week 3)
- Git repository detection
- Monorepo vs. single-repo logic
- Boundary enforcement
- Technology detection
- Inventory generation

### Phase 3: AI Integration (Week 4)
- AI provider abstraction
- Anthropic/OpenAI integration
- Prompt engineering
- Response parsing
- Caching system
- Recommendation messaging

### Phase 4: Distribution Engine (Weeks 5-6)
- Explicit naming patterns
- Heuristic allocation
- AI allocation
- Dependency graph analysis
- Conflict resolution
- Subdirectory suggestions

### Phase 5: Classification (Week 7)
- Script type detection
- Staleness analysis
- AI-generated content detection
- Heuristic scoring
- AI classification

### Phase 6: Folder Enforcement (Week 8)
- Required folder detection
- Folder creation logic
- File organization
- Merge strategies

### Phase 7: Execution Engine (Week 9)
- Distribution execution
- Cleanup execution
- Backup system
- File operations
- Logging

### Phase 8: Build Validation (Week 10)
- Technology-specific builders
- Docker validation
- Critical path detection
- Auto-restore on failure

### Phase 9: Interactive Mode (Week 11)
- User prompts
- Plan review
- Distribution review
- Approval workflows

### Phase 10: YOLO Mode (Week 12)
- Auto-decision logic
- Aggressive cleanup
- AI warnings
- Conservative fallbacks

### Phase 11: Restore System (Week 13)
- Restore command
- Backup browsing
- Selective restore
- Verification

### Phase 12: Testing & Refinement (Weeks 14-16)
- Comprehensive test suite
- Real-world validation
- Performance optimization
- Documentation
- Bug fixes

---

## 15. Success Metrics

### 15.1 Adoption Metrics

- 80% of users configure AI key within first 3 uses
- 90% success rate for first-time workflows
- <5 minutes average time for full cleanup
- 70% of power users adopt YOLO mode

### 15.2 Quality Metrics

- Zero critical bugs in production
- <1% false positive deletion rate
- >95% user satisfaction with distribution accuracy (AI)
- >80% user satisfaction with distribution accuracy (heuristics)

### 15.3 Safety Metrics

- 100% of operations reversible via restore
- Zero reported data loss incidents
- 100% auto-restore success rate when triggered
- Zero git corruption incidents

---

## 16. Future Enhancements (Post-v1.0)

### 16.1 Plugin System
- Custom allocation strategies
- Custom classification rules
- Technology-specific handlers
- Custom validation steps

### 16.2 Advanced Features
- Duplicate file detection
- Large binary detection
- Unused dependency detection
- Code quality scoring

### 16.3 Integration
- GitHub Action
- GitLab CI component
- Pre-commit hook
- VS Code extension

### 16.4 Analytics
- Cleanup statistics over time
- Space reclaimed tracking
- Accuracy improvement metrics
- Common patterns detection

---

## 17. Documentation Requirements

### 17.1 User Documentation

- **README.md**: Quick start, installation, basic usage
- **USAGE.md**: Comprehensive CLI guide
- **CONFIG.md**: Configuration options and examples
- **FAQ.md**: Common questions and troubleshooting
- **EXAMPLES.md**: Real-world scenarios

### 17.2 Developer Documentation

- **ARCHITECTURE.md**: System design and flow
- **TESTING.md**: Test strategy and fixtures
- **CONTRIBUTING.md**: How to contribute
- **API.md**: Internal API documentation (if plugins added)

### 17.3 Inline Documentation

- JSDoc comments for all public functions
- Type definitions (TypeScript or JSDoc types)
- Code examples in complex areas
- Decision rationale in comments

---

## 18. Glossary

**Vibe Coding**: Rapid development sessions, often AI-assisted, where files may be created in suboptimal locations

**Monorepo**: Single repository containing multiple sub-projects, each with own `.git`

**Sub-repository**: Git repository nested within a monorepo

**Root Files**: Files at monorepo root that may belong to sub-repositories

**Distribution**: Process of moving root files to their correct sub-repositories

**Allocation**: Determining which sub-repository a file belongs to

**Heuristic**: Rule-based logic for file classification (no AI)

**YOLO Mode**: Aggressive, automated cleanup mode (You Only Live Once)

**Staleness**: Measure of how old/unused a file is

**Critical Path**: Files/paths essential for builds to work

**Protected Files**: Files that must never be touched by cleanup

**Git Boundary**: `.git` directory marking repository independence

---

## 19. Change Log

**v1.6** (2025-10-02)
- Added secret detection engine (FR-2.x)
- Pattern-based scanning for API keys, tokens, passwords, private keys
- Secret detection reports with severity levels and recommendations
- Integration with scan workflow (pre-operation warning)
- CLI commands: `devibe secrets`, flags: `--no-secret-scan`, `--secrets-only`, `--ignore-secrets`
- False positive handling and custom pattern support
- Privacy-focused reporting (truncated secret values)

**v1.5** (2025-10-02)
- Terminology fix: "vibe cutting" → "vibe coding sessions"
- Enhanced AI recommendation system with multiple touchpoints
- Added AI vs. heuristic comparison displays
- Strengthened YOLO mode warnings without AI
- Added explicit "strongly recommended" language for AI

**v1.4** (2025-10-02)
- Added intelligent monorepo root file distribution
- AI-powered file allocation with heuristic fallback
- Distribution-first processing workflow
- Subdirectory suggestions

**v1.3** (2025-10-02)
- Enhanced CLI/UX with contextual help
- API key management system
- Status command

**v1.2** (2025-10-02)
- Added YOLO mode
- Aggressive cleanup options
- Auto-restore on failure

**v1.1** (2025-10-02)
- Enhanced git-awareness
- AI-powered classification
- Interactive prompts

**v1.0** (2025-10-02)
- Initial requirements document

---

**Document Status:** Living Document
**Next Review:** After Phase 4 completion
**Owner:** Development Team
**Stakeholders:** Users, Contributors, Maintainers
