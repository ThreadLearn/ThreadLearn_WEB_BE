# ============================================
# Stage 1: Install ALL dependencies (including devDeps for build)
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ============================================
# Stage 2: Builder — compile Next.js + TypeScript
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ============================================
# Build-time environment variables
# ============================================
# Next.js App Router evaluates API routes during `next build`.
# Some routes import env validation (Zod) and require mandatory
# environment variables at build time.
#
# These dummy values are ONLY used for compilation inside Docker
# and CI pipelines. Real production values are injected at runtime
# via deployment environment variables or Docker secrets.

RUN DATABASE_URL="mongodb://localhost:27017/dummy" \
    JWT_ACCESS_SECRET="dummy_access" \
    JWT_REFRESH_SECRET="dummy_refresh" \
    NEXTAUTH_SECRET="dummy_nextauth_secret" \
    npm run build

# ============================================
# Stage 3: Production dependencies only
# ============================================
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ============================================
# Stage 4: Runner (Production)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules

RUN mkdir -p ./logs ./public/uploads/attachments ./public/uploads/avatars
RUN chown -R nextjs:nodejs ./logs ./public/uploads

USER nextjs

EXPOSE 3000

CMD ["node", "dist/server.js"]
