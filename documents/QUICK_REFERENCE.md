# DeVibe Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Test Organization
devibe detect-tests                    # List all test files
devibe organize-tests --report         # Show current organization
devibe organize-tests --dry-run        # Preview changes
devibe organize-tests                  # Organize tests (with backup)

# Rule Packs (Future)
devibe rulepack install @devibe/nodejs-standard
devibe rulepack list
devibe --rulepack ./custom-rules.yaml

# Core Commands
devibe scan                            # Secret scanning
devibe plan                            # Preview file moves
devibe execute                         # Apply changes
devibe enforce                         # Enforce folder structure
devibe yolo                            # Full auto-cleanup
```

## 📁 Directory Structures

### Standard Node.js (`@devibe/nodejs-standard`)
```
project/
├── src/              # Source code
├── tests/
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   └── e2e/         # E2E tests
├── docs/            # Documentation
├── scripts/         # Build scripts
└── config/          # Configuration
```

### React (`@devibe/react-standard`)
```
project/
├── src/
│   ├── components/  # React components
│   ├── hooks/       # Custom hooks
│   ├── utils/       # Utilities
│   ├── contexts/    # React contexts
│   └── types/       # TypeScript types
├── public/          # Static assets
└── tests/
    ├── integration/
    └── e2e/
```

### Monorepo (`@devibe/nodejs-monorepo`)
```
monorepo/
├── apps/            # Applications
│   ├── web-app/
│   └── api-server/
├── packages/        # Shared libraries
│   ├── shared-utils/
│   └── ui-components/
├── tools/           # Build tools
└── docs/            # Documentation
```

## 🧪 Test Categories

| Category | Pattern Examples | Use Case |
|----------|-----------------|----------|
| `unit` | `*.test.ts`, `*.spec.ts` | Isolated component tests |
| `integration` | `*.integration.test.ts` | Component interaction |
| `e2e` | `*.e2e.ts`, `e2e/**/*.ts` | End-to-end flows |
| `tdd` | `*.tdd.test.ts` | TDD specs |
| `functional` | `*.functional.test.ts` | Business logic |
| `performance` | `*.perf.test.ts` | Benchmarks |
| `acceptance` | `*.acceptance.test.ts` | UAT criteria |
| `contract` | `*.contract.test.ts` | API contracts |

## 🔧 Configuration Templates

### Basic `.devibe.config.js`
```javascript
module.exports = {
  testOrganization: {
    enabled: true,
    baseDirectory: 'tests',
  },

  secretScan: {
    excludePatterns: ['node_modules/**'],
  },

  backup: {
    enabled: true,
    retentionDays: 30,
  }
};
```

### With Rule Packs
```javascript
module.exports = {
  rulepacks: [
    '@devibe/nodejs-standard',
    './custom-overrides.yaml'
  ],

  overrides: {
    testOrganization: {
      baseDirectory: 'test'  // Override
    }
  },

  disabledRules: [
    'naming-conventions/PascalCase'
  ]
};
```

### Custom Rule Pack YAML
```yaml
schema: "devibe-rulepack/v1"

metadata:
  name: "@mycompany/standard"
  version: "1.0.0"
  author: "Engineering Team"

extends:
  - "@devibe/nodejs-standard"

structure:
  requiredFolders:
    - path: "src"
    - path: "tests"

testOrganization:
  enabled: true
  categories:
    - name: "unit"
      patterns: ["**/*.test.ts"]
      targetDirectory: "tests/unit"
```

## 🎯 Common Workflows

### Organize Tests After AI Coding Session
```bash
# 1. See what tests exist
devibe detect-tests

# 2. Check current organization
devibe organize-tests --report

# 3. Preview changes
devibe organize-tests --dry-run

# 4. Apply organization (creates backup)
devibe organize-tests

# 5. If something went wrong, restore
devibe backups
devibe restore <backup-id>
```

### Set Up Project with Rule Pack
```bash
# 1. Initialize config
devibe init

# 2. Edit .devibe.config.js
# Add: rulepacks: ['@devibe/nodejs-standard']

# 3. Apply standards
devibe organize-tests
devibe enforce
```

### Create Company Standard
```bash
# 1. Create custom-standard.yaml
# (See template above)

# 2. Use in project
devibe --rulepack ./custom-standard.yaml

# 3. Share with team
git add custom-standard.yaml
git commit -m "Add DeVibe standards"

# 4. Team uses it
devibe --rulepack ./custom-standard.yaml
```

## 📊 Technology Detection

| Technology | Indicators | Test Patterns |
|------------|-----------|---------------|
| Node.js | `package.json` | `*.test.{js,ts}` |
| TypeScript | `tsconfig.json` | `*.spec.ts` |
| React | `dependencies.react` | `*.test.{tsx,jsx}` |
| Python | `requirements.txt` | `test_*.py` |
| Go | `go.mod` | `*_test.go` |
| Java | `pom.xml` | `*Test.java` |

## 🔍 File Classification

| Category | Extensions | Example Locations |
|----------|-----------|------------------|
| Source | `.ts`, `.js`, `.tsx` | `src/**/*` |
| Test | `.test.ts`, `.spec.ts` | `tests/**/*` |
| Config | `.json`, `.yaml` | `config/**/*` |
| Documentation | `.md`, `.mdx` | `docs/**/*` |
| Script | `.sh`, `.bash` | `scripts/**/*` |
| Asset | `.png`, `.svg` | `public/**/*` |

## 🛡️ Secret Detection

**31 Types Detected**:
- Cloud: AWS, Azure, GCP, DigitalOcean
- Payment: Stripe, PayPal
- APIs: GitHub, GitLab, npm, Docker
- Communication: Slack, Discord, SendGrid, Twilio
- Databases: MongoDB, PostgreSQL, Redis
- AI: OpenAI, Anthropic, Cohere
- More: JWT, Private Keys, Webhooks

**Severity Levels**:
- 🔴 **Critical**: API keys, private keys, passwords
- 🟠 **High**: Tokens, credentials
- 🟡 **Medium**: Potential secrets
- 🔵 **Low**: False positive risk

## ⚙️ CLI Options

```bash
# Global Options
--dry-run              Preview changes without applying
--path <path>          Specify repository path
--rulepack <path>      Use specific rule pack

# Test Organization
--report               Generate organization report

# Scan Options
-p, --path <path>      Path to scan

# Backup Management
devibe backups         List all backups
devibe restore <id>    Restore from backup
```

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `RULE_PACK_SPEC.md` | Complete rule pack specification |
| `ARCHITECTURE.md` | System architecture and design |
| `rulepacks/README.md` | Official rule packs guide |
| `IMPLEMENTATION_SUMMARY.md` | What was built and why |
| `README.md` | Main user documentation |

## 🎨 Naming Conventions

### Files
- **camelCase**: `userService.ts`, `formatDate.ts`
- **PascalCase**: `UserProfile.tsx`, `Button.component.tsx`
- **kebab-case**: `user-service.ts`, `format-date.ts`

### Folders
- **kebab-case**: `user-management/`, `api-client/`
- **PascalCase**: `UserProfile/`, `SharedComponents/`

### Test Files
- Unit: `userService.test.ts`
- Integration: `userService.integration.test.ts`
- E2E: `userFlow.e2e.ts`

## 💡 Best Practices

### ✅ Do's
- ✅ Use `--dry-run` before applying changes
- ✅ Enable automatic backups
- ✅ Review reports before organizing
- ✅ Share rule packs with your team
- ✅ Version your rule packs (semver)
- ✅ Document custom rules

### ❌ Don'ts
- ❌ Skip dry-run on first use
- ❌ Disable backups in production
- ❌ Mix test categories
- ❌ Ignore git boundaries
- ❌ Hard-code secrets (scan first!)

## 🆘 Troubleshooting

### Tests not detected?
```bash
# Check patterns in config
devibe detect-tests

# Verify technology detection
devibe validate
```

### Wrong categorization?
```bash
# Check current categories
devibe organize-tests --report

# Override in .devibe.config.js
testOrganization: {
  categories: [
    { name: "unit", patterns: ["your-pattern"] }
  ]
}
```

### Need to undo changes?
```bash
# List backups
devibe backups

# Restore specific backup
devibe restore <backup-id>
```

## 🔗 Quick Links

- **Specification**: [RULE_PACK_SPEC.md](./RULE_PACK_SPEC.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Rule Packs**: [rulepacks/README.md](./rulepacks/README.md)
- **Examples**: [rulepacks/](./rulepacks/)

---

**DeVibe Version**: 1.1.0
**Last Updated**: 2025-10-02
