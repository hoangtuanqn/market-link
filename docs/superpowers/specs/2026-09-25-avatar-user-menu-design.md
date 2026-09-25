# Profile photo and user menu — design

Date: 25/09/2026 · Status: approved in chat, part 1 of 3 (2 = working theme + saved settings, 3 = English ↔ Vietnamese)

> Not in `.ai/REQUIREMENTS.md` (R-07). Requested by the team; LEAD to confirm and add an FR id.
> The API below is a proposal for `docs/api-contract.md` (R-02): see `docs/proposals/avatar-api.md`.

## What the user gets

- The "Hi, name" link at the right of the storefront header becomes a menu button with the person's photo
  (or initials). It opens **Profile** (`/account`), **Settings** (`/settings`) and **Sign out**.
- On `/account` a photo card offers **Upload photo**, **Take photo** (camera in a dialog) and **Remove**.
  A chosen or captured picture opens a crop dialog: round frame, drag to move, zoom slider, arrow keys.
  The browser crops it to a 512×512 JPEG before it is sent.

## Backend

- No migration: `users.image` (VARCHAR 255) already holds the Google picture, and now also
  `/uploads/avatars/<uuid>.jpg`. `UserResource` gains `avatarUrl`.
- `FileStorageServiceInterface` + `LocalFileStorageService`: files under `app.storage.dir`
  (`STORAGE_DIR`, Docker volume `uploads-data` at `/app/uploads`). Reusable for product images (FR-062).
- `PUT /api/v1/auth/me/avatar` (multipart `file`) and `DELETE /api/v1/auth/me/avatar`, signed in only.
  Server checks: at most 2 MB, JPEG or PNG by magic bytes, readable by ImageIO, at most 4096 px a side.
  It re-encodes to a 512 px square JPEG, which drops EXIF (GPS) and anything hidden in the file.
  The previous uploaded file is deleted after commit; a Google URL is just replaced.
- `GET /uploads/avatars/{uuid}.jpg` is public, cached for a year (a new photo is a new name), `nosniff`.

## Frontend

- `Avatar` (photo or initials), `UserMenu` (menu button pattern: Esc, outside click, arrow keys),
  `AvatarCard` + `CameraDialog` + `CropDialog` on the Account page.
- The session user is updated from the response, so the header changes at once.

## Out of scope

Photo in the Farmer sidebar and the Admin header; theme and language (parts 2 and 3).
