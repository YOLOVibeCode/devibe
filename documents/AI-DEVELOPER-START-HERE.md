# AI Developer - Start Here 🤖

**You are an AI assistant implementing the Markdown Consolidation feature for devibe.**

---

## What You're Building

A CLI feature that consolidates 30-40 fragmented markdown files into 3-5 organized documents using AI-powered analysis.

**Command:** `devibe consolidate ./docs`

**Result:** Fewer, better-organized markdown files with 100% content preservation.

---

## Implementation Document

**📖 READ THIS:** [design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md](./design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md)

This document contains:
- ✅ Complete step-by-step instructions (9 steps)
- ✅ Full TypeScript code for every component
- ✅ Integration with existing systems (AIProvider, BackupManager)
- ✅ Test templates
- ✅ Success criteria for each step
- ✅ Common issues & solutions

---

## Quick Implementation Guide

### Step 1: Types (30 min)
Create `src/markdown-consolidation/types.ts` with all interfaces.

### Step 2: Scanner (4 hours)
Implement `MarkdownScanner` - finds and analyzes .md files.
- Uses `fast-glob` for file discovery
- Uses `gray-matter` for frontmatter parsing
- Extracts metadata (title, headers, word count, links)

### Step 3: Basic Analyzer (4 hours)
Implement `MarkdownAnalyzer` - scores relevance (0-100).
- Recency: 0-25 points (based on age)
- Quality: 0-25 points (structure, content)
- Connectivity: 0-25 points (inbound/outbound links)
- Uniqueness: 0-25 points (duplicate detection)

### Step 4: AI Analyzer (3 hours)
Implement `AIContentAnalyzer` - clusters files by topic.
- Uses existing `AIProvider` interface
- Sends clustering prompt to AI
- Parses AI response into topic clusters
- Falls back to directory-based clustering

### Step 5: Consolidator (8 hours)
Implement `MarkdownConsolidator` - executes consolidation.
- Creates consolidation plans
- Implements `merge-by-topic` strategy
- Integrates with `BackupManager` (existing)
- Generates consolidated markdown files

### Step 6: Super README (4 hours)
Implement `SuperReadmeGenerator` - creates documentation hub.
- Categorizes files (Architecture, Guides, API, etc.)
- Generates navigation structure
- Adds icons and metadata

### Step 7: Validator (3 hours)
Implement `ConsolidationValidator` - ensures safety.
- Validates file creation
- Checks content preservation
- Finds broken links

### Step 8: CLI (3 hours)
Add commands to `src/cli.ts`:
- `devibe consolidate [directory]` - main command
- Integrates all components
- Shows progress with spinners

### Step 9: Tests (8 hours)
Write tests for all components.
- Target: 90%+ coverage
- Unit tests for each component
- Integration tests for full workflow

---

## File Structure to Create

```
src/markdown-consolidation/
├── types.ts                       [Step 1]
├── markdown-scanner.ts            [Step 2]
├── markdown-analyzer.ts           [Step 3]
├── ai-content-analyzer.ts         [Step 4]
├── markdown-consolidator.ts       [Step 5]
├── super-readme-generator.ts      [Step 6]
├── consolidation-validator.ts     [Step 7]
└── index.ts                       [exports]

src/cli.ts                         [Step 8 - modify]

tests/unit/markdown-consolidation/
├── scanner.test.ts                [Step 9]
├── analyzer.test.ts               [Step 9]
├── ai-analyzer.test.ts            [Step 9]
├── consolidator.test.ts           [Step 9]
├── readme-generator.test.ts       [Step 9]
└── validator.test.ts              [Step 9]
```

---

## Dependencies

### Install
```bash
npm install fast-glob gray-matter
npm install -D @types/js-yaml
```

### Use Existing
- `AIProvider` from `src/ai-provider-resolver.ts`
- `BackupManager` from `src/backup-manager.ts`
- `Commander.js` for CLI (already in project)
- `ora` for spinners (already in project)

---

## Key Integration Points

### 1. AIProvider (Existing)
```typescript
import { AIProvider } from '../ai-provider-resolver';
import { AIProviderFactory } from '../ai-provider-resolver';

// Use in ai-content-analyzer.ts
const aiProvider = AIProviderFactory.create(config.ai);
const response = await aiProvider.analyzeFileAllocation({
  fileName: 'markdown-clustering',
  fileContent: prompt,
  availableRepos: [],
  context: {} as any
});
```

### 2. BackupManager (Existing)
```typescript
import { BackupManager } from '../backup-manager';

// Use in markdown-consolidator.ts
const backupManager = new BackupManager();
await backupManager.createBackup(filePaths, 'markdown-consolidation');
const backupPath = await backupManager.getLatestBackupPath();
```

### 3. CLI (Existing - Modify)
```typescript
// Add to src/cli.ts
program
  .command('consolidate [directory]')
  .description('Consolidate markdown documentation')
  .option('-r, --recursive', 'Process subdirectories')
  .option('--max-output <number>', 'Maximum output files', '5')
  .option('--dry-run', 'Preview without changes')
  .option('--auto', 'Auto-approve plan')
  .action(async (directory, options) => {
    await consolidateCommand(directory || '.', options);
  });
```

---

## Critical Constraints

### MUST HAVE
- ✅ AI engine MUST be enabled (not optional)
- ✅ Backup MUST be created before any changes
- ✅ Original files MUST be preserved until user confirms
- ✅ 100% content preservation (validate word counts)
- ✅ Valid markdown output

### MUST NOT
- ❌ Don't modify README.md (create DOCUMENTATION_HUB.md instead)
- ❌ Don't delete files without backup
- ❌ Don't lose content during consolidation
- ❌ Don't create broken links

---

## Success Criteria

Implementation is DONE when:

1. **Compiles:** All TypeScript compiles without errors
2. **Tests:** `npm test` passes with 90%+ coverage
3. **Command:** `devibe consolidate --help` works
4. **Dry-run:** `devibe consolidate ./test-docs --dry-run` shows plan
5. **Execute:** `devibe consolidate ./test-docs --auto` consolidates files
6. **AI Check:** Fails gracefully if AI not enabled
7. **Backup:** Creates backup before consolidation
8. **Validation:** Detects content loss and broken links
9. **Output:** Generates valid markdown files
10. **Super README:** Creates DOCUMENTATION_HUB.md

---

## Testing Approach

### Create Test Fixtures
```bash
mkdir -p test-fixtures/markdown-test
echo "# Test Doc 1" > test-fixtures/markdown-test/doc1.md
echo "# Test Doc 2" > test-fixtures/markdown-test/doc2.md
# ... create 20+ test markdown files
```

### Run Tests
```bash
npm test                                    # All tests
npm run test:watch                          # Watch mode
npm run coverage                            # Coverage report
npm test -- markdown-consolidation          # Just this feature
```

### Manual Testing
```bash
# Build
npm run build

# Test command
./dist/cli.js consolidate --help

# Dry run
./dist/cli.js consolidate ./test-fixtures/markdown-test --dry-run

# Execute
./dist/cli.js consolidate ./test-fixtures/markdown-test --auto
```

---

## Common Issues

### "Cannot find module 'fast-glob'"
**Fix:** `npm install fast-glob gray-matter`

### "AIProvider not found"
**Fix:** Import from `../ai-provider-resolver` (relative path)

### "BackupManager not found"
**Fix:** Import from `../backup-manager` (relative path)

### AI clustering returns empty
**Fix:** Check AI prompt format, ensure JSON response parsing works

### Tests fail with "ENOENT"
**Fix:** Create directories in `beforeAll`, remove in `afterAll`

---

## Implementation Order (Critical)

**DO NOT SKIP STEPS. FOLLOW IN ORDER:**

1. ✅ Read [design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md](./design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md)
2. ✅ Step 1: Create types.ts
3. ✅ Step 2: Create scanner + tests
4. ✅ Step 3: Create analyzer + tests
5. ✅ Step 4: Create AI analyzer + tests
6. ✅ Step 5: Create consolidator + tests
7. ✅ Step 6: Create super README generator + tests
8. ✅ Step 7: Create validator + tests
9. ✅ Step 8: Integrate CLI
10. ✅ Step 9: Complete all tests
11. ✅ Verify success criteria

---

## Time Estimate

- **Steps 1-8:** 30 hours (implementation)
- **Step 9:** 8 hours (tests)
- **Total:** 38 hours focused implementation

---

## Context for AI

**Project:** devibe - CLI tool for repository cleanup after vibe coding  
**Language:** TypeScript with Node.js  
**Test Framework:** Vitest  
**CLI Framework:** Commander.js  
**Current Version:** 1.6.0

**Existing Features:**
- Git detection
- File classification
- Secret scanning
- AI-powered file distribution
- Backup/restore system

**New Feature:** Markdown consolidation (you're implementing this)

**Key Requirement:** This feature REQUIRES AI to be enabled. It's not optional because:
- Topic clustering needs semantic understanding
- Staleness detection needs context awareness
- Content summarization needs intelligence

---

## Questions?

**Architecture:** Read [design/03-MARKDOWN-CONSOLIDATION-DESIGN.md](./design/03-MARKDOWN-CONSOLIDATION-DESIGN.md)  
**Specification:** Read [specs/08-MARKDOWN-CONSOLIDATION.md](./specs/08-MARKDOWN-CONSOLIDATION.md)  
**Implementation:** Read [design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md](./design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md) ⭐

---

## Ready to Start?

**Go to:** [design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md](./design/03-MARKDOWN-CONSOLIDATION-AI-IMPLEMENTATION.md)

**Begin with:** Step 1 (Types & Interfaces)

**Expected Completion:** 38 hours

---

**Good luck! You've got everything you need. Start with the implementation document and follow it step by step.** 🚀




