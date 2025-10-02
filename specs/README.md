# UnVibe - Technical Specification Documents

**Project:** UnVibe (Repository Cleanup Utility)  
**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft - Ready for Implementation

---

## Overview

This directory contains comprehensive technical specifications for UnVibe, a CLI utility that intelligently cleans up repositories after intense vibe coding sessions. The specifications are broken down into modular documents covering distinct feature areas.

---

## Document Structure

### Core Architecture

#### [00-ARCHITECTURE.md](./00-ARCHITECTURE.md)
**Priority:** Foundation  
**Implementation:** Phase 1-2 (Weeks 1-2)

- System architecture and design principles
- Component structure and dependencies
- Data flow and module organization
- Technology stack and development tools
- Performance and security considerations
- High-level testing strategy

**Key Topics:**
- Modular component architecture
- Working directory structure
- Data structures and interfaces
- Error handling strategy
- Deployment and distribution

---

### Feature Specifications

#### [01-GIT-DETECTION.md](./01-GIT-DETECTION.md)
**Priority:** High  
**Implementation:** Phase 2 (Week 3)  
**Dependencies:** None

- Git repository detection (single vs monorepo)
- Monorepo structure analysis
- Technology and package manager detection
- Repository boundary enforcement
- Git submodule handling

**Key Topics:**
- Multi-repository detection algorithm
- Technology stack identification
- Boundary validation and protection
- Monorepo tool integration (Lerna, pnpm, Nx, etc.)

---

#### [02-ROOT-FILE-DISTRIBUTION.md](./02-ROOT-FILE-DISTRIBUTION.md)
**Priority:** High  
**Implementation:** Phase 4 (Weeks 5-6)  
**Dependencies:** Git Detection, AI Integration

- Intelligent file allocation to sub-repositories
- AI-powered content analysis
- Heuristic fallback system
- Conflict resolution strategies
- Subdirectory placement suggestions

**Key Topics:**
- Three-tier allocation system (explicit → AI → heuristic)
- Confidence scoring (85%+ high, 60-85% medium, <60% keep at root)
- Protected file patterns
- User-configurable allocation rules

---

#### [03-AI-INTEGRATION.md](./03-AI-INTEGRATION.md)
**Priority:** High  
**Implementation:** Phase 3 (Week 4)  
**Dependencies:** None (core infrastructure)

- AI provider abstraction (Anthropic, OpenAI, Local)
- API key management and security
- AI recommendation system
- Response caching strategy
- Graceful degradation to heuristics

**Key Topics:**
- Provider implementations (Claude, GPT-4)
- Multi-touchpoint recommendation system
- File-based API key storage with .gitignore
- 24-hour cache with hash-based invalidation
- AI vs. heuristic comparison displays

---

#### [04-SCRIPT-CLASSIFICATION.md](./04-SCRIPT-CLASSIFICATION.md)
**Priority:** Medium  
**Implementation:** Phase 5 (Week 7)  
**Dependencies:** AI Integration, Git Detection

- Script categorization (utility, build, critical, test, document)
- Staleness detection (fresh, aging, stale)
- AI-generated content detection
- Reference analysis for critical path detection
- Action determination (keep, organize, delete)

**Key Topics:**
- Multi-stage classification algorithm
- Critical reference detection (package.json, Dockerfile, CI)
- AI-generated content patterns
- Configurable staleness thresholds
- Safe deletion with backup

---

#### [05-BUILD-VALIDATION-SAFETY.md](./05-BUILD-VALIDATION-SAFETY.md)
**Priority:** High  
**Implementation:** Phase 8 (Week 10)  
**Dependencies:** Git Detection, Backup System

- Technology-specific build validators
- Critical path detection
- Pre/post operation validation
- Auto-restore on failure (YOLO mode)
- Safety guard system

**Key Topics:**
- Build validators (Node.js, Python, Go, Rust, Docker)
- Three-stage validation (pre, post-distribution, post-cleanup)
- Critical path detection from configs
- Automatic rollback on build failure
- Boundary violation prevention

---

#### [06-CLI-INTERFACE.md](./06-CLI-INTERFACE.md)
**Priority:** Medium  
**Implementation:** Phase 9-11 (Weeks 11-13)  
**Dependencies:** All Core Features

- Command structure and flags
- Contextual help system
- Interactive prompts and user flows
- Progress indicators and output formatting
- Error display and guidance

**Key Topics:**
- Primary commands (scan, distribute, plan, execute, yolo)
- Configuration management commands
- Comprehensive flag system
- Smart contextual help based on repository state
- Beautiful terminal output with tables and spinners

---

#### [07-BACKUP-RESTORE.md](./07-BACKUP-RESTORE.md)
**Priority:** Critical  
**Implementation:** Phase 7 (Week 9)  
**Dependencies:** File Operations, Git Detection

- Comprehensive backup system
- Manifest-based restore
- Selective and full restore options
- Backup management and pruning
- Safety guarantees

**Key Topics:**
- Structured backup format with manifests
- SHA-256 hashing for verification
- Git status preservation
- Flexible restore options (--last, --from, --distribution)
- Five non-negotiable safety guarantees

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- CLI framework setup (Commander.js)
- Configuration management system
- Contextual help implementation
- Project structure and tooling

### Phase 2: Git & Scanning (Week 3)
- Git repository detection
- Monorepo structure analysis
- Technology detection
- Inventory generation

### Phase 3: AI Integration (Week 4)
- AI provider abstraction
- Anthropic/OpenAI integration
- Prompt engineering
- Caching system
- Recommendation messaging

### Phase 4: Distribution Engine (Weeks 5-6)
- Explicit pattern matching
- AI-powered allocation
- Heuristic fallback
- Conflict resolution
- Subdirectory suggestions

### Phase 5: Classification (Week 7)
- Script type detection
- Staleness analysis
- AI-generated content detection
- Reference detection

### Phase 6: Folder Enforcement (Week 8)
- Required folder detection
- File organization logic
- Merge strategies

### Phase 7: Backup System (Week 9)
- Backup manager implementation
- Restore system
- Manifest generation
- Safety verification

### Phase 8: Build Validation (Week 10)
- Technology-specific validators
- Critical path detection
- Auto-restore on failure

### Phase 9: Interactive Mode (Week 11)
- User prompts
- Plan review flows
- Approval workflows

### Phase 10: YOLO Mode (Week 12)
- Auto-decision logic
- Aggressive cleanup
- AI warnings
- Conservative fallbacks

### Phase 11: Restore System (Week 13)
- Restore commands
- Backup browsing
- Selective restore

### Phase 12: Testing & Refinement (Weeks 14-16)
- Comprehensive test suite
- Real-world validation
- Performance optimization
- Documentation

---

## Key Design Principles

### 1. Safety First
- **ALL operations backed up** (non-negotiable)
- **Git boundaries strictly enforced**
- **Protected files never touched**
- **Auto-restore on build failure**
- **100% reversibility guaranteed**

### 2. AI-Powered with Graceful Degradation
- **AI strongly recommended** but not required
- **Clear value proposition** shown to users
- **Heuristic fallback** maintains functionality
- **Transparency** in which method was used
- **Conservative without AI** (higher thresholds)

### 3. User-Centric Design
- **Contextual help** guides next steps
- **Interactive mode** for control
- **YOLO mode** for speed
- **Clear reasoning** for all decisions
- **Beautiful output** with progress indicators

### 4. Build-Safe Operations
- **Pre/post validation** ensures builds work
- **Critical path detection** prevents breaks
- **Technology-aware** validation
- **Auto-restore** if problems detected

---

## Success Criteria

### Core Functionality
- ✅ Detect monorepo structure with 100% accuracy
- ✅ Allocate files with >90% accuracy (with AI)
- ✅ Allocate files with >65% accuracy (heuristics only)
- ✅ Zero incorrect file deletions
- ✅ All operations reversible via restore
- ✅ Builds work after cleanup (when they worked before)

### AI Integration
- ✅ Clear value proposition for API key
- ✅ Graceful degradation without API key
- ✅ Users understand accuracy difference
- ✅ Setup process quick and obvious
- ✅ YOLO mode strongly discourages no-AI usage

### User Experience
- ✅ Contextual help guides next steps
- ✅ Dry-run shows accurate preview
- ✅ Interactive mode feels safe and controlled
- ✅ YOLO mode is fast (<30 seconds typical repo)
- ✅ Error messages are helpful, not cryptic

### Safety
- ✅ Zero user reports of accidental file loss
- ✅ Auto-restore works 100% of time when triggered
- ✅ Protected files never touched
- ✅ Git boundaries never crossed incorrectly

---

## Configuration Reference

### Default Configuration
```javascript
// .unvibe/config/rules.js
module.exports = {
  distribution: {
    highConfidence: 0.85,
    lowConfidence: 0.60,
    explicitPatterns: { /* ... */ }
  },
  scripts: {
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

### YOLO Mode Overrides
```javascript
// .unvibe/config/yolo-rules.js
module.exports = {
  extends: './rules.js',
  yolo: {
    distribution: {
      autoAcceptConfidence: 0.70,  // Lower threshold
      conflictResolution: 'rename'
    },
    staleness: {
      staleThreshold: 14,  // More aggressive
      deleteStale: true
    },
    autoMerge: {
      scripts: true,
      documents: true
    },
    skipPreBuildTest: true,
    autoRestoreOnFailure: true
  }
};
```

---

## Technology Stack

### Runtime & Core
- **Node.js 18+** - Runtime environment
- **Commander.js** - CLI framework
- **TypeScript** - Type safety (via JSDoc or full TS)
- **fs-extra** - Enhanced file operations
- **simple-git** - Git operations

### AI Integration
- **@anthropic-ai/sdk** - Claude integration
- **openai** - GPT-4 integration (optional)
- **node-cache** - In-memory caching

### UI/UX
- **chalk** - Terminal colors
- **ora** - Spinners
- **inquirer** - Interactive prompts
- **cli-table3** - Table formatting
- **boxen** - Message boxes
- **cli-progress** - Progress bars

### Testing
- **Vitest** - Test framework
- **c8** - Coverage reporting

---

## Non-Functional Requirements

### Performance
- Scan 1000+ files in <10 seconds
- Distribution planning for 100 files in <30 seconds (with AI)
- Parallel sub-repo processing
- Aggressive AI response caching

### Reliability
- 99.9% of operations safely reversible
- Zero data loss in default mode
- Graceful handling of permission errors
- Resume capability after interruption

### Compatibility
- Support Node.js 18+
- Work on Linux, macOS, Windows
- Handle git submodules
- Support major monorepo tools

### Maintainability
- 85%+ test coverage
- Modular architecture
- Clear separation: AI vs. heuristic logic
- Comprehensive inline documentation

---

## Out of Scope (v1.0)

The following are explicitly NOT in scope for v1.0:

❌ Code refactoring or optimization  
❌ Git operations (commit, push, merge)  
❌ Dependency updates or management  
❌ Code formatting or linting  
❌ Security scanning  
❌ File content modification (only moves/deletes)  
❌ Cross-repository refactoring  
❌ Automated code generation

---

## Future Enhancements (Post-v1.0)

### v1.5 - CI/CD Integration
- GitHub Action
- GitLab CI component
- Pre-commit hook
- Automated cleanup on PR merge

### v2.0 - Advanced Features
- Plugin system for custom rules
- Duplicate file detection
- Large binary detection
- Web dashboard for plan review
- Real-time collaboration

### v2.5 - Analytics
- Cleanup statistics over time
- Space reclaimed tracking
- Accuracy improvement metrics
- Common patterns detection

---

## Documentation Status

| Document | Status | Completeness | Ready for Dev |
|----------|--------|--------------|---------------|
| 00-ARCHITECTURE | ✅ Complete | 100% | Yes |
| 01-GIT-DETECTION | ✅ Complete | 100% | Yes |
| 02-ROOT-FILE-DISTRIBUTION | ✅ Complete | 100% | Yes |
| 03-AI-INTEGRATION | ✅ Complete | 100% | Yes |
| 04-SCRIPT-CLASSIFICATION | ✅ Complete | 100% | Yes |
| 05-BUILD-VALIDATION-SAFETY | ✅ Complete | 100% | Yes |
| 06-CLI-INTERFACE | ✅ Complete | 100% | Yes |
| 07-BACKUP-RESTORE | ✅ Complete | 100% | Yes |

---

## Next Steps

1. **Review & Approve**: Team reviews all specifications
2. **Setup Development Environment**: Initialize project structure
3. **Begin Phase 1**: Foundation and CLI framework
4. **Iterative Development**: Follow implementation roadmap
5. **Continuous Testing**: Build test suite alongside features
6. **Beta Testing**: Real-world validation with test repositories
7. **Documentation**: User-facing docs (README, USAGE, FAQ)
8. **Release v1.0**: NPM publication

---

## Contributing

When contributing to UnVibe development:

1. **Reference Specifications**: All implementations should follow these specs
2. **Update Specs**: If design changes during implementation, update specs
3. **Test Coverage**: Maintain 85%+ coverage per specifications
4. **Safety First**: Never compromise on safety requirements
5. **Document Decisions**: Add comments explaining complex logic

---

## Questions & Clarifications

For questions about these specifications:

1. Check the specific feature specification document
2. Review the ARCHITECTURE document for system-wide patterns
3. Look at the original REQUIREMENTS.md for context
4. Open an issue for specification clarification

---

## Change Log

**2025-10-02** - Initial specification documents created
- All 8 specification documents completed
- Ready for implementation
- Comprehensive coverage of all requirements

---

**Document Maintainer:** Development Team  
**Review Cycle:** After each implementation phase  
**Status:** Living Documents - Update as needed during development

