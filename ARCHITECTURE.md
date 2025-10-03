# DeVibe Architecture Overview

## System Architecture

DeVibe is a modular, extensible repository cleanup utility with a layered architecture designed for flexibility and composability.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  (User Interface, Commands, Arguments, Output)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Core Services Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Git Detector │  │Secret Scanner│  │File Classifier│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Test Organizer│  │Build Validator│  │Backup Manager │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 Rule Pack System                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Rule Pack Manager                                  │     │
│  │  • Load & Parse    • Validate    • Compose          │     │
│  │  • Install         • Search      • Apply            │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                Configuration Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Local Config │  │  Rule Packs  │  │   Defaults   │      │
│  │.devibe.config│  │  (YAML/JSON) │  │   (Built-in) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              File System & External APIs                     │
│  • File I/O    • Git    • AI APIs    • Package Managers     │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. CLI Layer (`src/cli.ts`)

**Responsibility**: User interaction, command parsing, output formatting

**Key Commands**:
- `devibe scan` - Secret detection
- `devibe plan` - Preview operations
- `devibe execute` - Apply changes
- `devibe organize-tests` - Test organization
- `devibe rulepack` - Rule pack management
- `devibe yolo` - Automated cleanup

### 2. Git Detection (`src/git-detector.ts`)

**Responsibility**: Multi-repository boundary detection

**Features**:
- Detects multiple `.git` directories
- Identifies root vs nested repositories
- Respects monorepo boundaries
- Validates file movement safety

**Interface**:
```typescript
interface ICanDetectGitRepositories {
  detectRepositories(path: string): Promise<GitDetectionResult>;
}

interface ICanValidateGitBoundaries {
  isWithinRepository(filePath: string, repoPath: string): boolean;
  canMoveFile(sourcePath: string, targetPath: string, repositories: GitRepository[]): boolean;
}
```

### 3. Secret Scanner (`src/secret-scanner.ts`)

**Responsibility**: Detect hardcoded secrets and credentials

**Detection Methods**:
- Pattern-based (regex) - 31 built-in patterns
- Entropy analysis - High-entropy string detection
- Context validation - Reduce false positives

**Patterns Detected**:
- Cloud providers (AWS, Azure, GCP)
- Payment (Stripe, PayPal)
- Communication (Slack, Discord, SendGrid)
- Development (GitHub, npm, Docker)
- Databases (MongoDB, PostgreSQL, Redis)
- AI services (OpenAI, Anthropic, Cohere)

**Interface**:
```typescript
interface ICanScanForSecrets {
  scanFiles(files: string[]): Promise<SecretScanResult>;
}
```

### 4. File Classifier (`src/file-classifier.ts`)

**Responsibility**: Categorize files for organization

**Classification Strategy**:
1. **AI Classification** (if available) - 90% accuracy
2. **Content Analysis** - Heuristic patterns
3. **Extension Mapping** - File type rules
4. **Path Patterns** - Location-based hints

**Categories**:
- `source` - Application code
- `test` - Test files
- `config` - Configuration
- `documentation` - Docs and markdown
- `script` - Executable scripts
- `asset` - Images, fonts, static files

**Interface**:
```typescript
interface ICanClassifyFiles {
  classify(filePath: string, content?: string): Promise<FileClassification>;
  classifyBatch(files: string[]): Promise<FileClassification[]>;
}
```

### 5. Test Organizer (`src/test-organizer.ts`)

**Responsibility**: Organize test files by category and technology

**Test Categories**:
- `unit` - Isolated component tests
- `integration` - Component interaction tests
- `e2e` - End-to-end tests
- `tdd` - Test-driven development specs
- `functional` - Business logic tests
- `performance` - Benchmarks and load tests
- `acceptance` - User acceptance criteria
- `contract` - API contract tests

**Technology Support**:
- Node.js/TypeScript
- React/Next.js
- Python
- Go
- Java (Maven/Gradle)

**Interface**:
```typescript
interface ICanOrganizeTests {
  detectTestFiles(rootPath: string): Promise<string[]>;
  categorizeTest(filePath: string): Promise<TestCategory>;
  planTestOrganization(rootPath: string): Promise<OperationPlan>;
}
```

### 6. Rule Pack System (`src/rulepack-*.ts`)

**Responsibility**: Shareable, composable directory structure standards

**Key Concepts**:
- **Rule Pack**: YAML/JSON definition of standards
- **Composition**: Extend and override other packs
- **Validation**: Schema and compatibility checks
- **Registry**: Discover and install community packs

**Sources**:
- Local files (`.yaml`, `.json`)
- npm packages (`@org/rulepack`)
- GitHub repositories (`github:org/repo`)
- URLs (`https://...`)

**Interfaces**:
```typescript
interface ICanManageRulePacks {
  install(source: string, version?: string): Promise<RulePack>;
  resolve(name: string): Promise<ResolvedRulePack>;
  validate(rulePack: RulePack): Promise<ValidationResult>;
}

interface ICanComposeRulePacks {
  compose(rulepacks: RulePack[]): Promise<RulePack>;
  merge(base: RulePack, override: Partial<RulePack>): RulePack;
}
```

### 7. Backup Manager (`src/backup-manager.ts`)

**Responsibility**: 100% reversible operations

**Features**:
- Automatic backup creation
- Manifest-based restoration
- Retention policies
- Metadata preservation (permissions, timestamps)

**Interface**:
```typescript
interface ICanBackupFiles {
  backupFile(filePath: string, operation: 'move' | 'delete' | 'modify'): Promise<BackupEntry>;
  createManifest(operations: BackupEntry[]): Promise<BackupManifest>;
}

interface ICanRestoreFiles {
  restore(manifestId: string): Promise<void>;
  listBackups(): Promise<BackupManifest[]>;
}
```

### 8. Build Validator (`src/build-validator.ts`)

**Responsibility**: Ensure cleanup doesn't break builds

**Supported Technologies**:
- Node.js (npm, yarn, pnpm)
- Docker (Dockerfile, docker-compose)
- Python (requirements.txt, setup.py)
- Go (go.mod)

**Interface**:
```typescript
interface ICanDetectBuildSystem {
  detect(path: string): Promise<BuildTechnology[]>;
}

interface ICanValidateBuilds {
  validateBuild(path: string, technology: BuildTechnology): Promise<BuildResult>;
}
```

### 9. Operation Planner & Executor (`src/operation-executor.ts`)

**Responsibility**: Plan and execute file operations safely

**Operation Types**:
- `move` - Relocate files
- `delete` - Remove files
- `create` - Create directories

**Safety Features**:
- Dry-run mode
- Git boundary validation
- Automatic backups
- Rollback on failure

**Interface**:
```typescript
interface ICanPlanOperations {
  planRootFileDistribution(rootPath: string): Promise<OperationPlan>;
  planFolderEnforcement(repoPath: string): Promise<OperationPlan>;
  planTestOrganization(rootPath: string): Promise<OperationPlan>;
}

interface ICanExecuteOperations {
  execute(plan: OperationPlan, dryRun: boolean): Promise<ExecutionResult>;
}
```

## Design Principles

### 1. Interface Segregation Principle (ISP)

Each component implements focused interfaces:
```typescript
// Instead of one large interface
interface IFileManager {
  classify(), organize(), backup(), restore(), scan()
}

// We use segregated interfaces
interface ICanClassifyFiles { classify() }
interface ICanOrganizeTests { organize() }
interface ICanBackupFiles { backup() }
interface ICanRestoreFiles { restore() }
```

### 2. Composition Over Inheritance

Services are composed, not inherited:
```typescript
class OperationPlanner {
  constructor(
    private gitDetector: GitDetector,
    private fileClassifier: FileClassifier,
    private testOrganizer?: TestOrganizer  // Optional composition
  ) {}
}
```

### 3. Fail-Safe Defaults

Operations default to safe behavior:
- Dry-run mode available everywhere
- Backups enabled by default
- AI classification is optional (fallback to heuristics)
- Validation errors are warnings, not blockers

### 4. Extensibility

Multiple extension points:
- Custom rule packs
- AI provider plugins
- Build validator extensions
- Secret pattern additions

### 5. Configuration Hierarchy

Configuration merges from multiple sources:
```
User Config (.devibe.config.js)
    ↓ overrides
Rule Packs (YAML/JSON)
    ↓ extends
Built-in Defaults (code)
```

## Data Flow

### Typical Workflow: Test Organization

```
1. User runs: devibe organize-tests

2. CLI Layer:
   - Parse command
   - Load configuration

3. Configuration Layer:
   - Load .devibe.config.js
   - Resolve rule packs
   - Merge configurations

4. Test Organizer:
   - Detect test files (glob patterns)
   - Categorize each test
   - Plan file moves

5. Operation Planner:
   - Validate git boundaries
   - Check file conflicts
   - Create operation plan

6. Backup Manager:
   - Create backup entries
   - Generate manifest

7. Operation Executor:
   - Execute file moves
   - Update git tracking
   - Verify success

8. CLI Layer:
   - Display results
   - Show backup ID
```

## Configuration Schema

### Local Configuration (`.devibe.config.js`)

```javascript
module.exports = {
  // Rule packs to apply
  rulepacks: ['@devibe/nodejs-standard'],

  // Overrides
  overrides: {
    testOrganization: { baseDirectory: 'test' }
  },

  // Disable specific rules
  disabledRules: ['naming-conventions/PascalCase'],

  // Feature toggles
  secretScan: { excludePatterns: ['vendor/**'] },
  ai: { enabled: true, provider: 'anthropic' },
  backup: { retentionDays: 30 }
};
```

### Rule Pack Schema (YAML)

```yaml
schema: "devibe-rulepack/v1"

metadata:
  name: "@org/rulepack-name"
  version: "1.0.0"
  author: "Author Name"

extends:
  - "@devibe/base"

structure:
  requiredFolders: [...]
  forbiddenAtRoot: [...]

testOrganization:
  categories: [...]

fileClassification:
  categories: {...}
```

## Technology Stack

- **Language**: TypeScript 5.x
- **Runtime**: Node.js ≥18
- **CLI Framework**: Commander.js
- **File Matching**: glob
- **Testing**: Vitest
- **Build**: tsc

## Extensibility Points

### 1. Custom Rule Packs

Create and share your own standards:
```yaml
schema: "devibe-rulepack/v1"
# ... your rules
```

### 2. AI Provider Plugins

Implement `ICanClassifyFiles`:
```typescript
class CustomAIClassifier implements ICanClassifyFiles {
  async classify(filePath: string, content?: string): Promise<FileClassification> {
    // Your AI logic
  }
}
```

### 3. Build Validators

Implement `BuildValidator`:
```typescript
class CustomBuildValidator implements BuildValidator {
  technology = 'custom';
  async canValidate(path: string): Promise<boolean> { ... }
  async runBuild(path: string): Promise<BuildResult> { ... }
}
```

### 4. Secret Patterns

Add custom patterns:
```javascript
// .devibe.config.js
module.exports = {
  secretScan: {
    customPatterns: [
      {
        id: 'company-api-key',
        pattern: 'ACME_API_[A-Za-z0-9]{32}',
        severity: 'critical'
      }
    ]
  }
};
```

## Future Architecture Enhancements

### Planned Features

1. **Plugin System**
   - npm-based plugins
   - Hot-reloadable extensions
   - Plugin marketplace

2. **Distributed Rule Pack Registry**
   - Searchable registry
   - Version resolution
   - Dependency management

3. **IDE Integrations**
   - VSCode extension
   - Real-time validation
   - Quick fixes

4. **CI/CD Integration**
   - GitHub Actions
   - GitLab CI
   - Jenkins plugins

5. **Web Dashboard**
   - Project analytics
   - Rule pack editor
   - Team management

### Architecture Evolution

```
Current: Monolithic CLI
    ↓
Phase 1: Plugin System
    ↓
Phase 2: Client-Server Architecture
    ↓
Phase 3: Distributed Services
```

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing**
   - Concurrent file scanning
   - Parallel test detection
   - Batch AI classification

2. **Caching**
   - Rule pack resolution cache
   - File classification cache
   - Git boundary cache

3. **Lazy Loading**
   - AI providers loaded on-demand
   - Rule packs loaded only when needed
   - Optional dependencies

4. **Incremental Processing**
   - Only process changed files
   - Skip already-organized tests
   - Delta-based operations

## Security

### Security Features

1. **Secret Detection**
   - 31 built-in patterns
   - Entropy analysis
   - Custom pattern support

2. **Safe Operations**
   - Dry-run mode
   - Automatic backups
   - Git boundary validation

3. **No Network by Default**
   - AI is optional
   - Rule packs can be local
   - No telemetry

4. **Credentials Protection**
   - Never log sensitive data
   - Redact secrets in output
   - Secure backup storage

## Testing Strategy

### Test Categories

1. **Unit Tests** (`tests/unit/`)
   - Component isolation
   - Mock external dependencies
   - Fast execution

2. **Integration Tests** (`tests/integration/`)
   - Multi-component workflows
   - Real file system operations
   - Git repository scenarios

3. **E2E Tests** (planned)
   - Full CLI workflows
   - Real-world repositories
   - Performance benchmarks

### Coverage Goals

- Line coverage: ≥85%
- Branch coverage: ≥85%
- Function coverage: ≥85%

---

**Version**: 1.0.0
**Last Updated**: 2025-10-02
**Status**: Current Architecture
