#!/usr/bin/env bash
# ============================================================
# AutoCut Pro — Local Development Setup Script
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[info]${NC} $1"; }

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║     AutoCut Pro — Setup Script    ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# ============================================================
# Check dependencies
# ============================================================

log "Checking dependencies..."

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    error "$1 is required but not installed. Please install it and try again."
  fi
  log "  ✓ $1 found"
}

check_cmd node
check_cmd pnpm
check_cmd docker

# Check Node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 18+ is required. Current version: $(node -v)"
fi
log "  ✓ Node.js $(node -v)"

# Check pnpm version
log "  ✓ pnpm $(pnpm -v)"

# ============================================================
# Copy environment file
# ============================================================

if [ ! -f ".env" ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  warn "Please edit .env and fill in your configuration values before proceeding."
  echo ""
  info "Key values to set:"
  echo "  - DATABASE_URL"
  echo "  - S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY + S3_ENDPOINT"
  echo "  - JWT_SECRET"
  echo "  - NEXTAUTH_SECRET"
  echo ""
  read -p "Press Enter to continue after editing .env (or Ctrl+C to exit)..."
else
  log ".env already exists — skipping copy"
fi

# ============================================================
# Install packages
# ============================================================

log "Installing dependencies..."
pnpm install

# ============================================================
# Start Docker services
# ============================================================

log "Starting Docker services (PostgreSQL + Redis)..."
docker compose up -d postgres redis

log "Waiting for PostgreSQL to be ready..."
until docker compose exec postgres pg_isready -U autocut -d autocut_pro &>/dev/null; do
  printf '.'
  sleep 1
done
echo ""
log "PostgreSQL is ready!"

log "Waiting for Redis to be ready..."
until docker compose exec redis redis-cli ping &>/dev/null; do
  printf '.'
  sleep 1
done
echo ""
log "Redis is ready!"

# ============================================================
# Database setup
# ============================================================

log "Generating Prisma client..."
pnpm db:generate

log "Running database migrations..."
pnpm db:migrate

# ============================================================
# Create temp directories
# ============================================================

log "Creating temp directories..."
mkdir -p /tmp/autocut
mkdir -p logs

# ============================================================
# Done
# ============================================================

echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║            Setup Complete!                        ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""
log "Start the development servers:"
echo ""
echo "  Option 1 — Turbo (all services):"
echo "    pnpm dev"
echo ""
echo "  Option 2 — Individual services:"
echo "    pnpm --filter @autocut/api dev      # API on :4000"
echo "    pnpm --filter @autocut/worker dev   # Worker"
echo "    pnpm --filter @autocut/web dev      # Web on :3000"
echo ""
log "Other useful commands:"
echo "  pnpm db:studio      # Open Prisma Studio"
echo "  docker compose logs # View all logs"
echo "  docker compose down # Stop services"
echo ""
