# Stage 1: Build
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/worker/package.json ./packages/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/worker ./packages/worker

RUN pnpm --filter @autocut/database db:generate
RUN pnpm add -D tsup --filter @autocut/shared --filter @autocut/database --filter @autocut/worker
RUN pnpm --filter @autocut/shared build
RUN pnpm --filter @autocut/database build
RUN pnpm --filter @autocut/worker build

# Stage 2: Production
FROM node:20-slim AS runner

# Install FFmpeg + OpenSSL
RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    ca-certificates \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/worker/package.json ./packages/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @autocut/database db:generate

COPY --from=builder /app/packages/worker/dist ./packages/worker/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist

RUN mkdir -p /tmp/autocut

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV TEMP_DIR=/tmp/autocut

CMD ["node", "packages/worker/dist/index.js"]
