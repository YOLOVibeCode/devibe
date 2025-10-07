/**
 * AI Cost Advisor
 *
 * Prompts users to analyze AI costs when using expensive models
 * and suggests cheaper alternatives for better value.
 */

import * as readline from 'readline';
import { getPreferencesManager } from './user-preferences.js';
import { getAIResolver } from './ai-provider-resolver.js';
import { selectModel, compareModels, type ModelConfig } from './ai-model-config.js';

export interface CostSavingsInfo {
  currentModel: ModelConfig;
  currentCost: number;
  cheapestModel: ModelConfig;
  cheapestCost: number;
  savingsPercent: number;
  shouldPrompt: boolean;
}

export class AICostAdvisor {
  private preferences = getPreferencesManager();

  /**
   * Analyze if current model is expensive and calculate potential savings
   */
  async analyzeCostSavings(estimatedFiles: number = 1000): Promise<CostSavingsInfo | null> {
    const resolver = getAIResolver();
    const resolved = await resolver.resolve();

    if (!resolved) {
      return null;
    }

    const currentModel = resolved.model;
    const cheapestModel = selectModel('cheapest');

    // Calculate costs for estimated file count
    const comparison = compareModels(estimatedFiles);
    const currentCost = comparison.find(c => c.model === currentModel.name)?.totalCost || 0;
    const cheapestCost = comparison.find(c => c.model === cheapestModel.name)?.totalCost || 0;

    const savingsPercent = currentCost > 0
      ? Math.round(((currentCost - cheapestCost) / currentCost) * 100)
      : 0;

    // Consider "expensive" if savings would be >80% (e.g., Claude vs Gemini)
    const shouldPrompt = savingsPercent >= 80;

    return {
      currentModel,
      currentCost,
      cheapestModel,
      cheapestCost,
      savingsPercent,
      shouldPrompt,
    };
  }

  /**
   * Prompt user about AI cost analysis (max 2 times)
   */
  async promptForCostAnalysis(): Promise<boolean> {
    const shouldPrompt = await this.preferences.shouldPromptForAIAnalysis();
    if (!shouldPrompt) {
      // User has declined twice, don't ask again
      return false;
    }

    const savings = await this.analyzeCostSavings();
    if (!savings || !savings.shouldPrompt) {
      // Not using an expensive model, no need to prompt
      return false;
    }

    const declineCount = await this.preferences.get('aiAnalysisDeclineCount') || 0;

    console.log('\n💡 Cost Optimization Opportunity');
    console.log('━'.repeat(60));
    console.log(`\nYou're currently using: ${savings.currentModel.name}`);
    console.log(`Estimated cost for 1,000 files: $${savings.currentCost.toFixed(4)}`);
    console.log(`\nWe can help you switch to: ${savings.cheapestModel.name}`);
    console.log(`Estimated cost for 1,000 files: $${savings.cheapestCost.toFixed(4)}`);
    console.log(`\n💰 Potential savings: ${savings.savingsPercent}% ($${(savings.currentCost - savings.cheapestCost).toFixed(4)} per 1,000 files)`);
    console.log('\nWould you like to run an AI model analysis to find the best option?');

    if (declineCount === 1) {
      console.log('\n⚠️  This is your last chance! Saying no will save this preference.');
      console.log('   You could save substantial money by optimizing your AI model choice.');
    }

    const answer = await this.askYesNo('\nRun AI analysis now? (y/n): ');

    if (answer) {
      // User accepted, mark as prompted
      await this.preferences.markAIAnalysisAccepted();
      return true;
    } else {
      // User declined, increment count
      await this.preferences.incrementAIAnalysisDecline();

      if (declineCount === 0) {
        // First decline - explain the benefits
        console.log('\n📊 Just so you know:');
        console.log(`   • Current model: ${savings.currentModel.name} costs ~$${savings.currentCost.toFixed(4)}/1K files`);
        console.log(`   • Optimized model: ${savings.cheapestModel.name} costs ~$${savings.cheapestCost.toFixed(4)}/1K files`);
        console.log(`   • For a 10,000 file project, that's $${((savings.currentCost - savings.cheapestCost) * 10).toFixed(2)} in savings!`);
        console.log('\n   Run `devibe ai-analyze` anytime to see the full comparison.');
        console.log('   We\'ll ask you one more time the next time you use AI.\n');
      } else {
        // Second decline - save preference, don't ask again
        console.log('\n   No problem! We won\'t ask again.');
        console.log('   You can always run `devibe ai-analyze` to optimize your costs.\n');
      }

      return false;
    }
  }

  /**
   * Ask a yes/no question and return boolean
   */
  private askYesNo(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        const normalized = answer.toLowerCase().trim();
        resolve(normalized === 'y' || normalized === 'yes');
      });
    });
  }

  /**
   * Show AI analysis (called when user accepts the prompt)
   */
  async showAnalysis(): Promise<void> {
    const { compareModels } = await import('./ai-model-config.js');

    console.log('\n📊 AI Model Cost Analysis\n');
    console.log('Comparing costs for 1,000 files:\n');

    const comparison = compareModels(1000);

    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Model                   │ Batches │ Cost      │ Cost/File │ Context    │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    comparison.forEach((c, idx) => {
      const isRecommended = idx === 0; // Cheapest is first
      const marker = isRecommended ? '⭐' : '  ';
      const model = c.model.padEnd(21);
      const batches = String(c.batchCount).padStart(7);
      const cost = `$${c.totalCost.toFixed(4)}`.padStart(8);
      const costPerFile = `$${c.costPerFile.toFixed(6)}`.padStart(9);
      const context = c.apiCalls === 1 ? 'Single batch!' : `${c.apiCalls} calls`;

      console.log(`│ ${marker} ${model} │ ${batches} │ ${cost} │ ${costPerFile} │ ${context.padEnd(10)} │`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    const cheapest = comparison[0];
    console.log(`\n⭐ Recommended: ${cheapest.model}`);
    console.log(`   • Lowest cost: $${cheapest.totalCost.toFixed(4)} for 1,000 files`);
    console.log(`   • ${cheapest.batchCount} batches (efficient!)`);
    console.log('\nTo switch to this model:');
    console.log(`   devibe ai-key add <provider> <your-api-key>`);
    console.log('\nFor more details, run: devibe ai-models\n');
  }
}

/**
 * Show AI startup banner with model info, cost estimate, and removal instructions
 */
export async function showAIStartupBanner(estimatedFiles: number = 100): Promise<void> {
  const resolver = getAIResolver();
  const resolved = await resolver.resolve();

  if (!resolved) {
    return; // No AI configured, nothing to show
  }

  const model = resolved.model;
  const keyManager = await import('./ai-key-manager.js').then(m => m.getKeyManager());
  
  console.log('\n🤖 AI Classification Active');
  console.log('━'.repeat(70));
  console.log(`   Model:    ${model.name}`);
  console.log(`   Provider: ${resolved.provider}`);
  console.log(`   Context:  ${model.contextWindow.toLocaleString()} tokens`);
  
  // Estimate cost for this operation
  const comparison = compareModels(estimatedFiles);
  const cost = comparison.find(c => c.model === model.name);
  
  if (cost) {
    console.log(`   Cost:     $${cost.totalCost.toFixed(4)} for ~${estimatedFiles} files ($${cost.costPerFile.toFixed(6)}/file)`);
    console.log(`   Batches:  ${cost.batchCount} batch${cost.batchCount > 1 ? 'es' : ''} (${cost.apiCalls} API call${cost.apiCalls > 1 ? 's' : ''})`);
  }
  
  // Show removal instructions
  console.log(`\n   💡 To remove this key: devibe ai-key remove ${resolved.provider}`);
  console.log(`   📊 Compare costs:       devibe ai`);
  console.log('━'.repeat(70));
  console.log('');
}

/**
 * Check if we should prompt for AI analysis before using AI
 * Call this before AI operations that might be expensive
 */
export async function checkAndPromptForCostOptimization(): Promise<void> {
  const advisor = new AICostAdvisor();
  const preferences = getPreferencesManager();

  // Check if we've already prompted and user accepted
  const alreadyPrompted = await preferences.hasBeenPromptedForAIAnalysis();
  if (alreadyPrompted) {
    return; // Don't prompt again
  }

  // Check if we should prompt
  const shouldPrompt = await advisor.promptForCostAnalysis();

  if (shouldPrompt) {
    // User accepted, show the analysis
    await advisor.showAnalysis();
  }
}
