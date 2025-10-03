# DeVibe Official Rule Packs

This directory contains official rule packs maintained by the DeVibe team.

## Available Rule Packs

### Core Rule Packs

| Rule Pack | Description | Use Case |
|-----------|-------------|----------|
| [`nodejs-standard.yaml`](./nodejs-standard.yaml) | Standard Node.js project structure | Single Node.js applications and libraries |
| [`react-standard.yaml`](./react-standard.yaml) | React/Next.js best practices | React applications with component-based architecture |
| [`nodejs-monorepo.yaml`](./nodejs-monorepo.yaml) | Monorepo structure (NX/Turborepo) | Multi-package repositories with apps and shared libraries |

## Quick Start

### Using a Rule Pack

```bash
# Option 1: Direct reference in config
devibe --rulepack ./rulepacks/nodejs-standard.yaml

# Option 2: Add to .devibe.config.js
module.exports = {
  rulepacks: ['./rulepacks/nodejs-standard.yaml']
};
```

### Combining Rule Packs

Rule packs can extend each other:

```javascript
// .devibe.config.js
module.exports = {
  rulepacks: [
    './rulepacks/nodejs-monorepo.yaml',
    './rulepacks/react-standard.yaml',
    './custom-overrides.yaml'
  ]
};
```

## Rule Pack Details

### `@devibe/nodejs-standard`

**Purpose**: Standard Node.js project structure following community best practices

**Enforced Structure**:
```
project/
├── src/              # Source code
├── tests/            # Organized tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/             # Documentation
├── scripts/          # Build scripts
└── config/           # Configuration files
```

**Best For**:
- Single Node.js applications
- npm packages/libraries
- TypeScript projects
- Express/Fastify APIs

### `@devibe/react-standard`

**Purpose**: React/Next.js structure with modern component organization

**Enforced Structure**:
```
project/
├── src/
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   ├── utils/        # Utility functions
│   ├── types/        # TypeScript types
│   ├── contexts/     # React contexts
│   └── styles/       # CSS/styling
├── public/           # Static assets
└── tests/
    ├── integration/
    └── e2e/
```

**Features**:
- Component colocated tests (via `__tests__/`)
- PascalCase component naming enforcement
- Hook naming conventions (`useXyz`)
- CSS Module support

**Best For**:
- React applications
- Next.js projects
- Component libraries
- Frontend applications

### `@devibe/nodejs-monorepo`

**Purpose**: Enterprise monorepo structure following NX/Turborepo conventions

**Enforced Structure**:
```
monorepo/
├── apps/             # Application packages
│   ├── web-app/
│   └── api-server/
├── packages/         # Shared libraries
│   ├── shared-utils/
│   └── ui-components/
├── tools/            # Build tools
├── docs/             # Documentation
└── scripts/          # Shared scripts
```

**Features**:
- Per-package test organization
- Package naming conventions
- Workspace protocol enforcement
- NX/Turborepo/Lerna support

**Best For**:
- Large-scale applications
- Multi-team projects
- Shared library ecosystems
- Microservices monorepos

## Customization

### Extending Rule Packs

Create your own rule pack that extends official ones:

```yaml
# my-custom-rules.yaml
schema: "devibe-rulepack/v1"

metadata:
  name: "@mycompany/custom-standard"
  version: "1.0.0"
  author: "My Company"
  description: "Company-specific standards"

extends:
  - "./rulepacks/nodejs-standard.yaml"

# Add your overrides
structure:
  requiredFolders:
    - path: ".company"
      description: "Company-specific tooling"
```

### Overriding Rules

Override specific rules without creating a full rule pack:

```javascript
// .devibe.config.js
module.exports = {
  rulepacks: ['./rulepacks/nodejs-standard.yaml'],

  overrides: {
    testOrganization: {
      baseDirectory: 'test'  // Override from 'tests' to 'test'
    },

    structure: {
      requiredFolders: [
        // Add custom required folder
        { path: 'migrations', description: 'Database migrations' }
      ]
    }
  }
};
```

## Creating Your Own Rule Pack

See [RULE_PACK_SPEC.md](../RULE_PACK_SPEC.md) for the complete specification.

### Template

```yaml
schema: "devibe-rulepack/v1"

metadata:
  name: "your-rulepack-name"
  version: "1.0.0"
  author: "Your Name"
  description: "Description of your rule pack"
  tags: ["tag1", "tag2"]

structure:
  enforced: true
  requiredFolders:
    - path: "src"
      description: "Source code"

testOrganization:
  enabled: true
  baseDirectory: "tests"
  categories:
    - name: "unit"
      patterns: ["**/*.test.ts"]
      targetDirectory: "tests/unit"
      description: "Unit tests"
```

## Rule Pack Philosophy

### Design Principles

1. **Opinionated but Flexible**: Provide strong defaults while allowing customization
2. **Composable**: Rule packs should extend and combine well
3. **Technology-Aware**: Respect ecosystem conventions
4. **Non-Breaking**: Changes should be additive when possible
5. **Well-Documented**: Every rule should explain its purpose

### Versioning

Rule packs follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes to structure or required fields
- **MINOR**: New optional folders, patterns, or features
- **PATCH**: Bug fixes, documentation updates

### Community Contributions

Want to contribute a rule pack?

1. Fork the repository
2. Create your rule pack in `rulepacks/community/`
3. Add tests and examples
4. Submit a pull request

## Testing Rule Packs

Test your rule pack before using it:

```bash
# Validate rule pack syntax
devibe rulepack validate ./rulepacks/nodejs-standard.yaml

# Dry-run against a project
devibe organize-tests --rulepack ./rulepacks/nodejs-standard.yaml --dry-run

# Generate report
devibe organize-tests --rulepack ./rulepacks/nodejs-standard.yaml --report
```

## FAQ

### Q: Can I use multiple rule packs?

Yes! Rule packs are composable. Later rule packs override earlier ones.

```javascript
rulepacks: [
  './rulepacks/nodejs-standard.yaml',
  './rulepacks/react-standard.yaml',
  './my-overrides.yaml'
]
```

### Q: How do I disable a specific rule?

Use the `disabledRules` option:

```javascript
module.exports = {
  rulepacks: ['./rulepacks/nodejs-standard.yaml'],
  disabledRules: [
    'structure/forbiddenAtRoot/test-files'
  ]
};
```

### Q: Can I create private rule packs?

Yes! Rule packs can be:
- Local files
- Private GitHub repositories
- Private npm packages
- Internal file servers

### Q: What if I don't agree with a rule?

You can:
1. Override it in your config
2. Disable specific rules
3. Create your own rule pack
4. Contribute improvements upstream

## Resources

- [Rule Pack Specification](../RULE_PACK_SPEC.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Example Projects](../examples/)

## License

MIT - See [LICENSE](../LICENSE) for details
