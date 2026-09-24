#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Kiểm tra môi trường dev và production không bị trộn (CONTRIBUTING.md §0, luật H-7)
# CI chạy trên mọi PR; chạy tay:  scripts/check-env-separation.sh
# ---------------------------------------------------------------------
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

errors=0
fail() {
    printf '\033[31m✗ %s\033[0m\n' "$*" >&2
    errors=$((errors + 1))
}
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }

PROD_APP=backend/src/main/resources/application-prod.yaml
DEV_APP=backend/src/main/resources/application-dev.yaml
PROD_COMPOSE=docker-compose.prod.yml
DEV_ENV=.env.example
PROD_ENV=.env.production.example

# 1. Không có file bí mật / env của máy trong git
tracked_secrets=$(git ls-files | grep -E '(^|/)\.env$|^\.env\.production$|\.env(\.[a-z]+)?\.local$|(^|/)application-local\.(yml|yaml|properties)$|\.(pem|key|p12|jks)$' || true)
if [[ -n "$tracked_secrets" ]]; then
    fail "File bí mật / env của máy đang nằm trong git:"
    printf '    %s\n' $tracked_secrets >&2
else
    ok "Không có .env, .env.production, application-local.* hay key trong git"
fi

# 2. Profile prod không có giá trị mặc định → không bao giờ chạy prod bằng giá trị dev
if grep -nE '\$\{[A-Za-z0-9_.]+:' "$PROD_APP" >/dev/null; then
    fail "$PROD_APP có placeholder kèm giá trị mặc định (\${VAR:mac-dinh}). Prod phải lấy mọi giá trị từ env:"
    grep -nE '\$\{[A-Za-z0-9_.]+:' "$PROD_APP" | sed 's/^/    /' >&2
else
    ok "$PROD_APP không có giá trị mặc định"
fi

# 3. Profile prod không kéo cấu hình dev vào, và ngược lại
if grep -nEi '^\s*(include|active|group)\s*:.*\bdev\b|on-profile\s*:\s*dev' "$PROD_APP" >/dev/null; then
    fail "$PROD_APP đang include/active profile dev"
else
    ok "$PROD_APP không kéo profile dev"
fi
if grep -nEi '^\s*(include|active|group)\s*:.*\bprod\b|on-profile\s*:\s*prod' "$DEV_APP" >/dev/null; then
    fail "$DEV_APP đang include/active profile prod"
else
    ok "$DEV_APP không kéo profile prod"
fi

# 4. Compose prod: profile prod, bí mật bắt buộc (:?), không mở cổng DB/Redis
if ! grep -qE 'SPRING_PROFILES_ACTIVE:\s*prod\s*$' "$PROD_COMPOSE"; then
    fail "$PROD_COMPOSE phải đặt cứng SPRING_PROFILES_ACTIVE: prod"
else
    ok "$PROD_COMPOSE chạy backend với profile prod"
fi
missing=0
for var in MYSQL_ROOT_PASSWORD MYSQL_PASSWORD JWT_SECRET; do
    if ! grep -qE "\\\$\\{$var:\\?" "$PROD_COMPOSE"; then
        fail "$PROD_COMPOSE: $var phải là bắt buộc dạng \${$var:?...}, không có mặc định"
        missing=1
    fi
done
(( missing == 0 )) && ok "$PROD_COMPOSE bắt buộc truyền MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, JWT_SECRET"
exposed=0
for svc in mysql redis; do
    if ! awk -v s="  $svc:" '$0==s{f=1;next} f&&/^  [a-z]/{f=0} f&&/ports: !reset \[\]/{found=1} END{exit !found}' "$PROD_COMPOSE"; then
        fail "$PROD_COMPOSE: $svc không được mở cổng ra ngoài (cần 'ports: !reset []')"
        exposed=1
    fi
done
(( exposed == 0 )) && ok "$PROD_COMPOSE không mở cổng MySQL / Redis"

# 5. File env mẫu không lẫn giá trị của nhau
if grep -qE '^SPRING_PROFILES_ACTIVE=dev\s*$' "$DEV_ENV"; then
    ok "$DEV_ENV dùng profile dev"
else
    fail "$DEV_ENV phải có SPRING_PROFILES_ACTIVE=dev"
fi
if grep -qE '^SPRING_PROFILES_ACTIVE=prod\s*$' "$PROD_ENV"; then
    ok "$PROD_ENV dùng profile prod"
else
    fail "$PROD_ENV phải có SPRING_PROFILES_ACTIVE=prod"
fi
for var in MYSQL_ROOT_PASSWORD MYSQL_PASSWORD JWT_SECRET; do
    if ! grep -qE "^$var=<" "$PROD_ENV"; then
        fail "$PROD_ENV: $var phải để giá trị mẫu dạng <...>, không ghi bí mật thật"
    fi
done
dev_db=$(grep -E '^MYSQL_DATABASE=' "$DEV_ENV" | cut -d= -f2)
prod_db=$(grep -E '^MYSQL_DATABASE=' "$PROD_ENV" | cut -d= -f2)
if [[ -n "$dev_db" && "$dev_db" == "$prod_db" ]]; then
    fail "Dev và prod dùng chung tên database '$dev_db' — phải tách"
else
    ok "Database dev ($dev_db) và prod ($prod_db) tách riêng"
fi
if grep -q "$prod_db" "$DEV_ENV" "$DEV_APP" docker-compose.yml 2>/dev/null; then
    fail "Cấu hình dev đang trỏ tới database prod '$prod_db'"
fi

if (( errors > 0 )); then
    printf '\n\033[31m%d lỗi — xem CONTRIBUTING.md §0 (luật H-7)\033[0m\n' "$errors" >&2
    exit 1
fi
printf '\n\033[32mMôi trường dev và production tách biệt đúng luật.\033[0m\n'
