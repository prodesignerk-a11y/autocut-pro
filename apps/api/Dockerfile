# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY apps/api ./apps/api

RUN pnpm --filter @autocut/database db:generate
RUN pnpm add -D tsup --filter @autocut/shared --filter @autocut/api
RUN pnpm --filter @autocut/shared build
RUN pnpm --filter @autocut/api build

# Stage 2: Production
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @autocut/database db:generate

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
