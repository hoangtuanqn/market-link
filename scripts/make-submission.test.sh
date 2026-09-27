#!/usr/bin/env bash
# Checks that the submission archive holds what the SRS asks for (§1.9) and none of the team's
# internal working files.
set -euo pipefail

cd "$(dirname "$0")/.."

ZIP=dist/MarketLink-TechWiz7.zip
if [ ! -f "$ZIP" ]; then
  echo "No $ZIP to check. Build it first: ./scripts/make-submission.sh (or make submission)." >&2
  exit 1
fi

fail=0

# Listed once into a variable on purpose: `unzip -l | grep -q` makes grep close the pipe on its first
# match, unzip dies of SIGPIPE, and under `pipefail` every check reports failure — including the
# refuse() ones, which would then pass for the wrong reason and never catch a leak.
LISTING=$(unzip -l "$ZIP")

require() {
  if grep -q -- "$1" <<<"$LISTING"; then
    echo "ok       $1"
  else
    echo "MISSING  $1"
    fail=1
  fi
}

refuse() {
  if grep -q -- "$1" <<<"$LISTING"; then
    echo "LEAKED   $1"
    fail=1
  else
    echo "ok       no $1"
  fi
}

# SRS §1.9 — what the submission must carry
require 'db/schema.sql'
require 'db/seed.sql'
require 'docs/DEMO_CREDENTIALS.md'
require 'docs/ASSUMPTIONS.md'
require 'docs/setup.md'
require 'README.md'
require 'backend/src/main/java'
require 'frontend/src'

# Internal working files that must not travel with it
refuse 'docs/superpowers/'
refuse 'CLAUDE.md'
refuse 'AGENTS.md'
refuse '.ai/'
refuse 'node_modules/'
refuse '.git/'

exit $fail
