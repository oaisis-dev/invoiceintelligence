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

# NEXT_PUBLIC_* vars needed at build time for Next.js compilation.
# Clerk keys are baked into client JS (shared across environments).
# Supabase URL/key are injected at runtime via window.__RUNTIME_CONFIG__
# (see lib/runtime-config.ts) so the same image works with different
# Supabase projects per environment.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_DOMAIN
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_DOMAIN=$NEXT_PUBLIC_CLERK_DOMAIN
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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
