/**
 * Màn hình còn chạy trên dữ liệu mẫu (`src/data/*`) chỉ hiện ở dev. `npm run dev` luôn bật; bản `vite build` cho
 * production tắt, trừ khi build với `VITE_SHOW_WIP=true` (ví dụ bản xem trước nội bộ). Vite thay giá trị này lúc build,
 * nên nhánh bị tắt và dữ liệu mẫu chỉ nó dùng bị loại khỏi bundle.
 */
export const SHOW_WIP: boolean = import.meta.env.DEV || import.meta.env.VITE_SHOW_WIP === 'true';
