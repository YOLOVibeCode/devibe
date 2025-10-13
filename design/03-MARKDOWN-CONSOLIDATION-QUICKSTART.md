# Markdown Consolidation - Developer Quick Start

**Ready to implement? Start here!** 🚀

---

## What You Need to Know

### The Problem
Vibe coding creates 30-40+ fragmented markdown files that clutter repos and waste AI context tokens.

### The Solution
AI-powered consolidation that reduces 30-40 files → 3-5 organized documents while preserving 100% of content.

### Your Goal
Build a system that intelligently:
1. Scans markdown files (with recursive option)
2. Analyzes relevance (4-factor scoring: recency, quality, connectivity, uniqueness)
3. Clusters by topic using AI
4. Consolidates using 5 strategies
5. Generates super README for navigation
6. Validates safety and content preservation

---

## Documents You Need

### 📋 Start Here
1. **[Specification](../specs/08-MARKDOWN-CONSOLIDATION.md)** - What to build (1,200 lines)
2. **[Design Doc](./03-MARKDOWN-CONSOLIDATION-DESIGN.md)** - How to build it (architecture, components)
3. **[Checklist](./03-MARKDOWN-CONSOLIDATION-CHECKLIST.md)** - What to do (89 tasks, 6 weeks)

### 🎯 Quick Reference
- **Spec Summary:** [../specs/08-MARKDOWN-CONSOLIDATION-SUMMARY.md](../specs/08-MARKDOWN-CONSOLIDATION-SUMMARY.md) (4 pages)
- **This Document:** Quick start guide (you are here)

---

## Architecture at a Glance

```
User Command → CLI → Orchestrator → Components → Validation → Output

Components:
1. MarkdownScanner          # Discover & extract metadata
2. MarkdownAnalyzer         # 4-factor relevance scoring
3. AIContentAnalyzer        # Topic clustering & similarity
4. MarkdownConsolidator     # Execute 5 strategies
5. SuperReadmeGenerator     # Create documentation hub
6. ConsolidationValidator   # Ensure safety
```

---

## File Structure

### You Will Create

```
src/markdown-consolidation/
├── index.ts                    (100 lines)   [Public API]
├── markdown-scanner.ts         (350 lines)   [Week 1]
├── markdown-analyzer.ts        (500 lines)   [Week 2]
├── ai-content-analyzer.ts      (400 lines)   [Week 2]
├── markdown-consolidator.ts    (600 lines)   [Week 3]
├── consolidation-strategies.ts (400 lines)   [Week 3]
├── super-readme-generator.ts   (450 lines)   [Week 4]
├── consolidation-validator.ts  (250 lines)   [Week 5]
├── types.ts                    (150 lines)   [Week 1]
└── utils.ts                    (100 lines)   [As needed]

tests/unit/markdown-consolidation/
├── scanner.test.ts             (300 lines)
├── analyzer.test.ts            (400 lines)
├── ai-analyzer.test.ts         (350 lines)
├── consolidator.test.ts        (450 lines)
├── readme-generator.test.ts    (300 lines)
└── validator.test.ts           (250 lines)

tests/integration/
└── markdown-consolidation.test.ts (400 lines)

Total: ~5,750 lines (including tests)
```

---

## Week-by-Week Plan

### Week 1: Core Infrastructure (40h)
**Goal:** File discovery and metadata extraction
- Setup module structure
- Implement MarkdownScanner
- Extract metadata (title, headers, word count, links, code blocks)
- Parse frontmatter
- Unit tests (90%+ coverage)

**Deliverable:** Scanner that finds and analyzes .md files

---

### Week 2: Analysis Systems (40h)
**Goal:** Relevance scoring and AI clustering
- Implement MarkdownAnalyzer (4-factor scoring)
- Implement AIContentAnalyzer (topic clustering)
- Status classification (highly-relevant, relevant, marginal, stale)
- Unit tests for both (90%+ coverage)

**Deliverable:** Analysis engine that scores files and clusters by topic

---

### Week 3: Consolidation Engine (40h)
**Goal:** Execute consolidation strategies
- Implement 5 strategies:
  - merge-by-topic
  - merge-by-folder
  - summarize-cluster
  - create-super-readme
  - archive-stale
- Plan creation and execution
- Integration with BackupManager

**Deliverable:** Working consolidation engine

---

### Week 4: Super README & CLI (40h)
**Goal:** User interface and documentation hub
- Implement SuperReadmeGenerator (6 categories)
- Add CLI commands (`consolidate`, `consolidate finalize`)
- Interactive prompts and progress indicators
- Summary reports

**Deliverable:** Complete CLI interface

---

### Week 5: Validation & Safety (40h)
**Goal:** Ensure safety and quality
- Implement ConsolidationValidator
- Content preservation checks
- Link validation
- Backup verification
- Integration tests

**Deliverable:** Validated, safe consolidation

---

### Week 6: Polish & Launch (40h)
**Goal:** Production ready
- Bug fixes
- Performance optimization
- Comprehensive documentation
- Final testing
- Release

**Deliverable:** Feature shipped! 🎉

---

## Key Algorithms

### 1. Relevance Scoring (0-100 points)

```typescript
score = recency + quality + connectivity + uniqueness

// Recency (0-25)
≤7 days:    25 points
≤30 days:   20 points
≤90 days:   15 points
≤180 days:  10 points
>180 days:   5 points

// Quality (0-25)
wordCount:  0-10 (≥500: 10, ≥200: 7, ≥50: 4)
structure:  0-8  (≥5 headers: 8, ≥3: 5, ≥1: 3)
codeBlocks: 0-4  (≥3: 4, ≥1: 2)
links:      0-3  (≥5: 3, ≥1: 2)

// Connectivity (0-25)
inbound:  0-15 (each link: +3, max 15)
outbound: 0-10 (each link: +2, max 10)

// Uniqueness (0-25)
0 similar:     25 points
1 similar:     20 points
2-3 similar:   15 points
4-5 similar:   10 points
>5 similar:     5 points

// Status
75+:  highly-relevant
50-74: relevant
30-49: marginal
<30:   stale
```

### 2. Topic Clustering (AI-Powered)

```typescript
// AI analyzes files and returns:
{
  clusters: [
    {
      name: "Architecture",
      files: [1, 3, 7],  // file indices
      strategy: "merge",
      suggestedFilename: "ARCHITECTURE.md"
    },
    {
      name: "API Documentation",
      files: [2, 5, 9],
      strategy: "summarize",
      suggestedFilename: "API_DOCS.md"
    }
  ],
  staleFiles: [4, 8],
  standaloneFiles: [6]
}
```

### 3. Consolidation Strategies

**merge-by-topic:**
- Combine related files
- Add table of contents
- Include source attribution
- Preserve all content

**merge-by-folder:**
- Create index for folder
- Extract previews
- Link to individual files
- Categorize by type

**summarize-cluster:**
- AI-generated summary
- Extract key points
- Remove duplicates
- Keep examples

**create-super-readme:**
- Documentation hub
- 6 categories with icons
- Navigation table
- Metadata

**archive-stale:**
- Move to `.devibe/archive/`
- Preserve with timestamp
- Log archived files

---

## CLI Commands

```bash
# Basic consolidation
devibe consolidate

# With options
devibe consolidate ./docs --recursive --max-output 3 --dry-run

# Auto mode (no prompts)
devibe consolidate ./docs --auto

# Finalize (delete originals after review)
devibe consolidate finalize ./docs
```

---

## Testing Requirements

### Coverage Targets
- Scanner: 90%+
- Analyzer: 90%+
- AI Analyzer: 85%+
- Consolidator: 95%+
- README Generator: 90%+
- Validator: 100%
- **Overall: 90%+**

### Test Types
- **Unit tests (70%):** Test each component independently
- **Integration tests (20%):** Test component interactions
- **E2E tests (10%):** Test full workflows

### Must-Have Tests
- [ ] Scans 100 files in <5s
- [ ] Analyzes relevance accurately
- [ ] Clusters files into 3-5 groups
- [ ] Preserves 100% of content
- [ ] Detects broken links
- [ ] Validates backup existence
- [ ] Handles AI failures gracefully

---

## Performance Targets

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Scan 100 files | <2s | <5s |
| Analyze 100 files | <5s | <10s |
| AI clustering (50 files) | <30s | <60s |
| Full consolidation | <60s | <120s |

---

## Dependencies

### NPM Packages to Install
```bash
npm install fast-glob gray-matter js-yaml
npm install -D @types/js-yaml
```

### Existing Systems to Use
- `AIProvider` - For AI analysis
- `BackupManager` - For safety
- `cli.ts` - Add commands here
- `config.ts` - Add configuration

---

## Day 1 Tasks

### Setup (4 hours)
1. ✅ Read specification document (2h)
2. ✅ Read design document (1h)
3. ✅ Team kickoff meeting (1h)

### Development (4 hours)
1. ✅ Create feature branch
2. ✅ Create module directory
3. ✅ Define TypeScript types
4. ✅ Install dependencies
5. ✅ Create test fixtures (20+ sample .md files)

### First Code (optional, if time)
1. ✅ Start `markdown-scanner.ts`
2. ✅ Write first test
3. ✅ Make it pass

**End of Day 1:** Module structure ready, types defined, test fixtures created

---

## Common Pitfalls

### ❌ Don't Do This
1. **Skip tests** - Write tests first (TDD)
2. **Hardcode paths** - Use configuration
3. **Ignore edge cases** - Empty files, large files, no frontmatter
4. **Block on AI** - Handle failures gracefully
5. **Lose content** - Always validate preservation

### ✅ Do This Instead
1. **Write failing tests first** - Then implement
2. **Use config for patterns** - Keep flexible
3. **Test edge cases explicitly** - Add to test suite
4. **Mock AI for tests** - Use real AI in integration
5. **Validate before and after** - Word count, links, structure

---

## Getting Help

### Questions About...
**Specification:** Read [08-MARKDOWN-CONSOLIDATION.md](../specs/08-MARKDOWN-CONSOLIDATION.md)  
**Architecture:** Read [03-MARKDOWN-CONSOLIDATION-DESIGN.md](./03-MARKDOWN-CONSOLIDATION-DESIGN.md)  
**Tasks:** Check [03-MARKDOWN-CONSOLIDATION-CHECKLIST.md](./03-MARKDOWN-CONSOLIDATION-CHECKLIST.md)  
**Testing:** Read [00-TDD-METHODOLOGY.md](./00-TDD-METHODOLOGY.md)

### Stuck?
- **Code review:** Create PR, tag team
- **Blocker:** Slack @tech-lead
- **Architecture:** Schedule sync meeting

---

## Success Checklist

### You're Done When...
- [ ] All 89 tasks in checklist complete
- [ ] 90%+ test coverage achieved
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] Feature merged to main
- [ ] Release tagged

### You Know It Works When...
- [ ] Consolidates 30 files → 3-5
- [ ] Preserves 100% of content
- [ ] Detects stale files accurately
- [ ] Generates useful super README
- [ ] Handles AI failures gracefully
- [ ] Users can finalize safely
- [ ] No broken links after consolidation

---

## Team Roles (Suggested)

### Senior Developer
- Architecture oversight
- AI integration
- Consolidation strategies
- Code review

### Mid-Level Developer
- Scanner implementation
- Analyzer implementation
- Validator implementation
- Testing

### Shared
- CLI commands
- Documentation
- Bug fixes
- User feedback

---

## Daily Standup Template

```
What I did yesterday:
- Completed: [checklist items]
- Blockers: [issues]

What I'm doing today:
- Focus: [Week X, Day Y tasks]
- Goal: [deliverable]

Blockers:
- [impediments]
```

---

## Quick Commands Reference

```bash
# Development
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run coverage            # Coverage report
npm run lint                # Lint code

# Testing feature locally
./dist/cli.js consolidate ./test-docs --dry-run
./dist/cli.js consolidate ./test-docs --auto
./dist/cli.js consolidate finalize ./test-docs

# Git workflow
git checkout -b feature/markdown-consolidation
git add .
git commit -m "feat: implement scanner"
git push origin feature/markdown-consolidation
```

---

## Resources

### Documentation
- [Specification](../specs/08-MARKDOWN-CONSOLIDATION.md) - Detailed requirements
- [Design Doc](./03-MARKDOWN-CONSOLIDATION-DESIGN.md) - Architecture & components
- [Checklist](./03-MARKDOWN-CONSOLIDATION-CHECKLIST.md) - Implementation tasks

### Tools
- [Vitest](https://vitest.dev/) - Test framework
- [fast-glob](https://github.com/mrmlnc/fast-glob) - File discovery
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing

---

## Final Tips

1. **Start small** - Get scanner working first
2. **Test first** - Write failing tests, then implement
3. **Iterate fast** - Small commits, frequent pushes
4. **Ask early** - Don't spin for hours
5. **Document as you go** - JSDoc comments
6. **Celebrate wins** - Mark checklist items complete! ✅

---

**Ready? Go to [Week 1, Day 1 in the checklist](./03-MARKDOWN-CONSOLIDATION-CHECKLIST.md#week-1-core-infrastructure-40h) and start building! 🚀**

---

**Last Updated:** 2025-10-11  
**Version:** 1.0  
**Status:** Ready for Development




