FROM oven/bun:1-alpine AS bun-base
FROM node:22-alpine AS node-base

# ---------- Stage 1: Install dependencies (Bun — fast) ----------
FROM bun-base AS deps
WORKDIR /app

# Copy workspace config and app package files
COPY package.json bun.lock* turbo.json ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/

RUN bun install --frozen-lockfile

# ---------- Stage 2: Build the application (Node — stable) ----------
FROM node-base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/dashboard ./apps/dashboard
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/turbo.json ./turbo.json

# NEXT_PUBLIC_* vars needed at build time for Next.js compilation
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_ID
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_OPENPANEL_CLIENT_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_PLAID_ENVIRONMENT
ARG NEXT_PUBLIC_TELLER_APPLICATION_ID
ARG NEXT_PUBLIC_TELLER_ENVIRONMENT
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_API_KEY
ARG NEXT_PUBLIC_DESKTOP_SCHEME
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_DOMAIN

# Sentry source map upload (build-time only)
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT

ENV CI=true
ENV NODE_ENV=production

WORKDIR /app/apps/dashboard
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
COPY --from=builder /app/apps/dashboard/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
