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
