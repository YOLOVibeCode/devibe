# Markdown Consolidation - Developer Design Document

**Feature ID:** FEAT-008  
**Specification:** [08-MARKDOWN-CONSOLIDATION.md](../specs/08-MARKDOWN-CONSOLIDATION.md)  
**Status:** Ready for Implementation  
**Target Version:** v2.0 (Post-v1.0)  
**Estimated Effort:** 6 weeks (1 senior dev + 1 mid-level dev)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Dependencies & Prerequisites](#dependencies--prerequisites)
8. [Risk Assessment](#risk-assessment)
9. [Performance Considerations](#performance-considerations)
10. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### Problem Statement
Vibe coding sessions generate 30-40+ fragmented markdown files that clutter repositories, making documentation hard to navigate and consuming unnecessary AI context tokens.

### Solution
An AI-powered markdown consolidation system that:
- Analyzes relevance using multi-factor scoring (recency, quality, connectivity, uniqueness)
- Clusters related content using AI topic analysis
- Consolidates into 3-5 well-organized documents
- Generates a super README for navigation
- Preserves 100% of content with full backup/restore

### Success Criteria
- ✅ 70-90% reduction in markdown file count
- ✅ Zero data loss (100% content preservation)
- ✅ >80% accuracy in staleness detection
- ✅ >85% user satisfaction with topic clustering
- ✅ <5% broken links after consolidation

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLI Layer (cli.ts)                           │
│               devibe consolidate [options]                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Markdown Consolidation Orchestrator                │
│                  (markdown-consolidator.ts)                     │
└─────┬──────────┬──────────┬──────────┬──────────┬─────────────┘
      │          │          │          │          │
      ▼          ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│ Scanner │ │Analyzer│ │AI      │ │Super    │ │Validator │
│         │ │        │ │Analyzer│ │README   │ │          │
└─────────┘ └────────┘ └────────┘ └─────────┘ └──────────┘
      │          │          │          │          │
      └──────────┴──────────┴──────────┴──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Shared Services   │
              ├─────────────────────┤
              │ • AIProvider        │
              │ • BackupManager     │
              │ • FileSystem        │
              │ • Configuration     │
              └─────────────────────┘
```

### Module Structure

```
src/
├── markdown-consolidation/
│   ├── index.ts                          # Public API
│   ├── markdown-scanner.ts               # File discovery & metadata
│   ├── markdown-analyzer.ts              # Relevance scoring
│   ├── ai-content-analyzer.ts            # AI-powered analysis
│   ├── markdown-consolidator.ts          # Consolidation engine
│   ├── super-readme-generator.ts         # Documentation hub
│   ├── consolidation-validator.ts        # Safety checks
│   ├── consolidation-strategies.ts       # Strategy implementations
│   ├── types.ts                          # TypeScript types
│   └── utils.ts                          # Helper functions
│
├── cli.ts                                # Add consolidate command
└── config.ts                             # Add consolidation config
```

### File Organization

```
New Files to Create:
├── src/markdown-consolidation/
│   ├── index.ts                    (~100 lines)
│   ├── markdown-scanner.ts         (~350 lines)
│   ├── markdown-analyzer.ts        (~500 lines)
│   ├── ai-content-analyzer.ts      (~400 lines)
│   ├── markdown-consolidator.ts    (~600 lines)
│   ├── super-readme-generator.ts   (~450 lines)
│   ├── consolidation-validator.ts  (~250 lines)
│   ├── consolidation-strategies.ts (~400 lines)
│   ├── types.ts                    (~150 lines)
│   └── utils.ts                    (~100 lines)
│
├── tests/unit/markdown-consolidation/
│   ├── scanner.test.ts             (~300 lines)
│   ├── analyzer.test.ts            (~400 lines)
│   ├── ai-analyzer.test.ts         (~350 lines)
│   ├── consolidator.test.ts        (~450 lines)
│   ├── readme-generator.test.ts    (~300 lines)
│   └── validator.test.ts           (~250 lines)
│
└── tests/integration/
    └── markdown-consolidation.test.ts (~400 lines)

Total: ~5,750 lines of code (including tests)
```

---

## Component Design

### 1. MarkdownScanner

**Purpose:** Discover and extract metadata from markdown files

**Input:**
```typescript
interface ScanOptions {
  targetDirectory: string;
  recursive: boolean;
  excludePatterns: string[];
  includeHidden: boolean;
}
```

**Output:**
```typescript
interface MarkdownFile {
  path: string;
  relativePath: string;
  name: string;
  size: number;
  lastModified: Date;
  content: string;
  metadata: MarkdownMetadata;
}
```

**Key Methods:**
- `scan(options: ScanOptions): Promise<MarkdownFile[]>`
- `analyzeFile(filePath: string): Promise<MarkdownFile>`
- `extractMetadata(content: string): MarkdownMetadata`
- `parseFrontMatter(content: string): Record<string, any>`

**Implementation Notes:**
- Use `fast-glob` for efficient file discovery
- Parse frontmatter with `gray-matter` package
- Extract headers with regex: `/^(#{1,6})\s+(.+)$/gm`
- Handle large files (stream for >10MB)

---

### 2. MarkdownAnalyzer

**Purpose:** Calculate relevance scores using multi-factor analysis

**Scoring Algorithm:**

```typescript
interface RelevanceAnalysis {
  score: number;              // 0-100
  factors: {
    recency: number;          // 0-25 points
    contentQuality: number;   // 0-25 points
    connectivity: number;     // 0-25 points
    uniqueness: number;       // 0-25 points
  };
  status: 'highly-relevant' | 'relevant' | 'marginal' | 'stale';
  reasoning: string;
}
```

**Scoring Breakdown:**

1. **Recency Score (0-25):**
   ```
   ≤7 days:    25 points (fresh)
   ≤30 days:   20 points (recent)
   ≤90 days:   15 points (aging)
   ≤180 days:  10 points (old)
   >180 days:   5 points (very old)
   ```

2. **Content Quality (0-25):**
   ```
   Word count:    0-10 points (≥500: 10, ≥200: 7, ≥50: 4, <50: 1)
   Structure:     0-8 points  (≥5 headers: 8, ≥3: 5, ≥1: 3)
   Code blocks:   0-4 points  (≥3: 4, ≥1: 2)
   Links:         0-3 points  (≥5: 3, ≥1: 2)
   ```

3. **Connectivity (0-25):**
   ```
   Inbound links:  0-15 points (each link: +3, max 15)
   Outbound links: 0-10 points (each link: +2, max 10)
   ```

4. **Uniqueness (0-25):**
   ```
   0 similar files:    25 points (unique)
   1 similar file:     20 points
   2-3 similar files:  15 points
   4-5 similar files:  10 points
   >5 similar files:    5 points
   ```

**Key Methods:**
- `analyzeRelevance(file, allFiles, aiProvider): Promise<RelevanceAnalysis>`
- `scoreRecency(file): number`
- `scoreContentQuality(file): number`
- `scoreConnectivity(file, allFiles): number`
- `scoreUniqueness(file, allFiles, aiProvider): Promise<number>`

---

### 3. AIContentAnalyzer

**Purpose:** Use AI for semantic analysis and topic clustering

**AI Prompts:**

**Clustering Prompt:**
```typescript
const prompt = `
Analyze these markdown files and group them into logical topic clusters.
Goal: Consolidate ${fileCount} files into 3-5 coherent documents.

Files to analyze:
${files.map((f, i) => `
${i + 1}. ${f.name} (${f.metadata.wordCount} words)
   Title: ${f.metadata.title}
   Age: ${formatAge(f.lastModified)}
   Headers: ${f.metadata.headers.slice(0, 3).join(', ')}
   Content preview: ${f.content.substring(0, 200)}...
`).join('\n')}

Respond with JSON:
{
  "clusters": [
    {
      "name": "cluster-name",
      "description": "what this cluster represents",
      "fileIndices": [1, 3, 5],
      "suggestedFilename": "consolidated-name.md",
      "consolidationStrategy": "merge|summarize|link-only",
      "reasoning": "why these files belong together"
    }
  ],
  "staleFiles": [2, 7],
  "standaloneFiles": [4]
}
`;
```

**Relevance Prompt:**
```typescript
const prompt = `
Analyze if this markdown file is still relevant to the project:

File: ${file.name}
Title: ${file.metadata.title}
Last Modified: ${file.lastModified.toISOString()}
Word Count: ${file.metadata.wordCount}

Content:
${file.content}

Consider:
1. Is the information current or outdated?
2. Does it reference features/code that no longer exist?
3. Is it a temporary note or permanent documentation?
4. Does it duplicate information available elsewhere?

Respond with JSON:
{
  "isRelevant": true|false,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "suggestedAction": "keep|consolidate|archive|delete"
}
`;
```

**Key Methods:**
- `clusterByTopic(files): Promise<TopicCluster[]>`
- `determineRelevance(file): Promise<RelevanceResult>`
- `findSimilarContent(file, allFiles): Promise<MarkdownFile[]>`

---

### 4. MarkdownConsolidator

**Purpose:** Execute consolidation strategies

**Consolidation Strategies:**

1. **merge-by-topic**
   - Combine files with related content
   - Maintain all sections
   - Add table of contents
   - Include source attribution

2. **merge-by-folder**
   - Create index file for folder
   - Link to individual files
   - Extract previews
   - Categorize by type

3. **summarize-cluster**
   - Use AI to extract key points
   - Combine duplicate information
   - Preserve unique insights
   - Maintain code examples

4. **create-super-readme**
   - Generate documentation hub
   - Categorize by topic
   - Add metadata and navigation
   - Link to all documents

5. **archive-stale**
   - Move to `.devibe/archive/markdown/`
   - Preserve with timestamp
   - Log archived files

**Key Methods:**
- `createPlan(files, options): Promise<ConsolidationPlan[]>`
- `executePlan(plan): Promise<ConsolidationResult>`
- `mergeByTopic(files): Promise<string>`
- `mergeByFolder(files): Promise<string>`
- `summarizeCluster(files): Promise<string>`

---

### 5. SuperReadmeGenerator

**Purpose:** Create documentation hub with categorized navigation

**Categories:**

```typescript
const categories = {
  'Architecture': {
    icon: '🏗️',
    keywords: ['architecture', 'design', 'spec', 'specification'],
    paths: ['/specs/', '/architecture/', '/design/']
  },
  'Guides': {
    icon: '📚',
    keywords: ['guide', 'tutorial', 'how to', 'walkthrough'],
    paths: ['/guides/', '/tutorials/', '/docs/guides/']
  },
  'API': {
    icon: '🔌',
    keywords: ['api', 'reference', 'endpoint', 'schema'],
    paths: ['/api/', '/reference/']
  },
  'Development': {
    icon: '💻',
    keywords: ['development', 'coding', 'best practice', 'convention'],
    paths: ['/dev/', '/development/']
  },
  'Planning': {
    icon: '📝',
    keywords: ['note', 'meeting', 'planning', 'decision', 'adr'],
    paths: ['/planning/', '/notes/', '/decisions/']
  },
  'Other': {
    icon: '📄',
    keywords: [],
    paths: []
  }
};
```

**Generated Structure:**

```markdown
# Documentation Hub

*Consolidated navigation for all project documentation*

---

## Main Documentation

📖 [Project README](./README.md) - Start here for overview

---

## 🏗️ Architecture & Design

System architecture, design decisions, and technical specifications

### [Architecture Overview](./docs/ARCHITECTURE.md)

High-level system design and component interactions...

*250 words · Updated 2 weeks ago*

---

## Quick Navigation

| Category | Documents | Last Updated |
|----------|-----------|--------------|
| Architecture & Design | 3 | 2 weeks ago |
| Guides & Tutorials | 5 | 1 week ago |
| API Reference | 2 | 3 days ago |

---

*This index was automatically generated on 2025-10-11*
```

**Key Methods:**
- `generate(files, existingReadme?): Promise<string>`
- `categorizeForSuperReadme(files): Promise<CategoryMap>`
- `determineCategory(file): Promise<string>`
- `enhanceExistingReadme(readmePath, consolidatedFiles): Promise<void>`

---

### 6. ConsolidationValidator

**Purpose:** Ensure safety and content preservation

**Validation Checks:**

1. **File Creation Validation**
   - Verify all consolidated files exist
   - Check file sizes are reasonable
   - Ensure valid markdown syntax

2. **Content Preservation**
   - Compare total word counts (original vs consolidated)
   - Alert if >30% loss (error), >10% loss (warning)
   - Verify code blocks preserved
   - Check image references intact

3. **Backup Verification**
   - Confirm backup exists
   - Validate backup integrity
   - Check backup completeness

4. **Link Validation**
   - Find broken internal links
   - Check image links
   - Verify anchor links

**Key Methods:**
- `validate(originalFiles, consolidatedFiles): Promise<ValidationResult>`
- `validateContentPreservation(original, consolidated): ValidationCheck`
- `findBrokenLinks(filePath): Promise<string[]>`
- `validateBackup(): Promise<boolean>`

---

## Data Flow

### Complete Consolidation Flow

```
1. User Input
   └─> devibe consolidate ./docs --recursive

2. Validation
   ├─> Check AI enabled (required)
   ├─> Validate directory exists
   └─> Load configuration

3. Scanning Phase
   ├─> Discover markdown files (recursive)
   ├─> Extract metadata (title, headers, word count)
   ├─> Parse frontmatter
   └─> Build file list

4. Analysis Phase
   ├─> Calculate relevance scores (4 factors)
   ├─> Classify status (highly-relevant, relevant, marginal, stale)
   ├─> Detect connectivity (inbound/outbound links)
   └─> Identify duplicates

5. AI Analysis Phase
   ├─> Cluster by topic (AI semantic analysis)
   ├─> Determine relationships
   ├─> Detect stale content
   └─> Recommend strategies

6. Planning Phase
   ├─> Select consolidation strategies
   ├─> Group files by strategy
   ├─> Define output filenames
   ├─> Calculate impact (reduction %)
   └─> Generate plan summary

7. Preview & Confirmation
   ├─> Display plan details
   ├─> Show before/after comparison
   ├─> Request user approval (unless --auto)
   └─> Allow modification

8. Backup Phase
   ├─> Create backup directory
   ├─> Copy all original files
   ├─> Generate manifest
   └─> Verify backup integrity

9. Execution Phase
   ├─> Execute each consolidation plan
   │   ├─> merge-by-topic
   │   ├─> merge-by-folder
   │   ├─> summarize-cluster
   │   └─> archive-stale
   ├─> Generate super README
   ├─> Preserve original files
   └─> Save consolidation metadata

10. Validation Phase
    ├─> Verify all files created
    ├─> Check content preservation
    ├─> Validate links
    └─> Generate validation report

11. Summary Report
    ├─> Files processed
    ├─> Files created
    ├─> Reduction percentage
    ├─> Backup location
    └─> Next steps (finalize command)

12. Finalization (Separate Command)
    └─> devibe consolidate finalize ./docs
        ├─> Load consolidation metadata
        ├─> Show summary
        ├─> Confirm deletion
        ├─> Delete original files
        └─> Clean up metadata
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Deliverables:**
- [ ] Module structure setup
- [ ] TypeScript types defined
- [ ] MarkdownScanner implementation
- [ ] Basic metadata extraction
- [ ] Unit tests for scanner

**Tasks:**
1. Create module directory structure
2. Define all TypeScript interfaces in `types.ts`
3. Implement `MarkdownScanner` class
4. Add frontmatter parsing with `gray-matter`
5. Implement header extraction
6. Add word count calculation
7. Write scanner unit tests (90%+ coverage)

**Dependencies:**
- `fast-glob` (file discovery)
- `gray-matter` (frontmatter parsing)
- `fs-extra` (file operations)

**Acceptance Criteria:**
- ✅ Scans directories recursively
- ✅ Extracts metadata accurately
- ✅ Respects exclusion patterns
- ✅ Handles edge cases (empty files, no frontmatter)
- ✅ 90%+ test coverage

---

### Phase 2: Relevance Analysis (Week 1-2)

**Deliverables:**
- [ ] MarkdownAnalyzer implementation
- [ ] Four scoring factors implemented
- [ ] Status classification logic
- [ ] Connectivity analysis
- [ ] Unit tests for analyzer

**Tasks:**
1. Implement recency scoring
2. Implement content quality scoring
3. Implement connectivity analysis
4. Implement uniqueness detection (basic)
5. Add status classification logic
6. Generate reasoning strings
7. Write analyzer unit tests

**Formulas:**
```typescript
// Recency
const ageInDays = (Date.now() - lastModified) / (1000 * 60 * 60 * 24);
const recencyScore = ageInDays <= 7 ? 25 : 
                     ageInDays <= 30 ? 20 :
                     ageInDays <= 90 ? 15 :
                     ageInDays <= 180 ? 10 : 5;

// Content Quality
const qualityScore = 
  (wordCount >= 500 ? 10 : wordCount >= 200 ? 7 : wordCount >= 50 ? 4 : 1) +
  (headers.length >= 5 ? 8 : headers.length >= 3 ? 5 : headers.length >= 1 ? 3 : 0) +
  (codeBlocks >= 3 ? 4 : codeBlocks >= 1 ? 2 : 0) +
  (links >= 5 ? 3 : links >= 1 ? 2 : 0);

// Connectivity
const connectivityScore = 
  Math.min(15, inboundLinks * 3) + 
  Math.min(10, outboundLinks * 2);
```

**Acceptance Criteria:**
- ✅ All four factors calculated correctly
- ✅ Status classification accurate
- ✅ Reasoning generated for decisions
- ✅ Edge cases handled (new files, isolated files)
- ✅ 90%+ test coverage

---

### Phase 3: AI Integration (Week 2)

**Deliverables:**
- [ ] AIContentAnalyzer implementation
- [ ] Topic clustering with AI
- [ ] Relevance detection with AI
- [ ] Similarity analysis
- [ ] Unit tests with mocked AI

**Tasks:**
1. Create AI prompt templates
2. Implement topic clustering method
3. Implement relevance detection
4. Add similarity detection
5. Handle AI errors gracefully
6. Write tests with mocked AI responses

**AI Provider Integration:**
```typescript
// Use existing AIProvider abstraction
import { AIProvider } from '../ai-provider-resolver';

class AIContentAnalyzer {
  constructor(private aiProvider: AIProvider) {}
  
  async clusterByTopic(files: MarkdownFile[]): Promise<TopicCluster[]> {
    const prompt = this.buildClusteringPrompt(files);
    const response = await this.aiProvider.analyzeFileAllocation({
      fileName: 'markdown-clustering',
      fileContent: prompt,
      availableRepos: [],
      context: {} as any
    });
    return this.parseClusteringResponse(response, files);
  }
}
```

**Acceptance Criteria:**
- ✅ Topic clustering returns 3-5 clusters
- ✅ Relevance detection >80% accurate
- ✅ Handles AI failures gracefully
- ✅ Works with multiple AI providers
- ✅ 85%+ test coverage (with mocks)

---

### Phase 4: Consolidation Engine (Week 3)

**Deliverables:**
- [ ] MarkdownConsolidator implementation
- [ ] All 5 strategies implemented
- [ ] Plan creation logic
- [ ] Plan execution logic
- [ ] Unit tests for each strategy

**Tasks:**
1. Implement merge-by-topic strategy
2. Implement merge-by-folder strategy
3. Implement summarize-cluster strategy
4. Implement archive-stale strategy
5. Add plan creation logic
6. Add plan execution orchestration
7. Write comprehensive tests

**Strategy Implementations:**

**merge-by-topic:**
```typescript
async mergeByTopic(files: MarkdownFile[]): Promise<string> {
  const sections = [
    `# ${this.inferTopicTitle(files)}`,
    `*Consolidated from ${files.length} files*`,
    '',
    '## Table of Contents',
    ...files.map(f => `- [${f.metadata.title}](#${slugify(f.metadata.title)})`),
    '',
    '---',
    '',
    ...files.map(f => [
      `## ${f.metadata.title}`,
      `*Originally from: ${f.name}*`,
      f.content.replace(/^#\s+.+$/m, '').trim(),
      '---'
    ].join('\n\n'))
  ];
  
  return sections.join('\n');
}
```

**Acceptance Criteria:**
- ✅ All 5 strategies functional
- ✅ Content preserved accurately
- ✅ Markdown formatting valid
- ✅ Source attribution included
- ✅ 95%+ test coverage

---

### Phase 5: Super README Generation (Week 3-4)

**Deliverables:**
- [ ] SuperReadmeGenerator implementation
- [ ] Category detection logic
- [ ] Navigation generation
- [ ] README enhancement (optional)
- [ ] Unit tests

**Tasks:**
1. Define category rules
2. Implement category detection
3. Generate navigation structure
4. Add metadata formatting
5. Implement README enhancement
6. Write comprehensive tests

**Category Detection Logic:**
```typescript
async determineCategory(file: MarkdownFile): Promise<string> {
  // Check path first (most reliable)
  if (file.relativePath.includes('/specs/')) return 'Architecture';
  if (file.relativePath.includes('/guides/')) return 'Guides';
  
  // Check title
  const title = file.metadata.title.toLowerCase();
  if (title.includes('guide')) return 'Guides';
  if (title.includes('api')) return 'API';
  
  // Check content keywords
  const content = file.content.toLowerCase();
  if (content.includes('architecture')) return 'Architecture';
  
  return 'Other';
}
```

**Acceptance Criteria:**
- ✅ Categories detected accurately (>85%)
- ✅ Navigation clear and helpful
- ✅ Metadata formatted consistently
- ✅ Existing README not corrupted
- ✅ 90%+ test coverage

---

### Phase 6: CLI & UX (Week 4)

**Deliverables:**
- [ ] CLI command implementation
- [ ] Interactive prompts
- [ ] Progress indicators
- [ ] Summary reports
- [ ] Finalize command

**Tasks:**
1. Add `consolidate` command to CLI
2. Add `consolidate finalize` command
3. Implement option parsing
4. Add interactive confirmation
5. Add progress spinners
6. Generate summary reports
7. Add error handling

**CLI Implementation:**
```typescript
// In cli.ts
program
  .command('consolidate [directory]')
  .description('Consolidate markdown documentation')
  .option('-r, --recursive', 'Process subdirectories')
  .option('--max-output <number>', 'Maximum output files', '5')
  .option('--dry-run', 'Preview without changes')
  .option('--auto', 'Auto-approve plan')
  .option('--exclude <pattern>', 'Exclude pattern', collect, [])
  .action(async (directory, options) => {
    await consolidateCommand(directory || '.', options);
  });

program
  .command('consolidate finalize [directory]')
  .description('Finalize consolidation (delete originals)')
  .action(async (directory) => {
    await consolidateFinalizeCommand(directory || '.');
  });
```

**Progress Indicators:**
```typescript
const spinner = ora('Scanning directory...').start();
// ... scanning ...
spinner.succeed(`Found ${files.length} markdown files`);

const analysisSpinner = ora('Analyzing with AI...').start();
// ... analysis ...
analysisSpinner.succeed('Analysis complete');
```

**Acceptance Criteria:**
- ✅ Commands work correctly
- ✅ Options parsed properly
- ✅ Progress clear and helpful
- ✅ Errors handled gracefully
- ✅ Help text comprehensive

---

### Phase 7: Safety & Validation (Week 4-5)

**Deliverables:**
- [ ] ConsolidationValidator implementation
- [ ] Content preservation checks
- [ ] Link validation
- [ ] Backup verification
- [ ] Unit tests for validation

**Tasks:**
1. Implement content preservation validation
2. Add link validation
3. Verify backup integrity
4. Check markdown syntax
5. Generate validation reports
6. Write comprehensive tests

**Validation Checks:**
```typescript
async validate(
  originalFiles: MarkdownFile[],
  consolidatedFiles: string[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check file creation
  for (const file of consolidatedFiles) {
    if (!await fs.pathExists(file)) {
      errors.push(`File not created: ${file}`);
    }
  }
  
  // Check content preservation
  const originalWords = sum(originalFiles.map(f => f.metadata.wordCount));
  const consolidatedWords = await this.countWordsInFiles(consolidatedFiles);
  const loss = (originalWords - consolidatedWords) / originalWords;
  
  if (loss > 0.3) {
    errors.push(`Content loss: ${Math.round(loss * 100)}%`);
  } else if (loss > 0.1) {
    warnings.push(`Content reduction: ${Math.round(loss * 100)}%`);
  }
  
  // Check links
  for (const file of consolidatedFiles) {
    const brokenLinks = await this.findBrokenLinks(file);
    if (brokenLinks.length > 0) {
      warnings.push(`Broken links in ${file}: ${brokenLinks.join(', ')}`);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

**Acceptance Criteria:**
- ✅ All validation checks functional
- ✅ Errors vs warnings classified correctly
- ✅ Backup verification works
- ✅ Link checking accurate
- ✅ 100% test coverage for safety

---

### Phase 8: Testing & Documentation (Week 5)

**Deliverables:**
- [ ] Comprehensive unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Developer documentation
- [ ] User documentation

**Tasks:**
1. Write remaining unit tests
2. Create integration test suite
3. Add end-to-end tests
4. Document all APIs
5. Create user guide
6. Add code examples

**Test Coverage Goals:**
- Unit tests: 90%+ coverage
- Integration tests: All workflows covered
- E2E tests: Happy path + error cases
- Mock AI responses for consistency

**Acceptance Criteria:**
- ✅ 90%+ overall test coverage
- ✅ All critical paths tested
- ✅ Documentation complete
- ✅ Examples provided
- ✅ CI/CD integration works

---

## Testing Strategy

### Unit Tests (90%+ Coverage)

**MarkdownScanner:**
- ✅ Scans single directory
- ✅ Scans recursively
- ✅ Respects exclusions
- ✅ Extracts metadata correctly
- ✅ Parses frontmatter
- ✅ Handles edge cases (empty files, large files)

**MarkdownAnalyzer:**
- ✅ Calculates recency score correctly
- ✅ Calculates quality score correctly
- ✅ Calculates connectivity score correctly
- ✅ Detects duplicates
- ✅ Classifies status accurately
- ✅ Generates reasoning

**AIContentAnalyzer:**
- ✅ Clusters by topic (mocked AI)
- ✅ Detects relevance (mocked AI)
- ✅ Handles AI failures
- ✅ Parses AI responses correctly
- ✅ Falls back gracefully

**MarkdownConsolidator:**
- ✅ Creates valid plans
- ✅ Executes merge-by-topic correctly
- ✅ Executes merge-by-folder correctly
- ✅ Executes summarize correctly
- ✅ Archives stale files
- ✅ Preserves content

**SuperReadmeGenerator:**
- ✅ Generates valid README
- ✅ Categorizes correctly
- ✅ Formats metadata properly
- ✅ Handles missing files
- ✅ Doesn't corrupt existing README

**ConsolidationValidator:**
- ✅ Detects missing files
- ✅ Calculates content loss
- ✅ Finds broken links
- ✅ Verifies backups
- ✅ Generates reports

### Integration Tests

**Full Workflow:**
```typescript
describe('Markdown Consolidation Integration', () => {
  test('consolidates 20 files into 3', async () => {
    // Setup test files
    const testDir = await createTestMarkdownFiles(20);
    
    // Run consolidation
    const result = await consolidateCommand(testDir, {
      recursive: true,
      auto: true,
      maxOutput: 3
    });
    
    // Verify results
    expect(result.consolidatedFiles).toHaveLength(3);
    expect(result.originalFiles).toHaveLength(20);
    expect(result.backupPath).toBeDefined();
    
    // Verify content preservation
    const validation = await validateConsolidation(
      result.originalFiles,
      result.consolidatedFiles
    );
    expect(validation.valid).toBe(true);
    
    // Cleanup
    await fs.remove(testDir);
  });
  
  test('handles finalization correctly', async () => {
    // ... test finalize command ...
  });
  
  test('rolls back on error', async () => {
    // ... test error handling ...
  });
});
```

### End-to-End Tests

**Scenarios:**
1. ✅ Consolidate 30 docs → 3 files
2. ✅ Consolidate with recursive option
3. ✅ Dry-run mode (no changes)
4. ✅ Finalize workflow (two-phase)
5. ✅ AI failure fallback
6. ✅ Broken link detection
7. ✅ Content loss prevention

### Performance Tests

**Benchmarks:**
- Scan 100 files: <2 seconds
- Analyze 100 files: <5 seconds
- AI clustering (50 files): <30 seconds
- Full consolidation (50 files): <60 seconds

---

## Dependencies & Prerequisites

### Required Features (Must be Complete)
- ✅ AI Integration (Phase 3)
- ✅ Backup System (Phase 7)
- ✅ CLI Framework (Phase 1)
- ✅ Configuration System

### NPM Packages to Add

```json
{
  "dependencies": {
    "fast-glob": "^3.3.2",      // File discovery
    "gray-matter": "^4.0.3",     // Frontmatter parsing
    "js-yaml": "^4.1.0",         // YAML parsing
    "markdown-it": "^14.0.0"     // Markdown validation (optional)
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/markdown-it": "^13.0.7"
  }
}
```

### Configuration Updates

Add to `.devibe/config/`:

```javascript
// consolidation.js
module.exports = {
  consolidation: {
    requireAI: true,
    defaults: {
      maxOutputFiles: 5,
      preserveOriginals: true,
      createSuperReadme: true,
      recursive: false
    },
    relevance: {
      highlyRelevant: 75,
      relevant: 50,
      marginal: 30,
      stale: 0
    },
    staleness: {
      fresh: 7,
      recent: 30,
      aging: 90,
      old: 180,
      veryOld: 180
    },
    protected: [
      'README.md',
      'LICENSE*',
      'CHANGELOG*',
      'CONTRIBUTING.md'
    ]
  }
};
```

---

## Risk Assessment

### High Risk

**Risk:** AI clustering produces poor results
- **Mitigation:** Extensive prompt engineering, fallback to heuristic clustering
- **Detection:** User feedback, low confidence scores
- **Contingency:** Manual categorization option

**Risk:** Content loss during consolidation
- **Mitigation:** Validation checks, backup system, two-phase finalization
- **Detection:** Word count comparison, validation errors
- **Contingency:** Rollback from backup

### Medium Risk

**Risk:** Performance issues with large repositories (100+ files)
- **Mitigation:** Parallel processing, caching, progress indicators
- **Detection:** Performance tests, user reports
- **Contingency:** Batch processing, incremental consolidation

**Risk:** Broken links after consolidation
- **Mitigation:** Link validation, relative path preservation
- **Detection:** Validation checks, user reports
- **Contingency:** Link fixing tool, rollback option

### Low Risk

**Risk:** Markdown formatting corruption
- **Mitigation:** Parser validation, format preservation
- **Detection:** Syntax validation, visual review
- **Contingency:** Re-consolidate with format fixes

---

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing**
   ```typescript
   // Process files in parallel
   const analyses = await Promise.all(
     files.map(f => analyzer.analyzeRelevance(f, files, aiProvider))
   );
   ```

2. **Caching**
   ```typescript
   // Cache AI responses
   const cacheKey = `${file.name}-${file.lastModified}`;
   if (cache.has(cacheKey)) {
     return cache.get(cacheKey);
   }
   ```

3. **Streaming Large Files**
   ```typescript
   // Stream files >10MB
   if (file.size > 10 * 1024 * 1024) {
     return this.streamAnalyze(file);
   }
   ```

4. **Batched AI Requests**
   ```typescript
   // Batch AI requests (if provider supports)
   const batches = chunk(files, 10);
   for (const batch of batches) {
     await aiProvider.analyzeBatch(batch);
   }
   ```

### Performance Targets

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Scan 100 files | <2s | <5s |
| Analyze 100 files | <5s | <10s |
| AI clustering (50 files) | <30s | <60s |
| Consolidation (50→5) | <60s | <120s |
| Validation | <5s | <10s |

---

## Implementation Checklist

### Pre-Implementation ✅

- [ ] Review specification document thoroughly
- [ ] Review this design document with team
- [ ] Ensure dependencies are complete (AI, Backup, CLI)
- [ ] Set up development environment
- [ ] Create feature branch: `feature/markdown-consolidation`

### Week 1: Core Infrastructure

**Day 1-2: Setup**
- [ ] Create module directory structure
- [ ] Define TypeScript interfaces in `types.ts`
- [ ] Set up test framework for new module
- [ ] Install dependencies: `fast-glob`, `gray-matter`, `js-yaml`
- [ ] Create test fixtures (sample markdown files)

**Day 3-4: Scanner Implementation**
- [ ] Implement `MarkdownScanner` class
- [ ] Add `scan()` method with fast-glob
- [ ] Implement `analyzeFile()` method
- [ ] Add frontmatter parsing with gray-matter
- [ ] Implement header extraction (regex)
- [ ] Add word count calculation
- [ ] Handle exclusion patterns

**Day 5: Scanner Testing**
- [ ] Write unit tests for scanner (target: 90%+ coverage)
- [ ] Test recursive scanning
- [ ] Test exclusion patterns
- [ ] Test metadata extraction
- [ ] Test edge cases (empty files, large files)
- [ ] Fix any bugs found

### Week 2: Analysis Systems

**Day 1-2: Basic Analyzer**
- [ ] Implement `MarkdownAnalyzer` class
- [ ] Add recency scoring method
- [ ] Add content quality scoring method
- [ ] Add connectivity analysis method
- [ ] Implement status classification
- [ ] Add reasoning generation

**Day 3: Analyzer Testing**
- [ ] Write unit tests for analyzer (target: 90%+ coverage)
- [ ] Test all scoring factors
- [ ] Test status classification
- [ ] Test edge cases (new files, isolated files)
- [ ] Verify reasoning accuracy

**Day 4-5: AI Analyzer**
- [ ] Implement `AIContentAnalyzer` class
- [ ] Create clustering prompt template
- [ ] Create relevance prompt template
- [ ] Implement `clusterByTopic()` method
- [ ] Implement `determineRelevance()` method
- [ ] Add similarity detection
- [ ] Handle AI errors gracefully

### Week 3: Consolidation Engine

**Day 1-2: Strategy Implementations**
- [ ] Implement `MarkdownConsolidator` class
- [ ] Implement merge-by-topic strategy
- [ ] Implement merge-by-folder strategy
- [ ] Add table of contents generation
- [ ] Add source attribution
- [ ] Test markdown output validity

**Day 3: Advanced Strategies**
- [ ] Implement summarize-cluster strategy (AI-powered)
- [ ] Implement archive-stale strategy
- [ ] Add file moving/copying logic
- [ ] Integrate with BackupManager

**Day 4-5: Plan Management**
- [ ] Implement plan creation logic
- [ ] Add strategy selection algorithm
- [ ] Implement plan execution orchestration
- [ ] Add progress tracking
- [ ] Write consolidator tests (target: 95%+ coverage)

### Week 4: Super README & CLI

**Day 1-2: README Generator**
- [ ] Implement `SuperReadmeGenerator` class
- [ ] Define category rules
- [ ] Implement category detection
- [ ] Add navigation generation
- [ ] Format metadata sections
- [ ] Add quick navigation table

**Day 3: README Testing**
- [ ] Write tests for README generator (target: 90%+)
- [ ] Test category detection accuracy
- [ ] Test markdown output validity
- [ ] Test README enhancement (non-invasive)

**Day 4-5: CLI Implementation**
- [ ] Add `consolidate` command to CLI
- [ ] Add `consolidate finalize` command
- [ ] Implement option parsing
- [ ] Add interactive prompts with inquirer
- [ ] Add progress spinners with ora
- [ ] Generate summary reports
- [ ] Add error handling and messages

### Week 5: Validation & Safety

**Day 1-2: Validator Implementation**
- [ ] Implement `ConsolidationValidator` class
- [ ] Add file creation validation
- [ ] Implement content preservation check
- [ ] Add link validation
- [ ] Implement backup verification
- [ ] Generate validation reports

**Day 3: Validator Testing**
- [ ] Write tests for validator (target: 100% coverage)
- [ ] Test all validation checks
- [ ] Test error detection
- [ ] Test warning generation

**Day 4-5: Integration Testing**
- [ ] Write integration tests for full workflow
- [ ] Test dry-run mode
- [ ] Test finalization workflow
- [ ] Test rollback scenarios
- [ ] Test AI failure handling

### Week 6: Polish & Documentation

**Day 1-2: Bug Fixes**
- [ ] Fix any bugs found in testing
- [ ] Improve error messages
- [ ] Optimize performance bottlenecks
- [ ] Add logging

**Day 3-4: Documentation**
- [ ] Document all public APIs
- [ ] Create user guide
- [ ] Add code examples
- [ ] Write migration guide
- [ ] Update main README

**Day 5: Final Review**
- [ ] Code review with team
- [ ] Final testing round
- [ ] Update CHANGELOG
- [ ] Prepare release notes

### Post-Implementation

**Launch Preparation**
- [ ] Merge to main branch
- [ ] Update version number
- [ ] Tag release
- [ ] Publish to npm
- [ ] Announce feature

**Monitoring**
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Track performance metrics
- [ ] Monitor AI costs

**Iteration**
- [ ] Address user feedback
- [ ] Fix reported bugs
- [ ] Improve AI prompts based on results
- [ ] Optimize performance if needed

---

## Acceptance Criteria Summary

### Functionality
- ✅ Scans markdown files (recursive option)
- ✅ Analyzes relevance with 4-factor scoring
- ✅ Clusters by topic using AI
- ✅ Consolidates using 5 strategies
- ✅ Generates super README
- ✅ Validates content preservation
- ✅ Two-phase finalization works

### Quality
- ✅ 90%+ test coverage
- ✅ Zero data loss
- ✅ <5% broken links
- ✅ All TypeScript types defined
- ✅ Error handling comprehensive

### Performance
- ✅ 100 files scanned in <5s
- ✅ 50 files consolidated in <120s
- ✅ AI requests cached appropriately
- ✅ Progress indicators responsive

### User Experience
- ✅ Clear command documentation
- ✅ Helpful error messages
- ✅ Dry-run mode works
- ✅ Summary reports informative
- ✅ Finalization workflow intuitive

### Safety
- ✅ 100% backup before changes
- ✅ Originals preserved until confirmed
- ✅ Validation catches issues
- ✅ Rollback works correctly

---

## Team Assignments (Suggested)

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

### Shared Responsibilities
- CLI implementation
- Documentation
- Bug fixes
- User feedback

---

## Definition of Done

A task is "done" when:
- [ ] Code written and passes linter
- [ ] Unit tests written (90%+ coverage)
- [ ] Integration tests written (if applicable)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No critical bugs
- [ ] Acceptance criteria met

The feature is "done" when:
- [ ] All tasks in checklist complete
- [ ] All tests passing (90%+ coverage)
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] User guide written
- [ ] Code reviewed and merged
- [ ] Release notes prepared

---

## Questions & Support

**For clarifications on:**
- Specification details → See [08-MARKDOWN-CONSOLIDATION.md](../specs/08-MARKDOWN-CONSOLIDATION.md)
- Architecture decisions → Contact: Architecture Team
- AI integration → Reference: [03-AI-INTEGRATION.md](../specs/03-AI-INTEGRATION.md)
- Testing approach → Reference: [00-TDD-METHODOLOGY.md](./00-TDD-METHODOLOGY.md)

**Development support:**
- Slack: #devibe-development
- Stand-ups: Daily at 10am
- Code review: Pull request in GitHub

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-11  
**Author:** Software Architecture Team  
**Status:** Ready for Implementation

---

**Ready to start? Begin with Week 1, Day 1 tasks! 🚀**




