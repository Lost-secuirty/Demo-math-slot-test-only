#!/bin/bash
# PostToolUse hook: append a compact event record per tool call to a local
# JSONL log — lightweight observability with no backend (the cheap stand-in for
# OpenTelemetry; see docs/AGENT-SCAFFOLDING.md). The log dir is gitignored.
# Note: per-call duration isn't in the PostToolUse payload, so we log ts/tool/ok.
set -euo pipefail

input=$(cat)
dir="${CLAUDE_PROJECT_DIR:-.}/.claude/logs"
mkdir -p "$dir"

tool=$(printf '%s' "$input" | jq -r '.tool_name // "?"' 2>/dev/null || echo '?')
ok=$(printf '%s' "$input" \
  | jq -r 'if (.tool_response.success == false) then "false" else "true" end' 2>/dev/null \
  || echo 'true')
ts=$(date -u +%FT%TZ)

printf '{"ts":"%s","tool":"%s","ok":%s}\n' "$ts" "$tool" "$ok" >>"$dir/events.jsonl"
exit 0
