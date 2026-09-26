# Frontend — React 19 / Vite / TypeScript / Tailwind 4

Đọc `../CLAUDE.md` trước (luật R-01…R-10, Definition of Done).

- SPA React + Vite, entry `src/main.tsx`, alias `@` → `src/`. Dev server cổng 3000 (`vite.config.ts`).
- Biến môi trường cho client phải có tiền tố `VITE_`, đọc qua `import.meta.env.VITE_*`.
  URL backend: `VITE_API_URL` (mặc định `http://localhost:8080`).
- Gọi API: path, body và response phải khớp `../docs/api-contract.md` (R-05).
- Mọi màn có dữ liệu phải có đủ 4 trạng thái: loading / empty / error / có data (FR-084).
- Responsive 375 / 768 / 1440 px, không tràn ngang (FR-080).
- Bản đồ dùng Leaflet + OpenStreetMap, chỉ đường mở OSM directions ở tab mới (D-12).
- Mặc định: tiền `₫` có phân cách hàng nghìn, ngày `dd/MM/yyyy`, giờ 24h; người dùng đổi được trong Settings.
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
- Copy UI không viết cứng trong TSX: đặt key vào `src/locales/en/<Thư mục trang>.json` (component dùng chung:
  `common.json`), đọc bằng `useTranslation('<Thư mục trang>')` + `t('key')`, rồi dịch đủ 9 ngôn ngữ còn lại
  (`vi zh ja ko fr es de th id`). Key thiếu sẽ hiện English. Trang mới: thêm file JSON cho cả 10 ngôn ngữ và một dòng
  trong `src/i18n/resources.ts`. Tiếng Anh: sentence case, không emoji, không dấu chấm than; nút bị khoá có lý do.
- Tiền, đơn vị, ngày giờ đi qua `src/lib/format.ts` (`vnd`, `perUnit`, `units`, `formatDate`, `formatTime`,
  `formatClock`, `dayName`, `weekday`): nó theo Settings của người đọc (ngôn ngữ, ngày, giờ, tiền, kg/lb).
- Dark theme: `data-theme="dark"` trên `<html>` (Settings → Theme). Chỉ dùng token màu thì tự đúng cả hai theme.
- Spacing theo token: `p-1/2/3/4/6/8/12/16` (4 → 64px). Không dùng `p-5`, `p-7` hay giá trị tuỳ ý `p-[18px]`.
- Không sửa tay `src/styles/marketlink-*.css` và `docs/design-system/tokens.json`: muốn đổi style thì đổi design system
  rồi sinh lại cả ba file cùng lúc.

## Màn chưa nối API chỉ hiện ở dev

- `SHOW_WIP` (`src/config/wip.ts`) bật khi `npm run dev`, tắt trong `vite build`, trừ khi build với `VITE_SHOW_WIP=true`.
- Màn còn chạy trên dữ liệu mẫu (`src/data/*` hoặc mảng viết cứng trong file) phải nằm trong danh sách `SHOW_WIP ? XWip :
  ComingSoon` ở `App.tsx`. Nối xong API thì bỏ màn đó khỏi danh sách.
- Màn thật mà có một khối mock (review, favorites, nút chỉ hiện toast) thì bọc khối đó trong `SHOW_WIP && (...)`.
- Không gọi hàm hay `.find/.filter` trên dữ liệu mẫu ở top-level module: build production sẽ giữ cả mảng mẫu trong
  bundle. Tính trong component, hoặc thêm `/* @__NO_SIDE_EFFECTS__ */` cho hàm tra cứu mới trong `src/data/*`.

## Prototype là bản hướng dẫn, không phải sản phẩm

`docs/prototype/` dựng để **hướng dẫn code** và để LEAD/FE1 duyệt. Sản phẩm trong `frontend/` là thứ
**người dùng thật sự sài**. Chép bố cục và câu chữ từ prototype thì được, nhưng **bốn thứ sau không bao
giờ được sang app**:

| Chỉ có trong prototype | Là gì |
|---|---|
| `data-state-demo`, `data-state-target` | công tắc bật thử 4 trạng thái FR-084. App chọn trạng thái theo request thật |
| `pt-todo`, `data-todo` | chip TODO đỏ ghi những gì SRS chưa định nghĩa |
| `.pt-bar`, `.pt-sheet` | thanh điều hướng giữa các màn ở đáy trang |
| `.pt-adminbar`, các mục "Other states (FR-084)" | dải và khối dựng cho người duyệt xem |

Class `pt-*` **không phải design system**. Chúng nằm trong `docs/prototype/prototype.css`, là bố cục riêng
của prototype. Design system là `ml-*` trong `src/styles/marketlink-components.css`. Thấy `pt-*` trong
prototype thì **dựng lại bằng Tailwind trong app**, đừng chép class sang — app không nạp file CSS đó, nên
class sẽ không có định nghĩa và phần tử mất style mà không báo lỗi gì.

Câu chữ viết cho người duyệt cũng ở lại prototype. Ví dụ dòng "The map follows the filters and shows only
the markets in the list." là lời giải thích cho người đọc bản mẫu; người dùng thật không cần ai nói câu đó.