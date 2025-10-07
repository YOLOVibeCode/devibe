# DeVibe Rule Pack Specification v1.0

## Overview

Rule Packs are shareable, versioned configurations that define directory structure standards, test organization patterns, and file classification rules for DeVibe. They enable teams and communities to codify and share best practices.

## Rule Pack Structure

A Rule Pack is a JSON or YAML file that follows this specification:

```yaml
# example: @awesome-company/nodejs-monorepo-standard
schema: "devibe-rulepack/v1"
metadata:
  name: "nodejs-monorepo-standard"
  version: "1.2.0"
  author: "Awesome Company"
  description: "Enterprise Node.js monorepo structure based on NX conventions"
  tags: ["nodejs", "monorepo", "nx", "enterprise"]
  license: "MIT"
  homepage: "https://github.com/awesome-company/devibe-rulepacks"

extends:
  - "@devibe/base-nodejs"        # Can extend other rule packs
  - "@devibe/conventional-tests"

# Directory structure enforcement
structure:
  enforced: true
  requiredFolders:
    - path: "apps"
      description: "Application packages"
      allowedCategories: ["source"]
    - path: "libs"
      description: "Shared library packages"
      allowedCategories: ["source"]
    - path: "tools"
      description: "Build and deployment tools"
      allowedCategories: ["script", "config"]
    - path: "docs"
      description: "Documentation"
      allowedCategories: ["documentation"]

  forbiddenAtRoot:
    - "*.test.js"
    - "*.spec.js"
    - "*.component.tsx"
    - message: "Test files must be in tests/ or __tests__/ directories"

  optionalFolders:
    - path: "scripts"
      description: "Utility scripts"
    - path: "config"
      description: "Configuration files"

# Test organization rules
testOrganization:
  enabled: true
  strategy: "separated"  # Options: separated, colocated, hybrid
  baseDirectory: "tests"

  categories:
    - name: "unit"
      patterns:
        - "**/*.test.{ts,js}"
        - "**/*.spec.{ts,js}"
        - "!**/*.integration.*"
        - "!**/*.e2e.*"
      targetDirectory: "tests/unit"
      description: "Unit tests - isolated component testing"

    - name: "integration"
      patterns:
        - "**/*.integration.test.{ts,js}"
        - "**/*.integration.spec.{ts,js}"
      targetDirectory: "tests/integration"
      description: "Integration tests"

    - name: "e2e"
      patterns:
        - "**/*.e2e.{ts,js}"
        - "e2e/**/*.{ts,js}"
      targetDirectory: "tests/e2e"
      description: "End-to-end tests"

  # Technology-specific overrides
  technologyOverrides:
    react:
      strategy: "colocated"  # React tests next to components
      patterns:
        - "**/__tests__/**/*.{tsx,jsx}"

    python:
      baseDirectory: "tests"
      patterns:
        - "test_*.py"
        - "*_test.py"

# File classification rules
fileClassification:
  categories:
    source:
      extensions: [".ts", ".js", ".tsx", ".jsx"]
      patterns:
        - "src/**/*"
        - "lib/**/*"
      excludePatterns:
        - "**/*.test.*"
        - "**/*.spec.*"

    config:
      extensions: [".json", ".yaml", ".yml", ".toml", ".ini"]
      patterns:
        - "*config*"
        - ".*rc"
        - ".env*"
      suggestedLocation: "config/"

    script:
      extensions: [".sh", ".bash", ".py", ".rb"]
      patterns:
        - "scripts/**/*"
      suggestedLocation: "scripts/"

    documentation:
      extensions: [".md", ".mdx", ".txt"]
      patterns:
        - "docs/**/*"
        - "*.md"
      suggestedLocation: "docs/"

# Technology detection
technologies:
  nodejs:
    indicators:
      - file: "package.json"
        required: true
      - file: "node_modules"
        type: "directory"
    structure:
      preferredPackageManager: "npm"  # npm, yarn, pnpm

  typescript:
    indicators:
      - file: "tsconfig.json"
        required: true
    structure:
      requiredFolders: ["src"]

  react:
    indicators:
      - packageDependency: "react"
    structure:
      componentPattern: "src/components/**/*.tsx"

# Monorepo-specific rules
monorepo:
  enabled: true
  structure: "nx"  # Options: nx, lerna, turborepo, custom

  packageRules:
    - pattern: "apps/*"
      type: "application"
      requiredFolders: ["src", "tests"]

    - pattern: "libs/*"
      type: "library"
      requiredFolders: ["src", "tests"]
      requiredFiles: ["package.json", "README.md"]

# Secret scanning customization
secretScanning:
  severity: "critical"
  patterns:
    - id: "company-api-key"
      name: "Company API Key"
      pattern: "ACME_API_[A-Za-z0-9]{32}"
      severity: "critical"
      recommendation: "Use environment variables"

# Naming conventions
namingConventions:
  files:
    - pattern: "**/*.component.tsx"
      convention: "PascalCase"
      example: "UserProfile.component.tsx"

    - pattern: "**/*.test.ts"
      convention: "camelCase.test.ts"
      example: "userProfile.test.ts"

  folders:
    - pattern: "apps/*"
      convention: "kebab-case"
      example: "user-service"

# Git integration
git:
  requiredFiles:
    - ".gitignore"
    - "README.md"

  suggestedIgnorePatterns:
    - "dist/"
    - "build/"
    - "node_modules/"
    - ".env.local"

# CI/CD integration
cicd:
  preCommitChecks:
    - secretScan
    - testOrganization
    - buildValidation

  prChecks:
    - secretScan
    - folderStructure
    - namingConventions

# Custom rules (extensibility)
customRules:
  - id: "no-default-exports"
    description: "Prefer named exports over default exports"
    filePatterns: ["src/**/*.ts"]
    validator: "scripts/validators/no-default-exports.js"
    severity: "warning"

# Ignore patterns (global)
ignore:
  - "node_modules/**"
  - ".git/**"
  - "dist/**"
  - "build/**"
  - "coverage/**"
  - ".devibe/**"
```

## Rule Pack Schema Reference

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema` | string | Yes | Rule pack schema version (e.g., "devibe-rulepack/v1") |
| `metadata` | object | Yes | Rule pack metadata |
| `extends` | string[] | No | Other rule packs to extend |
| `structure` | object | No | Directory structure rules |
| `testOrganization` | object | No | Test organization configuration |
| `fileClassification` | object | No | File classification rules |
| `technologies` | object | No | Technology detection and rules |
| `monorepo` | object | No | Monorepo-specific configuration |
| `secretScanning` | object | No | Secret scanning customization |
| `namingConventions` | object | No | File and folder naming rules |
| `git` | object | No | Git integration rules |
| `cicd` | object | No | CI/CD pipeline configuration |
| `customRules` | array | No | Custom validation rules |
| `ignore` | string[] | No | Global ignore patterns |

### Metadata Object

```typescript
interface Metadata {
  name: string;              // Unique identifier (scoped: @org/name)
  version: string;           // Semantic version
  author: string;            // Author name or organization
  description: string;       // Human-readable description
  tags?: string[];           // Searchable tags
  license?: string;          // License identifier (SPDX)
  homepage?: string;         // Documentation URL
  repository?: string;       // Source repository URL
  compatibility?: {
    devibe: string;          // Minimum DeVibe version (semver)
    technologies?: string[]; // Compatible technologies
  };
}
```

## Rule Pack Discovery & Installation

### Local Rule Packs

```bash
# Use local rule pack
devibe --rulepack ./custom-rules.yaml

# Install from file
devibe rulepack install ./rules/company-standard.json
```

### Remote Rule Packs (GitHub, npm, URL)

```bash
# Install from GitHub
devibe rulepack install github:awesome-company/devibe-rulepacks#nodejs-monorepo

# Install from npm
devibe rulepack install @awesome-company/nodejs-standard

# Install from URL
devibe rulepack install https://example.com/rules/standard.yaml

# Install specific version
devibe rulepack install @devibe/nodejs-best-practices@2.1.0
```

### Rule Pack Registry

```bash
# List installed rule packs
devibe rulepack list

# Search registry
devibe rulepack search nodejs

# Show rule pack info
devibe rulepack info @devibe/nodejs-best-practices

# Update rule packs
devibe rulepack update

# Remove rule pack
devibe rulepack remove @awesome-company/nodejs-standard
```

## Configuration File Integration

In `.unvibe.config.js` or `.devibe.config.yaml`:

```javascript
module.exports = {
  // Use one or more rule packs
  rulepacks: [
    '@devibe/nodejs-best-practices',
    '@awesome-company/monorepo-standard',
    './local-overrides.yaml'
  ],

  // Override specific rules
  overrides: {
    testOrganization: {
      baseDirectory: 'test' // Override from rule pack
    }
  },

  // Disable specific rules from packs
  disabledRules: [
    'naming-conventions/PascalCase-components'
  ]
};
```

## Official Rule Packs (Curated)

DeVibe will maintain official rule packs:

- `@devibe/base` - Base configuration
- `@devibe/nodejs-standard` - Node.js best practices
- `@devibe/nodejs-monorepo` - NX/Lerna monorepo structure
- `@devibe/react-standard` - React/Next.js conventions
- `@devibe/python-standard` - Python best practices (PEP)
- `@devibe/go-standard` - Go standard project layout
- `@devibe/java-maven` - Maven project structure
- `@devibe/java-gradle` - Gradle project structure
- `@devibe/conventional-tests` - Conventional test organization

## Community Rule Packs

Community can publish rule packs following naming:

- `@company/rulepack-name` - Company/organization packs
- `@username/rulepack-name` - Personal packs
- GitHub: `github:org/repo#path/to/rulepack.yaml`

## Rule Pack Composition

### Inheritance & Extension

Rule packs can extend others:

```yaml
schema: "devibe-rulepack/v1"
metadata:
  name: "my-custom-standard"
  version: "1.0.0"

extends:
  - "@devibe/nodejs-standard"
  - "@devibe/conventional-tests"

# Only specify overrides
structure:
  requiredFolders:
    - path: "custom-folder"
      description: "My custom requirement"
```

### Merge Strategy

- **Arrays**: Append (no duplicates)
- **Objects**: Deep merge
- **Primitives**: Last one wins
- **Explicit null**: Remove inherited value

## Validation

Rule packs must pass validation:

```bash
# Validate a rule pack
devibe rulepack validate ./my-rules.yaml

# Check compatibility
devibe rulepack check-compatibility @org/rulepack
```

### Validation Rules:

1. ✅ Schema version must be supported
2. ✅ All required fields present
3. ✅ Patterns must be valid glob/regex
4. ✅ Extends references must exist
5. ✅ No circular dependencies
6. ✅ Version follows semver
7. ✅ Name follows scoping rules

## Publishing Rule Packs

### To npm

```bash
# Package structure
my-rulepack/
├── package.json
├── index.yaml          # Main rule pack
├── README.md
└── examples/
    └── .devibe.config.js

# package.json
{
  "name": "@myorg/devibe-nodejs-standard",
  "version": "1.0.0",
  "description": "My Node.js standards for DeVibe",
  "main": "index.yaml",
  "keywords": ["devibe", "rulepack", "nodejs"],
  "devibe": {
    "rulepack": true,
    "schema": "devibe-rulepack/v1"
  }
}
```

### To GitHub

```bash
# Repository structure
my-rulepacks/
├── README.md
├── nodejs-monorepo.yaml
├── react-standard.yaml
└── python-django.yaml

# Each YAML is a standalone rule pack
# Reference: github:myorg/my-rulepacks#nodejs-monorepo.yaml
```

## Use Cases

### 1. Company Standards

```yaml
# @acme-corp/engineering-standards
name: "acme-corp-engineering-standards"
description: "ACME Corp engineering directory standards"
structure:
  requiredFolders:
    - path: ".acme"
      description: "ACME-specific tooling"
```

### 2. Framework Conventions

```yaml
# @community/nextjs-app-router
name: "nextjs-app-router-standard"
description: "Next.js 13+ App Router conventions"
structure:
  requiredFolders:
    - path: "app"
    - path: "components"
    - path: "lib"
```

### 3. Technology Stacks

```yaml
# @stack/mern-fullstack
name: "mern-fullstack-standard"
description: "MongoDB, Express, React, Node.js stack"
extends:
  - "@devibe/nodejs-standard"
  - "@devibe/react-standard"
```

## Best Practices for Rule Pack Authors

1. **📝 Document Everything**: Clear descriptions for every rule
2. **🔄 Version Semantically**: Follow semver strictly
3. **🧪 Test Extensively**: Test with real projects
4. **📦 Start Specific**: Create focused packs, compose larger ones
5. **🏷️ Tag Appropriately**: Help users discover your pack
6. **🔗 Link Examples**: Provide example projects
7. **📊 Show Stats**: Include badges showing adoption
8. **💬 Community Feedback**: Listen to users, iterate

## Migration Path

Existing `.unvibe.config.js` files can be converted:

```bash
# Convert existing config to rule pack
devibe rulepack create --from-config .unvibe.config.js --output my-standard.yaml

# Publish for team
git add my-standard.yaml
git commit -m "Add DeVibe rule pack"
git push
```

## Future Enhancements

- [ ] Rule pack marketplace/registry
- [ ] Visual rule pack editor
- [ ] Auto-generated documentation
- [ ] Rule pack analytics (adoption, success rate)
- [ ] IDE integrations (VSCode extension)
- [ ] GitHub App for PR checks using rule packs
- [ ] Rule pack templates/generator
- [ ] Community voting/ratings
- [ ] Automated migration between rule packs

---

**Version**: 1.0.0
**Status**: Draft Specification
**Last Updated**: 2025-10-02
