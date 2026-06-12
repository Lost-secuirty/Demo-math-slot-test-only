#!/bin/bash
# PreToolUse hook: block edits to generated/derived files that must never be
# hand-edited. Exit 2 tells the harness to deny the tool call with the message.
set -euo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "${file:-}" ] && exit 0

case "$file" in
*/package-lock.json | package-lock.json)
  echo "Refusing to hand-edit package-lock.json — it's generated. Use npm." >&2
  exit 2
  ;;
*/dist/* | dist/* | */node_modules/* | node_modules/*)
  echo "Refusing to edit build output / dependencies (dist, node_modules)." >&2
  exit 2
  ;;
*/PERSONAL_JOURNAL* | PERSONAL_JOURNAL*)
  echo "Refusing to touch PERSONAL_JOURNAL* — sacred personal-tier file (Drive only)." >&2
  exit 2
  ;;
*/private/* | private/*)
  echo "Refusing to write under private/ — personal/Drive tier, not GitHub." >&2
  exit 2
  ;;
*.pem | *.key | *.p12 | *.keystore | .env | */.env | .env.* | */.env.*)
  echo "Refusing to write secret/credential files (.env, *.key, *.pem, ...)." >&2
  exit 2
  ;;
esac
exit 0
