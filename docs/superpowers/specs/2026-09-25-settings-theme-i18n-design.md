# Settings, dark theme and languages — design

Date: 25/09/2026 · Status: approved in chat (parts 2 + 3 of the profile work; part 1 is PR #100)

> Not in `.ai/REQUIREMENTS.md` (R-07). The team chose to drop two design-system rules
> ("No dark mode until every MUST requirement is done", "Write the UI in English"); README updated.
> API proposal: `docs/proposals/settings-api.md` (R-02).

## What each role gets

Customer `/settings`, Farmer `/farmer/settings`, Admin `/admin/settings` (built from the prototype pages):
Appearance (theme, language) · Money, dates and units · Notifications (saved, delivery not built yet) ·
the role's own block (Customer: market you shop at most, preferred pickup time; Farmer: selling defaults,
saved only; Admin: platform defaults, saved only).

## Settings

| Key | Values | Default | Effect |
|---|---|---|---|
| theme | light · dark · system | light | `data-theme` on `<html>`, set before first paint |
| language | en vi zh ja ko fr es de th id | en | i18next; missing keys fall back to English |
| currency | VND USD EUR JPY | VND | price stays in ₫, a reading-only conversion is added |
| units | metric · imperial | metric | kg/g/l/ml shown as lb/oz/pt/fl oz, count units unchanged |
| dateFormat | dmy · mdy · iso | dmy | `formatDate` |
| clock | h24 · h12 | h24 | `formatTime` |
| preferredMarket | market id or empty | empty | sorted first on Markets |
| preferredSlot, notifications, role blocks | saved | — | shown as "coming soon" where nothing uses them yet |

Stored per account (`user_settings`, `GET/PUT /api/v1/auth/me/settings`) and mirrored in localStorage,
so a guest keeps choices and the theme never flashes. After sign-in the server copy wins.

## Languages

`react-i18next`, resources bundled per language and namespace (`src/locales/<lng>/<ns>.json`), one
namespace per page folder plus `common`. English is the source; other languages are machine-assisted and
need a native check before release. Demo data (product, market, stall names) and server messages stay
as they are; the UI translates error codes it knows.

## Out of scope

Real notification delivery, applying Farmer/Admin defaults to stalls, translating server messages.
