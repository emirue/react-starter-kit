# syntax=docker/dockerfile:1
# @if standalone
# Build: docker build -t {{appName}} .
# @else
# Build from the workspace root: docker build -f {{appDir}}/Dockerfile -t {{appName}} .
# @endif
# Run:   docker run --rm -p 8080:8080 {{appName}}
#
# VITE_* values are compiled into the bundle at build time
# (docker build --build-arg VITE_API_BASE_URL=https://api.example.com).

FROM node:26.13.1-alpine3.24 AS build
# @if pm-pnpm
# node:26 images ship without corepack; install the pinned pnpm.
RUN npm install -g pnpm@{{pmVersion}}
# @endif
WORKDIR /app
# @if standalone && pm-pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE_URL=/api
RUN pnpm run build
# @endif
# @if standalone && pm-npm
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api
RUN npm run build
# @endif
# @if workspace
COPY . .
RUN pnpm install --frozen-lockfile --filter "{{appName}}..."
ARG VITE_API_BASE_URL=/api
RUN pnpm --filter "{{appName}}..." run build
# @endif

FROM nginxinc/nginx-unprivileged:1.30.6-alpine
# @if standalone
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# @else
COPY {{appDir}}/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/{{appDir}}/dist /usr/share/nginx/html
# @endif
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
