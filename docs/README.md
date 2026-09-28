# Documentation

Every document in the repository, grouped by what you want to do. Language: **EN** English, **VI** Vietnamese.

## Run the project

| Document | Lang | What it covers |
|---|---|---|
| [`setup.md`](setup.md) | EN | Prerequisites, running everything in Docker or on your machine, Web Push, manual chat check, troubleshooting |
| [`DEMO_CREDENTIALS.md`](DEMO_CREDENTIALS.md) | VI | Demo account for every role, the 10 seeded stalls, what the seed data contains |

## Requirements

| Document | Lang | What it covers |
|---|---|---|
| [`requirements/MarketLink-SRS.pdf`](requirements/MarketLink-SRS.pdf) | EN | The original brief (SRS) for the End-to-End Web Solutions category |
| [`requirements/SRS-vi.md`](requirements/SRS-vi.md) | VI | Vietnamese translation of the SRS |
| [`../.ai/REQUIREMENTS.md`](../.ai/REQUIREMENTS.md) | VI | **Source of truth for scope**: every requirement as `FR-xxx`, with priority (MUST / SHOULD / NICE) and owner |
| [`requirements/SRS-COVERAGE.md`](requirements/SRS-COVERAGE.md) | VI | Each SRS item → FR → screen URL, with backend and UI status, and the demo video script |
| [`ASSUMPTIONS.md`](ASSUMPTIONS.md) | VI | Assumptions made where the SRS is silent, for the submission's ReadMe |
| [`requirements/MarketLink-Feature-Catalog-by-Module-and-Role.md`](requirements/MarketLink-Feature-Catalog-by-Module-and-Role.md) | VI | Feature list by module and role |

## Design and contract

| Document | Lang | What it covers |
|---|---|---|
| [`decisions.md`](decisions.md) | VI | Product decisions D-01…D-14: one order per farmer, stock reservation, order lifecycle, cutoff, pickup slots, email verification at sign-up… |
| [`api-contract.md`](api-contract.md) | VI | Every REST and realtime endpoint: path, request, response, error codes |
| [`../db/`](../db/README.md) | EN | Target schema, dump of the live tables, demo seed data |
| [`MarketLink-Farmer-Profile-and-Approval.md`](MarketLink-Farmer-Profile-and-Approval.md) | VI | Backend design: farmer profile, application and approval |
| [`MarketLink-Product-and-Category.md`](MarketLink-Product-and-Category.md) | VI | Backend design: products, categories, images, moderation |
| [`market-removal-gaps.md`](market-removal-gaps.md) | VI | Kiểm tra 29/09/2026: xoá Market (FR-073) còn thiếu gì — lỗ cho đặt đơn ở chợ đã xoá, sạp không được báo, giỏ hàng chết lặng; việc tồn đọng, chưa sửa |
| [`chatbot-design.md`](chatbot-design.md) | VI | Shopping assistant (FR-090…092): Claude with read-only tools for signed-in users, keyword engine as fallback — never LLM-written SQL |
| [`proposals/`](proposals) | EN | API proposals waiting for the contract: profile photo, user settings |

## UI

| Document | Lang | What it covers |
|---|---|---|
| [`design-system/`](design-system/README.md) | EN | "Hang tag" design system: tokens, `ml-*` components, UI copy rules, live gallery |
| [`prototype/`](prototype/README.md) | EN | Clickable HTML prototype of every screen for the three roles |
| [`i18n.md`](i18n.md) | EN | How the 10 UI languages are organised and how to add or translate a key |

## Team and tooling

| Document | Lang | What it covers |
|---|---|---|
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | VI | Hard rules H-1…H-10, `dev` / `main` branches, commits, pull requests, releases |
| [`../CLAUDE.md`](../CLAUDE.md), [`../AGENTS.md`](../AGENTS.md) | VI | Rules every AI assistant follows in this repository (R-01…R-10) |
| [`ai-tooling.md`](ai-tooling.md) | VI | Shared Claude Code plugins and how to install them |
| [`superpowers/`](superpowers) | EN/VI | AI-assisted design specs and implementation plans, dated, one per feature |
| [`archive/`](archive) | VI | Early roadmap and handoff notes, kept for history; the code has moved past them |
