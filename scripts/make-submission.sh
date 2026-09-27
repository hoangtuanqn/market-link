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
# db/seed-images is 61MB of stock photos nothing loads: db/README.md says "Not referenced by seed.sql yet",
# no row in seed.sql sets image_url, and no source file reads the folder. It is not test data the project
# uses, and it triples the archive. See docs/IMAGE-CREDITS.md.
#
# docs/submission holds working sheets, not results: blank matrices waiting to be filled in, an outline
# addressed to QA/DOC, notes about the marking scheme. What they turn into is the project report, which is
# written outside the repo and handed in beside this archive.
rm -rf \
  "$STAGE/docs/superpowers" \
  "$STAGE/docs/submission" \
  "$STAGE/docs/archive" \
  "$STAGE/docs/proposals" \
  "$STAGE/.ai" \
  "$STAGE/CLAUDE.md" \
  "$STAGE/AGENTS.md" \
  "$STAGE/frontend/CLAUDE.md" \
  "$STAGE/backend/CLAUDE.md" \
  "$STAGE/lefthook.yml" \
  "$STAGE/.github" \
  "$STAGE/.claude" \
  "$STAGE/.vscode" \
  "$STAGE/db/seed-images"

(cd "$OUT" && zip -qr "$NAME.zip" "$NAME")
rm -rf "$STAGE"

echo "Wrote $OUT/$NAME.zip ($(du -h "$OUT/$NAME.zip" | cut -f1))"
