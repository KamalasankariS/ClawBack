#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   ClawBack — Deduction Recovery Tool    ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ─── 1. Check prerequisites ───
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Install Node 18+ and try again.${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js 18+ required. You have $(node -v).${NC}"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker is not installed. Install Docker Desktop and try again.${NC}"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo -e "${RED}Docker is not running. Start Docker Desktop and try again.${NC}"
  exit 1
fi

echo -e "  Node $(node -v) ${GREEN}OK${NC}"
echo -e "  Docker ${GREEN}OK${NC}"

# ─── 2. Start PostgreSQL ───
echo -e "${YELLOW}[2/6] Starting PostgreSQL...${NC}"

cd "$ROOT_DIR"
if docker compose ps --status running 2>/dev/null | grep -q "db"; then
  echo -e "  Already running ${GREEN}OK${NC}"
else
  docker compose up -d
  echo -e "  Waiting for database to be ready..."
  sleep 3
  # Wait until postgres accepts connections
  for i in {1..20}; do
    if docker compose exec -T db pg_isready -U clawback &> /dev/null; then
      break
    fi
    sleep 1
  done
  echo -e "  PostgreSQL started ${GREEN}OK${NC}"
fi

# ─── 3. Install dependencies ───
echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"

cd "$ROOT_DIR/server"
if [ ! -d "node_modules" ]; then
  npm install --silent
  echo -e "  Server dependencies installed ${GREEN}OK${NC}"
else
  echo -e "  Server dependencies ${GREEN}OK${NC}"
fi

cd "$ROOT_DIR/client"
if [ ! -d "node_modules" ]; then
  npm install --silent
  echo -e "  Client dependencies installed ${GREEN}OK${NC}"
else
  echo -e "  Client dependencies ${GREEN}OK${NC}"
fi

# ─── 4. Set up database ───
echo -e "${YELLOW}[4/6] Setting up database...${NC}"

cd "$ROOT_DIR/server"

# Create .env if missing
if [ ! -f ".env" ]; then
  echo 'DATABASE_URL="postgresql://clawback:clawback@localhost:5433/clawback?schema=public"' > .env
  echo -e "  Created .env ${GREEN}OK${NC}"
fi

# Run migrations
npx prisma migrate deploy --schema=prisma/schema.prisma > /dev/null 2>&1 || npx prisma db push --skip-generate > /dev/null 2>&1
npx prisma generate --schema=prisma/schema.prisma > /dev/null 2>&1
echo -e "  Database migrated ${GREEN}OK${NC}"

# ─── 5. Seed data (only if empty) ───
echo -e "${YELLOW}[5/6] Checking seed data...${NC}"

DEDUCTION_COUNT=$(docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db psql -U clawback -t -c "SELECT COUNT(*) FROM deductions;" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$DEDUCTION_COUNT" = "0" ] || [ -z "$DEDUCTION_COUNT" ]; then
  echo -e "  Database is empty — seeding 1,000+ deductions..."
  cd "$ROOT_DIR/server"
  npx tsx src/seed/seed.ts
  echo -e "  Seed complete ${GREEN}OK${NC}"
else
  echo -e "  $DEDUCTION_COUNT deductions already in database ${GREEN}OK${NC}"
fi

# ─── 6. Start the app ───
echo -e "${YELLOW}[6/6] Starting ClawBack...${NC}"
echo ""

# Cleanup function to kill background processes
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $SERVER_PID $CLIENT_PID 2>/dev/null
  wait $SERVER_PID $CLIENT_PID 2>/dev/null
  echo -e "${GREEN}ClawBack stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start server in background
cd "$ROOT_DIR/server"
npm run dev &
SERVER_PID=$!

# Start client in background
cd "$ROOT_DIR/client"
npm run dev &
CLIENT_PID=$!

sleep 3
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ClawBack is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  App:      ${CYAN}http://localhost:5173${NC}"
echo -e "  API:      ${CYAN}http://localhost:3001${NC}"
echo -e "  Database: ${CYAN}localhost:5433${NC}"
echo ""
echo -e "  First time? Register at the login page."
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop."
echo ""

# Auto-open in default browser
if command -v open &> /dev/null; then
  open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:5173
fi

# Wait for either process to exit
wait $SERVER_PID $CLIENT_PID
