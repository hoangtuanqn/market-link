# Proposal: profile photo API

For LEAD to review and, if accepted, copy into `docs/api-contract.md` (R-02). Not in `.ai/REQUIREMENTS.md`
yet (R-07); needs an FR id. Design: `docs/superpowers/specs/2026-09-25-avatar-user-menu-design.md`.

## Endpoints

| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| PUT | `/api/v1/auth/me/avatar` | Signed in | multipart, part `file` (JPEG or PNG, ≤ 2 MB) | `UserResource` |
| DELETE | `/api/v1/auth/me/avatar` | Signed in | — | `UserResource` without `avatarUrl` |
| GET | `/uploads/avatars/{uuid}.jpg` | Public | — | `image/jpeg`, `Cache-Control: public, max-age=31536000, immutable` |

`UserResource` (returned by login, register, `GET/PUT /auth/me`) gains `avatarUrl`:

- a Google picture: full URL, as stored at first Google sign-in;
- an uploaded photo: `/uploads/avatars/<uuid>.jpg`, relative to the API origin;
- absent: no photo, the UI shows initials.

## Errors

| HTTP | code | field | When |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `file` | missing, empty, over 2 MB, not JPEG/PNG by content, unreadable, over 4096 px a side |
| 401 | `UNAUTHORIZED` | — | no or expired access token |
| 413 | `PAYLOAD_TOO_LARGE` | `file` | body over the 5 MB multipart ceiling |

## Rules

- The user is taken from the access token; there is no `:id`, so nobody can change another person's photo (R-06).
- The server never keeps the uploaded bytes: it decodes the image and stores a new square JPEG of at most
  512 px. EXIF (GPS included) and anything appended to the file are dropped.
- A new photo gets a new file name; the previous upload is deleted after the change commits.
- Files live under `app.storage.dir` (`STORAGE_DIR`), Docker volume `uploads-data` at `/app/uploads`,
  separate for dev and prod (H-7). The same storage is meant for product images (FR-062).
