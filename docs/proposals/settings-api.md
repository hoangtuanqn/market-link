# Proposal: settings API

For LEAD to review and, if accepted, copy into `docs/api-contract.md` (R-02). Not in `.ai/REQUIREMENTS.md`
yet (R-07). Design: `docs/superpowers/specs/2026-09-25-settings-theme-i18n-design.md`.

## Endpoints

| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| GET | `/api/v1/auth/me/settings` | Signed in (all roles) | — | `SettingsResource` (defaults if never saved) |
| PUT | `/api/v1/auth/me/settings` | Signed in (all roles) | `SettingsResource` (the whole set) | `SettingsResource` |

```json
{
  "theme": "light | dark | system",
  "language": "en | vi | zh | ja | ko | fr | es | de | th | id",
  "currency": "VND | USD | EUR | JPY",
  "units": "metric | imperial",
  "dateFormat": "dmy | mdy | iso",
  "clock": "h24 | h12",
  "preferredMarket": "market id, or null",
  "extras": { "note.orderReady": "true", "sell.cutoff": "12" }
}
```

Defaults: `light`, `en`, `VND`, `metric`, `dmy`, `h24`, no market, no extras.

`extras` holds the notification switches and each role's own block (Customer preferred pickup time, Farmer
selling defaults, Admin platform defaults). Nothing reads them yet; they are saved so the choices survive.
Keys match `[a-zA-Z][a-zA-Z0-9.]{0,39}`, values are at most 60 characters, at most 30 entries.

## Errors

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | a value outside its list, or an `extras` key/value of the wrong shape (field `extras`) |
| 401 | `UNAUTHORIZED` | no or expired access token |

## Storage

Table `user_settings` (migration `V20260925003__create_user_settings_table.sql`), one row per user, created on the
first save, deleted with the user. The frontend mirrors the settings in `localStorage` (`ml-settings`) so a guest keeps
theme and language and the theme is applied before the first paint; after sign-in the server copy wins.
