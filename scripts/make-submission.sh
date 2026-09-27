#!/usr/bin/env bash
# Builds the archive handed to the judges (SRS §1.9). Exports a clean tree from HEAD, so nothing
# untracked and no build output can slip in, then drops the team's internal working files.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=dist
NAME=MarketLink-TechWiz7
STAGE="$OUT/$NAME"

rm -rf "$STAGE" "$OUT/$NAME.zip"
mkdir -p "$STAGE"

# From HEAD, not from the working tree: no node_modules, no .env, no half-finished edit.
git archive HEAD | tar -x -C "$STAGE"

# Internal working files. The AI acknowledgement stays in README.md — the SRS requires it (page 13);
# what goes is the day-to-day material that says nothing to a judge.
rm -rf \
  "$STAGE/docs/superpowers" \
  "$STAGE/docs/archive" \
  "$STAGE/docs/proposals" \
  "$STAGE/.ai" \
  "$STAGE/CLAUDE.md" \
  "$STAGE/AGENTS.md" \
  "$STAGE/frontend/CLAUDE.md" \
  "$STAGE/backend/CLAUDE.md" \
  "$STAGE/lefthook.yml" \
  "$STAGE/.github"

(cd "$OUT" && zip -qr "$NAME.zip" "$NAME")
rm -rf "$STAGE"

echo "Wrote $OUT/$NAME.zip ($(du -h "$OUT/$NAME.zip" | cut -f1))"
