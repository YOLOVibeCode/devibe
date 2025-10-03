# AI Key Resolution Flow

## How DevIbe Determines Which AI Model to Use

### Priority Order

```
1. AI_MODEL environment variable (explicit user choice)
   ├─→ Check devibe-stored key for that provider
   └─→ Fallback to environment variable key

2. DevIbe-configured keys (primary source)
   ├─→ google (cheapest + largest context)
   ├─→ anthropic (good balance)
   └─→ openai (alternative)

3. Environment variable keys (fallback)
   ├─→ ANTHROPIC_API_KEY
   ├─→ OPENAI_API_KEY
   └─→ GOOGLE_API_KEY

4. None available → AI classification disabled
```

### Examples

#### Scenario 1: User Adds Google Key via DevIbe
```bash
$ devibe ai-key add google AIzaSyXXX...

# What happens:
✓ Key stored in ~/.devibe/ai-keys.enc
✓ Model selected: Gemini 1.5 Flash (cheapest for google)
✓ When running devibe plan:
   "Using AI: Gemini 1.5 Flash (configured)"
```

#### Scenario 2: User Already Has ANTHROPIC_API_KEY in Environment
```bash
$ export ANTHROPIC_API_KEY=sk-ant-api03-XXX...
$ devibe plan

# What happens:
✓ No devibe keys configured, falls back to env
✓ Model selected: Claude 3 Haiku (cheapest for anthropic)
✓ Output:
   "Using AI: Claude 3 Haiku (env)"
```

#### Scenario 3: User Wants Specific Model
```bash
$ devibe ai-key add anthropic sk-ant-api03-XXX...
$ export AI_MODEL=claude-3-opus
$ devibe plan

# What happens:
✓ AI_MODEL takes priority
✓ Uses devibe-stored anthropic key
✓ Model selected: Claude 3 Opus
✓ Output:
   "Using AI: Claude 3 Opus (configured)"
```

#### Scenario 4: User Has Multiple Keys
```bash
$ devibe ai-key add google AIzaSyXXX...
$ devibe ai-key add anthropic sk-ant-XXX...
$ export OPENAI_API_KEY=sk-XXX...

$ devibe plan

# What happens:
✓ Prefers devibe keys over environment
✓ Chooses google (cheapest devibe-configured)
✓ Model: Gemini 1.5 Flash
✓ Output:
   "Using AI: Gemini 1.5 Flash (configured)"
```

#### Scenario 5: Override Default with AI_MODEL
```bash
$ devibe ai-key add google AIzaSyXXX...
$ devibe ai-key add anthropic sk-ant-XXX...

# Use Google (default)
$ devibe plan
# → Uses Gemini 1.5 Flash

# Override to use Anthropic Claude Haiku
$ export AI_MODEL=claude-3-haiku
$ devibe plan
# → Uses Claude 3 Haiku
```

---

## Model Selection Logic

### For Each Provider

When a provider is selected, DevIbe chooses the best model:

**Google:**
- Default: `gemini-1.5-flash` (cheapest, 1M context)
- Alternative: `gemini-1.5-pro` (if AI_MODEL=gemini-1.5-pro)

**Anthropic:**
- Default: `claude-3-haiku` (12x cheaper than Sonnet)
- Alternative: `claude-3-5-sonnet` (if AI_MODEL=claude-3-5-sonnet)
- Alternative: `claude-3-opus` (if AI_MODEL=claude-3-opus)

**OpenAI:**
- Default: `gpt-4o-mini` (cheapest)
- Alternative: `gpt-4o` (if AI_MODEL=gpt-4o)

---

## User Visibility

### Always Show Which Model Is Being Used

```bash
$ devibe plan

Detecting repositories...
   ℹ️  Using AI: Gemini 1.5 Flash (configured)

Planning file organization...
```

### Verbose Mode (--verbose)

```bash
$ devibe plan --verbose

Detecting repositories...
   🔧 AI: Gemini 1.5 Flash
      Provider: google
      Source: DevIbe config
      Context: 1,000,000 tokens
      Cost: $0.075/M input

Planning file organization...
```

---

## Configuration Files

### ~/.devibe/ai-keys.enc (Primary)
```
Encrypted storage:
{
  "google": "AIzaSyXXX...",
  "anthropic": "sk-ant-XXX..."
}
```

### Environment Variables (Fallback)
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-XXX...
export OPENAI_API_KEY=sk-XXX...
export GOOGLE_API_KEY=AIzaSyXXX...

# Optional: Override model selection
export AI_MODEL=gemini-1.5-flash
# Or
export AI_MODEL=claude-3-haiku
# Or
export AI_MODEL=gpt-4o-mini
```

---

## Key Features

### 1. Smart Fallback
✅ Dev Ibe keys → Environment variables → None

### 2. Always Know What's Being Used
✅ Every command shows: "Using AI: [Model Name] ([Source])"

### 3. Cost-Conscious Defaults
✅ Always picks cheapest good-quality model per provider

### 4. User Override
✅ AI_MODEL env var lets users choose specific model

### 5. No Surprises
✅ Clear logging of which model/key is active

---

## Common Questions

**Q: I added a Google key, but it's using my ANTHROPIC_API_KEY?**
A: Check if AI_MODEL is set to a Claude model. Unset it or set AI_MODEL=gemini-1.5-flash

**Q: How do I know which model is being used?**
A: Every command prints: "Using AI: [Model] ([Source])"

**Q: Can I use my existing API keys without devibe ai-key?**
A: Yes! Just set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY in your environment

**Q: Which key takes priority?**
A: DevIbe-stored keys take priority over environment variables

**Q: How do I switch models?**
A: Set AI_MODEL environment variable:
```bash
export AI_MODEL=gemini-1.5-flash
export AI_MODEL=claude-3-haiku
export AI_MODEL=gpt-4o-mini
```

**Q: What if I have keys for multiple providers?**
A: DevIbe prefers: Google (cheapest) > Anthropic > OpenAI
   Override with AI_MODEL if you want a specific one

---

## Resolution Algorithm (Code)

```typescript
async resolve(): Promise<ResolvedProvider | null> {
  // 1. Check AI_MODEL env var
  if (process.env.AI_MODEL && modelExists(process.env.AI_MODEL)) {
    const model = AVAILABLE_MODELS[process.env.AI_MODEL];
    const key = await getDevibeKey(model.provider) || getEnvKey(model.provider);
    if (key) return { model, key, source: key.source };
  }

  // 2. Check devibe-stored keys
  const devibeProviders = await getDevibeProviders();
  for (const provider of ['google', 'anthropic', 'openai']) {
    if (devibeProviders.includes(provider)) {
      const key = await getDevibeKey(provider);
      const model = getBestModelFor(provider);
      return { model, key, source: 'devibe-config' };
    }
  }

  // 3. Check environment variables
  for (const provider of ['anthropic', 'openai', 'google']) {
    const key = getEnvKey(provider);
    if (key) {
      const model = getBestModelFor(provider);
      return { model, key, source: 'environment' };
    }
  }

  // 4. None available
  return null;
}
```

---

## Best Practices

1. **Add a key via devibe**: `devibe ai-key add google YOUR_KEY`
2. **Let DevIbe choose the best model** (it picks cheapest/best)
3. **Override only if needed**: `export AI_MODEL=specific-model`
4. **Check what's being used**: Look for "Using AI: ..." in output
5. **Keep environment keys as fallback** (they still work!)
