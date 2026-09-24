# Lệnh tắt cho Docker stack. Chạy `make help` để xem danh sách.
COMPOSE      := docker compose
# backend + frontend nằm trong profile "app": `docker compose up -d` trơn chỉ chạy mysql + redis
COMPOSE_APP  := docker compose --profile app
# Production: project riêng + .env.production, không đụng container/volume của dev
COMPOSE_PROD := docker compose -p market-link-prod --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml --profile app

.DEFAULT_GOAL := help
.PHONY: help init up down build logs ps restart be-restart tools infra prod prod-down prod-logs prod-init \
        format lint be-format be-test fe-install mysql redis clean

help: ## Hiện danh sách lệnh
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n",$$1,$$2}'

init: ## Tạo .env, cài lefthook + plugin frontend trên host (cho IDE / git hook)
	@test -f .env || cp .env.example .env
	npm install
	cd frontend && npm install

up: ## Chạy toàn bộ stack dev (mysql, redis, backend, frontend)
	@test -f .env || cp .env.example .env
	$(COMPOSE_APP) up -d --build --renew-anon-volumes

infra: ## Chỉ chạy mysql + redis (khi muốn chạy BE/FE trực tiếp trên máy)
	$(COMPOSE) up -d mysql redis

tools: ## Chạy thêm Adminer (:8081) và RedisInsight (:5540)
	$(COMPOSE) --profile tools up -d

down: ## Dừng stack (giữ data)
	$(COMPOSE_APP) --profile tools down

build: ## Build lại image dev
	$(COMPOSE_APP) build

logs: ## Xem log (make logs s=backend)
	$(COMPOSE) logs -f $(s)

ps: ## Trạng thái container
	$(COMPOSE) ps

restart: ## Restart 1 service (make restart s=frontend)
	$(COMPOSE) restart $(s)

be-restart: ## Recompile + chạy lại backend sau khi sửa Java
	$(COMPOSE) restart backend

prod-init: ## Tạo .env.production từ mẫu (sau đó phải thay mọi giá trị <...>)
	@test -f .env.production || cp .env.production.example .env.production
	@echo "Đã có .env.production — nhớ thay mọi giá trị <...> trước khi chạy make prod"

prod: ## Build & chạy production (cần .env.production)
	@test -f .env.production || (echo "Thiếu .env.production — chạy make prod-init" && exit 1)
	@! grep -Eq '^[A-Z_]+=<' .env.production || (echo ".env.production còn giá trị mẫu <...>" && exit 1)
	$(COMPOSE_PROD) up -d --build

prod-logs: ## Xem log production (make prod-logs s=backend)
	$(COMPOSE_PROD) logs -f $(s)

prod-down: ## Dừng stack production (giữ data)
	$(COMPOSE_PROD) down

format: be-format ## Format toàn bộ code (prettier + spotless) trong container
	$(COMPOSE) exec frontend npx prettier --write .

be-format: ## Format Java bằng spotless trong container
	$(COMPOSE) exec backend ./mvnw -q spotless:apply

lint: ## ESLint frontend + spotless:check backend
	$(COMPOSE) exec frontend npm run lint
	$(COMPOSE) exec backend ./mvnw -q spotless:check

be-test: ## Chạy test backend trong container
	$(COMPOSE) exec backend ./mvnw -B test

fe-install: ## Cài lại package frontend trong container (sau khi đổi package.json)
	$(COMPOSE) exec frontend npm install

mysql: ## Mở MySQL shell
	$(COMPOSE) exec mysql sh -c 'mysql -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" "$$MYSQL_DATABASE"'

redis: ## Mở redis-cli
	$(COMPOSE) exec redis redis-cli

clean: ## Xoá container + volume (MẤT DATA DB)
	$(COMPOSE_APP) --profile tools down -v
