## What changed

<!-- Requirement ID + 1–3 lines. Example: FR-030 — split the cart into one order per farmer -->
- FR-

## How to test

<!-- Steps for the reviewer to verify it; screenshots if there is UI -->

## Checklist (CONTRIBUTING.md §5)

- [ ] PR targets the right branch: `dev`, or `main` if it is a release/hotfix
- [ ] CI is green
- [ ] No secret files (`.env`, `.env.production`, `application-local.yml`)
- [ ] DB change → a **new** migration, no edits to old migrations
- [ ] API change → matches `docs/api-contract.md`
- [ ] New environment variable → updated `.env.example`, `.env.production.example`, `application-*.yaml`
- [ ] UI: all four states loading / empty / error / data, responsive 375 / 768 / 1440
- [ ] Code comments, commits, and this PR's title and description are in English (R-09, R-10)
