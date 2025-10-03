# UnVibe - Technical Specifications Summary

**Version:** 1.0  
**Status:** ✅ Complete - Ready for Implementation  
**Last Updated:** 2025-10-02

---

## Quick Overview

UnVibe is a CLI utility that intelligently cleans up repositories after intense vibe coding sessions, with special focus on monorepo environments where AI-assisted development often results in files being created in wrong locations.

### Key Features
- 🎯 **AI-Powered File Distribution** - Intelligently move root files to correct sub-repositories
- 🧹 **Script Classification** - Identify and organize utility, build, and critical scripts
- 📁 **Folder Structure Enforcement** - Create standardized `scripts/` and `documents/` folders
- ✅ **Build Validation** - Ensure operations don't break builds
- 🔒 **Safety First** - All operations backed up and reversible

---

## Specification Documents

All detailed specifications are located in the [`specs/`](./specs/) directory:

### 📘 [00-ARCHITECTURE.md](./specs/00-ARCHITECTURE.md)
System architecture, component structure, data flow, and high-level design.

**Key Topics:** Module architecture • Data structures • Working directory structure • Technology stack

---

### 📗 [01-GIT-DETECTION.md](./specs/01-GIT-DETECTION.md)
Git repository detection, monorepo analysis, and boundary enforcement.

**Key Topics:** Multi-repo detection • Technology identification • Boundary validation • Monorepo tools

---

### 📙 [02-ROOT-FILE-DISTRIBUTION.md](./specs/02-ROOT-FILE-DISTRIBUTION.md)
Intelligent file allocation using AI and heuristic analysis.

**Key Topics:** Three-tier allocation • AI content analysis • Conflict resolution • Subdirectory placement

---

### 📕 [03-AI-INTEGRATION.md](./specs/03-AI-INTEGRATION.md)
AI provider integration, API key management, and graceful degradation.

**Key Topics:** Anthropic/OpenAI integration • API key security • Response caching • Recommendation system

---

### 📓 [04-SCRIPT-CLASSIFICATION.md](./specs/04-SCRIPT-CLASSIFICATION.md)
Script categorization, staleness detection, and action determination.

**Key Topics:** Classification algorithm • AI-generated detection • Reference analysis • Staleness thresholds

---

### 📔 [05-BUILD-VALIDATION-SAFETY.md](./specs/05-BUILD-VALIDATION-SAFETY.md)
Build validation, critical path detection, and safety mechanisms.

**Key Topics:** Technology validators • Auto-restore • Critical paths • Safety guards

---

### 📒 [06-CLI-INTERFACE.md](./specs/06-CLI-INTERFACE.md)
Command-line interface, user interactions, and output formatting.

**Key Topics:** Command structure • Contextual help • Interactive prompts • Progress indicators

---

### 📝 [07-BACKUP-RESTORE.md](./specs/07-BACKUP-RESTORE.md)
Comprehensive backup and restore system with safety guarantees.

**Key Topics:** Backup manifests • Restore options • Safety guarantees • Backup management

---

## Quick Start for Developers

### 1. Read the Architecture
Start with [`specs/00-ARCHITECTURE.md`](./specs/00-ARCHITECTURE.md) to understand the system design.

### 2. Review Core Features
Read specifications in order based on implementation phases:
- Phase 2: Git Detection (Week 3)
- Phase 3: AI Integration (Week 4)
- Phase 4: Distribution (Weeks 5-6)
- Phase 5: Classification (Week 7)

### 3. Implementation Roadmap
Follow the 16-week roadmap outlined in [`specs/README.md`](./specs/README.md).

### 4. Safety Requirements
**Critical**: All implementations MUST follow the safety requirements in each specification:
- All deletions backed up (non-negotiable)
- Git boundaries strictly enforced
- Protected files never touched
- 100% reversibility guaranteed

---

## Design Principles

### 🔒 Safety First
All operations are backed up and reversible. Git boundaries are strictly enforced. Protected files are never touched.

### 🤖 AI-Powered with Graceful Degradation
AI is strongly recommended but not required. System works with heuristics if AI unavailable.

### 👤 User-Centric
Contextual help guides users. Interactive mode provides control. Clear reasoning for all decisions.

### ✅ Build-Safe
Pre/post validation ensures builds work. Auto-restore if problems detected.

---

## Key Statistics

| Metric | Target |
|--------|--------|
| **Test Coverage** | 85%+ overall, 100% for safety features |
| **AI Accuracy** | >90% with AI, >65% with heuristics |
| **Scan Performance** | 1000+ files in <10 seconds |
| **Reversibility** | 100% of operations |
| **Data Loss** | Zero tolerance |

---

## Technology Stack

### Core
- **Node.js 18+** - Runtime
- **Commander.js** - CLI framework
- **simple-git** - Git operations
- **fs-extra** - File operations

### AI
- **@anthropic-ai/sdk** - Claude integration
- **openai** - GPT-4 integration

### UI/UX
- **chalk** - Colors
- **ora** - Spinners
- **inquirer** - Prompts
- **cli-table3** - Tables

### Testing
- **Vitest** - Test framework
- **c8** - Coverage

---

## Implementation Phases

```
Phase 1-2:  Foundation & Git Detection (Weeks 1-3)
Phase 3:    AI Integration (Week 4)
Phase 4:    Distribution Engine (Weeks 5-6)
Phase 5:    Classification (Week 7)
Phase 6:    Folder Enforcement (Week 8)
Phase 7:    Backup System (Week 9)
Phase 8:    Build Validation (Week 10)
Phase 9-11: CLI & Modes (Weeks 11-13)
Phase 12:   Testing & Refinement (Weeks 14-16)
```

---

## Configuration Example

```javascript
// .unvibe/config/rules.js
module.exports = {
  distribution: {
    enabled: true,
    explicitPatterns: {
      'api-*': './api',
      'web-*': './web'
    },
    highConfidence: 0.85,
    lowConfidence: 0.60
  },
  
  scripts: {
    forceUtility: ['temp-*', 'debug-*'],
    forceCritical: ['deploy.sh', 'init.sh'],
    stalenessThreshold: { 
      fresh: 7, 
      aging: 30, 
      stale: 60 
    }
  },
  
  ai: {
    enabled: true,
    provider: 'anthropic',
    useForDistribution: true,
    cacheResults: true,
    cacheDuration: 86400
  }
};
```

---

## Command Examples

```bash
# Get contextual help and status
devibe

# Set up AI (strongly recommended)
devibe config set-api-key

# Scan repository
devibe scan

# Distribute root files to sub-repos
devibe distribute

# Create cleanup plan
devibe plan

# Execute operations
devibe execute

# Full auto-cleanup (with AI)
devibe yolo

# Restore from backup
devibe restore --last
```

---

## Safety Guarantees

### Non-Negotiable Requirements

1. **ALL deletions MUST be backed up** - No exceptions, even in YOLO mode
2. **Git boundaries MUST be respected** - Never move files between sub-repos
3. **Protected files MUST never be touched** - System configs, credentials, etc.
4. **ALL operations MUST be reversible** - Via restore command
5. **Build integrity MUST be validated** - With auto-restore on failure

---

## Success Criteria

### Must Have (v1.0)
- ✅ 100% accurate monorepo detection
- ✅ >90% file allocation accuracy with AI
- ✅ Zero data loss
- ✅ 100% reversibility
- ✅ Builds work after cleanup

### Nice to Have (Future)
- Plugin system for custom rules
- Web dashboard for plan review
- GitHub Action integration
- Analytics and reporting

---

## Out of Scope (v1.0)

❌ Code refactoring or optimization  
❌ Git operations (commit, push, merge)  
❌ Dependency management  
❌ Code formatting or linting  
❌ Security scanning  
❌ File content modification

---

## Next Steps

1. ✅ **Specifications Complete** - All specs written and reviewed
2. 🔄 **Setup Development** - Initialize project structure
3. ⏳ **Begin Implementation** - Start with Phase 1 (Foundation)
4. ⏳ **Iterative Development** - Follow 16-week roadmap
5. ⏳ **Testing** - Maintain 85%+ coverage
6. ⏳ **Beta Testing** - Real-world validation
7. ⏳ **Release v1.0** - NPM publication

---

## Documentation Structure

```
devibe/
├── REQUIREMENTS.md              # Original requirements (source of truth)
├── SPECIFICATIONS.md            # This summary document
├── specs/                       # Detailed technical specifications
│   ├── README.md                # Specs overview and roadmap
│   ├── 00-ARCHITECTURE.md       # System architecture
│   ├── 01-GIT-DETECTION.md      # Git and monorepo detection
│   ├── 02-ROOT-FILE-DISTRIBUTION.md  # File allocation
│   ├── 03-AI-INTEGRATION.md     # AI providers and caching
│   ├── 04-SCRIPT-CLASSIFICATION.md   # Script categorization
│   ├── 05-BUILD-VALIDATION-SAFETY.md # Build validation
│   ├── 06-CLI-INTERFACE.md      # CLI and UX
│   └── 07-BACKUP-RESTORE.md     # Backup system
└── src/                         # (To be created during implementation)
```

---

## Getting Help

### During Development
1. **Check specs first** - Detailed answers in feature specifications
2. **Review architecture** - System-wide patterns in 00-ARCHITECTURE.md
3. **Consult requirements** - Original context in REQUIREMENTS.md
4. **Ask questions** - Open issues for specification clarifications

### For Implementation
- Each spec has a "Testing" section with test scenarios
- Code examples provided throughout specifications
- TypeScript interfaces defined for all data structures
- Error handling patterns documented

---

## Specification Status

| Document | Lines | Completeness | Review Status |
|----------|-------|--------------|---------------|
| 00-ARCHITECTURE | ~1200 | 100% | ✅ Ready |
| 01-GIT-DETECTION | ~1000 | 100% | ✅ Ready |
| 02-ROOT-FILE-DISTRIBUTION | ~1200 | 100% | ✅ Ready |
| 03-AI-INTEGRATION | ~800 | 100% | ✅ Ready |
| 04-SCRIPT-CLASSIFICATION | ~900 | 100% | ✅ Ready |
| 05-BUILD-VALIDATION-SAFETY | ~700 | 100% | ✅ Ready |
| 06-CLI-INTERFACE | ~800 | 100% | ✅ Ready |
| 07-BACKUP-RESTORE | ~900 | 100% | ✅ Ready |
| **Total** | **~7500** | **100%** | **✅ Ready** |

---

## Contact & Maintenance

**Document Owner:** Development Team  
**Review Cycle:** After each implementation phase  
**Status:** Living Documents - Update as needed during development

---

**🎉 Specifications Complete - Ready to Build!**

