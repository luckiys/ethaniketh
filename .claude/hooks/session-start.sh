#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install and build shared package (required by both frontend and backend)
echo "Installing shared dependencies..."
cd "$CLAUDE_PROJECT_DIR/shared"
npm install
npm run build

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$CLAUDE_PROJECT_DIR/frontend"
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$CLAUDE_PROJECT_DIR/backend"
npm install

echo "All dependencies installed successfully."
