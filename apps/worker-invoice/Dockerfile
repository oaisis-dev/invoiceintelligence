# Base image with Bun
FROM oven/bun:1 AS base

# Install turbo CLI globally
FROM base AS turbo-cli
RUN bun add -g turbo

# Builder stage — prune worker-invoice workspace
FROM turbo-cli AS builder
WORKDIR /app
COPY . .
RUN turbo prune @invoiceprocessor/worker-invoice --docker --out-dir=out/worker-invoice

# Installer stage — install deps
FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/worker-invoice/json/ .
COPY bunfig.toml .

RUN rm -f bun.lock
RUN bun install

COPY --from=builder /app/out/worker-invoice/full/ .

# Runner stage — clean image
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/worker-invoice ./apps/worker-invoice
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/package.json ./package.json

WORKDIR /app/apps/worker-invoice

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]
