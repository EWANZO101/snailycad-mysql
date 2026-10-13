FROM node:20-slim AS base

WORKDIR /snailycad

# not in the slim image: OpenSSL for Prisma, git for the API's startup requirements check.
# IPv4 only, short timeouts and retries: on hosts with broken IPv6 or a flaky mirror, apt would
# otherwise hang for minutes before failing the whole build
RUN printf 'Acquire::ForceIPv4 "true";\nAcquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
    > /etc/apt/apt.conf.d/99snailycad-network \
  && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm globally and set config in one layer
RUN npm install -g pnpm@9.0.4 && pnpm config set httpTimeout 1200000

# Copy the rest of the source code
COPY . ./

FROM base AS deps

RUN pnpm install --frozen-lockfile

FROM deps AS build

ENV NODE_ENV="production"

# Build all packages (this will also build the API and Client)
RUN pnpm turbo run build --filter="{packages/*}"


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