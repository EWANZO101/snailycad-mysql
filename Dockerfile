# syntax=docker/dockerfile:1
# the directive above is required for the --mount=type=cache layers below
FROM node:20-slim AS base

WORKDIR /snailycad

# fallbacks for hosts with broken container networking: public DNS, other Debian mirrors, retries
COPY scripts/docker/build-network.sh /usr/local/bin/snailycad-build-network

# not in the slim image: OpenSSL for Prisma, git for the API's startup requirements check
RUN sh /usr/local/bin/snailycad-build-network apt openssl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm globally and set config in one layer; downloads retry instead of failing the build
RUN sh /usr/local/bin/snailycad-build-network dns \
  && npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm install -g pnpm@9.0.4 && pnpm config set httpTimeout 1200000 \
  && pnpm config set fetch-retries 5 && pnpm config set store-dir /pnpm-store

FROM base AS deps

# Only the files pnpm needs to resolve the workspace. Copying just these - not the rest of the
# source - means an application-code-only change can't invalidate this layer or the cached pnpm
# store below: a rebuild (Control Panel "Rebuild", or a retried build after a network failure)
# reuses already-downloaded dependencies instead of reinstalling the whole tree from scratch.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/client/package.json apps/client/package.json
COPY packages/audit-logger/package.json packages/audit-logger/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/permissions/package.json packages/permissions/package.json
COPY packages/radio/package.json packages/radio/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json

# The pnpm store is cache-mounted so the downloaded packages survive across builds too, not just
# across layers of the same build (BuildKit required - already assumed elsewhere in this image).
RUN --mount=type=cache,target=/pnpm-store \
  sh /usr/local/bin/snailycad-build-network dns && pnpm install --frozen-lockfile

# Now bring in the rest of the source. Only this layer (and everything after it) is invalidated by
# an application-code change; the dependency install above stays cached.
COPY . ./

FROM deps AS build

ENV NODE_ENV="production"

# Build all packages (this will also build the API and Client). The Turborepo cache is also
# mounted, so an unchanged package is skipped on a rebuild instead of recompiled every time.
RUN --mount=type=cache,target=/snailycad/.turbo-cache \
  pnpm turbo run build --filter="{packages/*}" --cache-dir=.turbo-cache


FROM build AS api
ENV NODE_ENV="production"
WORKDIR /snailycad/apps/api
RUN pnpm run build
CMD ["pnpm", "start"]

FROM build AS client
ENV NODE_ENV="production"
WORKDIR /snailycad/apps/client
RUN rm -rf /snailycad/apps/client/.next
RUN pnpm create-images-domain
RUN pnpm run build
CMD ["pnpm", "start"]