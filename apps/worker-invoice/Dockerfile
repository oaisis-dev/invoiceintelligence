FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace config
COPY package.json bun.lock* turbo.json ./
COPY packages/ ./packages/
COPY apps/worker-invoice/ ./apps/worker-invoice/

# Install dependencies
RUN bun install --frozen-lockfile

# Expose port
EXPOSE 8080

# Start the service
CMD ["bun", "run", "apps/worker-invoice/src/index.ts"]
