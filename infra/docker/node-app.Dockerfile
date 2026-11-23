# syntax=docker/dockerfile:1.7
# Production image for a Node app in this monorepo (api or worker), following Turborepo's
# `prune --docker` recipe. Build from the repo root:
#   docker build -f infra/docker/node-app.Dockerfile --build-arg APP=api -t setubandh-api .
# Behind a TLS-inspecting proxy, add: --secret id=extra_ca,src=/path/to/ca.crt
ARG NODE_IMAGE=node:26-slim

FROM ${NODE_IMAGE} AS base
# Keep in sync with "packageManager" and the turbo devDependency in package.json.
ARG PNPM_VERSION=12.21.0
ARG TURBO_VERSION=2.11.13
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true TURBO_TELEMETRY_DISABLED=1 \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca
# Node 26 images no longer ship corepack; install the pinned tools directly.
RUN --mount=type=secret,id=extra_ca,required=false \
    npm install -g pnpm@${PNPM_VERSION} turbo@${TURBO_VERSION} --no-fund --no-audit
WORKDIR /repo

# 1. Cut the monorepo down to this app and the workspace packages it depends on.
FROM base AS prune
ARG APP
COPY . .
RUN turbo prune @setubandh/${APP} --docker

# 2. Install from package manifests only (cached until a manifest or the lockfile changes), then build.
FROM base AS build
ARG APP
COPY --from=prune /repo/out/json/ .
RUN --mount=type=secret,id=extra_ca,required=false \
    --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-meta,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
COPY .swcrc turbo.json ./
RUN turbo run build --filter=@setubandh/${APP}
# Collect only build output (and SQL migrations) for the runtime image.
RUN mkdir -p /out && for d in apps/*/dist packages/*/dist packages/db/migrations; do \
      if [ -d "$d" ]; then mkdir -p "/out/$(dirname "$d")" && cp -r "$d" "/out/$d"; fi; \
    done

# 3. Production dependencies only, installed fresh from the pruned manifests.
FROM base AS prod-deps
COPY --from=prune /repo/out/json/ .
RUN --mount=type=secret,id=extra_ca,required=false \
    --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=pnpm-meta,target=/root/.cache/pnpm \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# 4. Runtime: production dependencies plus compiled code, as the unprivileged node user.
FROM ${NODE_IMAGE} AS runtime
ARG APP
ENV NODE_ENV=production APP=${APP}
COPY --from=prod-deps --chown=node:node /repo /app
COPY --from=build --chown=node:node /out /app
WORKDIR /app/apps/${APP}
USER node
EXPOSE 3000
# api: liveness over HTTP. The worker has no HTTP server; its process is supervised instead.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD [ "$APP" != "api" ] || node -e "fetch('http://127.0.0.1:3000/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["node", "--enable-source-maps", "dist/main.js"]
