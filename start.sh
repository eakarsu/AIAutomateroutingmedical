#!/bin/bash

# HomeHealth Pro - Start Script
# Starts backend and frontend with hot reload, seeds database

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   HomeHealth Pro - Route & Order Management     ${NC}"
echo -e "${BLUE}================================================${NC}"

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo -e "${YELLOW}Cleaning up ports...${NC}"
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null) || true
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}Killing processes on port $port...${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

# Check PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if ! pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" >/dev/null 2>&1; then
  echo -e "${RED}PostgreSQL is not running. Starting...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo -e "${RED}Failed to start PostgreSQL. Please start it manually.${NC}"
    exit 1
  }
  sleep 3
fi

# Create database if not exists
echo -e "${YELLOW}Setting up database...${NC}"
createdb "${DB_NAME:-homehealth}" 2>/dev/null || true

# Run init SQL
echo -e "${YELLOW}Initializing tables...${NC}"
psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-homehealth}" -f backend/db/init.sql -q 2>/dev/null || \
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-homehealth}" -f backend/db/init.sql -q

# Run seed SQL
echo -e "${YELLOW}Seeding data...${NC}"
psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-homehealth}" -f backend/db/seed.sql -q 2>/dev/null || \
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-homehealth}" -f backend/db/seed.sql -q

echo -e "${GREEN}Database setup complete!${NC}"

# Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
  echo -e "${YELLOW}Installing backend dependencies...${NC}"
  (cd backend && npm install)
fi

if [ ! -d "frontend/node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  (cd frontend && npm install)
fi

# Track child PIDs for cleanup
PIDS=()

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  sleep 1
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"
  echo -e "${GREEN}Stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start backend with hot reload (nodemon)
echo -e "${GREEN}Starting backend on port ${BACKEND_PORT} (with hot reload)...${NC}"
(cd "$ROOT_DIR/backend" && npx nodemon server.js) &
PIDS+=($!)

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend...${NC}"
for i in $(seq 1 20); do
  if curl -s "http://localhost:${BACKEND_PORT}/api/health" >/dev/null 2>&1; then
    echo -e "${GREEN}Backend is ready!${NC}"
    break
  fi
  sleep 1
done

# Seed bcrypt passwords (needs running backend)
echo -e "${YELLOW}Seeding user passwords...${NC}"
curl -s -X POST "http://localhost:${BACKEND_PORT}/api/auth/seed-password" > /dev/null 2>&1 || true

# Start frontend with hot reload (Vite) - use --strictPort so it doesn't pick a random port
echo -e "${GREEN}Starting frontend on port ${FRONTEND_PORT} (with hot reload)...${NC}"
(cd "$ROOT_DIR/frontend" && npx vite --port "${FRONTEND_PORT}" --strictPort) &
PIDS+=($!)

sleep 2

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Application is running!                       ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${BLUE}   Frontend: http://localhost:${FRONTEND_PORT}${NC}"
echo -e "${BLUE}   Backend:  http://localhost:${BACKEND_PORT}${NC}"
echo -e "${BLUE}   Login:    admin@homehealth.com / admin123${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for any child to exit
wait
