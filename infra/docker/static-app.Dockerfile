# syntax=docker/dockerfile:1.7
# Production image for a browser app (web or admin): the Vite build served by Caddy.
#   docker build -f infra/docker/static-app.Dockerfile --build-arg APP=web -t setubandh-web .
ARG NODE_IMAGE=node:26-slim
# Keep in sync with "packageManager" in package.json.
ARG PNPM_VERSION=12.21.0

FROM ${NODE_IMAGE} AS build
ARG APP
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true TURBO_TELEMETRY_DISABLED=1
# Builds behind a TLS-inspecting proxy can pass its CA as an optional BuildKit secret:
#   --secret id=extra_ca,src=/path/to/ca.crt   (absent in CI: Node then just warns and ignores it)
ENV NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca
ARG PNPM_VERSION
# Node 26 images no longer ship corepack; install the pinned pnpm directly.
RUN --mount=type=secret,id=extra_ca,required=false npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=secret,id=extra_ca,required=false \
    --mount=type=cache,id=pnpm-store,target=/pnpm/store --mount=type=cache,id=pnpm-meta,target=/root/.cache/pnpm pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store --mount=type=cache,id=pnpm-meta,target=/root/.cache/pnpm pnpm install --frozen-lockfile --offline
RUN pnpm exec turbo run build --filter=@setubandh/${APP}...

FROM caddy:2-alpine AS runtime
ARG APP
COPY infra/docker/static-app.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/${APP}/dist /srv
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
