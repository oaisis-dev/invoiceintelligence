FROM oven/bun:1-alpine AS bun-base
FROM node:22-alpine AS node-base

# ---------- Stage 1: Install dependencies (Bun — fast) ----------
FROM bun-base AS deps
WORKDIR /app

# Copy workspace config and app package files
COPY package.json bun.lock* turbo.json ./
COPY packages/ ./packages/
COPY apps/admin/ ./apps/admin/

RUN bun install --frozen-lockfile

# ---------- Stage 2: Build the application (Node — stable) ----------
FROM node-base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/admin ./apps/admin
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/turbo.json ./turbo.json

# NEXT_PUBLIC_* vars inlined into client-side JS at build time
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV CI=true
ENV NODE_ENV=production

WORKDIR /app/apps/admin
RUN npx next build

# ---------- Stage 3: Production runner ----------
FROM node-base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts from builder
COPY --from=builder /app/apps/admin/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
