FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace config
COPY package.json bun.lock* turbo.json ./
COPY packages/ ./packages/
COPY apps/worker-email/ ./apps/worker-email/

# Install dependencies
RUN bun install --frozen-lockfile

# Start the service (cron job — no HTTP server)
CMD ["bun", "run", "apps/worker-email/src/index.ts"]
