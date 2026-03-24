# AutoCut Pro

AI-powered video editing platform that automatically removes silences, pauses, and dead air from videos using FFmpeg's silence detection engine.

## Architecture

```
autocut-pro/
├── apps/
│   ├── web/          Next.js 14 frontend (port 3000)
│   └── api/          Express REST API (port 4000)
├── packages/
│   ├── database/     Prisma schema + client
│   ├── worker/       BullMQ video processing worker
│   └── shared/       TypeScript types shared across packages
├── scripts/
│   └── setup.sh      Local dev setup script
├── docker-compose.yml
└── turbo.json        Turborepo config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend API | Express, TypeScript, JWT auth, Zod validation |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Video Processing | FFmpeg (fluent-ffmpeg) |
| Storage | AWS S3 / Cloudflare R2 |
| Auth | JWT (API) + NextAuth (Web) |
| Monorepo | pnpm workspaces + Turborepo |

## Prerequisites

- Node.js 18+
- pnpm 9+
- Docker + Docker Compose
- FFmpeg (for local worker development)

## Local Development

### Quick setup

```bash
git clone <repo-url>
cd autocut-pro
./scripts/setup.sh
```

The setup script will:
1. Check all dependencies
2. Copy `.env.example` to `.env`
3. Install all packages via pnpm
4. Start PostgreSQL and Redis via Docker
5. Run Prisma migrations
6. Generate Prisma client

### Manual setup

```bash
# 1. Copy env
cp .env.example .env
# Edit .env with your values

# 2. Install packages
pnpm install

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Setup database
pnpm db:generate
pnpm db:migrate

# 5. Start all dev servers
pnpm dev
```

### Individual services

```bash
# API (port 4000)
pnpm --filter @autocut/api dev

# Worker
pnpm --filter @autocut/worker dev

# Web (port 3000)
pnpm --filter @autocut/web dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `S3_BUCKET_NAME` | S3/R2 bucket name | Yes |
| `S3_ACCESS_KEY_ID` | Storage access key | Yes |
| `S3_SECRET_ACCESS_KEY` | Storage secret key | Yes |
| `S3_ENDPOINT` | Custom S3 endpoint (for R2) | R2 only |
| `S3_PUBLIC_URL` | Public base URL for files | No |
| `JWT_SECRET` | API JWT signing secret | Yes |
| `NEXTAUTH_SECRET` | NextAuth signing secret | Yes |
| `NEXTAUTH_URL` | Next.js app URL | Yes |
| `NEXT_PUBLIC_API_URL` | API URL (browser) | Yes |
| `FFMPEG_PATH` | FFmpeg binary path | Worker |
| `FFPROBE_PATH` | FFprobe binary path | Worker |
| `WORKER_CONCURRENCY` | Parallel jobs | No (default: 2) |
| `ADMIN_EMAIL` | Email for admin role | No |

## Video Processing Pipeline

```
Upload (chunked to S3)
    │
    ▼
BullMQ Queue
    │
    ▼
Worker picks up job
    │
    ├─ 1. Download original from S3 → /tmp
    ├─ 2. FFprobe: get duration, codec, resolution
    ├─ 3. FFmpeg silencedetect filter → silence timestamps
    ├─ 4. Build cut timeline (mode: light/medium/aggressive)
    ├─ 5. Apply padding around speech segments
    ├─ 6. FFmpeg select/aselect filter → trim + concat
    ├─ 7. Upload processed video → S3
    ├─ 8. Update VideoProject metrics in DB
    └─ 9. Mark job complete, cleanup /tmp
```

### Processing Modes

| Mode | Min Silence | Padding | Use case |
|------|-------------|---------|----------|
| Light | 1.5s | 300ms | Interviews, podcasts |
| Medium | 0.8s | 200ms | General content (default) |
| Aggressive | 0.3s | 100ms | Lectures, tutorials |

## API Reference

All responses follow: `{ success: boolean, data?: T, error?: string, message?: string }`

### Auth
```
POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password } → { user, tokens }
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh-token
```

### Uploads (chunked)
```
POST /api/uploads/sessions                    Create session
POST /api/uploads/sessions/:id/presign/:chunk Get S3 presigned URL
POST /api/uploads/sessions/:id/chunk         Mark chunk uploaded
POST /api/uploads/sessions/:id/complete      Finalize → create job
GET  /api/uploads/sessions/:id               Session status
DELETE /api/uploads/sessions/:id             Cancel
```

### Videos
```
GET    /api/videos              List videos (paginated)
GET    /api/videos/:id          Video details
POST   /api/videos/:id/reprocess  Reprocess with new settings
DELETE /api/videos/:id          Delete video + S3 assets
GET    /api/videos/:id/download  Get signed download URL
```

### Jobs
```
GET /api/jobs/:id/status    Job status + progress
GET /api/jobs/:id/logs      Worker logs
```

### Admin
```
GET /api/admin/jobs    All jobs
GET /api/admin/users   All users
GET /api/admin/stats   Platform statistics
```

## Upload Flow

The frontend uses **direct-to-S3 chunked uploads** (browser → S3, no data through API server):

```
1. POST /api/uploads/sessions
   → get sessionId

2. For each 5MB chunk:
   a. POST /api/uploads/sessions/:id/presign/:chunkIndex
      → get presigned S3 URL
   b. PUT (chunk data) directly to S3 presigned URL
   c. POST /api/uploads/sessions/:id/chunk (mark uploaded)

3. POST /api/uploads/sessions/:id/complete
   → creates VideoProject + ProcessingJob
   → adds job to BullMQ queue
   → returns { videoProjectId, jobId }
```

## Deploy

### Vercel (Web)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy web app
cd apps/web
vercel

# Set env vars in Vercel dashboard:
# NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_API_URL
```

### Railway (API + Worker)

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

# Deploy API
cd apps/api
railway up

# Deploy Worker
cd packages/worker
railway up

# Add PostgreSQL and Redis services in Railway dashboard
```

### Docker (Self-hosted)

```bash
# Build all images
docker compose build

# Start everything
docker compose up -d

# Run migrations
docker compose exec api npx prisma migrate deploy
```

## Database Management

```bash
# Open Prisma Studio (visual DB editor)
pnpm db:studio

# Create new migration
pnpm db:migrate

# Push schema changes (dev only)
pnpm db:push

# Regenerate client after schema changes
pnpm db:generate
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a pull request

### Code Style
- TypeScript strict mode everywhere
- `ApiResponse<T>` for all API responses
- BullMQ for all async jobs (no direct processing in API routes)
- Zod schemas for all request validation

## License

MIT
