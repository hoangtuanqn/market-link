# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------
# Frontend (React 19 / Vite / Tailwind 4)
#   target "dev"  : the vite dev server, the source is mounted from the host
#   target "prod" : builds a static dist/, served by nginx (SPA fallback)
# ---------------------------------------------------------------------

FROM node:22-alpine AS base
WORKDIR /app

# ---------- deps: install all packages, including the prettier/eslint plugins ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- dev ----------
FROM deps AS dev
EXPOSE 3000
# --host so it is reachable from outside the container; port 3000 comes from vite.config.ts
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- build ----------
FROM deps AS build
# Vite embeds the VITE_* variables into the bundle at build time, so they must be passed as build args
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}
# Map: when empty src/config/map.ts uses OpenStreetMap tiles by itself
ARG VITE_MAP_TILE_URL=""
ENV VITE_MAP_TILE_URL=${VITE_MAP_TILE_URL}
ARG VITE_MAP_ATTRIBUTION=""
ENV VITE_MAP_ATTRIBUTION=${VITE_MAP_ATTRIBUTION}
COPY . .
RUN npm run build

# ---------- prod ----------
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
# A route that is not a static file → index.html for React Router to handle (F5 at /orders/12 does not get a 404)
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
