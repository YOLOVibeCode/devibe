#!/bin/bash
# Setup Git Hooks for UnVibe

echo "🔧 Setting up UnVibe Git hooks..."

# Get the repository root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Path to hooks
HOOKS_DIR="$REPO_ROOT/.githooks"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

# Check if .githooks exists
if [ ! -d "$HOOKS_DIR" ]; then
    echo "❌ Error: .githooks directory not found"
    exit 1
fi

# Create .git/hooks if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Install pre-push hook
if [ -f "$HOOKS_DIR/pre-push" ]; then
    cp "$HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
    chmod +x "$GIT_HOOKS_DIR/pre-push"
    echo "✓ Installed pre-push hook"
else
    echo "⚠️  Warning: pre-push hook not found in .githooks"
fi

# Configure git to use .githooks directory (Git 2.9+)
git config core.hooksPath .githooks
echo "✓ Configured git to use .githooks directory"

echo ""
echo "✅ Git hooks installed successfully!"
echo ""
echo "The following checks will run before pushing to main/master:"
echo "  1. Secret scanning (blocks critical secrets)"
echo "  2. Build validation"
echo "  3. Test execution"
echo "  4. Folder structure check"
echo ""
echo "To bypass hooks (not recommended):"
echo "  git push --no-verify"
