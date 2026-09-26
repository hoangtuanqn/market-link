# Backend — Spring Boot 4 / Java 25

Đọc `../CLAUDE.md` trước (luật R-01…R-10, Definition of Done).

## Cấu trúc

```
com.techx.intervue
├── config/        SecurityConfig (whitelist route public), AppConfig, RedisConfig
├── filters/       JwtAuthFilter, TraceIdFilter
├── controllers/   BaseController (ok/created) — controller mới extends class này
├── resources/     ApiResource<T> (envelope), ErrorResource, FieldErrorResource
├── services/      BaseService, dịch vụ dùng chung
└── modules/<tên>/ controllers · services/{interfaces,impl} · repositories · entities
                   · requests (record + jakarta.validation) · resources (record trả về) · enums
```

Mỗi tính năng là một module trong `modules/`. Service có interface trong `services/interfaces`.

## Quy ước

- Trả về `ResponseEntity<ApiResource<T>>` qua `ok(...)` / `created(...)` của `BaseController`.
- Request/response là `record`. Validate bằng annotation trên request + `@Valid`.
- Lấy user đang đăng nhập: principal là `CustomUserDetails` (có `getId()`), `null` nếu khách vãng lai.
- Route public phải thêm vào `SecurityConfig`, nếu không mặc định là `authenticated()`.
- SQL đọc phức tạp (join nhiều bảng) dùng `NamedParameterJdbcTemplate` với tham số — không nối chuỗi (R-04).
- Migration: `src/main/resources/db/migration/V<yyyyMMdd><nnn>__<mo_ta>.sql`, không sửa file đã merge.
  Khoá ngoại tới `users` phải là `BIGINT UNSIGNED` (khớp `users.id`).
- Format bằng Spotless (google-java-format AOSP); lefthook tự chạy khi commit.

## Lệnh

```bash
make be-test     # ./mvnw test trong container (host có thể không có JDK 25)
make be-format   # spotless:apply
make be-restart  # recompile + restart sau khi sửa Java
make logs s=backend
```
