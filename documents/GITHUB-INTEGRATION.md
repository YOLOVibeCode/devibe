# GitHub Integration Guide

UnVibe integrates with GitHub to ensure your `main` branch stays clean with automated checks.

## Features

✅ **Pre-push hooks** - Blocks pushes with critical secrets or failing tests
✅ **GitHub Actions** - Automated CI/CD checks on PRs
✅ **PR comments** - Automatic UnVibe reports on pull requests
✅ **CLI commands** - Test locally before pushing

## Quick Setup

```bash
# 1. Install UnVibe hooks
devibe setup-hooks

# 2. Test before pushing
devibe check-pr
```

That's it! Now every push to `main` will be validated.

## What Gets Checked

### 1. Secret Scanning ��
- Scans for 31 types of secrets
- **BLOCKS** pushes with critical secrets (AWS keys, API keys, etc.)
- Prevents accidental credential leaks

### 2. Build Validation 🏗️
- Runs `npm run build`
- **BLOCKS** if build fails
- Ensures code compiles

### 3. Test Execution 🧪
- Runs `npm test`
- **BLOCKS** if tests fail
- Maintains code quality

### 4. Folder Structure 📁
- Checks folder compliance
- **WARNS** but doesn't block
- Encourages organization

## Pre-Push Hook

Automatically installed when you run:
```bash
devibe setup-hooks
```

The hook runs before every `git push` to `main` or `master`:

```bash
git push origin main

🔍 UnVibe Pre-Push Check

⚠️  Pushing to main - running UnVibe checks...

1. Scanning for secrets...
✓ No critical secrets found

2. Validating builds...
✓ Build successful

3. Running tests...
✓ All tests passed

4. Checking folder structure...
✓ Folder structure compliant

✅ All checks passed! Proceeding with push...
```

### Example: Blocked Push

```bash
git push origin main

❌ PUSH REJECTED: Found 2 critical secrets!

🔴 /src/config.ts:12
   Type: AWS Access Key ID
   Fix: Use AWS credentials file or IAM roles instead

Fix secrets and try again:
  1. Review: devibe scan
  2. Remove secrets from code
  3. Use environment variables instead
```

## GitHub Actions Workflow

The workflow runs automatically on:
- Pushes to `main`/`master`
- Pull requests to `main`/`master`

Location: `.github/workflows/unvibe-check.yml`

### What It Does

1. ✅ Checks out code
2. ✅ Installs dependencies
3. ✅ Runs build
4. ✅ Runs tests
5. ✅ Scans for secrets
6. ✅ Validates folder structure
7. ✅ Comments on PR with results

### PR Comment Example

```markdown
## 🧹 UnVibe Check Results

### Secret Scan
✓ No critical secrets found

### Build
✓ Build successful

### Tests
✓ All tests passed (86 tests)

### Status
✅ All UnVibe checks passed!
```

## CLI Commands

### `devibe setup-hooks`
Install git hooks for automated checking.

```bash
devibe setup-hooks

🔧 Setting up Git hooks...
✓ Installed pre-push hook
✓ Configured git to use .githooks directory
✅ Git hooks installed successfully!
```

### `devibe check-pr`
Manually run all checks (simulates GitHub Actions).

```bash
devibe check-pr

🔍 Pre-Push Check (simulating GitHub CI)...

1️⃣  Scanning for secrets...
   ✓ No critical secrets found

2️⃣  Checking build...
   ✓ Build successful

3️⃣  Running tests...
   ✓ All tests passed

4️⃣  Checking folder structure...
   ✓ Folder structure compliant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All checks passed! Safe to push to main
```

## Bypassing Hooks (Not Recommended)

If you absolutely need to bypass checks:

```bash
# Skip pre-push hook
git push --no-verify

# Disable hooks entirely
git config core.hooksPath ""
```

⚠️ **Warning:** This defeats the purpose of automated safety checks!

## Configuration

### Customize Checks

Edit `.unvibe.config.js`:

```javascript
module.exports = {
  secretScan: {
    excludePatterns: ['node_modules/**', '.git/**'],
  },
  // Add custom patterns
  customPatterns: [
    {
      id: 'company-api-key',
      name: 'Company API Key',
      pattern: 'COMPANY_[A-Z0-9]{32}',
      severity: 'critical'
    }
  ]
};
```

### Disable Specific Checks

Modify `.githooks/pre-push` to comment out checks you don't need.

## CI/CD Integration

### For GitHub Actions

Already included! Just merge the `.github/workflows/unvibe-check.yml` file.

### For Other CI Systems

Use the CLI command:

```yaml
# .gitlab-ci.yml
unvibe-check:
  script:
    - npm install -g devibe
    - devibe check-pr
```

```yaml
# circle.yml
jobs:
  unvibe:
    steps:
      - run: npm install -g devibe
      - run: devibe check-pr
```

## Workflow Example

### Daily Development

```bash
# 1. Make changes
vim src/new-feature.ts

# 2. Test locally
devibe check-pr

# 3. Commit
git add .
git commit -m "feat: new feature"

# 4. Push (hooks run automatically)
git push origin feature-branch

# 5. Create PR (GitHub Actions run)
gh pr create --title "New Feature"
```

### Fixing Blocked Push

```bash
# Push blocked by secrets
git push origin main
❌ PUSH REJECTED: Found 1 critical secret!

# Fix: Remove secret
vim src/config.ts  # Remove hardcoded API key

# Add to environment instead
echo "API_KEY=xxx" >> .env

# Verify fix
devibe scan
✓ No secrets detected

# Push again
git push origin main
✅ All checks passed!
```

## Troubleshooting

### Hooks Not Running

```bash
# Reinstall hooks
devibe setup-hooks

# Verify installation
ls -la .git/hooks/pre-push
```

### False Positives in Secret Scan

```bash
# Add to .unvibe.config.js
excludePatterns: [
  'tests/**/*.test.ts',  # Exclude test files
  'docs/**/*'            # Exclude docs
]
```

### Build Fails in Hook but Not Locally

```bash
# Ensure clean build
npm run build

# Check git status
git status

# Make sure all files are committed
git add dist/
```

## Best Practices

✅ **Run `devibe check-pr` before creating PRs**
✅ **Never use `--no-verify` on main branch**
✅ **Keep `.unvibe.config.js` in version control**
✅ **Review secret scan results carefully**
✅ **Fix warnings even if they don't block**

## Summary

UnVibe + GitHub = Clean, safe repository! 🎉

- **Pre-push hooks** catch problems before they reach GitHub
- **GitHub Actions** provide second line of defense
- **PR comments** keep team informed
- **CLI commands** test anytime

Your `main` branch will stay clean and secret-free! 🔒

---

Made with [Claude Code](https://claude.com/claude-code)
