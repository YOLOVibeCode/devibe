# Root File Distribution Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines how UnVibe intelligently distributes misplaced root-level files to their correct sub-repositories in monorepo environments. It covers AI-powered analysis, heuristic fallback, and conflict resolution strategies.

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-2.1**: File Allocation Analysis
- **FR-2.2**: Allocation Decision Rules
- **FR-2.3**: Conflict Handling
- **FR-2.4**: Subdirectory Placement

---

## 3. Distribution Overview

### 3.1 Core Concept

In monorepo environments, AI-assisted development often results in files being created at the root level that actually belong to specific sub-repositories. UnVibe uses a multi-tier analysis approach to intelligently allocate these files.

### 3.2 Analysis Priority Cascade

```
1. Explicit Naming Patterns (95%+ confidence)
   ↓ (if no match)
2. AI Content Analysis (85-95% confidence, RECOMMENDED)
   ↓ (if no AI or low confidence)
3. Heuristic Analysis (60-75% confidence)
   ↓ (if still uncertain)
4. Keep at Root (safe default)
```

---

## 4. Explicit Naming Patterns

### 4.1 Pattern Matching

```typescript
interface ExplicitPattern {
  pattern: string | RegExp;
  targetRepo: string;
  confidence: number;
  subdirectory?: string;
}

interface PatternConfig {
  patterns: ExplicitPattern[];
  caseSensitive: boolean;
}

const defaultPatterns: ExplicitPattern[] = [
  // API patterns
  { pattern: /^api-/, targetRepo: './api', confidence: 0.95 },
  { pattern: /-api\./, targetRepo: './api', confidence: 0.95 },
  { pattern: /^.*api\./, targetRepo: './api', confidence: 0.90 },
  
  // Web/Frontend patterns
  { pattern: /^web-/, targetRepo: './web', confidence: 0.95 },
  { pattern: /-frontend\./, targetRepo: './web', confidence: 0.95 },
  { pattern: /-ui\./, targetRepo: './web', confidence: 0.90 },
  { pattern: /^component-/, targetRepo: './web', confidence: 0.85, subdirectory: 'src/components' },
  
  // Mobile patterns
  { pattern: /^mobile-/, targetRepo: './mobile', confidence: 0.95 },
  { pattern: /-app\./, targetRepo: './mobile', confidence: 0.90 },
  { pattern: /^app-/, targetRepo: './mobile', confidence: 0.85 },
  
  // Shared/Common patterns
  { pattern: /^shared-/, targetRepo: './shared', confidence: 0.90 },
  { pattern: /^common-/, targetRepo: './common', confidence: 0.90 },
  { pattern: /^utils?-/, targetRepo: './shared', confidence: 0.85 },
  
  // Backend patterns
  { pattern: /^backend-/, targetRepo: './backend', confidence: 0.95 },
  { pattern: /^server-/, targetRepo: './backend', confidence: 0.90 },
  { pattern: /-service\./, targetRepo: './backend', confidence: 0.85 },
];

class ExplicitPatternMatcher {
  constructor(
    private patterns: ExplicitPattern[],
    private availableRepos: string[]
  ) {}
  
  match(fileName: string): AllocationDecision | null {
    for (const pattern of this.patterns) {
      // Check if target repo exists
      if (!this.availableRepos.includes(pattern.targetRepo)) {
        continue;
      }
      
      // Test pattern
      const matches = typeof pattern.pattern === 'string'
        ? fileName.includes(pattern.pattern)
        : pattern.pattern.test(fileName);
      
      if (matches) {
        return {
          file: fileName,
          targetRepo: pattern.targetRepo,
          targetSubdir: pattern.subdirectory,
          confidence: pattern.confidence,
          method: 'explicit',
          reasoning: `Filename matches explicit pattern: ${pattern.pattern}`
        };
      }
    }
    
    return null;
  }
}
```

### 4.2 User-Configurable Patterns

```javascript
// .unvibe/config/rules.js
module.exports = {
  distribution: {
    explicitPatterns: {
      // Custom patterns for this project
      'auth-*': './services/auth',
      'payment-*': './services/payment',
      '*Controller.js': { 
        repo: './api', 
        subdir: 'src/controllers' 
      },
      '*Model.js': { 
        repo: './api', 
        subdir: 'src/models' 
      },
      'use*.tsx': { 
        repo: './web', 
        subdir: 'src/hooks' 
      },
      '*Component.tsx': { 
        repo: './web', 
        subdir: 'src/components' 
      }
    }
  }
};
```

---

## 5. AI-Powered Content Analysis

### 5.1 AI Analysis Flow

```typescript
interface AIAnalysisRequest {
  fileName: string;
  filePath: string;
  fileContent: string;
  availableRepos: RepositoryInfo[];
  monorepoContext: MonorepoContext;
}

interface RepositoryInfo {
  path: string;
  name: string;
  technologies: Technology[];
  existingStructure: DirectoryTree;
}

interface MonorepoContext {
  rootPath: string;
  repoStructure: string;
  commonPatterns: string[];
}

interface AIAnalysisResponse {
  targetRepo: string;
  suggestedSubdir: string;
  confidence: number;
  reasoning: string;
  alternativeOptions?: AlternativeAllocation[];
}

interface AlternativeAllocation {
  targetRepo: string;
  suggestedSubdir: string;
  confidence: number;
  reasoning: string;
}
```

### 5.2 AI Prompt Template

```typescript
function buildDistributionPrompt(request: AIAnalysisRequest): string {
  return `You are analyzing a file in a monorepo to determine which sub-repository it belongs to.

MONOREPO STRUCTURE:
${formatRepositoryStructure(request.monorepoContext)}

FILE TO ANALYZE:
- Name: ${request.fileName}
- Path: ${request.filePath}

FILE CONTENT:
\`\`\`
${truncateContent(request.fileContent, 2000)}
\`\`\`

AVAILABLE SUB-REPOSITORIES:
${formatAvailableRepos(request.availableRepos)}

TASK:
Analyze this file and determine:
1. Which sub-repository it belongs to
2. What subdirectory within that repo (e.g., src/controllers, src/components)
3. Your confidence level (0.0 - 1.0)
4. Clear reasoning for your decision

Consider:
- Import statements and dependencies
- Framework patterns (Express routes, React components, etc.)
- Technology stack compatibility
- Code patterns and conventions
- Referenced paths within the file
- File naming conventions

Respond in JSON format:
{
  "targetRepo": "./api",
  "suggestedSubdir": "src/controllers",
  "confidence": 0.92,
  "reasoning": "This file contains Express route handlers with imports from '../models', indicating it's an API controller that belongs in the api repository.",
  "alternatives": [
    {
      "targetRepo": "./backend",
      "suggestedSubdir": "src/routes",
      "confidence": 0.45,
      "reasoning": "Could potentially fit in backend if api and backend are merged"
    }
  ]
}

IMPORTANT:
- Only suggest repos that exist in the available list
- Be conservative with confidence if uncertain
- Consider the existing directory structure of target repos
- Confidence >0.85 means "very certain"
- Confidence 0.70-0.85 means "likely but not certain"
- Confidence <0.70 means "uncertain, might be better at root"`;
}

function formatRepositoryStructure(context: MonorepoContext): string {
  return context.repoStructure;
}

function formatAvailableRepos(repos: RepositoryInfo[]): string {
  return repos.map(repo => {
    return `
${repo.name} (${repo.path})
  Technologies: ${repo.technologies.map(t => t.name).join(', ')}
  Structure:
${formatDirectoryTree(repo.existingStructure, 4)}
`;
  }).join('\n');
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // Try to truncate at a sensible point (end of line)
  const truncated = content.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n... (truncated)';
  }
  
  return truncated + '\n\n... (truncated)';
}
```

### 5.3 AI Provider Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';

class AIDistributionAnalyzer {
  private client: Anthropic;
  private cache: AICache;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.cache = new AICache();
  }
  
  async analyzeFile(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Make AI request
    const prompt = buildDistributionPrompt(request);
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      // Parse response
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      const analysis = this.parseAIResponse(content);
      
      // Cache result
      await this.cache.set(cacheKey, analysis);
      
      return analysis;
      
    } catch (error) {
      throw new AIAnalysisError(
        `AI analysis failed: ${error.message}`,
        error
      );
    }
  }
  
  private getCacheKey(request: AIAnalysisRequest): string {
    // Hash file content + available repos
    const hash = createHash('sha256');
    hash.update(request.fileContent);
    hash.update(JSON.stringify(request.availableRepos.map(r => r.path)));
    return hash.digest('hex');
  }
  
  private parseAIResponse(content: string): AIAnalysisResponse {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate response structure
    if (!parsed.targetRepo || !parsed.confidence || !parsed.reasoning) {
      throw new Error('Incomplete AI response');
    }
    
    return {
      targetRepo: parsed.targetRepo,
      suggestedSubdir: parsed.suggestedSubdir || '',
      confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
      reasoning: parsed.reasoning,
      alternativeOptions: parsed.alternatives || []
    };
  }
}
```

### 5.4 AI Response Caching

```typescript
interface CacheEntry {
  key: string;
  value: AIAnalysisResponse;
  timestamp: number;
  fileHash: string;
}

class AICache {
  private cacheDir: string;
  private ttl: number; // milliseconds
  
  constructor(cacheDir: string = '.unvibe/cache', ttlHours: number = 24) {
    this.cacheDir = cacheDir;
    this.ttl = ttlHours * 60 * 60 * 1000;
  }
  
  async get(key: string): Promise<AIAnalysisResponse | null> {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    
    if (!await fs.pathExists(cacheFile)) {
      return null;
    }
    
    const entry: CacheEntry = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      await fs.remove(cacheFile);
      return null;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: AIAnalysisResponse, fileHash: string = ''): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      fileHash
    };
    
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2));
  }
  
  async invalidate(fileHash: string): Promise<void> {
    // Remove all cache entries for this file
    const files = await fs.readdir(this.cacheDir);
    
    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const entry: CacheEntry = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      if (entry.fileHash === fileHash) {
        await fs.remove(filePath);
      }
    }
  }
}
```

---

## 6. Heuristic Fallback Analysis

### 6.1 Heuristic Scoring System

```typescript
interface HeuristicRule {
  name: string;
  weight: number;
  evaluate: (file: FileEntry, repo: Repository) => number;
}

const heuristicRules: HeuristicRule[] = [
  // Import statement analysis
  {
    name: 'import-matching',
    weight: 0.30,
    evaluate: (file, repo) => {
      const imports = extractImports(file.content);
      const repoName = path.basename(repo.path);
      
      let score = 0;
      for (const imp of imports) {
        if (imp.includes(repoName) || imp.includes(`../${repoName}`)) {
          score += 0.4;
        }
      }
      
      return Math.min(1.0, score);
    }
  },
  
  // Technology stack matching
  {
    name: 'technology-matching',
    weight: 0.25,
    evaluate: (file, repo) => {
      const fileExt = path.extname(file.path);
      const fileTech = detectTechnologyFromExtension(fileExt);
      
      const repoTechs = repo.technologies.map(t => t.name);
      
      if (repoTechs.includes(fileTech)) {
        return 0.8;
      }
      
      return 0.2;
    }
  },
  
  // Framework pattern matching
  {
    name: 'framework-patterns',
    weight: 0.20,
    evaluate: (file, repo) => {
      const patterns = detectFrameworkPatterns(file.content);
      const repoTechs = repo.technologies.map(t => t.name);
      
      let matches = 0;
      for (const pattern of patterns) {
        if (repoTechs.includes(pattern)) {
          matches++;
        }
      }
      
      return matches > 0 ? matches / patterns.length : 0;
    }
  },
  
  // Path reference detection
  {
    name: 'path-references',
    weight: 0.15,
    evaluate: (file, repo) => {
      const repoName = path.basename(repo.path);
      const content = file.content.toLowerCase();
      
      // Look for relative path references
      const pathRefs = [
        `./${repoName}`,
        `../${repoName}`,
        `'${repoName}/`,
        `"${repoName}/`,
        `from '${repoName}`,
        `from "${repoName}`
      ];
      
      let score = 0;
      for (const ref of pathRefs) {
        if (content.includes(ref.toLowerCase())) {
          score += 0.3;
        }
      }
      
      return Math.min(1.0, score);
    }
  },
  
  // File naming conventions
  {
    name: 'naming-conventions',
    weight: 0.10,
    evaluate: (file, repo) => {
      const fileName = path.basename(file.path, path.extname(file.path));
      const repoConventions = detectNamingConventions(repo);
      
      for (const convention of repoConventions) {
        if (convention.test(fileName)) {
          return 0.7;
        }
      }
      
      return 0.1;
    }
  }
];

class HeuristicAnalyzer {
  analyze(file: FileEntry, availableRepos: Repository[]): AllocationDecision | null {
    const scores = new Map<string, number>();
    
    for (const repo of availableRepos) {
      let totalScore = 0;
      let totalWeight = 0;
      
      for (const rule of heuristicRules) {
        const ruleScore = rule.evaluate(file, repo);
        totalScore += ruleScore * rule.weight;
        totalWeight += rule.weight;
      }
      
      const normalizedScore = totalScore / totalWeight;
      scores.set(repo.path, normalizedScore);
    }
    
    // Find best match
    const bestMatch = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (!bestMatch || bestMatch[1] < 0.60) {
      return null; // Not confident enough
    }
    
    const targetRepo = availableRepos.find(r => r.path === bestMatch[0])!;
    
    return {
      file: file.path,
      targetRepo: bestMatch[0],
      targetSubdir: suggestSubdirectory(file, targetRepo),
      confidence: bestMatch[1],
      method: 'heuristic',
      reasoning: `Heuristic analysis scored ${(bestMatch[1] * 100).toFixed(1)}% match based on imports, technology, and patterns`
    };
  }
}
```

### 6.2 Helper Functions

```typescript
function extractImports(content: string): string[] {
  const imports: string[] = [];
  
  // ES6 imports
  const es6Pattern = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6Pattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // CommonJS requires
  const cjsPattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = cjsPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function detectTechnologyFromExtension(ext: string): string {
  const techMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'react',
    '.ts': 'typescript',
    '.tsx': 'react',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.rb': 'ruby',
    '.php': 'php'
  };
  
  return techMap[ext] || 'unknown';
}

function detectFrameworkPatterns(content: string): string[] {
  const patterns: string[] = [];
  
  // React patterns
  if (/import\s+React/.test(content) || /from\s+['"]react['"]/.test(content)) {
    patterns.push('react');
  }
  
  // Express patterns
  if (/require\s*\(\s*['"]express['"]\s*\)/.test(content)) {
    patterns.push('express');
  }
  
  // FastAPI patterns
  if (/from\s+fastapi\s+import/.test(content)) {
    patterns.push('fastapi');
  }
  
  // Vue patterns
  if (/from\s+['"]vue['"]/.test(content)) {
    patterns.push('vue');
  }
  
  return patterns;
}

function detectNamingConventions(repo: Repository): RegExp[] {
  const conventions: RegExp[] = [];
  
  // Analyze existing files in repo to detect conventions
  // This is a simplified version
  if (repo.technologies.some(t => t.name === 'react')) {
    conventions.push(/Component$/);
    conventions.push(/^use[A-Z]/); // Hooks
  }
  
  if (repo.technologies.some(t => t.name === 'express')) {
    conventions.push(/Controller$/);
    conventions.push(/Route$/);
    conventions.push(/Middleware$/);
  }
  
  return conventions;
}

function suggestSubdirectory(file: FileEntry, repo: Repository): string {
  const fileName = path.basename(file.path);
  const ext = path.extname(file.path);
  
  // React components
  if (ext === '.tsx' || ext === '.jsx') {
    if (/Component\.tsx$/.test(fileName)) {
      return 'src/components';
    }
    if (/^use[A-Z]/.test(fileName)) {
      return 'src/hooks';
    }
    if (/Page\.tsx$/.test(fileName)) {
      return 'src/pages';
    }
  }
  
  // Express routes
  if (/Controller\.js$/.test(fileName) || /Controller\.ts$/.test(fileName)) {
    return 'src/controllers';
  }
  
  if (/Route\.js$/.test(fileName) || /Route\.ts$/.test(fileName)) {
    return 'src/routes';
  }
  
  if (/Model\.js$/.test(fileName) || /Model\.ts$/.test(fileName)) {
    return 'src/models';
  }
  
  // Default to src/
  return 'src';
}
```

---

## 7. Allocation Decision Engine

### 7.1 Decision Flow

```typescript
class DistributionEngine {
  private explicitMatcher: ExplicitPatternMatcher;
  private aiAnalyzer?: AIDistributionAnalyzer;
  private heuristicAnalyzer: HeuristicAnalyzer;
  private config: DistributionConfig;
  
  constructor(config: DistributionConfig) {
    this.config = config;
    this.explicitMatcher = new ExplicitPatternMatcher(
      config.explicitPatterns,
      config.availableRepos
    );
    
    if (config.aiEnabled && config.aiApiKey) {
      this.aiAnalyzer = new AIDistributionAnalyzer(config.aiApiKey);
    }
    
    this.heuristicAnalyzer = new HeuristicAnalyzer();
  }
  
  async analyzeFile(file: FileEntry): Promise<AllocationDecision> {
    // Step 1: Try explicit patterns (fastest, highest confidence)
    const explicitMatch = this.explicitMatcher.match(file.path);
    if (explicitMatch && explicitMatch.confidence >= this.config.highConfidenceThreshold) {
      return explicitMatch;
    }
    
    // Step 2: Try AI analysis (if enabled)
    if (this.aiAnalyzer && file.size < this.config.maxFileSizeForAI) {
      try {
        const aiResult = await this.aiAnalyzer.analyzeFile({
          fileName: path.basename(file.path),
          filePath: file.path,
          fileContent: await fs.readFile(file.absolutePath, 'utf-8'),
          availableRepos: this.config.repositories,
          monorepoContext: this.config.context
        });
        
        if (aiResult.confidence >= this.config.lowConfidenceThreshold) {
          return {
            file: file.path,
            targetRepo: aiResult.targetRepo,
            targetSubdir: aiResult.suggestedSubdir,
            confidence: aiResult.confidence,
            method: 'ai',
            reasoning: aiResult.reasoning,
            alternatives: aiResult.alternativeOptions
          };
        }
      } catch (error) {
        console.warn(`AI analysis failed for ${file.path}: ${error.message}`);
        // Fall through to heuristics
      }
    }
    
    // Step 3: Try heuristic analysis (fallback)
    const heuristicResult = this.heuristicAnalyzer.analyze(
      file,
      this.config.repositories
    );
    
    if (heuristicResult && heuristicResult.confidence >= this.config.lowConfidenceThreshold) {
      return heuristicResult;
    }
    
    // Step 4: Keep at root (not confident enough to move)
    return {
      file: file.path,
      targetRepo: 'root',
      confidence: 0,
      method: 'none',
      reasoning: 'Insufficient confidence to allocate to any repository'
    };
  }
  
  async createDistributionPlan(rootFiles: FileEntry[]): Promise<DistributionPlan> {
    const decisions: AllocationDecision[] = [];
    
    // Process files in parallel (with concurrency limit)
    const queue = new PQueue({ concurrency: this.config.concurrency });
    
    for (const file of rootFiles) {
      queue.add(async () => {
        const decision = await this.analyzeFile(file);
        decisions.push(decision);
      });
    }
    
    await queue.onIdle();
    
    // Categorize decisions
    const toDistribute = decisions.filter(d => 
      d.targetRepo !== 'root' && 
      d.confidence >= this.config.lowConfidenceThreshold
    );
    
    const keepAtRoot = decisions.filter(d => 
      d.targetRepo === 'root' || 
      d.confidence < this.config.lowConfidenceThreshold
    );
    
    const highConfidence = toDistribute.filter(d => 
      d.confidence >= this.config.highConfidenceThreshold
    );
    
    const lowConfidence = toDistribute.filter(d => 
      d.confidence < this.config.highConfidenceThreshold
    );
    
    return {
      timestamp: new Date().toISOString(),
      aiEnabled: !!this.aiAnalyzer,
      decisions: toDistribute,
      keepAtRoot: keepAtRoot.map(d => d.file),
      highConfidence,
      lowConfidence,
      statistics: {
        total: rootFiles.length,
        toDistribute: toDistribute.length,
        keepAtRoot: keepAtRoot.length,
        highConfidence: highConfidence.length,
        lowConfidence: lowConfidence.length,
        byMethod: this.groupByMethod(decisions)
      }
    };
  }
  
  private groupByMethod(decisions: AllocationDecision[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const decision of decisions) {
      groups[decision.method] = (groups[decision.method] || 0) + 1;
    }
    
    return groups;
  }
}
```

### 7.2 Configuration

```typescript
interface DistributionConfig {
  // AI settings
  aiEnabled: boolean;
  aiApiKey?: string;
  aiProvider: 'anthropic' | 'openai' | 'local';
  maxFileSizeForAI: number;  // Skip AI for files larger than this
  
  // Confidence thresholds
  highConfidenceThreshold: number;  // Default: 0.85
  lowConfidenceThreshold: number;   // Default: 0.60 (0.70 for YOLO)
  
  // Repository context
  availableRepos: string[];
  repositories: Repository[];
  context: MonorepoContext;
  
  // Patterns
  explicitPatterns: ExplicitPattern[];
  
  // Performance
  concurrency: number;  // Parallel file analysis
}

const defaultDistributionConfig: Partial<DistributionConfig> = {
  aiEnabled: true,
  aiProvider: 'anthropic',
  maxFileSizeForAI: 10 * 1024 * 1024, // 10MB
  highConfidenceThreshold: 0.85,
  lowConfidenceThreshold: 0.60,
  concurrency: 5
};
```

---

## 8. Conflict Resolution

### 8.1 Conflict Detection

```typescript
interface FileConflict {
  sourceFile: string;
  targetFile: string;
  conflictType: 'exact' | 'similar';
  existingFileHash: string;
  newFileHash: string;
  existingFileSize: number;
  newFileSize: number;
  areSame: boolean;
}

async function detectConflicts(
  decision: AllocationDecision,
  targetRepoPath: string
): Promise<FileConflict | null> {
  const targetPath = path.join(
    targetRepoPath,
    decision.targetSubdir || '',
    path.basename(decision.file)
  );
  
  // Check if target file exists
  if (!await fs.pathExists(targetPath)) {
    return null; // No conflict
  }
  
  // Get file hashes
  const sourceHash = await getFileHash(decision.file);
  const targetHash = await getFileHash(targetPath);
  
  // Get file sizes
  const sourceStat = await fs.stat(decision.file);
  const targetStat = await fs.stat(targetPath);
  
  return {
    sourceFile: decision.file,
    targetFile: targetPath,
    conflictType: 'exact',
    existingFileHash: targetHash,
    newFileHash: sourceHash,
    existingFileSize: targetStat.size,
    newFileSize: sourceStat.size,
    areSame: sourceHash === targetHash
  };
}

async function getFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}
```

### 8.2 Conflict Resolution Strategies

```typescript
type ConflictStrategy = 'prompt' | 'overwrite' | 'rename' | 'skip' | 'diff';

interface ConflictResolution {
  strategy: ConflictStrategy;
  newTargetPath?: string;  // If renamed
  backupPath?: string;      // Where original was backed up
}

class ConflictResolver {
  async resolve(
    conflict: FileConflict,
    mode: 'interactive' | 'yolo'
  ): Promise<ConflictResolution> {
    // If files are identical, just skip (and delete source)
    if (conflict.areSame) {
      return { strategy: 'skip' };
    }
    
    // YOLO mode: auto-rename with timestamp
    if (mode === 'yolo') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(conflict.targetFile);
      const base = path.basename(conflict.targetFile, ext);
      const dir = path.dirname(conflict.targetFile);
      const newName = `${base}-${timestamp}${ext}`;
      
      return {
        strategy: 'rename',
        newTargetPath: path.join(dir, newName)
      };
    }
    
    // Interactive mode: prompt user
    return await this.promptUser(conflict);
  }
  
  private async promptUser(conflict: FileConflict): Promise<ConflictResolution> {
    const { strategy } = await inquirer.prompt([{
      type: 'list',
      name: 'strategy',
      message: `File conflict: ${path.basename(conflict.targetFile)}`,
      choices: [
        { name: 'Overwrite existing file', value: 'overwrite' },
        { name: 'Rename new file (add timestamp)', value: 'rename' },
        { name: 'Skip this file', value: 'skip' },
        { name: 'Show diff', value: 'diff' }
      ]
    }]);
    
    if (strategy === 'diff') {
      await this.showDiff(conflict);
      return this.promptUser(conflict); // Ask again after showing diff
    }
    
    if (strategy === 'rename') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(conflict.targetFile);
      const base = path.basename(conflict.targetFile, ext);
      const dir = path.dirname(conflict.targetFile);
      const newName = `${base}-${timestamp}${ext}`;
      
      return {
        strategy: 'rename',
        newTargetPath: path.join(dir, newName)
      };
    }
    
    return { strategy };
  }
  
  private async showDiff(conflict: FileConflict): Promise<void> {
    // Use a diff library to show differences
    const sourceContent = await fs.readFile(conflict.sourceFile, 'utf-8');
    const targetContent = await fs.readFile(conflict.targetFile, 'utf-8');
    
    // Display diff (implementation depends on chosen diff library)
    console.log(chalk.bold('\nFile Diff:'));
    console.log(chalk.dim('─'.repeat(80)));
    // ... show diff ...
    console.log(chalk.dim('─'.repeat(80)));
  }
}
```

---

## 9. Protected Files

### 9.1 Protected File Rules

```typescript
const protectedFiles: string[] = [
  // Root monorepo configs
  'package.json',
  'lerna.json',
  'pnpm-workspace.yaml',
  'nx.json',
  'turbo.json',
  'workspace.json',
  
  // Git files
  '.gitignore',
  '.gitmodules',
  '.gitattributes',
  
  // CI/CD
  '.github/**',
  '.gitlab-ci.yml',
  'azure-pipelines.yml',
  'jenkins file',
  
  // Documentation
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  
  // Environment
  '.env*',
  
  // User-specified
  '.unvibe-preserve'
};

function isProtected(filePath: string): boolean {
  const fileName = path.basename(filePath);
  
  for (const pattern of protectedFiles) {
    if (minimatch(fileName, pattern)) {
      return true;
    }
  }
  
  // Check .unvibe-preserve file
  const preserveList = readPreserveList();
  return preserveList.includes(filePath);
}

function readPreserveList(): string[] {
  const preservePath = '.unvibe-preserve';
  if (!fs.existsSync(preservePath)) {
    return [];
  }
  
  const content = fs.readFileSync(preservePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}
```

---

## 10. Output and Reporting

### 10.1 Distribution Plan Display

```typescript
function displayDistributionPlan(plan: DistributionPlan): void {
  console.log(chalk.bold('\n📦 Root File Distribution Plan'));
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');
  
  // Statistics
  console.log(chalk.bold('Summary:'));
  console.log(`  Total root files analyzed: ${plan.statistics.total}`);
  console.log(`  Files to distribute: ${chalk.green(plan.statistics.toDistribute)}`);
  console.log(`  Files to keep at root: ${chalk.yellow(plan.statistics.keepAtRoot)}`);
  console.log(`  High confidence (≥85%): ${chalk.green(plan.statistics.highConfidence)}`);
  console.log(`  Low confidence (<85%): ${chalk.yellow(plan.statistics.lowConfidence)}`);
  console.log('');
  
  // AI status
  if (plan.aiEnabled) {
    console.log(chalk.green('✓') + ' AI-powered analysis enabled');
  } else {
    console.log(chalk.yellow('⚠') + ' Using heuristic analysis only');
    console.log(chalk.dim('  Consider enabling AI for better accuracy'));
  }
  console.log('');
  
  // Decisions by method
  console.log(chalk.bold('Analysis Methods:'));
  for (const [method, count] of Object.entries(plan.statistics.byMethod)) {
    console.log(`  ${method}: ${count} files`);
  }
  console.log('');
  
  // High confidence allocations
  if (plan.highConfidence.length > 0) {
    console.log(chalk.bold.green('High Confidence Allocations (≥85%):'));
    for (const decision of plan.highConfidence) {
      console.log(`  ${chalk.cyan(path.basename(decision.file))}`);
      console.log(`    → ${decision.targetRepo}${decision.targetSubdir ? '/' + decision.targetSubdir : ''}`);
      console.log(`    ${chalk.dim(`${(decision.confidence * 100).toFixed(0)}% confidence via ${decision.method}`)}`);
      console.log(`    ${chalk.dim(decision.reasoning)}`);
      console.log('');
    }
  }
  
  // Low confidence allocations
  if (plan.lowConfidence.length > 0) {
    console.log(chalk.bold.yellow('Lower Confidence Allocations (<85%):'));
    console.log(chalk.dim('  These will require user confirmation'));
    for (const decision of plan.lowConfidence) {
      console.log(`  ${chalk.cyan(path.basename(decision.file))}`);
      console.log(`    → ${decision.targetRepo}${decision.targetSubdir ? '/' + decision.targetSubdir : ''}`);
      console.log(`    ${chalk.dim(`${(decision.confidence * 100).toFixed(0)}% confidence via ${decision.method}`)}`);
      console.log('');
    }
  }
  
  console.log(chalk.dim('─'.repeat(80)));
}
```

---

## 11. Testing Requirements

### 11.1 Test Coverage

- Explicit pattern matching: 100%
- AI integration: 90%
- Heuristic analysis: 95%
- Conflict resolution: 100%
- Protected files: 100%

### 11.2 Test Scenarios

```typescript
describe('Distribution Engine', () => {
  test('matches explicit patterns with high confidence', async () => {
    const engine = new DistributionEngine(config);
    const file = createTestFile('api-users.js');
    const decision = await engine.analyzeFile(file);
    
    expect(decision.targetRepo).toBe('./api');
    expect(decision.confidence).toBeGreaterThanOrEqual(0.95);
    expect(decision.method).toBe('explicit');
  });
  
  test('uses AI analysis when available', async () => {
    const engine = new DistributionEngine(configWithAI);
    const file = createTestFile('UserController.js', EXPRESS_CONTROLLER_CONTENT);
    const decision = await engine.analyzeFile(file);
    
    expect(decision.method).toBe('ai');
    expect(decision.confidence).toBeGreaterThan(0.85);
  });
  
  test('falls back to heuristics when AI unavailable', async () => {
    const engine = new DistributionEngine(configWithoutAI);
    const file = createTestFile('user-routes.js', EXPRESS_ROUTES_CONTENT);
    const decision = await engine.analyzeFile(file);
    
    expect(decision.method).toBe('heuristic');
    expect(decision.confidence).toBeGreaterThan(0.60);
  });
  
  test('keeps files at root when confidence too low', async () => {
    const engine = new DistributionEngine(config);
    const file = createTestFile('random.txt', 'random content');
    const decision = await engine.analyzeFile(file);
    
    expect(decision.targetRepo).toBe('root');
    expect(decision.confidence).toBeLessThan(0.60);
  });
  
  test('respects protected files', () => {
    expect(isProtected('package.json')).toBe(true);
    expect(isProtected('README.md')).toBe(true);
    expect(isProtected('random.js')).toBe(false);
  });
  
  test('handles file conflicts in YOLO mode', async () => {
    const resolver = new ConflictResolver();
    const conflict = createTestConflict();
    const resolution = await resolver.resolve(conflict, 'yolo');
    
    expect(resolution.strategy).toBe('rename');
    expect(resolution.newTargetPath).toMatch(/-\d{4}-\d{2}-\d{2}/);
  });
});
```

---

**Document Status:** Complete  
**Implementation Priority:** Phase 4 (Weeks 5-6)  
**Dependencies:** Git Detection, AI Integration

