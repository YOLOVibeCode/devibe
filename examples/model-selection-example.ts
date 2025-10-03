/**
 * Example: How to use different AI models for file classification
 *
 * This example shows various ways to select and use different models
 * based on your needs (cost, speed, context size, quality).
 */

import {
  selectModel,
  compareModels,
  getModelConfig,
  estimateCost,
  isModelAvailable,
  AVAILABLE_MODELS,
} from '../src/ai-model-config.js';

// ============================================================================
// Example 1: Quick Model Selection
// ============================================================================

console.log('=== Example 1: Quick Model Selection ===\n');

// Get the cheapest model
const cheapest = selectModel('cheapest');
console.log(`Cheapest model: ${cheapest.name}`);
console.log(`  Input: $${cheapest.inputPricePerMillion}/M tokens`);
console.log(`  Context: ${cheapest.contextWindow.toLocaleString()} tokens`);
console.log(`  Batch size: ${cheapest.recommendedBatchSize} files\n`);

// Get the model with largest context
const largestContext = selectModel('largest-context');
console.log(`Largest context model: ${largestContext.name}`);
console.log(`  Context: ${largestContext.contextWindow.toLocaleString()} tokens`);
console.log(`  Can fit: ${largestContext.recommendedBatchSize} files per batch\n`);

// Get best quality
const bestQuality = selectModel('best-quality');
console.log(`Best quality model: ${bestQuality.name}`);
console.log(`  Quality: ${bestQuality.quality}`);
console.log(`  Cost: $${bestQuality.inputPricePerMillion}/M input\n`);

// ============================================================================
// Example 2: Cost Comparison for Your Workload
// ============================================================================

console.log('\n=== Example 2: Cost Comparison for 10,000 Files ===\n');

const comparison = compareModels(10000, 400, 100);
console.table(comparison);

// ============================================================================
// Example 3: Environment-Based Configuration
// ============================================================================

console.log('\n=== Example 3: Environment-Based Configuration ===\n');

// Set in your environment:
// export AI_MODEL_SELECTOR=cheapest
// or
// export AI_MODEL=gemini-1.5-flash

const selectedModel = getModelConfig();
console.log(`Selected model: ${selectedModel.name}`);
console.log(`  Provider: ${selectedModel.provider}`);
console.log(`  Context: ${selectedModel.contextWindow.toLocaleString()} tokens`);

// ============================================================================
// Example 4: Check Available Models (with API keys)
// ============================================================================

console.log('\n=== Example 4: Available Models ===\n');

Object.keys(AVAILABLE_MODELS).forEach(key => {
  const available = isModelAvailable(key);
  const model = AVAILABLE_MODELS[key];
  console.log(`${available ? '✓' : '✗'} ${model.name} (${model.provider})`);
});

// ============================================================================
// Example 5: Estimate Cost for Your Batch
// ============================================================================

console.log('\n=== Example 5: Cost Estimation ===\n');

const myFiles = 1000;
const avgInputTokens = 400;
const avgOutputTokens = 100;

const totalInput = myFiles * avgInputTokens;
const totalOutput = myFiles * avgOutputTokens;

console.log(`Estimating cost for ${myFiles} files:`);
console.log(`  Input: ${totalInput.toLocaleString()} tokens`);
console.log(`  Output: ${totalOutput.toLocaleString()} tokens\n`);

// Compare costs across models
const modelsToCompare = [
  'claude-3-5-sonnet',
  'claude-3-haiku',
  'gemini-1.5-flash',
  'gpt-4o-mini',
];

modelsToCompare.forEach(key => {
  const model = AVAILABLE_MODELS[key];
  const cost = estimateCost(model, totalInput, totalOutput);
  console.log(`${model.name}: $${cost.toFixed(4)}`);
});

// ============================================================================
// Example 6: Smart Model Selection Based on Task
// ============================================================================

console.log('\n=== Example 6: Smart Model Selection ===\n');

function selectModelForTask(taskType: 'simple' | 'complex' | 'bulk') {
  switch (taskType) {
    case 'simple':
      // Simple classification - use cheapest
      return selectModel('cheapest');

    case 'complex':
      // Complex reasoning - use best quality
      return selectModel('best-quality');

    case 'bulk':
      // Bulk processing - use largest context
      return selectModel('largest-context');
  }
}

const simpleTask = selectModelForTask('simple');
console.log(`Simple task: ${simpleTask.name} ($${simpleTask.inputPricePerMillion}/M)`);

const complexTask = selectModelForTask('complex');
console.log(`Complex task: ${complexTask.name} (${complexTask.quality} quality)`);

const bulkTask = selectModelForTask('bulk');
console.log(`Bulk task: ${bulkTask.name} (${bulkTask.recommendedBatchSize} files/batch)`);

// ============================================================================
// Example 7: Usage in Real Code
// ============================================================================

console.log('\n=== Example 7: Real-World Usage ===\n');

async function classifyFiles(files: string[], priority: 'cost' | 'speed' | 'quality') {
  // Select model based on priority
  let model;
  switch (priority) {
    case 'cost':
      model = selectModel('cheapest');
      break;
    case 'speed':
      model = selectModel('fastest');
      break;
    case 'quality':
      model = selectModel('best-quality');
      break;
  }

  console.log(`Using ${model.name} for ${files.length} files`);
  console.log(`  Priority: ${priority}`);
  console.log(`  Batch size: ${model.recommendedBatchSize}`);
  console.log(`  Estimated batches: ${Math.ceil(files.length / model.recommendedBatchSize)}`);

  const cost = estimateCost(model, files.length * 400, files.length * 100);
  console.log(`  Estimated cost: $${cost.toFixed(4)}`);

  // In real code, you would:
  // const classifier = new AIClassifier(model);
  // return await classifier.classifyBatch(files);
}

// Simulate different scenarios
console.log('\nScenario 1: Cost-sensitive (10,000 files)');
await classifyFiles(Array(10000).fill('file.ts'), 'cost');

console.log('\nScenario 2: Speed-sensitive (100 files)');
await classifyFiles(Array(100).fill('file.ts'), 'speed');

console.log('\nScenario 3: Quality-sensitive (50 critical files)');
await classifyFiles(Array(50).fill('important.ts'), 'quality');

// ============================================================================
// Example 8: Cost Savings Analysis
// ============================================================================

console.log('\n=== Example 8: Cost Savings ===\n');

const filesPerMonth = 50000;
const currentModel = AVAILABLE_MODELS['claude-3-5-sonnet'];
const cheapestModel = selectModel('cheapest');

const currentCost = estimateCost(currentModel, filesPerMonth * 400, filesPerMonth * 100);
const cheaperCost = estimateCost(cheapestModel, filesPerMonth * 400, filesPerMonth * 100);
const savings = currentCost - cheaperCost;
const savingsPercent = ((savings / currentCost) * 100).toFixed(1);

console.log(`Current model: ${currentModel.name}`);
console.log(`  Monthly cost: $${currentCost.toFixed(2)}`);
console.log(`\nCheapest model: ${cheapestModel.name}`);
console.log(`  Monthly cost: $${cheaperCost.toFixed(2)}`);
console.log(`\nSavings: $${savings.toFixed(2)}/month (${savingsPercent}%)`);
console.log(`Annual savings: $${(savings * 12).toFixed(2)}`);

// ============================================================================
// Example 9: Quick Reference
// ============================================================================

console.log('\n=== Quick Reference ===\n');
console.log('Environment variables:');
console.log('  export AI_MODEL_SELECTOR=cheapest           # Auto-select cheapest');
console.log('  export AI_MODEL_SELECTOR=largest-context    # Auto-select largest context');
console.log('  export AI_MODEL=gemini-1.5-flash            # Use specific model');
console.log('  export AI_MODEL=claude-3-haiku              # Use specific model');
console.log('\nProgrammatic:');
console.log('  selectModel("cheapest")      // Gemini 1.5 Flash ($0.075/M)');
console.log('  selectModel("fastest")       // Claude 3 Haiku (very-fast)');
console.log('  selectModel("largest-context") // Gemini 1.5 Pro (2M tokens)');
console.log('  selectModel("best-quality")  // Claude 3 Opus (best)');

// ============================================================================
// Pro Tips
// ============================================================================

console.log('\n=== 💡 Pro Tips ===\n');
console.log('1. Use Gemini 1.5 Flash for high-volume processing');
console.log('   → 600 files/batch, $0.012 per 1K files');
console.log('');
console.log('2. Use Claude 3 Haiku for development/testing');
console.log('   → Same Anthropic API, 12x cheaper than Sonnet');
console.log('');
console.log('3. Use Claude 3.5 Sonnet for production (balanced)');
console.log('   → Best mix of quality and reasonable cost');
console.log('');
console.log('4. Reserve Claude 3 Opus for critical decisions only');
console.log('   → 5x more expensive but highest quality');
console.log('');
console.log('5. Start with cheapest, upgrade only if quality suffers');
console.log('   → Most tasks work fine with Haiku or Gemini Flash');
