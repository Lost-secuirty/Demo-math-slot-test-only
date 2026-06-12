#!/bin/bash
# PostToolUse hook: auto-format a file right after the agent edits it, so
# formatting is enforced mechanically (not by reminding the agent).
set -euo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "${file:-}" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
*.js | *.mjs | *.json | *.md | *.css | *.html)
  npx prettier --write "$file" >/dev/null 2>&1 || true
  ;;
esac
exit 0
