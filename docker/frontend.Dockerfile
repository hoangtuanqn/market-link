# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------
# Frontend (React 19 / Vite / Tailwind 4)
#   target "dev"  : vite dev server, source được mount từ host
#   target "prod" : build ra dist/ tĩnh, phục vụ bằng nginx (SPA fallback)
# ---------------------------------------------------------------------

FROM node:22-alpine AS base
WORKDIR /app

# ---------- deps: cài toàn bộ package, gồm prettier/eslint plugin ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- dev ----------
FROM deps AS dev
EXPOSE 3000
# --host để truy cập được từ ngoài container; cổng 3000 lấy từ vite.config.ts
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- build ----------
FROM deps AS build
# Vite nhúng biến VITE_* vào bundle lúc build, nên phải truyền qua build arg
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

# ---------- prod ----------
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
# Route không phải file tĩnh → index.html để React Router xử lý (F5 ở /orders/12 không bị 404)
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 3000;
    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
EXPOSE 3000
