# AI Integration Specification

**Version:** 1.0  
**Last Updated:** 2025-10-02  
**Status:** Draft

---

## 1. Overview

This specification defines how UnVibe integrates AI capabilities for intelligent file allocation and script classification, with graceful degradation to heuristic analysis when AI is unavailable.

---

## 2. Requirements Reference

### 2.1 Functional Requirements

- **FR-7.1**: AI Provider Support
- **FR-7.2**: AI API Key Management
- **FR-7.3**: AI Recommendation System
- **FR-7.4**: AI vs. Heuristic Comparison
- **FR-7.5**: Graceful Degradation
- **FR-7.6**: AI Caching

---

## 3. Design Philosophy

### 3.1 Core Principles

1. **AI is Strongly Recommended, Not Required**
   - System works without AI
   - But actively encourages AI configuration
   - Shows clear value proposition

2. **Graceful Degradation**
   - Automatic fallback to heuristics
   - No feature loss, only accuracy reduction
   - Clear communication about limitations

3. **Transparency**
   - Show which method was used (AI vs. heuristic)
   - Display confidence scores
   - Explain decision reasoning

4. **Performance**
   - Aggressive caching to minimize API calls
   - Batch operations where possible
   - Respect rate limits

---

## 4. AI Provider Architecture

### 4.1 Provider Abstraction

```typescript
interface AIProvider {
  name: string;
  apiKey: string;
  
  // Core methods
  analyzeFileAllocation(request: AllocationRequest): Promise<AllocationResponse>;
  classifyScript(request: ClassificationRequest): Promise<ClassificationResponse>;
  
  // Utilities
  validateApiKey(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  getRateLimits(): RateLimitInfo;
}

interface AllocationRequest {
  fileName: string;
  fileContent: string;
  availableRepos: RepositoryInfo[];
  context: MonorepoContext;
}

interface AllocationResponse {
  targetRepo: string;
  suggestedSubdir: string;
  confidence: number;
  reasoning: string;
  alternatives?: AlternativeAllocation[];
}

interface ClassificationRequest {
  fileName: string;
  fileContent: string;
  fileMetadata: FileMetadata;
  repositoryContext: RepositoryContext;
}

interface ClassificationResponse {
  category: 'utility' | 'build' | 'critical' | 'test' | 'unknown';
  staleness: 'fresh' | 'aging' | 'stale';
  isAIGenerated: boolean;
  confidence: number;
  reasoning: string;
  action: 'keep' | 'organize' | 'delete';
  targetLocation?: string;
}
```

### 4.2 Anthropic Provider Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';

class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;
  
  constructor(public apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async analyzeFileAllocation(request: AllocationRequest): Promise<AllocationResponse> {
    const prompt = this.buildAllocationPrompt(request);
    
    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.2, // Lower temperature for more consistent results
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    return this.parseAllocationResponse(response.text);
  }
  
  async classifyScript(request: ClassificationRequest): Promise<ClassificationResponse> {
    const prompt = this.buildClassificationPrompt(request);
    
    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    return this.parseClassificationResponse(response.text);
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      if (error.status === 401) {
        return false;
      }
      throw error;
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.validateApiKey();
      return true;
    } catch {
      return false;
    }
  }
  
  getRateLimits(): RateLimitInfo {
    return {
      requestsPerMinute: 50,
      tokensPerMinute: 100000,
      requestsPerDay: 1000
    };
  }
  
  private buildAllocationPrompt(request: AllocationRequest): string {
    // Implementation in 02-ROOT-FILE-DISTRIBUTION.md
    return buildDistributionPrompt(request);
  }
  
  private buildClassificationPrompt(request: ClassificationRequest): string {
    // Implementation in 05-SCRIPT-CLASSIFICATION.md
    return buildScriptClassificationPrompt(request);
  }
  
  private parseAllocationResponse(text: string): AllocationResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      targetRepo: parsed.targetRepo,
      suggestedSubdir: parsed.suggestedSubdir || '',
      confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
      reasoning: parsed.reasoning,
      alternatives: parsed.alternatives || []
    };
  }
  
  private parseClassificationResponse(text: string): ClassificationResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      category: parsed.category,
      staleness: parsed.staleness,
      isAIGenerated: parsed.isAIGenerated || false,
      confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
      reasoning: parsed.reasoning,
      action: parsed.action,
      targetLocation: parsed.targetLocation
    };
  }
}
```

### 4.3 OpenAI Provider Implementation

```typescript
import OpenAI from 'openai';

class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  
  constructor(public apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async analyzeFileAllocation(request: AllocationRequest): Promise<AllocationResponse> {
    const prompt = this.buildAllocationPrompt(request);
    
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: 'You are a code organization expert. Respond with valid JSON only.'
      }, {
        role: 'user',
        content: prompt
      }]
    });
    
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from GPT-4');
    }
    
    return this.parseAllocationResponse(response);
  }
  
  async classifyScript(request: ClassificationRequest): Promise<ClassificationResponse> {
    const prompt = this.buildClassificationPrompt(request);
    
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: 'You are a code classification expert. Respond with valid JSON only.'
      }, {
        role: 'user',
        content: prompt
      }]
    });
    
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from GPT-4');
    }
    
    return this.parseClassificationResponse(response);
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      if (error.status === 401) {
        return false;
      }
      throw error;
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.validateApiKey();
      return true;
    } catch {
      return false;
    }
  }
  
  getRateLimits(): RateLimitInfo {
    return {
      requestsPerMinute: 500,
      tokensPerMinute: 150000,
      requestsPerDay: 10000
    };
  }
  
  private buildAllocationPrompt(request: AllocationRequest): string {
    return buildDistributionPrompt(request);
  }
  
  private buildClassificationPrompt(request: ClassificationRequest): string {
    return buildScriptClassificationPrompt(request);
  }
  
  private parseAllocationResponse(text: string): AllocationResponse {
    const parsed = JSON.parse(text);
    return {
      targetRepo: parsed.targetRepo,
      suggestedSubdir: parsed.suggestedSubdir || '',
      confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
      reasoning: parsed.reasoning,
      alternatives: parsed.alternatives || []
    };
  }
  
  private parseClassificationResponse(text: string): ClassificationResponse {
    const parsed = JSON.parse(text);
    return {
      category: parsed.category,
      staleness: parsed.staleness,
      isAIGenerated: parsed.isAIGenerated || false,
      confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
      reasoning: parsed.reasoning,
      action: parsed.action,
      targetLocation: parsed.targetLocation
    };
  }
}
```

### 4.4 Provider Factory

```typescript
class AIProviderFactory {
  static create(config: AIConfig): AIProvider | null {
    if (!config.enabled || !config.apiKey) {
      return null;
    }
    
    switch (config.provider) {
      case 'anthropic':
        return new AnthropicProvider(config.apiKey);
        
      case 'openai':
        return new OpenAIProvider(config.apiKey);
        
      case 'local':
        return new LocalLLMProvider(config.endpoint!, config.apiKey);
        
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  }
}

interface AIConfig {
  enabled: boolean;
  provider: 'anthropic' | 'openai' | 'local';
  apiKey?: string;
  endpoint?: string; // For local LLM
}
```

---

## 5. API Key Management

### 5.1 Storage

```typescript
interface APIKeyStore {
  getApiKey(provider: string): Promise<string | undefined>;
  setApiKey(provider: string, key: string): Promise<void>;
  removeApiKey(provider: string): Promise<void>;
  maskApiKey(key: string): string;
}

class FileBasedAPIKeyStore implements APIKeyStore {
  private settingsPath = '.unvibe/config/settings.json';
  
  async getApiKey(provider: string): Promise<string | undefined> {
    // Check environment variable first
    const envKey = this.getEnvKey(provider);
    if (envKey) {
      return envKey;
    }
    
    // Fall back to config file
    const settings = await this.loadSettings();
    return settings.ai?.[provider]?.apiKey;
  }
  
  async setApiKey(provider: string, key: string): Promise<void> {
    const settings = await this.loadSettings();
    
    if (!settings.ai) {
      settings.ai = {};
    }
    
    if (!settings.ai[provider]) {
      settings.ai[provider] = {};
    }
    
    settings.ai[provider].apiKey = key;
    settings.ai[provider].enabled = true;
    
    await this.saveSettings(settings);
    await this.ensureGitignore();
  }
  
  async removeApiKey(provider: string): Promise<void> {
    const settings = await this.loadSettings();
    
    if (settings.ai?.[provider]) {
      delete settings.ai[provider].apiKey;
      settings.ai[provider].enabled = false;
    }
    
    await this.saveSettings(settings);
  }
  
  maskApiKey(key: string): string {
    if (key.length < 12) {
      return '***';
    }
    
    const start = key.substring(0, 7);
    const end = key.substring(key.length - 4);
    return `${start}...${end}`;
  }
  
  private getEnvKey(provider: string): string | undefined {
    switch (provider) {
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      default:
        return undefined;
    }
  }
  
  private async loadSettings(): Promise<any> {
    if (!await fs.pathExists(this.settingsPath)) {
      return {};
    }
    
    return JSON.parse(await fs.readFile(this.settingsPath, 'utf-8'));
  }
  
  private async saveSettings(settings: any): Promise<void> {
    await fs.ensureDir(path.dirname(this.settingsPath));
    await fs.writeFile(
      this.settingsPath, 
      JSON.stringify(settings, null, 2)
    );
  }
  
  private async ensureGitignore(): Promise<void> {
    const gitignorePath = '.gitignore';
    let content = '';
    
    if (await fs.pathExists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf-8');
    }
    
    const pattern = '.unvibe/config/settings.json';
    if (!content.includes(pattern)) {
      content += `\n# UnVibe settings (contains API keys)\n${pattern}\n`;
      await fs.writeFile(gitignorePath, content);
    }
  }
}
```

### 5.2 Interactive API Key Setup

```typescript
async function setupApiKey(provider?: string): Promise<void> {
  console.log(chalk.bold('\n🔑 AI API Key Setup'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');
  
  // Choose provider if not specified
  if (!provider) {
    const { selectedProvider } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedProvider',
      message: 'Select AI provider:',
      choices: [
        { 
          name: 'Anthropic Claude (Recommended)', 
          value: 'anthropic',
          short: 'Anthropic'
        },
        { 
          name: 'OpenAI GPT-4', 
          value: 'openai',
          short: 'OpenAI'
        },
        {
          name: 'Local LLM',
          value: 'local',
          short: 'Local'
        }
      ]
    }]);
    
    provider = selectedProvider;
  }
  
  // Show instructions
  console.log(chalk.bold(`\nSetting up ${provider}:`));
  console.log('');
  
  if (provider === 'anthropic') {
    console.log('Get your API key from: https://console.anthropic.com/settings/keys');
  } else if (provider === 'openai') {
    console.log('Get your API key from: https://platform.openai.com/api-keys');
  }
  
  console.log('');
  
  // Get API key
  const { apiKey } = await inquirer.prompt([{
    type: 'password',
    name: 'apiKey',
    message: 'Enter your API key:',
    validate: (input) => {
      if (!input || input.trim().length < 10) {
        return 'Please enter a valid API key';
      }
      return true;
    }
  }]);
  
  // Validate key
  console.log('');
  console.log('Validating API key...');
  
  const aiProvider = AIProviderFactory.create({
    enabled: true,
    provider: provider as any,
    apiKey: apiKey.trim()
  });
  
  if (!aiProvider) {
    console.error(chalk.red('✗ Failed to create AI provider'));
    return;
  }
  
  const isValid = await aiProvider.validateApiKey();
  
  if (!isValid) {
    console.error(chalk.red('✗ Invalid API key'));
    return;
  }
  
  // Save key
  const store = new FileBasedAPIKeyStore();
  await store.setApiKey(provider, apiKey.trim());
  
  console.log(chalk.green('✓ API key saved successfully'));
  console.log('');
  console.log(chalk.dim(`Stored in: ${store['settingsPath']}`));
  console.log(chalk.dim('This file has been added to .gitignore'));
  console.log('');
  console.log(chalk.bold('You\'re all set! AI-powered analysis is now enabled.'));
}
```

---

## 6. AI Recommendation System

### 6.1 Recommendation Triggers

```typescript
interface AIRecommendation {
  context: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  setupCommand: string;
  comparisonData?: ComparisonData;
}

interface ComparisonData {
  withAI: {
    accuracy: number;
    filesAllocated: number;
    averageConfidence: number;
  };
  withoutAI: {
    accuracy: number;
    filesAllocated: number;
    averageConfidence: number;
  };
}

class AIRecommendationSystem {
  private config: AIConfig;
  
  constructor(config: AIConfig) {
    this.config = config;
  }
  
  // Trigger 1: First run
  async checkFirstRun(): Promise<AIRecommendation | null> {
    if (this.config.enabled) {
      return null;
    }
    
    const isFirstRun = !await fs.pathExists('.unvibe/');
    if (!isFirstRun) {
      return null;
    }
    
    return {
      context: 'first-run',
      severity: 'info',
      message: 'AI-powered analysis significantly improves accuracy (90% vs 65%)',
      setupCommand: 'devibe config set-api-key'
    };
  }
  
  // Trigger 2: devibe command (status)
  async checkStatus(): Promise<AIRecommendation | null> {
    if (this.config.enabled) {
      return null;
    }
    
    return {
      context: 'status',
      severity: 'warning',
      message: 'AI is not configured. File allocation will use heuristics only.',
      setupCommand: 'devibe config set-api-key'
    };
  }
  
  // Trigger 3: Before scanning
  async checkBeforeScan(): Promise<AIRecommendation | null> {
    if (this.config.enabled) {
      return null;
    }
    
    return {
      context: 'before-scan',
      severity: 'info',
      message: 'Consider enabling AI for more accurate file analysis',
      setupCommand: 'devibe config set-api-key'
    };
  }
  
  // Trigger 4: Before distribution
  async checkBeforeDistribution(plan: DistributionPlan): Promise<AIRecommendation | null> {
    if (this.config.enabled) {
      return null;
    }
    
    // Show comparison with estimated AI results
    const comparison = this.estimateAIImprovement(plan);
    
    return {
      context: 'before-distribution',
      severity: 'warning',
      message: 'AI analysis would likely allocate more files with higher confidence',
      setupCommand: 'devibe config set-api-key',
      comparisonData: comparison
    };
  }
  
  // Trigger 5: YOLO mode
  async checkYoloMode(): Promise<AIRecommendation | null> {
    if (this.config.enabled) {
      return null;
    }
    
    return {
      context: 'yolo-mode',
      severity: 'critical',
      message: 'YOLO mode without AI uses conservative thresholds and may leave more files at root',
      setupCommand: 'devibe config set-api-key'
    };
  }
  
  // Trigger 6: Post-operation summary
  async checkPostOperation(results: OperationResults): Promise<AIRecommendation | null> {
    if (this.config.enabled) {
      return null;
    }
    
    return {
      context: 'post-operation',
      severity: 'info',
      message: `${results.filesKeptAtRoot} files kept at root. AI might have allocated some of these.`,
      setupCommand: 'devibe config set-api-key'
    };
  }
  
  private estimateAIImprovement(plan: DistributionPlan): ComparisonData {
    // Rough estimation based on heuristic confidence scores
    const lowConfidenceFiles = plan.decisions.filter(d => d.confidence < 0.75).length;
    
    return {
      withAI: {
        accuracy: 0.90,
        filesAllocated: plan.decisions.length + Math.floor(lowConfidenceFiles * 0.6),
        averageConfidence: 0.87
      },
      withoutAI: {
        accuracy: 0.65,
        filesAllocated: plan.decisions.length,
        averageConfidence: 0.68
      }
    };
  }
  
  displayRecommendation(rec: AIRecommendation): void {
    const icon = rec.severity === 'critical' ? '🚨' : 
                 rec.severity === 'warning' ? '⚠️' : 'ℹ️';
    
    console.log('');
    console.log(boxen(
      `${icon}  ${chalk.bold('AI Configuration Recommended')}\n\n` +
      `${rec.message}\n\n` +
      `${chalk.dim('Setup:')} ${chalk.cyan(rec.setupCommand)}` +
      (rec.comparisonData ? this.formatComparison(rec.comparisonData) : ''),
      {
        padding: 1,
        borderColor: rec.severity === 'critical' ? 'red' : 
                     rec.severity === 'warning' ? 'yellow' : 'blue',
        borderStyle: 'round'
      }
    ));
    console.log('');
  }
  
  private formatComparison(data: ComparisonData): string {
    return `\n\n${chalk.bold('Expected Improvement:')}\n` +
           `  Accuracy:    ${data.withoutAI.accuracy * 100}% → ${chalk.green(data.withAI.accuracy * 100 + '%')}\n` +
           `  Files moved: ${data.withoutAI.filesAllocated} → ${chalk.green(data.withAI.filesAllocated)}\n` +
           `  Confidence:  ${(data.withoutAI.averageConfidence * 100).toFixed(0)}% → ${chalk.green((data.withAI.averageConfidence * 100).toFixed(0) + '%')}`;
  }
}
```

### 6.2 Integration Points

```typescript
// In CLI commands
async function scanCommand() {
  const recommender = new AIRecommendationSystem(config.ai);
  
  // Show recommendation before scan
  const rec = await recommender.checkBeforeScan();
  if (rec) {
    recommender.displayRecommendation(rec);
  }
  
  // Continue with scan...
}

async function yoloCommand() {
  const recommender = new AIRecommendationSystem(config.ai);
  
  // Critical warning for YOLO without AI
  const rec = await recommender.checkYoloMode();
  if (rec) {
    recommender.displayRecommendation(rec);
    
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Continue without AI?',
      default: false
    }]);
    
    if (!proceed) {
      console.log('Setup AI with: devibe config set-api-key');
      process.exit(0);
    }
  }
  
  // Continue with YOLO...
}
```

---

## 7. Response Caching

### 7.1 Cache Implementation

```typescript
interface CachedResponse {
  request: {
    type: 'allocation' | 'classification';
    fileHash: string;
    contextHash: string;
  };
  response: AllocationResponse | ClassificationResponse;
  timestamp: number;
  provider: string;
}

class AIResponseCache {
  private cacheDir = '.unvibe/cache';
  private ttl = 24 * 60 * 60 * 1000; // 24 hours
  private memoryCache = new Map<string, CachedResponse>();
  
  async get(
    type: 'allocation' | 'classification',
    fileHash: string,
    contextHash: string
  ): Promise<CachedResponse | null> {
    const key = this.getCacheKey(type, fileHash, contextHash);
    
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key)!;
      if (this.isValid(cached)) {
        return cached;
      }
      this.memoryCache.delete(key);
    }
    
    // Check file cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    if (await fs.pathExists(cachePath)) {
      const cached: CachedResponse = JSON.parse(
        await fs.readFile(cachePath, 'utf-8')
      );
      
      if (this.isValid(cached)) {
        this.memoryCache.set(key, cached);
        return cached;
      }
      
      await fs.remove(cachePath);
    }
    
    return null;
  }
  
  async set(
    type: 'allocation' | 'classification',
    fileHash: string,
    contextHash: string,
    response: AllocationResponse | ClassificationResponse,
    provider: string
  ): Promise<void> {
    const key = this.getCacheKey(type, fileHash, contextHash);
    
    const cached: CachedResponse = {
      request: { type, fileHash, contextHash },
      response,
      timestamp: Date.now(),
      provider
    };
    
    // Store in memory
    this.memoryCache.set(key, cached);
    
    // Store in file
    await fs.ensureDir(this.cacheDir);
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(cachePath, JSON.stringify(cached, null, 2));
  }
  
  async invalidateFile(fileHash: string): Promise<void> {
    // Remove all cache entries for this file
    const files = await fs.readdir(this.cacheDir);
    
    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const cached: CachedResponse = JSON.parse(
        await fs.readFile(filePath, 'utf-8')
      );
      
      if (cached.request.fileHash === fileHash) {
        await fs.remove(filePath);
        
        // Remove from memory cache
        const key = this.getCacheKey(
          cached.request.type,
          cached.request.fileHash,
          cached.request.contextHash
        );
        this.memoryCache.delete(key);
      }
    }
  }
  
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (await fs.pathExists(this.cacheDir)) {
      await fs.remove(this.cacheDir);
    }
  }
  
  async stats(): Promise<CacheStats> {
    const files = await fs.readdir(this.cacheDir);
    const validEntries = [];
    const expiredEntries = [];
    
    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const cached: CachedResponse = JSON.parse(
        await fs.readFile(filePath, 'utf-8')
      );
      
      if (this.isValid(cached)) {
        validEntries.push(cached);
      } else {
        expiredEntries.push(cached);
      }
    }
    
    return {
      totalEntries: files.length,
      validEntries: validEntries.length,
      expiredEntries: expiredEntries.length,
      memorySize: this.memoryCache.size,
      byProvider: this.groupByProvider(validEntries)
    };
  }
  
  private getCacheKey(type: string, fileHash: string, contextHash: string): string {
    const combined = `${type}:${fileHash}:${contextHash}`;
    return createHash('sha256').update(combined).digest('hex');
  }
  
  private isValid(cached: CachedResponse): boolean {
    return Date.now() - cached.timestamp < this.ttl;
  }
  
  private groupByProvider(entries: CachedResponse[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const entry of entries) {
      groups[entry.provider] = (groups[entry.provider] || 0) + 1;
    }
    return groups;
  }
}

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  memorySize: number;
  byProvider: Record<string, number>;
}
```

---

## 8. Error Handling

### 8.1 AI Error Types

```typescript
class AIError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

type AIErrorCode = 
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT';

function handleAIError(error: any, fallbackToHeuristics: boolean = true): void {
  if (error instanceof AIError) {
    switch (error.code) {
      case 'INVALID_API_KEY':
        console.error(chalk.red('✗ Invalid API key'));
        console.error('Run: devibe config set-api-key');
        if (!fallbackToHeuristics) {
          process.exit(2);
        }
        break;
        
      case 'RATE_LIMIT_EXCEEDED':
        console.warn(chalk.yellow('⚠ AI rate limit exceeded'));
        console.warn('Falling back to heuristic analysis...');
        break;
        
      case 'NETWORK_ERROR':
        console.warn(chalk.yellow('⚠ Network error connecting to AI provider'));
        if (fallbackToHeuristics) {
          console.warn('Falling back to heuristic analysis...');
        } else {
          process.exit(3);
        }
        break;
        
      default:
        console.error(chalk.red(`✗ AI error: ${error.message}`));
        if (fallbackToHeuristics) {
          console.warn('Falling back to heuristic analysis...');
        }
    }
  } else {
    throw error;
  }
}
```

---

## 9. Testing

### 9.1 Test Coverage

- Provider implementations: 95%
- API key management: 100%
- Caching: 95%
- Error handling: 100%
- Recommendation system: 90%

### 9.2 Test Scenarios

```typescript
describe('AI Integration', () => {
  test('creates Anthropic provider with valid key', () => {
    const provider = AIProviderFactory.create({
      enabled: true,
      provider: 'anthropic',
      apiKey: 'sk-ant-test123'
    });
    
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });
  
  test('returns null when AI disabled', () => {
    const provider = AIProviderFactory.create({
      enabled: false,
      provider: 'anthropic'
    });
    
    expect(provider).toBeNull();
  });
  
  test('caches AI responses', async () => {
    const cache = new AIResponseCache();
    const response: AllocationResponse = {
      targetRepo: './api',
      suggestedSubdir: 'src',
      confidence: 0.9,
      reasoning: 'test'
    };
    
    await cache.set('allocation', 'hash1', 'context1', response, 'anthropic');
    const cached = await cache.get('allocation', 'hash1', 'context1');
    
    expect(cached?.response).toEqual(response);
  });
  
  test('shows recommendation on first run', async () => {
    const recommender = new AIRecommendationSystem({ enabled: false });
    const rec = await recommender.checkFirstRun();
    
    expect(rec).not.toBeNull();
    expect(rec?.severity).toBe('info');
  });
  
  test('shows critical warning for YOLO without AI', async () => {
    const recommender = new AIRecommendationSystem({ enabled: false });
    const rec = await recommender.checkYoloMode();
    
    expect(rec).not.toBeNull();
    expect(rec?.severity).toBe('critical');
  });
});
```

---

**Document Status:** Complete  
**Implementation Priority:** Phase 3 (Week 4)  
**Dependencies:** None (core infrastructure)

