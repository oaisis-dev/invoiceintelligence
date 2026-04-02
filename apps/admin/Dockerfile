FROM node:22-alpine AS node-base
FROM oven/bun:1-alpine AS bun-base

# ---------- Stage 1: Install dependencies (Bun — fast) ----------
FROM bun-base AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- Stage 2: Build the application (Node — stable) ----------
FROM node-base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into client-side JS at build time.
# Admin app only needs Google OAuth client ID — all other config is server-only at runtime.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN npx next build

# ---------- Stage 3: Production runner ----------
FROM node-base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# HOSTNAME must be 0.0.0.0 — Next.js standalone defaults to localhost,
# which won't accept external connections in Cloud Run.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
