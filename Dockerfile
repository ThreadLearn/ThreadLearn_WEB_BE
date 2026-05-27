# ============================================
# Stage 1: Install ALL dependencies (including devDeps for build)
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ============================================
# Stage 2: Builder — compile NestJS
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN DATABASE_URL="mongodb://localhost:27017/dummy" \
    JWT_ACCESS_SECRET="dummy_access" \
    JWT_REFRESH_SECRET="dummy_refresh" \
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
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules

RUN mkdir -p ./logs ./public/uploads/attachments ./public/uploads/avatars
RUN chown -R nestjs:nodejs ./logs ./public/uploads

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
