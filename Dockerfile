# syntax=docker.io/docker/dockerfile:1

##############################################
# 0. Base image with runtime dependencies
##############################################
FROM node:22-alpine AS base

WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  cairo \
  pango \
  jpeg \
  giflib \
  pixman \
  libpng \
  libjpeg-turbo \
  freetype \
  fontconfig

##############################################
# 1. Deps stage — install build dependencies
##############################################
FROM base AS deps

WORKDIR /app

RUN apk update && apk add --no-cache \
  python3 make g++ bash pkgconfig \
  cairo-dev pango-dev giflib-dev \
  libjpeg-turbo-dev libpng-dev pixman-dev musl-dev

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i; \
  else echo "Lockfile not found." && exit 1; \
  fi

##############################################
# 2. Builder stage — build Next.js app
##############################################
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# BUILD VERIFICATION 
# Build verification - ensures standalone output exists
RUN echo "=== Build Verification ===" && \
    echo "Checking standalone directory structure..." && \
    ls -la .next/ && \
    echo "Checking standalone build contents..." && \
    ls -la .next/standalone/ && \
    echo "Checking for server.js..." && \
    [ -f .next/standalone/server.js ] || (echo "ERROR: server.js not found in standalone build!" && exit 1) && \
    echo "✅ Build verification passed - server.js found"

##############################################
# 3. Runner stage — production image
##############################################
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production PORT=3000

# Create a non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# Install Redis CLI for health checks
RUN apk add --no-cache redis curl

# Copy wait script
COPY --chown=nextjs:nodejs wait-for-redis.sh /app/wait-for-redis.sh
RUN chmod +x /app/wait-for-redis.sh

# Copy standalone build and static assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# ✅ HEALTHCHECK 
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["./wait-for-redis.sh", "redis", "6379"]
CMD ["node", "server.js"]