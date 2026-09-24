## Làm gì

<!-- Mã requirement + 1–3 dòng mô tả. Ví dụ: FR-030 — tách giỏ hàng thành nhiều đơn theo Farmer -->
- FR-

## Test thế nào

<!-- Các bước để reviewer kiểm tra lại; ảnh chụp màn hình nếu có UI -->

## Checklist (CONTRIBUTING.md §5)

- [ ] PR vào đúng nhánh: `dev`, hoặc `main` nếu là release/hotfix
- [ ] CI xanh
- [ ] Không có file bí mật (`.env`, `.env.production`, `application-local.yml`)
- [ ] Đổi DB → có migration **mới**, không sửa migration cũ
- [ ] Đổi API → khớp `docs/api-contract.md`
- [ ] Thêm biến môi trường → cập nhật `.env.example`, `.env.production.example`, `application-*.yaml`
- [ ] UI: đủ 4 trạng thái loading / empty / error / có data, responsive 375 / 768 / 1440
