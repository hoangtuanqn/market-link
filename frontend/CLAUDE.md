# Frontend — React 19 / Vite / TypeScript / Tailwind 4

Đọc `../CLAUDE.md` trước (luật R-01…R-07, Definition of Done).

- SPA React + Vite, entry `src/main.tsx`, alias `@` → `src/`. Dev server cổng 3000 (`vite.config.ts`).
- Biến môi trường cho client phải có tiền tố `VITE_`, đọc qua `import.meta.env.VITE_*`.
  URL backend: `VITE_API_URL` (mặc định `http://localhost:8080`).
- Gọi API: path, body và response phải khớp `../docs/api-contract.md` (R-05).
- Mọi màn có dữ liệu phải có đủ 4 trạng thái: loading / empty / error / có data (FR-084).
- Responsive 375 / 768 / 1440 px, không tràn ngang (FR-080).
- Bản đồ dùng Leaflet + OpenStreetMap, chỉ đường mở OSM directions ở tab mới (D-12).
- Tiền `₫` có phân cách hàng nghìn, ngày `dd/MM/yyyy`, giờ 24h.
- Ẩn nút theo role chỉ là UX — quyền thật do backend kiểm tra.
- Lệnh: `npm run dev` · `npm run build` · `npm run lint` · `npx prettier --write .`

## Design system — bắt buộc cho mọi UI và prototype

- Đọc `../docs/design-system/README.md` trước khi dựng màn hình. Mở `../docs/design-system/reference/gallery.html` để xem
  từng component và 3 màn mẫu (`ScreenMarket`, `ScreenFarmer`, `ScreenCartMobile`); màn mới bắt đầu từ màn mẫu gần nhất.
- Màu chỉ qua token utility: `bg-surface`, `bg-surface-raised`, `text-ink`, `text-ink-muted`, `border-line-strong`,
  `bg-brand text-on-brand`, `bg-accent text-on-accent`… Palette mặc định của Tailwind đã tắt (`bg-white`, `text-zinc-*`
  không tồn tại). Không viết hex, không inline style màu.
- Component dùng class `ml-*` trong `src/styles/marketlink-components.css`, props theo
  `../docs/design-system/components/<Name>.md`. Component thật viết bằng TSX trong `src/components/`; không import
  `docs/design-system/reference/marketlink-reference.js` vào app.
- `font-hand` (Patrick Hand) chỉ cho tên chợ, giá, nhãn "Fresh today", lời chào. Nút, form, lỗi, bảng dùng `font-sans`.
- Copy UI tiếng Anh, sentence case, không emoji, không dấu chấm than; nút bị khoá phải có lý do bằng chữ.
  Tiền, đơn vị, ngày giờ đi qua `src/lib/format.ts` (`vnd`, `units`, `formatDate`, `formatTime`, `weekday`).
- Spacing theo token: `p-1/2/3/4/6/8/12/16` (4 → 64px). Không dùng `p-5`, `p-7` hay giá trị tuỳ ý `p-[18px]`.
- Không sửa tay `src/styles/marketlink-*.css` và `docs/design-system/tokens.json`: muốn đổi style thì đổi design system
  rồi sinh lại cả ba file cùng lúc.
