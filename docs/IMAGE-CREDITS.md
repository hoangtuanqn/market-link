# Nguồn ảnh

SRS §1.5: *"Usage of various images and videos can be subject to licensing agreements and copyright
restrictions. It is important to understand and comply with these constraints to avoid legal issues."*

Bản kê mọi ảnh do đội đưa vào dự án, kèm nguồn. Ảnh người dùng tự tải lên (ảnh sản phẩm của sạp, ảnh hồ sơ)
không nằm ở đây — chúng do người dùng cung cấp lúc chạy.

| Nhóm | Đường dẫn | Số ảnh | Nguồn | Giấy phép |
|---|---|---|---|---|
| Carousel trang About | nạp thẳng từ `images.unsplash.com` (`frontend/src/pages/public/About/index.tsx`) | 4 | Unsplash | Unsplash License |
| Ảnh sản phẩm cho dữ liệu demo | `db/seed-images/` | 34 | Pexels (tên file giữ nguyên dạng `pexels-<tác giả>-<id>.jpg`) | Pexels License |
| Ảnh chợ (carousel dự phòng ở trang chi tiết chợ) | `frontend/public/images/markets/market-1…5.jpg` | 5 | **Chưa xác định** — xem bên dưới | **Chưa xác định** |
| Logo, linh vật, icon | `frontend/public/` | — | Đội tự vẽ | Thuộc về đội |

## Việc còn mở: 5 ảnh chợ

`frontend/public/images/markets/market-1…5.jpg` vào repo ở commit `ee4d71dd`
(*"feat(UI): add Market carousel…"*), commit không ghi nguồn. Đây là carousel dự phòng hiện trên **mọi** trang
chi tiết chợ (`MarketDetail/index.tsx`), nên là nhóm ảnh người dùng nhìn thấy nhiều nhất.

`market-4.jpg` có metadata XMP ghi tác giả rõ ràng:

```
dc:creator = Mahbub Mehad
dc:rights  = Mehad@2k23
```

**Người tải 5 ảnh này về cần xác nhận nguồn và điền vào bảng trên.** Ba khả năng:

1. Ảnh lấy từ kho miễn phí (Unsplash, Pexels, Pixabay) → ghi kho và link, xong.
2. Ảnh có tác giả xác định và không rõ giấy phép → **thay bằng ảnh có giấy phép rõ ràng**. Đây là 5 file,
   thay mất vài phút, và loại bỏ hẳn rủi ro bản quyền cho phần bị nhìn nhiều nhất.
3. Ảnh do thành viên đội tự chụp → ghi tên người chụp.

Trang About chỉ ghi công cho ảnh của **chính trang đó** (`credits.photosValue`), vì đó là thứ duy nhất kiểm
chứng được hôm nay. Khi bảng trên đầy đủ, mở rộng câu đó cho đúng phạm vi thật.

## Ghi chú: `db/seed-images/` chưa được dùng

`db/README.md` ghi rõ: *"Not referenced by `seed.sql` yet"*. Không có dòng nào trong `db/seed.sql` đặt
`image_url`, và không file mã nguồn nào đọc thư mục này — chỉ hai dòng README nhắc tới nó.

Vì vậy 61 MB ảnh đó **không đi vào gói nộp bài** (`scripts/make-submission.sh`): nó không phải dữ liệu kiểm
thử mà dự án dùng, và nó kéo gói từ 20 MB lên 81 MB. Ảnh vẫn nằm trong repo, sẵn sàng cho lúc nối vào seed.
