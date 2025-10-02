# Script Classification Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines how UnVibe classifies scripts and documents as utility, build, critical, or test files, determines staleness, and decides appropriate actions (keep, organize, or delete).

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-3.1**: Script Type Detection
- **FR-3.2**: Classification Factors
- **FR-3.3**: AI-Generated Content Detection
- **FR-3.4**: Staleness Detection
- **FR-4.1-4.4**: Folder Structure Enforcement

---

## 3. Classification Categories

### 3.1 Category Definitions

```typescript
type ScriptCategory = 'utility' | 'build' | 'critical' | 'test' | 'document' | 'unknown';

interface CategoryDefinition {
  name: ScriptCategory;
  description: string;
  defaultAction: 'keep' | 'organize' | 'delete';
  indicators: string[];
}

const categories: Record<ScriptCategory, CategoryDefinition> = {
  utility: {
    name: 'utility',
    description: 'Temporary, debugging, or one-off scripts',
    defaultAction: 'delete',
    indicators: [
      'Temporary file names (temp-, debug-, test-)',
      'Quick scripts with minimal logic',
      'Recently created, untracked',
      'No references in other files'
    ]
  },
  
  build: {
    name: 'build',
    description: 'Build automation and deployment scripts',
    defaultAction: 'organize',
    indicators: [
      'Build-related names (build-, deploy-, release-)',
      'CI/CD scripts',
      'Docker build scripts',
      'Package scripts'
    ]
  },
  
  critical: {
    name: 'critical',
    description: 'Essential scripts referenced by build systems',
    defaultAction: 'keep',
    indicators: [
      'Referenced in package.json',
      'Referenced in Dockerfile',
      'Referenced in CI configs',
      'Entry points (main, bin)'
    ]
  },
  
  test: {
    name: 'test',
    description: 'Test scripts and fixtures',
    defaultAction: 'organize',
    indicators: [
      'Test file patterns (*.test.*, *.spec.*)',
      'In test directories',
      'Contains test framework imports'
    ]
  },
  
  document: {
    name: 'document',
    description: 'Documentation, notes, and markdown files',
    defaultAction: 'organize',
    indicators: [
      '.md, .txt files',
      'Documentation content',
      'AI-generated notes',
      'Design documents'
    ]
  },
  
  unknown: {
    name: 'unknown',
    description: 'Cannot confidently classify',
    defaultAction: 'keep',
    indicators: []
  }
};
```

---

## 4. Classification Algorithm

### 4.1 Multi-Stage Classification

```typescript
interface ClassificationInput {
  file: FileEntry;
  repository: Repository;
  references: FileReference[];
  gitStatus: GitStatus;
}

interface FileReference {
  sourceFile: string;
  lineNumber: number;
  context: string;
}

interface GitStatus {
  tracked: boolean;
  lastModified: Date;
  lastAccessed: Date;
  age: number; // days
}

class ScriptClassifier {
  private aiProvider?: AIProvider;
  private heuristicClassifier: HeuristicClassifier;
  
  constructor(aiProvider?: AIProvider) {
    this.aiProvider = aiProvider;
    this.heuristicClassifier = new HeuristicClassifier();
  }
  
  async classify(input: ClassificationInput): Promise<ScriptClassification> {
    // Step 1: Check if force-classified by user rules
    const forcedCategory = this.checkForcedRules(input.file);
    if (forcedCategory) {
      return this.buildClassification(input, forcedCategory, 1.0, 'forced');
    }
    
    // Step 2: Check if critical (referenced in build systems)
    const criticalCheck = this.checkCriticalReferences(input);
    if (criticalCheck.isCritical) {
      return this.buildClassification(
        input, 
        'critical', 
        criticalCheck.confidence,
        'reference-check'
      );
    }
    
    // Step 3: Try AI classification
    if (this.aiProvider) {
      try {
        const aiResult = await this.classifyWithAI(input);
        if (aiResult.confidence >= 0.75) {
          return aiResult;
        }
      } catch (error) {
        console.warn(`AI classification failed: ${error.message}`);
      }
    }
    
    // Step 4: Heuristic classification
    return this.heuristicClassifier.classify(input);
  }
  
  private checkForcedRules(file: FileEntry): ScriptCategory | null {
    const config = loadConfig();
    const fileName = path.basename(file.path);
    
    // Check forced utility patterns
    for (const pattern of config.scripts.forceUtility || []) {
      if (minimatch(fileName, pattern)) {
        return 'utility';
      }
    }
    
    // Check forced critical patterns
    for (const pattern of config.scripts.forceCritical || []) {
      if (minimatch(fileName, pattern)) {
        return 'critical';
      }
    }
    
    return null;
  }
  
  private checkCriticalReferences(input: ClassificationInput): {
    isCritical: boolean;
    confidence: number;
    reason?: string;
  } {
    const { file, references } = input;
    
    // Check if referenced in package.json scripts
    const pkgJsonRefs = references.filter(ref => 
      ref.sourceFile.endsWith('package.json')
    );
    if (pkgJsonRefs.length > 0) {
      return {
        isCritical: true,
        confidence: 1.0,
        reason: 'Referenced in package.json scripts'
      };
    }
    
    // Check if referenced in Dockerfile
    const dockerRefs = references.filter(ref => 
      ref.sourceFile.endsWith('Dockerfile')
    );
    if (dockerRefs.length > 0) {
      return {
        isCritical: true,
        confidence: 0.95,
        reason: 'Referenced in Dockerfile'
      };
    }
    
    // Check if referenced in CI config
    const ciRefs = references.filter(ref => 
      ref.sourceFile.includes('.github/') ||
      ref.sourceFile.includes('.gitlab-ci') ||
      ref.sourceFile.includes('jenkins')
    );
    if (ciRefs.length > 0) {
      return {
        isCritical: true,
        confidence: 0.90,
        reason: 'Referenced in CI/CD configuration'
      };
    }
    
    // Check if it's an entry point
    if (this.isEntryPoint(file, input.repository)) {
      return {
        isCritical: true,
        confidence: 0.95,
        reason: 'Package entry point'
      };
    }
    
    return { isCritical: false, confidence: 0 };
  }
  
  private isEntryPoint(file: FileEntry, repo: Repository): boolean {
    if (!repo.hasPackageJson) {
      return false;
    }
    
    const pkgJsonPath = path.join(repo.path, 'package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const relativePath = path.relative(repo.path, file.absolutePath);
      
      return (
        pkg.main === relativePath ||
        pkg.bin === relativePath ||
        (typeof pkg.bin === 'object' && Object.values(pkg.bin).includes(relativePath))
      );
    } catch {
      return false;
    }
  }
  
  private async classifyWithAI(input: ClassificationInput): Promise<ScriptClassification> {
    const request: ClassificationRequest = {
      fileName: path.basename(input.file.path),
      fileContent: await fs.readFile(input.file.absolutePath, 'utf-8'),
      fileMetadata: {
        size: input.file.size,
        lastModified: input.gitStatus.lastModified,
        lastAccessed: input.gitStatus.lastAccessed,
        isGitTracked: input.gitStatus.tracked,
        age: input.gitStatus.age
      },
      repositoryContext: {
        path: input.repository.path,
        technologies: input.repository.technologies,
        hasTests: input.repository.hasSrcDirectory
      }
    };
    
    const response = await this.aiProvider!.classifyScript(request);
    
    return {
      file: input.file,
      category: response.category,
      staleness: this.determineStaleness(input.gitStatus),
      isAIGenerated: response.isAIGenerated,
      referencedBy: input.references.map(r => r.sourceFile),
      confidence: response.confidence,
      reasoning: response.reasoning,
      action: response.action,
      targetLocation: response.targetLocation
    };
  }
  
  private buildClassification(
    input: ClassificationInput,
    category: ScriptCategory,
    confidence: number,
    method: string
  ): ScriptClassification {
    return {
      file: input.file,
      category,
      staleness: this.determineStaleness(input.gitStatus),
      isAIGenerated: this.detectAIGenerated(input.file),
      referencedBy: input.references.map(r => r.sourceFile),
      confidence,
      reasoning: `Classified as ${category} via ${method}`,
      action: categories[category].defaultAction,
      targetLocation: this.suggestTargetLocation(category, input.file)
    };
  }
  
  private determineStaleness(gitStatus: GitStatus): 'fresh' | 'aging' | 'stale' {
    const config = loadConfig();
    const thresholds = config.scripts.stalenessThreshold;
    
    const daysSinceAccess = Math.floor(
      (Date.now() - gitStatus.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceAccess <= thresholds.fresh) {
      return 'fresh';
    } else if (daysSinceAccess <= thresholds.aging) {
      return 'aging';
    } else {
      return 'stale';
    }
  }
  
  private detectAIGenerated(file: FileEntry): boolean {
    const detector = new AIContentDetector();
    return detector.detect(file);
  }
  
  private suggestTargetLocation(category: ScriptCategory, file: FileEntry): string {
    if (category === 'build' || category === 'utility') {
      return 'scripts/';
    } else if (category === 'document') {
      return 'documents/';
    } else if (category === 'test') {
      return 'tests/';
    } else {
      return ''; // Keep in place
    }
  }
}
```

---

## 5. AI Classification Prompt

### 5.1 Prompt Template

```typescript
function buildScriptClassificationPrompt(request: ClassificationRequest): string {
  return `You are analyzing a file to classify its purpose and determine appropriate action.

FILE INFORMATION:
- Name: ${request.fileName}
- Size: ${request.fileMetadata.size} bytes
- Last Modified: ${request.fileMetadata.lastModified.toISOString()}
- Last Accessed: ${request.fileMetadata.lastAccessed.toISOString()}
- Age: ${request.fileMetadata.age} days
- Git Tracked: ${request.fileMetadata.isGitTracked ? 'Yes' : 'No'}

REPOSITORY CONTEXT:
- Technologies: ${request.repositoryContext.technologies.map(t => t.name).join(', ')}

FILE CONTENT:
\`\`\`
${truncateContent(request.fileContent, 2000)}
\`\`\`

TASK:
Classify this file into ONE of the following categories:

1. **utility** - Temporary, debugging, or quick scripts
   - Usually short-lived
   - Often prefixed with temp-, debug-, test-
   - Minimal logic, hacky code
   - Not referenced elsewhere
   - ACTION: Delete (with backup)

2. **build** - Build automation, deployment, CI/CD scripts
   - Build scripts, deployment automation
   - Docker scripts, package scripts
   - Reusable automation
   - ACTION: Organize to scripts/ folder

3. **critical** - Essential scripts (DO NOT DELETE)
   - Referenced in package.json, Dockerfile, CI configs
   - Entry points, initialization scripts
   - Core functionality
   - ACTION: Keep in place

4. **test** - Test scripts and fixtures
   - Test files (*.test.*, *.spec.*)
   - Test utilities, fixtures
   - ACTION: Organize to tests/ folder

5. **document** - Documentation, notes, markdown
   - .md, .txt files
   - Documentation, design docs
   - AI-generated notes
   - ACTION: Organize to documents/ folder

Also determine:
- **Staleness**: fresh (active), aging (somewhat old), stale (very old)
- **AI Generated**: Was this likely generated by an AI?
- **Confidence**: 0.0 - 1.0 (how sure are you?)

IMPORTANT RULES:
- If referenced in build configs → MUST be "critical"
- If has proper test patterns → "test" not "utility"
- If it's a .md file → "document" not "utility"
- Conservative with "utility" classification
- High confidence (>0.85) required for deletion recommendations

Respond in JSON format:
{
  "category": "utility",
  "staleness": "stale",
  "isAIGenerated": false,
  "confidence": 0.82,
  "reasoning": "File named 'temp-test.js', contains quick debugging code, not referenced elsewhere, hasn't been accessed in 45 days",
  "action": "delete",
  "targetLocation": null
}`;
}
```

---

## 6. Heuristic Classification

### 6.1 Heuristic Rules

```typescript
class HeuristicClassifier {
  classify(input: ClassificationInput): ScriptClassification {
    const { file, gitStatus, references } = input;
    const fileName = path.basename(file.path);
    const ext = path.extname(file.path);
    
    let category: ScriptCategory = 'unknown';
    let confidence = 0.5;
    let reasoning = '';
    
    // Rule 1: File extension patterns
    if (['.md', '.txt', '.rst'].includes(ext)) {
      category = 'document';
      confidence = 0.90;
      reasoning = 'Document file extension';
    }
    
    // Rule 2: Test patterns
    else if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.includes('test-') ||
      file.path.includes('/tests/') ||
      file.path.includes('/__tests__/')
    ) {
      category = 'test';
      confidence = 0.85;
      reasoning = 'Test file pattern detected';
    }
    
    // Rule 3: Utility patterns (filename)
    else if (
      /^(temp|tmp|debug|quick|scratch|test)-/.test(fileName) ||
      /-temp\./.test(fileName)
    ) {
      category = 'utility';
      confidence = 0.80;
      reasoning = 'Temporary file naming pattern';
    }
    
    // Rule 4: Build patterns
    else if (
      /^(build|deploy|release|publish|install|setup)-/.test(fileName) ||
      fileName === 'build.sh' ||
      fileName === 'deploy.sh'
    ) {
      category = 'build';
      confidence = 0.75;
      reasoning = 'Build/deployment script pattern';
    }
    
    // Rule 5: Short, recent, untracked = utility
    else if (
      !gitStatus.tracked &&
      file.size < 5000 &&
      gitStatus.age < 7
    ) {
      category = 'utility';
      confidence = 0.70;
      reasoning = 'Small, recent, untracked file';
    }
    
    // Rule 6: Referenced files = important
    else if (references.length > 0) {
      category = 'build';
      confidence = 0.75;
      reasoning = `Referenced by ${references.length} file(s)`;
    }
    
    // Rule 7: Old + untracked = stale utility
    else if (!gitStatus.tracked && gitStatus.age > 30) {
      category = 'utility';
      confidence = 0.80;
      reasoning = 'Old untracked file, likely leftover';
    }
    
    const staleness = this.determineStaleness(gitStatus);
    const isAIGenerated = this.detectAIGenerated(file);
    
    return {
      file,
      category,
      staleness,
      isAIGenerated,
      referencedBy: references.map(r => r.sourceFile),
      confidence,
      reasoning,
      action: this.determineAction(category, staleness, references.length),
      targetLocation: this.suggestLocation(category)
    };
  }
  
  private determineStaleness(gitStatus: GitStatus): 'fresh' | 'aging' | 'stale' {
    const config = loadConfig();
    const thresholds = config.scripts.stalenessThreshold;
    
    const daysSinceAccess = Math.floor(
      (Date.now() - gitStatus.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceAccess <= thresholds.fresh) {
      return 'fresh';
    } else if (daysSinceAccess <= thresholds.aging) {
      return 'aging';
    } else {
      return 'stale';
    }
  }
  
  private detectAIGenerated(file: FileEntry): boolean {
    const detector = new AIContentDetector();
    return detector.detect(file);
  }
  
  private determineAction(
    category: ScriptCategory,
    staleness: string,
    referenceCount: number
  ): 'keep' | 'organize' | 'delete' {
    // Never delete if referenced
    if (referenceCount > 0) {
      return 'keep';
    }
    
    // Critical files always kept
    if (category === 'critical') {
      return 'keep';
    }
    
    // Stale utility files deleted
    if (category === 'utility' && staleness === 'stale') {
      return 'delete';
    }
    
    // Organize build, test, document files
    if (['build', 'test', 'document'].includes(category)) {
      return 'organize';
    }
    
    // Default: keep
    return 'keep';
  }
  
  private suggestLocation(category: ScriptCategory): string {
    switch (category) {
      case 'build':
      case 'utility':
        return 'scripts/';
      case 'document':
        return 'documents/';
      case 'test':
        return 'tests/';
      default:
        return '';
    }
  }
}
```

---

## 7. AI Content Detection

### 7.1 Detection Patterns

```typescript
class AIContentDetector {
  private patterns = {
    comments: [
      /generated by (ai|claude|gpt|copilot|chatgpt)/i,
      /ai-generated/i,
      /auto-generated by/i,
      /created with (claude|gpt|copilot)/i
    ],
    
    frontmatter: [
      /^---[\s\S]*?generated_by:\s*(ai|claude|gpt)/im,
      /^---[\s\S]*?ai_generated:\s*true/im
    ],
    
    signatures: [
      /\bclaude\b.*\bgenerated\b/i,
      /\bgpt\b.*\bcreated\b/i,
      /\bcopilot\b.*\bassisted\b/i
    ]
  };
  
  detect(file: FileEntry): boolean {
    try {
      const content = fs.readFileSync(file.absolutePath, 'utf-8');
      
      // Check comments
      for (const pattern of this.patterns.comments) {
        if (pattern.test(content)) {
          return true;
        }
      }
      
      // Check frontmatter (first 500 chars)
      const frontmatter = content.substring(0, 500);
      for (const pattern of this.patterns.frontmatter) {
        if (pattern.test(frontmatter)) {
          return true;
        }
      }
      
      // Check signatures
      for (const pattern of this.patterns.signatures) {
        if (pattern.test(content)) {
          return true;
        }
      }
      
      // Heuristic: very generic naming + recent
      if (this.hasGenericName(file) && this.isRecent(file)) {
        return true; // Probably AI-generated
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  private hasGenericName(file: FileEntry): boolean {
    const fileName = path.basename(file.path, path.extname(file.path));
    const genericNames = [
      'output', 'result', 'generated', 'temp', 'new', 'untitled',
      'document', 'notes', 'summary', 'analysis'
    ];
    
    return genericNames.some(name => fileName.toLowerCase().includes(name));
  }
  
  private isRecent(file: FileEntry): boolean {
    const daysSinceCreation = Math.floor(
      (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreation <= 7;
  }
}
```

---

## 8. Reference Detection

### 8.1 Finding References

```typescript
class ReferenceDetector {
  async findReferences(file: FileEntry, repository: Repository): Promise<FileReference[]> {
    const references: FileReference[] = [];
    const fileName = path.basename(file.path);
    const relativePath = path.relative(repository.path, file.absolutePath);
    
    // Search patterns
    const patterns = [
      fileName,                           // Exact filename
      `./${relativePath}`,                // Relative path
      `../${path.basename(repository.path)}/${relativePath}`, // From parent
      relativePath.replace(/\\/g, '/')   // Unix-style path
    ];
    
    // Search in all repository files
    const searchFiles = await glob('**/*', {
      cwd: repository.path,
      absolute: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });
    
    for (const searchFile of searchFiles) {
      if (searchFile === file.absolutePath) {
        continue; // Skip self-references
      }
      
      try {
        const content = await fs.readFile(searchFile, 'utf-8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          for (const pattern of patterns) {
            if (line.includes(pattern)) {
              references.push({
                sourceFile: searchFile,
                lineNumber: i + 1,
                context: line.trim()
              });
              break; // Only count once per line
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    // Also check critical files specifically
    await this.checkPackageJson(file, repository, references);
    await this.checkDockerfile(file, repository, references);
    await this.checkCIConfigs(file, repository, references);
    
    return references;
  }
  
  private async checkPackageJson(
    file: FileEntry,
    repository: Repository,
    references: FileReference[]
  ): Promise<void> {
    const pkgJsonPath = path.join(repository.path, 'package.json');
    if (!await fs.pathExists(pkgJsonPath)) {
      return;
    }
    
    try {
      const content = await fs.readFile(pkgJsonPath, 'utf-8');
      const fileName = path.basename(file.path);
      
      if (content.includes(fileName)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(fileName)) {
            references.push({
              sourceFile: pkgJsonPath,
              lineNumber: i + 1,
              context: lines[i].trim()
            });
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  private async checkDockerfile(
    file: FileEntry,
    repository: Repository,
    references: FileReference[]
  ): Promise<void> {
    const dockerfilePath = path.join(repository.path, 'Dockerfile');
    if (!await fs.pathExists(dockerfilePath)) {
      return;
    }
    
    try {
      const content = await fs.readFile(dockerfilePath, 'utf-8');
      const fileName = path.basename(file.path);
      
      if (content.includes(fileName)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(fileName)) {
            references.push({
              sourceFile: dockerfilePath,
              lineNumber: i + 1,
              context: lines[i].trim()
            });
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  private async checkCIConfigs(
    file: FileEntry,
    repository: Repository,
    references: FileReference[]
  ): Promise<void> {
    const ciFiles = [
      '.github/workflows/*.yml',
      '.github/workflows/*.yaml',
      '.gitlab-ci.yml',
      'Jenkinsfile',
      'azure-pipelines.yml'
    ];
    
    for (const pattern of ciFiles) {
      const files = await glob(pattern, {
        cwd: repository.path,
        absolute: true
      });
      
      for (const ciFile of files) {
        try {
          const content = await fs.readFile(ciFile, 'utf-8');
          const fileName = path.basename(file.path);
          
          if (content.includes(fileName)) {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(fileName)) {
                references.push({
                  sourceFile: ciFile,
                  lineNumber: i + 1,
                  context: lines[i].trim()
                });
              }
            }
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }
}
```

---

## 9. Cleanup Plan Generation

### 9.1 Plan Builder

```typescript
class CleanupPlanBuilder {
  async buildPlan(
    files: FileEntry[],
    repository: Repository,
    classifier: ScriptClassifier
  ): Promise<CleanupPlan> {
    const classifications: ScriptClassification[] = [];
    const referenceDetector = new ReferenceDetector();
    
    // Classify all files
    for (const file of files) {
      // Find references
      const references = await referenceDetector.findReferences(file, repository);
      
      // Get git status
      const gitStatus = await this.getGitStatus(file, repository);
      
      // Classify
      const classification = await classifier.classify({
        file,
        repository,
        references,
        gitStatus
      });
      
      classifications.push(classification);
    }
    
    // Categorize by action
    const toOrganize = classifications.filter(c => c.action === 'organize');
    const toDelete = classifications.filter(c => c.action === 'delete');
    const toKeep = classifications.filter(c => c.action === 'keep');
    
    // Determine folders to create
    const foldersToCreate = new Set<string>();
    for (const classification of toOrganize) {
      if (classification.targetLocation) {
        const fullPath = path.join(repository.path, classification.targetLocation);
        foldersToCreate.add(fullPath);
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      aiEnabled: !!classifier['aiProvider'],
      repository: repository.path,
      classifications,
      toOrganize,
      toDelete,
      toKeep,
      foldersToCreate: Array.from(foldersToCreate),
      statistics: {
        total: classifications.length,
        toOrganize: toOrganize.length,
        toDelete: toDelete.length,
        toKeep: toKeep.length,
        byCategory: this.groupByCategory(classifications),
        byStaleness: this.groupByStaleness(classifications)
      }
    };
  }
  
  private async getGitStatus(file: FileEntry, repository: Repository): Promise<GitStatus> {
    const git = simpleGit(repository.path);
    
    try {
      const relativePath = path.relative(repository.path, file.absolutePath);
      const result = await git.raw(['ls-files', '--', relativePath]);
      const tracked = result.trim().length > 0;
      
      const stat = await fs.stat(file.absolutePath);
      const age = Math.floor((Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24));
      
      return {
        tracked,
        lastModified: stat.mtime,
        lastAccessed: stat.atime,
        age
      };
    } catch {
      return {
        tracked: false,
        lastModified: new Date(),
        lastAccessed: new Date(),
        age: 0
      };
    }
  }
  
  private groupByCategory(classifications: ScriptClassification[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const c of classifications) {
      groups[c.category] = (groups[c.category] || 0) + 1;
    }
    return groups;
  }
  
  private groupByStaleness(classifications: ScriptClassification[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const c of classifications) {
      groups[c.staleness] = (groups[c.staleness] || 0) + 1;
    }
    return groups;
  }
}
```

---

## 10. Output Display

### 10.1 Plan Display

```typescript
function displayCleanupPlan(plan: CleanupPlan): void {
  console.log(chalk.bold('\n🧹 Cleanup Plan'));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');
  
  // Statistics
  console.log(chalk.bold('Summary:'));
  console.log(`  Total files analyzed: ${plan.statistics.total}`);
  console.log(`  ${chalk.green('To organize:')} ${plan.statistics.toOrganize}`);
  console.log(`  ${chalk.red('To delete:')} ${plan.statistics.toDelete}`);
  console.log(`  ${chalk.blue('To keep:')} ${plan.statistics.toKeep}`);
  console.log('');
  
  // By category
  console.log(chalk.bold('By Category:'));
  for (const [category, count] of Object.entries(plan.statistics.byCategory)) {
    console.log(`  ${category}: ${count}`);
  }
  console.log('');
  
  // Files to delete
  if (plan.toDelete.length > 0) {
    console.log(chalk.bold.red('Files to Delete:'));
    for (const c of plan.toDelete) {
      console.log(`  ${chalk.red('✗')} ${chalk.cyan(path.basename(c.file.path))}`);
      console.log(`     ${chalk.dim(c.reasoning)}`);
      console.log(`     ${chalk.dim(`Staleness: ${c.staleness}, Confidence: ${(c.confidence * 100).toFixed(0)}%`)}`);
      console.log('');
    }
  }
  
  // Files to organize
  if (plan.toOrganize.length > 0) {
    console.log(chalk.bold.green('Files to Organize:'));
    for (const c of plan.toOrganize) {
      console.log(`  ${chalk.green('→')} ${chalk.cyan(path.basename(c.file.path))}`);
      console.log(`     Move to: ${c.targetLocation}`);
      console.log(`     ${chalk.dim(c.reasoning)}`);
      console.log('');
    }
  }
  
  console.log(chalk.dim('─'.repeat(80)));
}
```

---

## 11. Testing

### 11.1 Test Scenarios

```typescript
describe('Script Classification', () => {
  test('classifies temp files as utility', async () => {
    const classifier = new ScriptClassifier();
    const file = createTestFile('temp-test.js');
    const classification = await classifier.classify(createTestInput(file));
    
    expect(classification.category).toBe('utility');
    expect(classification.action).toBe('delete');
  });
  
  test('classifies referenced scripts as critical', async () => {
    const file = createTestFile('deploy.sh');
    const references = [{ sourceFile: 'package.json', lineNumber: 10, context: '"deploy": "./deploy.sh"' }];
    const classification = await classifier.classify(createTestInput(file, references));
    
    expect(classification.category).toBe('critical');
    expect(classification.action).toBe('keep');
  });
  
  test('detects AI-generated content', () => {
    const detector = new AIContentDetector();
    const file = createTestFile('notes.md', '<!-- Generated by Claude -->');
    
    expect(detector.detect(file)).toBe(true);
  });
  
  test('organizes build scripts to scripts folder', async () => {
    const file = createTestFile('build-app.sh');
    const classification = await classifier.classify(createTestInput(file));
    
    expect(classification.category).toBe('build');
    expect(classification.action).toBe('organize');
    expect(classification.targetLocation).toBe('scripts/');
  });
});
```

---

**Document Status:** Complete  
**Implementation Priority:** Phase 5 (Week 7)  
**Dependencies:** AI Integration, Git Detection

