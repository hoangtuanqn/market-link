# Chat Photos in More Formats and Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers and farmers can send photos (JPEG, PNG, WebP, GIF, AVIF, HEIC→JPEG) and videos (MP4/M4V, MOV,
WebM) up to 50 MB in chat, and videos play at once through a short-lived signed stream URL.

**Architecture:** A new `MediaProbe` (replacing the image-only `ImageProbe` entry point) sniffs the upload from a temp
file and returns what it is; photos keep the decode/re-encode path (now with subsampled decode for big JPEG/PNG), GIF/
AVIF/WebP and videos are stored as uploaded after a structural check. `MessageKind.VIDEO` joins `IMAGE`. A
`StreamLinkSigner` issues HMAC links that `AttachmentDownloadController` serves with HTTP Range, re-checking the
viewer's rights on each request. The frontend adds media validation/HEIC conversion, upload progress/cancel and a
`ChatVideo` bubble.

**Tech Stack:** Spring Boot 4.1 / Java 25, ImageIO (JDK only), Spring MVC Resource range support, JUnit 5 + Mockito ·
React 19, TypeScript, axios, `heic2any` (new, dynamically imported), vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-28-chat-media-design.md`

**Execution mode:** Native (LEAD approved the design and asked to go straight through). Code bodies for the
routine parts are written during execution; this plan fixes file layout, names, signatures, rules and the tests that
pin them. Each task: failing test → implementation → green → commit.

## Global Constraints

- Branch `feature/FR-115-chat-media` in worktree `techwiz7/market-link-media`; never commit to `dev`/`main`.
- English code comments (R-09); English commits `feat(FR-115): …` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (R-10).
- 50 MB = 52 428 800 bytes for both photos and videos; `spring.servlet.multipart.max-file-size: 50MB`.
- `MAX_SIDE = 4096` for stored-as-is images; JPEG/PNG over 4096 are downscaled; JPEG/PNG header side > 30 000 → 400.
- Signed link: HMAC-SHA256 over `id|u|s|e`, key = SHA-256("chat-stream|" + jwt.secret bytes), base64url, TTL 300 s.
- Rate limit: existing `Action.IMAGE` counts photos and videos (10/h); env names unchanged.
- UI copy in `common.json` `chat.*` / `AdminModeration.json` for 10 languages; tokens only; spacing tokens.
- Host has no JDK 25 / full node_modules: backend checks in `market-link-backend:dev`, frontend checks in a frontend
  image that has `heic2any` installed (see Task 7).

## Review Focus

1. **A file renamed to look like another type** (a PHP/HTML file named `.jpg`, a `.mp4` that is really a zip) → 415,
   never stored. Pinned in Task 1 (`refusesBytesThatOnlyClaimToBeMedia`).
2. **Stored-as-is files with a tail** (GIF/AVIF/MP4 with bytes appended, or cut short) → 415. Pinned in Task 1.
3. **A 48 MP JPEG (8064×6048)** is accepted and stored at most 4096 px on the long side without decoding at full size.
   Pinned in Task 2 (`downscalesALargePhotoWithoutRefusingIt`).
4. **A stream link reused by someone else or after expiry, or with `u` edited** → 403; a link to a message hidden
   after issue → 404. Pinned in Task 5.
5. **Upload over a slow line** does not time out at 10 s and can be cancelled; HEIC from an iPhone arrives as JPEG.
   Pinned in Task 8/9.

---

### Task 1: `MediaProbe` — sniff and structurally check every accepted format

**Files:**
- Create: `backend/src/main/java/com/techx/intervue/modules/conversation/services/impl/MediaProbe.java`
- Modify: `…/conversation/services/impl/ImageProbe.java` (expose `probe`/`normalize` pieces MediaProbe reuses; keep
  the WebP header checks here)
- Test: `backend/src/test/java/com/techx/intervue/modules/conversation/services/impl/MediaProbeTest.java`

**Interfaces:**
- Produces: `public final class MediaProbe` with
  `public enum Handling { REENCODE, STORE_AS_IS }`,
  `public record Probed(String mime, boolean video, Integer width, Integer height, Handling handling)`,
  `public static Probed probe(Path file) throws UnsupportedImageTypeException/InvalidFieldException`,
  constants `GIF="image/gif"`, `AVIF="image/avif"`, `MP4="video/mp4"`, `MOV="video/quicktime"`, `WEBM="video/webm"`,
  `static String extension(String mime)`.
- Rules (spec §2): read the first 64 KB for sniffing; ISO BMFF files are walked box by box with `RandomAccessFile`
  (size 1 → 64-bit largesize, size 0 → to end, size < 8 → invalid) and must end exactly at the file length; GIF must end
  with `0x3B`; brands decide AVIF / HEIC (415 with message "Convert HEIC photos to JPEG before sending.") / MOV / MP4;
  WebM needs EBML magic + `webm` DocType in the header; stored-as-is images with a side > 4096 → 400 (field `file`).

- [ ] **Step 1: Failing tests** — fixtures built in the test: `png(w,h)`, `jpeg(w,h)` (ImageIO), `gif(w,h)` (ImageIO
  GIF writer), `box(type, payload)` helper for ISO BMFF, `avif(w,h)` (`ftyp avif` + `meta` containing an `ispe`
  box), `mp4()` (`ftyp isom` + `mdat`), `mov()` (`ftyp qt  ` + `mdat`), `legacyMov()` (`wide` + `mdat`), `heic()`
  (`ftyp heic`), `webm()` (EBML header with DocType `webm`), `mkv()` (DocType `matroska`). Tests:
  `recognisesEveryAcceptedFormat` (parameterized: mime, video flag, handling, width/height where known),
  `refusesHeicWithAHintToConvert`, `refusesBytesThatOnlyClaimToBeMedia` (HTML text, zip `PK\3\4`, empty file),
  `refusesAStoredAsIsFileWithATail` (gif + bytes, mp4 + bytes), `refusesATruncatedIsoFile`, `refusesMatroska`,
  `refusesAStoredAsIsImageOverTheSideLimit` (gif 5000×10), `extensionFollowsTheMime`.
- [ ] **Step 2:** run → compile failure. **Step 3:** implement. **Step 4:** green. **Step 5:** commit
  `feat(FR-115): recognise photos and videos from their bytes`.

### Task 2: Big JPEG/PNG are scaled down instead of refused

**Files:**
- Modify: `…/conversation/services/impl/ImageProbe.java` (`decode` → subsampled decode via `ImageReader` +
  `ImageReadParam.setSourceSubsampling(f, f, 0, 0)` with `f = ceil(maxSide / 4096)`, then a final scale to fit 4096;
  header side > 30 000 → 400)
- Test: `ImageProbeTest.java`

- [ ] **Step 1: Failing tests** — `downscalesALargePhotoWithoutRefusingIt` (JPEG 5000×2500 → normalized JPEG with
  width 4096, height 2048), `refusesAnAbsurdHeader` (PNG header claiming 40000×10 via `pngHeaderOnly`), existing
  "over 4096 is refused" test for JPEG/PNG is replaced by the downscale one.
- [ ] **Steps 2–5** as usual; commit `feat(FR-115): scale big photos down instead of refusing them`.

### Task 3: Upload stores photos and videos up to 50 MB through a temp file

**Files:**
- Modify: `backend/src/main/java/com/techx/intervue/services/interfaces/FileStorageServiceInterface.java` (+
  `void storeFile(String folder, String fileName, Path source)`), `services/impl/LocalFileStorageService.java`
  (copy to temp in the target dir, atomic move; same name validation)
- Modify: `…/conversation/services/impl/AttachmentService.java` (transfer upload to a temp file, `MediaProbe.probe`,
  rate token after the checks, REENCODE → bytes → `ImageProbe.normalize` → `store`; STORE_AS_IS → `storeFile`;
  key = UUID + `MediaProbe.extension(mime)`; temp deleted in `finally`)
- Modify: `…/conversation/resources/AttachmentResource.java` (+ `String mime`), exceptions' messages
  (`UnsupportedImageTypeException` → "Send a JPEG, PNG, WebP, GIF or AVIF photo, or an MP4, MOV or WebM video.",
  `AttachmentTooLargeException` → "The file must be N MB or smaller."), `Bucket4jChatRateLimiter` IMAGE reason text
- Modify: `backend/src/main/resources/application.yaml` (`max-file-size: 50MB`, `max-upload-bytes` default
  52428800, `stream-url-ttl-seconds: 300`), `controllers/UploadExceptionHandler.java` (message from the configured
  `DataSize`)
- Test: `AttachmentServiceTest.java`, `LocalFileStorageServiceTest.java` (or the existing storage test),
  `UploadExceptionHandlerTest.java` (new)

- [ ] **Step 1: Failing tests** — `storesAVideoAsUploaded` (MockMultipartFile mp4 → `storeFile` called, mime
  `video/mp4`, width/height null), `storesAGifAsUploaded`, `acceptsAFileOfExactlyTheLimit` / `refusesOneByteMore`
  (limit set small in the test), `heicIsRefusedBeforeARateTokenIsSpent`, `aPhotoStillComesBackAsJpeg`,
  `theTempFileIsDeletedEvenWhenTheFileIsRefused`, storage `storeFileMovesTheCopyIntoPlace` +
  `storeFileRefusesATraversalName`, `uploadTooLargeSaysTheConfiguredSize`.
- [ ] **Steps 2–5**; commit `feat(FR-115): accept photos and videos up to 50 MB`.

### Task 4: Video messages

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260928004__add_video_message_kind.sql`
  (`ALTER TABLE messages MODIFY kind ENUM('text','image','video','offer','system') NOT NULL DEFAULT 'text';`)
- Modify: `…/conversation/enums/MessageKind.java` (+ `VIDEO`), `MessageService.java` (accept VIDEO; mime family must
  match the kind → `InvalidFieldException("attachmentId", …)`; `VIDEO_PREVIEW = "Video"`; `list` loads attachments
  for IMAGE and VIDEO), `ModerationService.java` (`hasVideo`, preview "Video"), `ModeratedMessageResource.java`
  (+ `boolean hasVideo`), `ChatNotificationListener.java` (VIDEO → text null + `messageKey` "message.video"; see how
  `NotificationEvent`/renderer choose the key and add the smallest hook), `i18n/notifications*.properties` (+
  `notification.message.video.*` in 10 languages, same shape as the photo key)
- Test: `MessageServiceTest`, `ModerationServiceTest`, `ChatNotificationListenerTest`, renderer/bundle parity test if
  one exists

- [ ] **Step 1: Failing tests** — `sendsAVideoMessage` (preview "Video", attachment bound), `refusesAVideoMessageWith
  APhoto` / `refusesAPhotoMessageWithAVideo` (400 field attachmentId), `listLoadsVideoAttachments`,
  `aReportedVideoShowsHasVideo`, `aVideoNotificationSaysVideo`.
- [ ] **Steps 2–5**; commit `feat(FR-115): send video messages`.

### Task 5: Signed stream links with HTTP Range

**Files:**
- Create: `…/conversation/services/impl/StreamLinkSigner.java` (`String sign(long id, long userId, char scope, long
  expEpochSeconds)`, `boolean verify(long id, long userId, char scope, long exp, String sig, Instant now)`; key
  derived from `AuthConfig.getSecretKey()` bytes), `…/conversation/resources/StreamUrlResource.java`
  (`String url, Instant expiresAt`), `…/conversation/exceptions/StreamLinkInvalidException.java`
- Modify: `AttachmentServiceInterface` (+ `StreamUrlResource streamUrl(Long meId, boolean admin, Long id)`,
  `StoredFile stream(Long id, long userId, char scope, long exp, String sig)`), `AttachmentService` (streamUrl: run the
  same rules as `read`/`readAsAdmin` — admin logs here; stream: verify → re-check rights without logging),
  `AttachmentDownloadController` (`GET /{id}/stream-url` → envelope; `GET /{id}/stream` → `ResponseEntity<Resource>`
  with `Accept-Ranges`, disposition inline/attachment by `download`, nosniff, private cache — Spring handles Range
  for `Resource` bodies), `ConversationExceptionHandler` (403 `STREAM_LINK_INVALID`), `SecurityConfig`
  (`permitAll` for `GET /api/v1/attachments/*/stream` only)
- Test: `StreamLinkSignerTest`, `AttachmentServiceTest` (streamUrl/stream rules), `AttachmentStreamControllerTest`
  (MockMvc standalone with the real handler: 206 + `Content-Range` for `Range: bytes=0-9`, 200 full, disposition),
  `SecurityConfig` rule test if the project has one for public paths

- [ ] **Step 1: Failing tests** — signer: `aFreshSignatureVerifies`, `anExpiredLinkIsRefused`, `changingTheUserOrScope
  BreaksTheSignature`, `aForgedSignatureIsRefused`; service: `aMemberGetsALinkForAVideoInTheirConversation`,
  `aStrangerGetsNoLink`, `anAdminLinkOnlyForAReportedMessageAndItIsLogged`, `streamRefusesAnExpiredLink`,
  `streamHidesAMessageHiddenAfterTheLinkWasIssued`; controller: `servesARangeWith206`.
- [ ] **Steps 2–5**; commit `feat(FR-115): play chat videos through short-lived signed links`.

### Task 6: Config and documents

- Modify: `docker-compose.yml`, `docker-compose.prod.yml`, `.env.example`, `.env.production.example`
  (`CHAT_MAX_UPLOAD_BYTES=52428800`), `docs/api-contract.md` §12, chat spec 2026-09-25 (§6.3, §8.2, §8.4, §12.2),
  `.ai/REQUIREMENTS.md` FR-115 row, `docs/design-system/components/MessageBubble.md`, `docs/setup.md` (manual check).
- Verify: `docker compose --profile app config -q`.
- Commit `docs(FR-115): contract, chat spec and config for photos and videos up to 50 MB`.

### Task 7: Frontend dependency and media helpers

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json` (`heic2any`, via `npm install heic2any` in the
  frontend image with the worktree mounted; then `docker commit` that container as `market-link-frontend:media` for
  later checks)
- Create: `frontend/src/lib/chat/media.ts` (`MAX_MEDIA_BYTES = 52_428_800`, `ACCEPT` string, `classify(file) → 'image'
  | 'video' | 'heic' | null` by mime or extension, `prepareMedia(file) → Promise<{ file: File; kind: 'image' |
  'video' }>` converting HEIC with `import('heic2any')` and throwing `MediaError('type' | 'size' | 'convert')`)
- Test: `frontend/src/lib/chat/media.test.ts` (mock `heic2any`)

- [ ] Tests: accepts each image/video type, accepts `.heic` with empty mime, refuses `.exe`/`application/zip`,
  refuses 50 MB + 1 byte, converts HEIC and names it `.jpg`, a failed conversion throws `convert`.
- [ ] Commit `feat(FR-115): check and prepare chat media in the browser`.

### Task 8: Upload with progress and cancel, send the right kind

**Files:**
- Modify: `frontend/src/api-requests/conversation.requests.ts` (`uploadMedia(file, { onProgress, signal })` with
  `timeout: 0`, `onUploadProgress`; `streamUrl(id)`; `SendBody.kind` + `'video'`), `frontend/src/types/chat.types.ts`
  (`ChatAttachment.mime`, `kind` + `'video'`, `ModeratedMessage.hasVideo`), `frontend/src/lib/chat/useChat.ts`
  (`sendMedia(file, opts)` → kind from `mime`), `frontend/src/lib/chat/errors.ts` (413/415 → media keys),
  `frontend/src/components/chat/Composer.tsx` (accept list, `prepareMedia`, converting state, progress bar with %
  and Cancel, errors inline), `ConversationPanel.tsx` wiring if `sendPhoto` is passed through
- Test: `conversation.requests.test.ts`, `useChat.test.ts` (`sendMedia` sends `video` for `video/mp4`), `errors.test.ts`,
  `Composer.test.tsx` (too big → error, HEIC converting text, progress shown, Cancel aborts)

- [ ] Commit `feat(FR-115): send photos and videos with progress and cancel`.

### Task 9: Video bubble, admin view, copy

**Files:**
- Create: `frontend/src/components/chat/ChatVideo.tsx` (+ test)
- Modify: `MessageBubble.tsx` (`kind === 'video'` → `ChatVideo`), `pages/admin/Moderation/ReportedMessages.tsx`
  (`hasVideo` → `ChatVideo`, list preview "Video"), `frontend/src/locales/*/common.json` (`chat.attachMedia`,
  `chat.videoFrom`, `chat.playVideo`, `chat.videoUnavailable`, `chat.downloadVideo`, `chat.uploading`,
  `chat.cancelUpload`, `chat.converting`, `chat.convertFailed`, reworded `chat.photoFailed`/`photoTooBig`/`photoType`
  as media), `AdminModeration.json` (`messages.video`) — 10 languages
- Test: `ChatVideo.test.tsx` (play → `streamUrl` → `<video>` with the absolute URL; `error` event → message + download
  link with `download=1`), `ReportedMessages.test.tsx` (video row), locale parity

- [ ] Commit `feat(FR-115): play videos in the chat and in moderation`.

### Task 10: Whole-feature verification, review, PR

- Backend: `spotless:check`, `test-compile`, touched unit tests; full `mvnw verify` against a stack's MySQL/Redis
  (pause other app containers if the Docker VM runs out of memory).
- Frontend: prettier, eslint, `tsc -b`, full vitest, `vite build` (check `heic2any` lands in its own chunk).
- Second stack from the worktree (`mlmedia`, ports 3032/8098, images rebuilt because `package.json` changed), drive in
  Chrome: JPEG 8 MB, HEIC, GIF, MP4 and MOV between a customer and a farmer, play/seek video, admin view of a reported
  video, 375/1440, light/dark.
- Fresh whole-branch review (opus) → fix Critical/Important with tests → push → PR to `dev` (squash).
