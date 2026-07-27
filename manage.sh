#!/usr/bin/env bash
# ===========================================================================
# pixelArt — Project Manager
# ===========================================================================
# Usage:
#   ./manage.sh dev            Start backend + frontend (dev mode, --reload)
#   ./manage.sh dev:backend    Start only backend (dev mode)
#   ./manage.sh dev:frontend   Start only frontend (dev mode)
#   ./manage.sh build          Build frontend for production
#   ./manage.sh prod           Start backend (production mode, no --reload)
#   ./manage.sh test           Run all tests
#   ./manage.sh test:backend   Run backend tests (pytest)
#   ./manage.sh test:frontend  Run frontend tests (vitest)
#   ./manage.sh stop           Stop all running services
#   ./manage.sh status         Show running services and ports
#   ./manage.sh logs           Watch backend + frontend logs
#   ./manage.sh setup          Install all dependencies (first time)
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
PID_DIR="$ROOT/.pids"

mkdir -p "$PID_DIR"

# ── Colors ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m' # No Color
info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()   { echo -e "${RED}[err]${NC}   $*"; }

# ── Helpers ───────────────────────────────────────────────────────────────
pidfile()  { echo "$PID_DIR/$1.pid"; }
is_running() { [[ -f "$(pidfile "$1")" ]] && kill -0 "$(cat "$(pidfile "$1")")" 2>/dev/null; }

stop_service() {
    local name="$1" file
    file="$(pidfile "$name")"
    if [[ ! -f "$file" ]]; then
        warn "$name — not running (no pidfile)"
        return 0
    fi
    local pid
    pid="$(cat "$file")"
    if kill "$pid" 2>/dev/null; then
        ok "$name — stopped (pid $pid)"
    else
        warn "$name — not running (stale pid $pid)"
    fi
    rm -f "$file"
}

wait_for_http() {
    local url="$1" label="$2" max=15 i=0
    while ! curl -s -o /dev/null "$url" 2>/dev/null; do
        i=$((i + 1))
        if [[ $i -ge $max ]]; then
            err "$label — not ready after ${max}s"
            return 1
        fi
        sleep 1
    done
    ok "$label — ready ($url)"
}

# ── Commands ──────────────────────────────────────────────────────────────
cmd_dev()      { dev_backend; dev_frontend; info "Dev servers running. Use './manage.sh stop' to stop."; }
cmd_dev_be()   { dev_backend; }
cmd_dev_fe()   { dev_frontend; }

dev_backend() {
    if is_running backend; then warn "Backend already running"; return 0; fi
    info "Starting backend (uvicorn --reload) on :8000..."
    cd "$BACKEND_DIR"
    nohup "$VENV_DIR/bin/uvicorn" api.main:app --reload --port 8000 --host 0.0.0.0 \
        > /tmp/pixelart-backend.log 2>&1 &
    echo $! > "$(pidfile backend)"
    wait_for_http "http://localhost:8000/" "Backend"
}

dev_frontend() {
    if is_running frontend; then warn "Frontend already running"; return 0; fi
    info "Starting frontend (vite dev) on :5173..."
    cd "$FRONTEND_DIR"
    nohup npx vite --port 5173 --host 0.0.0.0 \
        > /tmp/pixelart-frontend.log 2>&1 &
    echo $! > "$(pidfile frontend)"
    wait_for_http "http://localhost:5173/" "Frontend"
}

cmd_build() {
    info "Building frontend for production..."
    cd "$FRONTEND_DIR"
    npx vite build
    ok "Frontend built → $FRONTEND_DIR/dist/"
}

cmd_prod() {
    if is_running backend; then warn "Backend already running"; return 0; fi
    info "Starting backend (production) on :8000..."
    cd "$BACKEND_DIR"
    nohup "$VENV_DIR/bin/uvicorn" api.main:app --port 8000 --host 127.0.0.1 \
        > /tmp/pixelart-backend.log 2>&1 &
    echo $! > "$(pidfile backend)"
    wait_for_http "http://localhost:8000/" "Backend"
    info "Backend running in production mode. Frontend should be served via nginx (see deploy/)."
}

cmd_test() {
    cmd_test_backend
    cmd_test_frontend
    ok "All tests passed"
}

cmd_test_backend() {
    info "Running backend tests..."
    cd "$ROOT"
    PYTHONPATH="$BACKEND_DIR" "$VENV_DIR/bin/python" -m pytest tests/ -v --tb=short
    ok "Backend tests passed"
}

cmd_test_frontend() {
    info "Running frontend tests..."
    cd "$FRONTEND_DIR"
    npx vitest run
    ok "Frontend tests passed"
}

cmd_stop() {
    stop_service backend
    stop_service frontend
    info "All services stopped."
}

cmd_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  pixelArt — Service Status${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    if is_running backend; then
        local be_pid
        be_pid=$(cat "$(pidfile backend)")
        echo -e "  ${GREEN}●${NC} Backend   — running (pid $be_pid) — http://localhost:8000"
    else
        echo -e "  ${RED}○${NC} Backend   — stopped"
    fi

    if is_running frontend; then
        local fe_pid
        fe_pid=$(cat "$(pidfile frontend)")
        echo -e "  ${GREEN}●${NC} Frontend  — running (pid $fe_pid) — http://localhost:5173"
    else
        echo -e "  ${RED}○${NC} Frontend  — stopped"
    fi

    echo ""
    echo -e "  ${CYAN}PIDs:${NC}   $(ls "$PID_DIR" 2>/dev/null || echo '—')"
    echo -e "  ${CYAN}Logs:${NC}   /tmp/pixelart-backend.log / /tmp/pixelart-frontend.log"
    echo ""
}

cmd_logs() {
    if [[ $# -eq 0 ]]; then
        tail -f /tmp/pixelart-backend.log /tmp/pixelart-frontend.log 2>/dev/null \
            || err "No logs found. Start services first."
    else
        case "$1" in
            backend|be)  tail -f /tmp/pixelart-backend.log 2>/dev/null  || err "No backend log";;
            frontend|fe) tail -f /tmp/pixelart-frontend.log 2>/dev/null || err "No frontend log";;
            *)           err "Unknown: $1. Use: backend/be | frontend/fe";;
        esac
    fi
}

cmd_setup() {
    info "Setting up backend dependencies..."
    cd "$BACKEND_DIR"
    python3 -m venv .venv
    .venv/bin/pip install -e ".[dev]" 2>&1 | tail -1
    ok "Backend dependencies installed"

    info "Setting up frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install 2>&1 | tail -1
    ok "Frontend dependencies installed"

    info "Setup complete. Run './manage.sh dev' to start."
}

# ── Dispatch ──────────────────────────────────────────────────────────────
help() {
    sed -n '3,16p' "$0" | sed 's/^#//'
    exit 0
}

case "${1:-help}" in
    dev)            cmd_dev ;;
    dev:backend|be) cmd_dev_be ;;
    dev:frontend|fe) cmd_dev_fe ;;
    build)          cmd_build ;;
    prod)           cmd_prod ;;
    test)           cmd_test ;;
    test:backend)   cmd_test_backend ;;
    test:frontend)  cmd_test_frontend ;;
    stop)           cmd_stop ;;
    status|st)      cmd_status ;;
    logs)           shift; cmd_logs "$@" ;;
    setup)          cmd_setup ;;
    *)              help ;;
esac
