# UnVibe Architecture Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

UnVibe is a CLI utility that intelligently cleans up repositories after intense vibe coding sessions. It specializes in monorepo environments where AI-assisted coding often results in files being created in wrong locations.

### 1.1 Core Capabilities

1. **Root File Distribution** - Move misplaced root files to correct sub-repositories
2. **Script Classification** - Identify and organize utility, build, and critical scripts
3. **Folder Structure Enforcement** - Create standardized `scripts/` and `documents/` folders
4. **Build Validation** - Ensure operations don't break builds
5. **Safety & Reversibility** - All operations backed up and reversible

### 1.2 Design Principles

- **Safety First** - All operations are backed up and reversible
- **AI-Powered with Graceful Degradation** - Works with or without AI, but strongly recommends AI
- **Git-Aware** - Respects repository boundaries and never corrupts git state
- **Build-Safe** - Validates builds before and after operations
- **User-Centric** - Clear feedback, contextual help, and intelligent defaults

---

## 2. System Architecture

### 2.1 High-Level Architecture

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

### 2.2 Component Architecture

```
src/
├── cli/                       # Command-line interface
│   ├── commands/              # Command implementations
│   ├── prompts/               # User interaction prompts
│   └── output/                # Formatting and display
│
├── core/                      # Core business logic
│   ├── git/                   # Git detection and analysis
│   ├── distribution/          # Root file distribution
│   ├── classification/        # Script classification
│   ├── organization/          # Folder structure enforcement
│   └── validation/            # Build validation
│
├── ai/                        # AI integration layer
│   ├── providers/             # AI provider implementations
│   ├── prompts/               # AI prompt templates
│   ├── cache/                 # AI response caching
│   └── fallback/              # Heuristic fallback logic
│
├── safety/                    # Safety and backup system
│   ├── backup/                # Backup operations
│   ├── restore/               # Restore operations
│   └── validation/            # Safety checks
│
├── config/                    # Configuration management
│   ├── loader/                # Config file loading
│   ├── validator/             # Config validation
│   └── defaults/              # Default configurations
│
└── utils/                     # Shared utilities
    ├── file-ops/              # File operations
    ├── patterns/              # Pattern matching
    └── tech-detection/        # Technology detection
```

---

## 3. Data Flow

### 3.1 Primary Workflow (Interactive Mode)

```
User runs `devibe`
    │
    ▼
┌─────────────────────┐
│ Contextual Help     │  Shows status, AI config, next steps
└─────────────────────┘
    │
    ▼
User runs `devibe scan`
    │
    ▼
┌─────────────────────┐
│ Git Detection       │  Identify repos, boundaries
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Repository Analysis │  Detect technology, structure
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ File Inventory      │  Catalog all files
└─────────────────────┘
    │
    ▼
User runs `devibe distribute`
    │
    ▼
┌─────────────────────┐
│ Distribution Plan   │  AI/Heuristic allocation
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ User Review/Approve │  Show plan, get confirmation
└─────────────────────┘
    │
    ▼
User runs `devibe plan`
    │
    ▼
┌─────────────────────┐
│ Classification      │  Classify scripts, docs
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Cleanup Plan        │  What to move, delete, organize
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ User Review         │  Show plan, get confirmation
└─────────────────────┘
    │
    ▼
User runs `devibe execute`
    │
    ▼
┌─────────────────────┐
│ Backup              │  Backup all affected files
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Execute Operations  │  Distribution + Cleanup
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Build Validation    │  Test builds still work
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Report Results      │  Show summary, offer restore
└─────────────────────┘
```

### 3.2 YOLO Workflow

```
User runs `devibe yolo`
    │
    ▼
┌─────────────────────┐
│ AI Configuration    │  Check if AI enabled
│ Warning             │  (CRITICAL if disabled)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Scan + Analyze      │  Full repository scan
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Auto-Distribution   │  Confidence >70% (AI)
│                     │  Confidence >80% (Heuristic)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Auto-Classification │  Classify all scripts
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Backup              │  Backup all affected files
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Execute All         │  No prompts, full automation
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Build Validation    │  Test builds
└─────────────────────┘
    │
    ├─ Success ─────────────► Report Results
    │
    └─ Failure ──────────────► Auto-Restore ──► Revalidate
```

---

## 4. Working Directory Structure

```
.unvibe/
├── inventory/              # Scan results and file listings
│   ├── scan-{timestamp}.json
│   └── latest.json
│
├── distribution/           # Root file distribution plans
│   ├── distribution-{timestamp}.json
│   └── current.json
│
├── plans/                  # Cleanup operation plans
│   ├── plan-{timestamp}.json
│   └── current.json
│
├── backups/                # Backed up files before deletion
│   └── {timestamp}/
│       ├── root/
│       ├── api/
│       └── web/
│
├── logs/                   # Operation logs
│   └── {timestamp}.log
│
├── cache/                  # AI classification cache
│   ├── script-classifications.json
│   └── file-allocations.json
│
└── config/                 # User configuration
    ├── rules.js            # Default rules
    ├── yolo-rules.js       # YOLO mode overrides
    └── settings.json       # API keys, preferences
```

---

## 5. Key Data Structures

### 5.1 Repository Structure

```typescript
interface Repository {
  path: string;              // Absolute path to repository
  type: 'root' | 'sub';      // Repository type
  hasGit: boolean;           // Has .git directory
  gitPath: string;           // Path to .git
  technology: Technology[];  // Detected technologies
  buildCommand?: string;     // Build command if detected
  packageManager?: string;   // npm, pnpm, yarn, etc.
}

interface RepositoryTree {
  isMonorepo: boolean;
  rootRepo?: Repository;
  subRepos: Repository[];
  boundaries: string[];      // Paths to all .git directories
}
```

### 5.2 File Inventory

```typescript
interface FileEntry {
  path: string;              // Relative path from repo root
  absolutePath: string;      // Absolute path
  repository: string;        // Which repo it belongs to
  type: 'script' | 'doc' | 'code' | 'config' | 'other';
  isGitTracked: boolean;
  lastModified: Date;
  lastAccessed: Date;
  size: number;
  hash: string;              // For caching AI results
}

interface Inventory {
  timestamp: string;
  repositoryTree: RepositoryTree;
  files: FileEntry[];
  rootFiles: FileEntry[];    // Files at monorepo root
  totalFiles: number;
  totalSize: number;
}
```

### 5.3 Distribution Plan

```typescript
interface AllocationDecision {
  file: FileEntry;
  targetRepo: string;        // Target repository path
  targetSubdir?: string;     // Suggested subdirectory
  confidence: number;        // 0.0 - 1.0
  method: 'explicit' | 'ai' | 'heuristic';
  reasoning: string;         // Why this allocation
  conflicts?: ConflictInfo;  // If target file exists
}

interface DistributionPlan {
  timestamp: string;
  aiEnabled: boolean;
  decisions: AllocationDecision[];
  keepAtRoot: FileEntry[];   // Files to keep at root
  highConfidence: AllocationDecision[];  // >85% confidence
  lowConfidence: AllocationDecision[];   // <70% confidence
}
```

### 5.4 Classification Result

```typescript
interface ScriptClassification {
  file: FileEntry;
  category: 'utility' | 'build' | 'critical' | 'test' | 'unknown';
  staleness: 'fresh' | 'aging' | 'stale';
  isAIGenerated: boolean;
  referencedBy: string[];    // Files that reference this
  confidence: number;
  reasoning: string;
  action: 'keep' | 'organize' | 'delete';
  targetLocation?: string;   // Where to organize it
}

interface CleanupPlan {
  timestamp: string;
  aiEnabled: boolean;
  classifications: ScriptClassification[];
  toOrganize: ScriptClassification[];
  toDelete: ScriptClassification[];
  toKeep: ScriptClassification[];
  foldersToCreate: string[];
}
```

### 5.5 Backup Manifest

```typescript
interface BackupEntry {
  originalPath: string;
  backupPath: string;
  operation: 'delete' | 'move' | 'overwrite';
  timestamp: string;
  hash: string;
}

interface BackupManifest {
  timestamp: string;
  mode: 'interactive' | 'yolo';
  repository: string;
  entries: BackupEntry[];
  distributionPlan?: DistributionPlan;
  cleanupPlan?: CleanupPlan;
}
```

---

## 6. Technology Stack

### 6.1 Core Dependencies

```json
{
  "dependencies": {
    "commander": "^11.0.0",      // CLI framework
    "inquirer": "^9.0.0",        // Interactive prompts
    "chalk": "^5.0.0",           // Terminal colors
    "ora": "^7.0.0",             // Spinners
    "boxen": "^7.0.0",           // Boxes
    "cli-table3": "^0.6.0",      // Tables
    "fs-extra": "^11.0.0",       // File operations
    "fast-glob": "^3.0.0",       // Fast file globbing
    "minimatch": "^9.0.0",       // Pattern matching
    "simple-git": "^3.0.0",      // Git operations
    "@anthropic-ai/sdk": "^0.9.0", // AI integration
    "node-cache": "^5.0.0",      // In-memory caching
    "p-queue": "^7.0.0"          // Parallel operations
  }
}
```

### 6.2 Development Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",          // Testing framework
    "c8": "^8.0.0",              // Coverage
    "@types/node": "^20.0.0",    // Type definitions
    "eslint": "^8.0.0",          // Linting
    "prettier": "^3.0.0"         // Formatting
  }
}
```

---

## 7. Module Dependencies

### 7.1 Module Dependency Graph

```
cli/
  ├─> core/git               (repo detection)
  ├─> core/distribution      (distribution logic)
  ├─> core/classification    (classification logic)
  ├─> safety/backup          (backup operations)
  └─> config/loader          (configuration)

core/distribution
  ├─> ai/providers           (AI allocation)
  ├─> ai/fallback            (heuristic allocation)
  ├─> core/git               (repo boundaries)
  └─> utils/patterns         (pattern matching)

core/classification
  ├─> ai/providers           (AI classification)
  ├─> ai/fallback            (heuristic classification)
  └─> utils/tech-detection   (technology detection)

core/validation
  ├─> core/git               (git operations)
  ├─> utils/tech-detection   (build commands)
  └─> safety/restore         (auto-restore)

ai/providers
  ├─> ai/cache               (response caching)
  └─> config/loader          (API keys)
```

### 7.2 Circular Dependency Prevention

- **Rule 1**: `cli/` can depend on anything
- **Rule 2**: `core/` cannot depend on `cli/`
- **Rule 3**: `ai/` cannot depend on `core/` (only used by core)
- **Rule 4**: `utils/` cannot depend on anything except other utils
- **Rule 5**: `safety/` can depend on `core/` and `utils/`

---

## 8. Error Handling Strategy

### 8.1 Error Categories

1. **User Errors** - Invalid input, missing files
   - Display helpful message with solution
   - Exit with code 1

2. **Configuration Errors** - Invalid config, missing API key
   - Show configuration help
   - Suggest fix command
   - Exit with code 2

3. **System Errors** - Permission denied, disk full
   - Show error details
   - Suggest system-level solutions
   - Exit with code 3

4. **Build Failures** - Build broke after operations
   - Trigger auto-restore (YOLO)
   - Show restore instructions (Interactive)
   - Exit with code 4

5. **Internal Errors** - Bugs, unexpected conditions
   - Show error details
   - Request bug report
   - Exit with code 99

### 8.2 Error Recovery

```typescript
class OperationError extends Error {
  code: number;
  recoverable: boolean;
  backupId?: string;
}

async function executeWithRecovery(operation: Operation) {
  const backupId = await backup.create();
  
  try {
    await operation.execute();
    await validate.builds();
    return { success: true };
  } catch (error) {
    if (error.recoverable && config.yolo) {
      await restore.fromBackup(backupId);
      return { success: false, restored: true };
    }
    throw error;
  }
}
```

---

## 9. Performance Considerations

### 9.1 Optimization Targets

- **Scan 1000+ files in <10 seconds**
  - Use `fast-glob` for file discovery
  - Parallel file stat operations
  - Early filtering with ignore patterns

- **AI responses cached aggressively**
  - Hash-based cache keys
  - 24-hour default TTL
  - Invalidate on file content changes

- **Parallel repository processing**
  - Independent sub-repos processed in parallel
  - Use `p-queue` for concurrency control
  - Limit: CPU cores × 2

- **Incremental operations**
  - Reuse previous scan results when possible
  - Only re-analyze changed files
  - Track inventory diffs

### 9.2 Resource Management

```typescript
interface PerformanceConfig {
  maxConcurrency: number;        // Default: CPU cores × 2
  aiRequestBatchSize: number;    // Default: 10
  cacheSize: number;             // Default: 1000 entries
  maxFileSize: number;           // Skip files >10MB for AI
  scanTimeout: number;           // Default: 60s
}
```

---

## 10. Security Considerations

### 10.1 API Key Protection

- Store in `.unvibe/config/settings.json`
- Never log full API keys
- Auto-add to `.gitignore`
- Mask in all displays: `sk-ant-***...***abc`

### 10.2 File System Safety

- Validate all paths before operations
- Prevent directory traversal
- Check permissions before operations
- Never follow symlinks outside repo

### 10.3 Protected Files

Never touch:
- `.git/` directories
- `.env` files
- Certificate/key files (`*.pem`, `*.key`, `*.crt`)
- Database files (`*.db`, `*.sqlite`)
- Files in `.unvibe-preserve`

---

## 11. Testing Strategy

### 11.1 Test Coverage Goals

- Overall: 85%+
- Safety features: 100%
- Allocation algorithms: 95%+
- Classification: 95%+
- CLI commands: 80%+

### 11.2 Test Fixtures

Create comprehensive mock repositories in `tests/fixtures/`:
- `monorepo-complex/` - 3 sub-repos, 50+ root files
- `monorepo-simple/` - 2 sub-repos, basic case
- `single-repo/` - Non-monorepo case
- `no-git/` - No git repositories
- `edge-cases/` - Nested, submodules, symlinks

### 11.3 Test Types

1. **Unit Tests (70%)** - Individual functions, pure logic
2. **Integration Tests (20%)** - Component interactions
3. **E2E Tests (10%)** - Full CLI workflows

---

## 12. Deployment & Distribution

### 12.1 NPM Package Structure

```
unvibe/
├── bin/
│   └── devibe.js          # CLI entry point
├── dist/                  # Compiled JavaScript
├── src/                   # Source code
├── tests/                 # Test suite
├── package.json
├── README.md
└── LICENSE
```

### 12.2 Installation

```bash
npm install -g unvibe
```

### 12.3 Release Process

1. Version bump (semantic versioning)
2. Update CHANGELOG.md
3. Run full test suite
4. Build and verify
5. Publish to npm
6. Tag release in git

---

## 13. Future Architecture Considerations

### 13.1 Plugin System (v2.0)

```typescript
interface Plugin {
  name: string;
  version: string;
  
  allocators?: CustomAllocator[];
  classifiers?: CustomClassifier[];
  validators?: CustomValidator[];
  
  onBeforeScan?: Hook;
  onAfterScan?: Hook;
  onBeforeExecute?: Hook;
  onAfterExecute?: Hook;
}
```

### 13.2 Web Dashboard (v2.0)

- Visual plan review
- Drag-and-drop file allocation
- Real-time collaboration
- Historical analytics

### 13.3 CI/CD Integration (v1.5)

- GitHub Action
- GitLab CI component
- Pre-commit hook
- Automated cleanup on PR merge

---

## 14. Documentation Architecture

### 14.1 Documentation Structure

```
docs/
├── README.md              # Overview and quick start
├── USAGE.md               # Comprehensive CLI guide
├── CONFIG.md              # Configuration reference
├── FAQ.md                 # Troubleshooting
├── EXAMPLES.md            # Real-world scenarios
├── ARCHITECTURE.md        # This document
├── CONTRIBUTING.md        # Contribution guidelines
└── API.md                 # Internal API (future)
```

### 14.2 Code Documentation

- JSDoc for all public functions
- Type definitions using TypeScript or JSDoc
- Decision rationale in complex areas
- Examples in docstrings

---

## 15. Versioning & Compatibility

### 15.1 Semantic Versioning

- **Major (x.0.0)**: Breaking changes to CLI or config
- **Minor (0.x.0)**: New features, backward compatible
- **Patch (0.0.x)**: Bug fixes, no API changes

### 15.2 Configuration Compatibility

- Always support previous major version configs
- Auto-migrate configs when possible
- Warn on deprecated options

### 15.3 Node.js Compatibility

- Minimum: Node.js 18
- Target: Node.js 20 LTS
- Test on: 18, 20, 21 (latest)

---

**Document Status:** Living Document  
**Next Review:** After implementation begins  
**Owner:** Development Team

