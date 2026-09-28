# Ảnh nhiều định dạng và video trong chat — thiết kế

- Ngày: 28/09/2026 · Người duyệt: LEAD (duyệt thiết kế trong hội thoại cùng ngày)
- FR: **FR-115** (đính kèm trong chat Customer ↔ Farmer) — mở rộng, không mở FR mới.
- Nền: spec chat `2026-09-25-farmer-customer-chat-design.md` §6.3, §8.2, §8.4, §12.2 (các mục này được cập nhật theo file này).

## 1. Mục tiêu

Hiện chat chỉ nhận ảnh JPEG/PNG/WebP tối đa 5 MB, chưa có video. Sau thay đổi:

- Ảnh: JPEG, PNG, WebP, GIF (giữ ảnh động), AVIF, HEIC/HEIF (trình duyệt đổi sang JPEG trước khi gửi).
- Video: MP4/M4V, MOV, WebM.
- Mỗi file tối đa **50 MB** (52 428 800 byte).
- Video phát ngay, tua được, không phải tải hết file trước.

Coi là xong khi Customer và Farmer gửi/nhận được ảnh chụp từ điện thoại (kể cả iPhone HEIC, ảnh 48 MP) và video
quay bằng điện thoại dưới 50 MB, xem được trên trình duyệt người nhận, ở 375 / 1440 px, sáng và tối.

### Ngoài phạm vi

- Chuyển mã video (ffmpeg), ảnh bìa (thumbnail) video, đo thời lượng video.
- Prototype (`docs/prototype/*/messages.html`).
- Dịch chữ xem trước hội thoại "Photo"/"Video" do server gửi (hiện "Photo" cũng chưa dịch — giữ nguyên cách làm).

## 2. Định dạng và cách kiểm

Server **không tin** đuôi file hay Content-Type; loại file suy ra từ nội dung (magic bytes + cấu trúc).

| Loại | Nhận diện | Cách lưu |
|---|---|---|
| JPEG | `FF D8 FF` | giải mã → mã hoá lại JPEG (bỏ EXIF/GPS). Cạnh > 4096 px: giải mã với subsampling rồi thu nhỏ còn tối đa 4096 px |
| PNG | chữ ký 8 byte | như JPEG (nền trắng cho vùng trong suốt, như hiện nay) |
| WebP | RIFF…WEBP, kiểm như hiện nay | lưu nguyên |
| GIF | `GIF87a`/`GIF89a`, byte cuối `3B` (trailer) | lưu nguyên (giữ ảnh động) |
| AVIF | ISO BMFF, `ftyp` có brand `avif`/`avis`, kích thước lấy từ hộp `ispe` | lưu nguyên |
| HEIC/HEIF | ISO BMFF, brand `heic`/`heix`/`heif`/`mif1`/`msf1` (không có `avif`) | **415** — trình duyệt phải đổi sang JPEG trước |
| MP4/M4V | ISO BMFF, brand khác `qt  ` và khác nhóm ảnh ở trên | lưu nguyên, mime `video/mp4` |
| MOV | ISO BMFF, major brand `qt  ` (hoặc file QuickTime cũ bắt đầu bằng `wide`/`free`/`skip`/`mdat`/`moov`) | lưu nguyên, mime `video/quicktime` |
| WebM | EBML `1A 45 DF A3` + DocType `webm` trong phần đầu | lưu nguyên, mime `video/webm` |

- **Toàn vẹn cho file lưu nguyên:** ISO BMFF (AVIF, MP4, MOV) phải đi hết chuỗi hộp cấp cao nhất và dừng **đúng**
  ở cuối file (size 1 = largesize 64 bit, size 0 = tới cuối file); GIF phải kết thúc bằng `3B`; WebP giữ các kiểm
  hiện có. Chặn đuôi file gắn thêm và file cụt.
- **Chống "bom giải nén":** WebP/GIF/AVIF cạnh > 4096 px → 400 như hiện nay (không giải mã được để thu nhỏ). JPEG/PNG
  có cạnh > 30 000 px trong header → 400 (không giải mã). Bổ sung sau review cuối: tổng > 200 MP → 400; JPEG
  **progressive** > 24 MP → 400 (libjpeg giữ toàn bộ hệ số DCT trong bộ nhớ native, subsampling không giảm được).
- **Hướng ảnh:** JPEG mã hoá lại mất EXIF nên Orientation được áp vào điểm ảnh trước (ảnh dọc chụp bằng điện thoại
  không bị xoay ngang); `width`/`height` lưu là kích thước thật của tệp đã lưu.
- **Đánh đổi đã biết:** GIF/AVIF lưu nguyên có thể còn metadata (AVIF có thể chứa EXIF) — giống WebP hiện nay; file chỉ
  ra ngoài qua endpoint có kiểm quyền và chỉ tới người nhận do người gửi chọn.

## 3. Kích thước, bộ nhớ, giới hạn

- `app.chat.max-upload-bytes` = `${CHAT_MAX_UPLOAD_BYTES:52428800}`; `spring.servlet.multipart.max-file-size` = `50MB`
  (các upload khác vẫn giữ giới hạn riêng: ảnh Farmer 8 MB, video hồ sơ Farmer 40 MB…). Thông báo 413 của
  `UploadExceptionHandler` đọc giá trị cấu hình thay vì chữ "40 MB" viết cứng.
- Upload được chuyển vào **file tạm** (không `getBytes()` cả file). Video được kiểm cấu trúc trên file tạm rồi chuyển
  thẳng vào kho (`FileStorageServiceInterface.storeFile(folder, name, Path source)`, ghi tạm + đổi tên nguyên tử).
  Chỉ ảnh mới đọc vào bộ nhớ để giải mã. File tạm luôn bị xoá.
- Giới hạn tần suất: action `IMAGE` hiện có giờ đếm **ảnh và video** chung — 10 tệp/giờ/người
  (`CHAT_IMAGES_PER_HOUR`, giữ tên biến). Lý do hiển thị đổi thành "Too many photos or videos…".
- Thư mục lưu giữ nguyên `images` (job dọn file mồ côi sau 24 h đang dọn thư mục này); tên file UUID + đuôi theo mime
  (`.jpg .webp .gif .avif .mp4 .mov .webm`).

## 4. Tin nhắn video

- `MessageKind` thêm `VIDEO`; migration `V20260928010__add_video_message_kind.sql` sửa ENUM
  `messages.kind` thành `('text','image','video','offer','system')`.
- `POST /conversations/{id}/messages` nhận `kind: "video"` + `attachmentId`. Loại tệp phải khớp loại tin: `image` cần
  mime `image/*`, `video` cần `video/*`, sai → 400 `VALIDATION_ERROR` (field `attachmentId`).
- Danh sách tin nạp tệp cho cả `image` và `video`. Xem trước hội thoại: `"Video"` (như `"Photo"`).
- Thông báo: tin video dùng khoá mới `notification.message.video` = "{sender} sent a video" (10 ngôn ngữ).
- Kiểm duyệt: `ModeratedMessageResource` thêm `hasVideo`; `attachmentId` chỉ có khi tin bị báo cáo (như ảnh).
- `AttachmentResource` thêm `mime` để frontend biết gửi tin `image` hay `video`.

## 5. Phát video bằng link ký tạm

- `GET /api/v1/attachments/{id}/stream-url` (cần đăng nhập): kiểm quyền **giống hệt** tải ảnh — người dùng thường:
  người upload (khi chưa gửi) hoặc thành viên hội thoại, tin không bị ẩn; admin: chỉ tin đã bị báo cáo, **ghi log**.
  Trả `{ url, expiresAt }`, `url` =
  `/api/v1/attachments/{id}/stream?u={userId}&s={u|a}&e={epochSeconds}&t={signature}`.
- Chữ ký: HMAC-SHA256 trên `id|u|s|e`, khoá = SHA-256(`"chat-stream|"` + `jwt.secret`) (không dùng thẳng khoá JWT,
  không thêm biến môi trường), mã hoá base64url. Hạn `app.chat.stream-url-ttl-seconds` = 300.
- `GET /api/v1/attachments/{id}/stream` (**permitAll**, không cần token vì thẻ `<video>` không gửi được header):
  - Sai chữ ký / hết hạn / thiếu tham số → 403 `STREAM_LINK_INVALID`.
  - Kiểm lại quyền của `u` mỗi lần (tin bị ẩn sau khi cấp link → 404), nhưng **không** ghi log admin mỗi request
    (log đã ghi lúc cấp link).
  - Hỗ trợ **HTTP Range** (206, `Accept-Ranges: bytes`), `Content-Disposition: inline` (hoặc `attachment` khi có
    `download=1`), `X-Content-Type-Options: nosniff`, `Cache-Control: private`.
- Ảnh vẫn tải bằng blob như cũ (`GET /attachments/{id}` có token).

## 6. Frontend

- **Chọn tệp:** nút "Add a photo or video"; `accept` gồm các mime ở §2 + `.heic .heif .mov .m4v`. Trên iPhone/iPad
  bỏ HEIC khỏi `accept` để iOS tự đổi sang JPEG (đổi bằng JS trên máy iOS hỏng với ảnh 24/48 MP vì canvas iOS giới hạn
  ~16,7 MP) — bổ sung sau review cuối.
  - Kiểm loại (theo mime hoặc đuôi) và ≤ 50 MB trước khi gửi, báo lỗi tại chỗ như hiện nay.
  - HEIC/HEIF: đổi sang JPEG bằng `heic2any` (**dependency npm mới**, `import()` động — chỉ nạp khi cần), hiện
    "Converting the photo…". Đổi xong vẫn phải ≤ 50 MB.
- **Upload:** không dùng timeout 10 s mặc định cho request này; có **thanh tiến độ** (% đã gửi) và nút **Huỷ**
  (`AbortController`). Upload xong gửi tin `image` hoặc `video` theo `mime` trả về.
- **Bong bóng video (`ChatVideo`):** khung có nút play (giữ chỗ 16:9, tối đa 280 px); bấm → xin `stream-url` →
  `<video controls playsInline autoPlay preload="metadata">`. Lỗi phát (định dạng máy không hỗ trợ) → "This video
  cannot be played in this browser." + nút **Download** (link `download=1`). Link hết hạn khi đang xem → xin link mới một lần.
- **Lỗi:** quá 50 MB (trình duyệt tự chặn) → "That file is over 50 MB…"; 413 từ server (trần server thấp hơn, vd
  `.env` cũ còn 5 MB) → câu không nêu con số; 415 → danh sách định dạng mới, 429 → như hiện nay.
- **Admin:** `ReportedMessages` hiện video (qua cùng endpoint, nhánh admin) khi `hasVideo`; danh sách hiện "Video".
- Chữ mới / sửa trong `common.json` (`chat.*`) và `AdminModeration.json`, đủ 10 ngôn ngữ.

## 7. Tài liệu

| File | Sửa gì |
|---|---|
| `docs/api-contract.md` §12 | upload nhận ảnh + video 50 MB, `mime` trong kết quả, `kind: video`, 2 endpoint stream, mã lỗi |
| spec chat 2026-09-25 | §6.3 (413 50 MB), §8.2 (định dạng, lưu nguyên, toàn vẹn), §8.4 (10 tệp/giờ gồm video), §12.2 |
| `.ai/REQUIREMENTS.md` | dòng FR-115: ảnh nhiều định dạng + video ≤ 50 MB |
| `.env.example`, `.env.production.example`, compose | `CHAT_MAX_UPLOAD_BYTES=52428800` |
| `docs/design-system/components/MessageBubble.md` | bong bóng video |
| `docs/setup.md` | bước thử tay gửi ảnh/video |

## 8. Kiểm thử

- **Backend:** nhận diện từng định dạng bằng file mẫu nhỏ dựng trong test (JPEG/PNG qua ImageIO, WebP/GIF/AVIF/MP4/
  MOV/WebM bằng byte); HEIC → 415; file đổi đuôi / đuôi gắn thêm / file cụt → 415; ảnh 5000 px được thu nhỏ còn
  4096; > 50 MB → 413; video được lưu bằng `storeFile`; tin `video` với tệp ảnh → 400; chữ ký sai/hết hạn/sửa `u`
  → 403; Range → 206 với `Content-Range`; thông báo video; `hasVideo` ở kiểm duyệt.
- **Frontend:** kiểm loại/kích thước, đổi HEIC (mock `heic2any`), tiến độ + huỷ, gửi đúng `kind`, `ChatVideo` (xin link
  → phát; lỗi → nút tải về), lỗi 413/415.
- **Tay:** stack Docker từ nhánh, gửi ảnh JPEG lớn, HEIC, GIF, video MP4/MOV giữa Customer và Farmer; 375 / 1440,
  sáng / tối.

## 9. Quyết định đã chốt với LEAD (28/09/2026)

1. Định dạng: đổi phía trình duyệt (HEIC → JPEG), video lưu nguyên, không chuyển mã; máy không phát được thì tải về.
2. Phát video bằng link ký tạm, tua được.
3. 50 MB cho ảnh và video; 10 tệp/giờ; hạn link 5 phút.
