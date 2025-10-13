# Markdown Consolidation - Quick Reference

**Specification Document:** [08-MARKDOWN-CONSOLIDATION.md](./08-MARKDOWN-CONSOLIDATION.md)  
**Status:** Complete and Ready for Review  
**Estimated Development Time:** 5-6 weeks

---

## Overview

The Markdown Consolidation feature intelligently analyzes and consolidates fragmented markdown documentation created during vibe coding sessions, reducing 30-40 files into 3-5 well-organized documents while preserving all useful information.

---

## Key Features

### 1. Intelligent Scanning
- **Recursive directory processing** - Optional deep scanning of subdirectories
- **Automatic exclusions** - Skips node_modules, .git, build directories
- **Metadata extraction** - Captures title, headers, word count, links, code blocks

### 2. Relevance & Staleness Detection
- **Multi-factor scoring (0-100 points)**
  - Recency: 0-25 points (based on last modified date)
  - Content quality: 0-25 points (structure, word count, code blocks)
  - Connectivity: 0-25 points (inbound/outbound links)
  - Uniqueness: 0-25 points (duplicate detection)
- **Status classification**
  - Highly relevant: 75+ points
  - Relevant: 50-74 points
  - Marginal: 30-49 points
  - Stale: <30 points

### 3. AI-Powered Analysis
- **Requires AI engine** - Graceful error if not enabled
- **Topic clustering** - Groups related documents
- **Semantic similarity** - Detects duplicate content
- **Intelligent decision making** - Determines consolidation strategy

### 4. Consolidation Strategies
- **Merge by topic** - Combines complementary content
- **Merge by folder** - Creates folder indexes
- **Summarize cluster** - AI-generated summaries of similar content
- **Link-only** - References in super README for distinct topics
- **Archive stale** - Moves outdated files to archive

### 5. Super README Generation
- **Documentation hub** - Central navigation for all docs
- **Smart categorization**
  - 🏗️ Architecture & Design
  - 📚 Guides & Tutorials
  - 🔌 API Reference
  - 💻 Development
  - 📝 Planning & Notes
  - 📄 Other Documentation
- **Non-invasive** - Doesn't alter original README
- **Rich metadata** - Word counts, last updated dates, descriptions

### 6. Safety & Validation
- **100% backup** before any changes
- **Two-phase finalization**
  1. Create consolidated files (originals preserved)
  2. User reviews, then confirms deletion of originals
- **Content preservation validation** - Ensures no significant data loss
- **Broken link detection** - Warns about dead references

---

## CLI Commands

```bash
# Consolidate markdown files in current directory
devibe consolidate

# Consolidate with recursive scanning
devibe consolidate ./docs --recursive

# Preview consolidation plan (no changes)
devibe consolidate --dry-run

# Auto-approve consolidation
devibe consolidate --auto

# Limit output to maximum 3 files
devibe consolidate --max-output 3

# Exclude specific patterns
devibe consolidate --exclude "CHANGELOG.md" --exclude "LICENSE.md"

# Finalize consolidation (delete original files after review)
devibe consolidate finalize ./docs
```

---

## Workflow

```
1. Scan Directory
   └─> Find all .md files
   └─> Extract metadata
   └─> Apply exclusions

2. Analyze Relevance
   └─> Calculate scores (0-100)
   └─> Classify status
   └─> Identify duplicates

3. AI Analysis
   └─> Cluster by topic
   └─> Determine relationships
   └─> Recommend strategies

4. Create Plan
   └─> Select consolidation strategies
   └─> Define output files
   └─> Calculate impact

5. Preview & Confirm
   └─> Show plan details
   └─> Display before/after comparison
   └─> Request user approval

6. Execute Consolidation
   └─> Backup originals
   └─> Create consolidated files
   └─> Generate super README
   └─> Preserve originals

7. Review & Finalize
   └─> User reviews results
   └─> Runs finalize command
   └─> Original files deleted
```

---

## Configuration

```javascript
// .devibe/config/consolidation.js
module.exports = {
  consolidation: {
    requireAI: true,  // Cannot be disabled
    
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
      fresh: 7,      // days
      recent: 30,
      aging: 90,
      old: 180,
      veryOld: 180
    },
    
    // Protected files (never consolidate)
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

## Example Scenarios

### Scenario 1: Design Documents Folder
**Input:** 15 design documents in `/design/` folder
**AI Analysis:** Identifies 3 main topics (architecture, API, workflows)
**Output:**
- `ARCHITECTURE.md` (consolidated from 6 files)
- `API_DESIGN.md` (consolidated from 5 files)
- `WORKFLOWS.md` (consolidated from 4 files)
- `DOCUMENTATION_HUB.md` (super README with navigation)

### Scenario 2: Root-Level Documentation Chaos
**Input:** 40 markdown files at repository root
**AI Analysis:** Detects 8 stale files, clusters rest into 4 topics
**Output:**
- 4 consolidated topic files
- 8 files archived to `.devibe/archive/markdown/`
- Enhanced README with documentation section
- `DOCUMENTATION_HUB.md` with categorized navigation

### Scenario 3: Mixed Relevance
**Input:** 25 files with varying staleness
**AI Analysis:**
- 10 highly relevant → consolidated into 2 files
- 8 relevant → consolidated into 1 file
- 5 marginal → archived
- 2 stale → archived
**Output:**
- 3 consolidated files
- 7 files archived
- Super README with links to active docs

---

## Key Design Decisions

### Why AI is Required
1. **Semantic understanding** - Detects topic relationships beyond keywords
2. **Staleness detection** - Identifies outdated references and concepts
3. **Quality judgment** - Distinguishes valuable from trivial content
4. **Intelligent summarization** - Creates coherent consolidated content

### Why Two-Phase Finalization
1. **Safety first** - Users can review consolidated results
2. **Reversibility** - Original files remain until confirmed
3. **Trust building** - Users verify AI decisions before committing
4. **Error correction** - Opportunity to adjust before deletion

### Why Super README over Modifying README
1. **Non-invasive** - Respects existing documentation structure
2. **Separation of concerns** - Main README for project, hub for docs
3. **Flexibility** - Can be regenerated without affecting main docs
4. **Navigation focus** - Purpose-built for documentation discovery

---

## Success Metrics

- ✅ 70-90% reduction in markdown file count
- ✅ 100% content preservation (zero data loss)
- ✅ >80% accuracy in staleness detection
- ✅ >85% user satisfaction with topic clustering
- ✅ <5% broken links after consolidation
- ✅ 100% backup success rate

---

## Dependencies

### Required
- AI Integration (Phase 3) - For content analysis
- Backup System (Phase 7) - For safety guarantees
- CLI Framework (Phase 1) - For command interface

### Optional
- Learning Database - For improved accuracy over time
- User Preferences - For customization

---

## Implementation Phases

1. **Week 1**: Core infrastructure (scanner, metadata extraction)
2. **Week 2**: Relevance analysis (scoring system)
3. **Week 2**: AI integration (topic clustering)
4. **Week 3**: Consolidation engine (strategies)
5. **Week 3-4**: Super README generation
6. **Week 4**: CLI implementation
7. **Week 4-5**: Safety & validation
8. **Week 5**: Testing & documentation

---

## Out of Scope (v1.0)

❌ Non-markdown formats (RST, AsciiDoc)  
❌ Automatic git commits  
❌ Real-time collaboration  
❌ Custom templates  
❌ Translation/internationalization  
❌ Version control integration

---

## Future Enhancements

### v1.5
- Support for RST and AsciiDoc
- Duplicate detection across formats
- Image deduplication
- Custom consolidation templates

### v2.0
- Integration with documentation generators (MkDocs, Docusaurus)
- Team review workflows
- Diff visualization
- Documentation quality metrics

---

**Ready for Implementation:** Yes  
**Estimated LOC:** ~2,500 lines  
**Test Coverage Target:** 90%+  
**Documentation:** Complete

For full technical details, see [08-MARKDOWN-CONSOLIDATION.md](./08-MARKDOWN-CONSOLIDATION.md)




