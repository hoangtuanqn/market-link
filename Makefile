# Shortcuts for the Docker stack. Run `make help` to see the list.
COMPOSE      := docker compose
# backend + frontend live in the "app" profile: a plain `docker compose up -d` only starts mysql + redis
COMPOSE_APP  := docker compose --profile app
# Production: separate project + .env.production, does not touch the dev containers/volumes
COMPOSE_PROD := docker compose -p market-link-prod --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml --profile app

.DEFAULT_GOAL := help
.PHONY: help vapid-keys check-env init up down build logs ps restart be-restart tools infra prod prod-down prod-logs prod-init \
        format lint be-format be-test fe-install seed mysql redis clean

help: ## Show the command list
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n",$$1,$$2}'

check-env: ## Check that dev / prod environments are not mixed (CI runs this too)
	bash scripts/check-env-separation.sh

init: ## Create .env, install lefthook + frontend plugins on the host (for the IDE / git hooks)
	@test -f .env || cp .env.example .env
	npm install
	cd frontend && npm install

up: ## Run the whole dev stack (mysql, redis, backend, frontend)
	@test -f .env || cp .env.example .env
	$(COMPOSE_APP) up -d --build --renew-anon-volumes

infra: ## Run only mysql + redis + rabbitmq (when running BE/FE directly on the host)
	$(COMPOSE) up -d mysql redis rabbitmq

tools: ## Also run Adminer (:8081) and RedisInsight (:5540); the RabbitMQ UI (:15672) already runs with the stack
	$(COMPOSE) --profile tools up -d

down: ## Stop the stack (keep data)
	$(COMPOSE_APP) --profile tools down

build: ## Rebuild the dev images
	$(COMPOSE_APP) build

logs: ## Xem log (make logs s=backend)
	$(COMPOSE) logs -f $(s)

ps: ## Container status
	$(COMPOSE) ps

restart: ## Restart 1 service (make restart s=frontend)
	$(COMPOSE) restart $(s)

be-restart: ## Recompile + restart the backend after editing Java
	$(COMPOSE) restart backend

prod-init: ## Create .env.production from the template (then replace every <...> value)
	@test -f .env.production || cp .env.production.example .env.production
	@echo "Đã có .env.production — nhớ thay mọi giá trị <...> trước khi chạy make prod"

prod: ## Build & run production — only from the main branch or a tag (rule H-8)
	@branch=$$(git symbolic-ref --quiet --short HEAD || true); \
	tag=$$(git describe --exact-match --tags HEAD 2>/dev/null || true); \
	if [ "$$branch" != "main" ] && [ -z "$$tag" ] && [ "$(ALLOW_PROD_FROM_BRANCH)" != "1" ]; then \
		echo "✗ make prod chỉ chạy từ nhánh main hoặc một tag release (đang ở: $${branch:-detached})."; \
		echo "  git switch main && git pull   — rồi chạy lại make prod"; exit 1; fi
	@git diff --quiet HEAD -- . ':!docs' || [ "$(ALLOW_PROD_FROM_BRANCH)" = "1" ] || \
		(echo "✗ Có thay đổi chưa commit — production phải đúng bằng code trên main" && exit 1)
	@test -f .env.production || (echo "Thiếu .env.production — chạy make prod-init" && exit 1)
	@! grep -Eq '^[A-Z_]+=<' .env.production || (echo ".env.production còn giá trị mẫu <...>" && exit 1)
	$(COMPOSE_PROD) up -d --build

prod-logs: ## Xem log production (make prod-logs s=backend)
	$(COMPOSE_PROD) logs -f $(s)

prod-down: ## Stop the production stack (keep data)
	$(COMPOSE_PROD) down

format: be-format ## Format all code (prettier + spotless) in the container
	$(COMPOSE) exec frontend npx prettier --write .

be-format: ## Format Java with spotless in the container
	$(COMPOSE) exec backend ./mvnw -q spotless:apply

lint: ## ESLint frontend + spotless:check backend
	$(COMPOSE) exec frontend npm run lint
	$(COMPOSE) exec backend ./mvnw -q spotless:check

vapid-keys: ## Generate a VAPID key pair for Web Push (paste into .env)
	@$(COMPOSE_APP) run --rm --no-deps --entrypoint node frontend -e "const {generateKeyPairSync}=require('crypto');const k=generateKeyPairSync('ec',{namedCurve:'prime256v1'});const j=k.privateKey.export({format:'jwk'});console.log('VAPID_PUBLIC_KEY='+Buffer.concat([Buffer.from([4]),Buffer.from(j.x,'base64url'),Buffer.from(j.y,'base64url')]).toString('base64url'));console.log('VAPID_PRIVATE_KEY='+j.d)"

be-test: ## Run backend tests in the container
	$(COMPOSE) exec backend ./mvnw -B test

fe-install: ## Reinstall frontend packages in the container (after changing package.json)
	$(COMPOSE) exec frontend npm install

seed: ## Load the demo data db/seed.sql (FR-100…102) — safe to run repeatedly
	$(COMPOSE) exec -T mysql sh -c 'mysql -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" "$$MYSQL_DATABASE"' < db/seed.sql
	@echo "Seed xong."

mysql: ## Open a MySQL shell
	$(COMPOSE) exec mysql sh -c 'mysql -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" "$$MYSQL_DATABASE"'

redis: ## Open redis-cli
	$(COMPOSE) exec redis redis-cli

clean: ## Remove containers + volumes (DB DATA IS LOST)
	$(COMPOSE_APP) --profile tools down -v
