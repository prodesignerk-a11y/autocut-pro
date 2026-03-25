# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

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
RUN pnpm --filter @autocut/worker build

# Stage 2: Production
FROM node:20-alpine AS runner

# Install FFmpeg
RUN apk add --no-cache ffmpeg ca-certificates

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/worker/package.json ./packages/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --no-frozen-lockfile --prod

COPY --from=builder /app/packages/worker/dist ./packages/worker/dist
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Create temp directory
RUN mkdir -p /tmp/autocut

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV TEMP_DIR=/tmp/autocut

CMD ["node", "packages/worker/dist/index.js"]
