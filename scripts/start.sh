#!/usr/bin/env bash
# Robust startup script for Job-Ops orchestrator
# Run from the monorepo root: ./scripts/start.sh

set -e

MONOREPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$MONOREPO_ROOT"

echo "================================================"
echo "🚀 Job-Ops Orchestrator Startup"
echo "================================================"
echo ""

# Function to find an available port
find_available_port() {
    local start_port="${1:-3001}"
    local max_attempts="${2:-100}"
    
    for ((i=0; i<max_attempts; i++)); do
        local test_port=$((start_port + i))
        if ! lsof -Pi :$test_port -sTCP:LISTEN -t >/dev/null 2>&1 && \
           ! netstat -an 2>/dev/null | grep -q ":$test_port.*LISTEN"; then
            echo "$test_port"
            return 0
        fi
    done
    
    echo "-1"
    return 1
}

# Function to update PORT in .env file
update_port_in_env() {
    local new_port="$1"
    
    if [ -f ".env" ]; then
        if grep -q "^PORT=" ".env"; then
            # Update existing PORT line
            sed -i.bak "s/^PORT=.*/PORT=$new_port/" ".env" && rm ".env.bak"
        else
            # Add PORT line at the beginning after header
            sed -i.bak "1a\\
PORT=$new_port
" ".env" && rm ".env.bak"
        fi
        echo "✅ Updated PORT=$new_port in .env file"
    fi
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the monorepo root."
  exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env file not found. Copying from .env.example..."
  cp .env.example .env
  echo "✅ Created .env - please configure it with your credentials."
  echo ""
fi

# Install dependencies if node_modules doesn't exist or is incomplete
if [ ! -d "node_modules" ] || [ ! -d "orchestrator/node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm ci
  echo "✅ Dependencies installed"
  echo ""
fi

# Rebuild native modules
echo "🔧 Rebuilding native modules (better-sqlite3)..."
if npm --workspace orchestrator rebuild better-sqlite3 2>/dev/null; then
    echo "✅ Native modules rebuilt"
else
    echo "⚠️  Native module rebuild skipped (may already be compiled)"
fi
echo ""

# Build client
if [ ! -d "orchestrator/dist/client" ]; then
  echo "🏗️  Building client bundle..."
  npm --workspace orchestrator run build:client
  echo "✅ Client built"
  echo ""
else
  echo "ℹ️  Client bundle exists (skipping build)"
  echo ""
fi

# Run migrations
echo "🗄️  Running database migrations..."
npm --workspace orchestrator run db:migrate
echo "✅ Migrations complete"
echo ""

# Read PORT from .env or use default
DESIRED_PORT=3001
if [ -f ".env" ] && grep -q "^PORT=" ".env"; then
    DESIRED_PORT=$(grep "^PORT=" ".env" | cut -d'=' -f2)
fi

# Check if desired port is in use
echo "🔍 Checking port availability..."

if lsof -Pi :$DESIRED_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  PID=$(lsof -Pi :$DESIRED_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
  
  # Get process name
  PROCESS_NAME="Unknown"
  if [ -n "$PID" ]; then
      if command -v ps >/dev/null 2>&1; then
          PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "Unknown")
      fi
  fi
  
  echo "⚠️  Port $DESIRED_PORT is in use by process: $PROCESS_NAME (PID: $PID)"
  echo ""
  echo "Choose an option:"
  echo "  [1] Kill the process and use port $DESIRED_PORT"
  echo "  [2] Find and use an alternative port automatically"
  echo "  [3] Exit"
  echo ""
  
  read -p "Enter your choice (1-3): " choice
  
  case $choice in
    1)
      if kill -9 "$PID" 2>/dev/null; then
          echo "✅ Killed process $PID ($PROCESS_NAME)"
          sleep 2
      else
          echo "❌ Failed to kill process. Finding alternative port..."
          AVAILABLE_PORT=$(find_available_port $((DESIRED_PORT + 1)))
          
          if [ "$AVAILABLE_PORT" = "-1" ]; then
              echo "❌ Could not find an available port"
              exit 1
          fi
          
          echo "✅ Found available port: $AVAILABLE_PORT"
          update_port_in_env "$AVAILABLE_PORT"
          DESIRED_PORT=$AVAILABLE_PORT
      fi
      echo ""
      ;;
    2)
      AVAILABLE_PORT=$(find_available_port $((DESIRED_PORT + 1)))
      
      if [ "$AVAILABLE_PORT" = "-1" ]; then
          echo "❌ Could not find an available port in range $((DESIRED_PORT+1))-$((DESIRED_PORT+100))"
          exit 1
      fi
      
      echo "✅ Found available port: $AVAILABLE_PORT"
      update_port_in_env "$AVAILABLE_PORT"
      DESIRED_PORT=$AVAILABLE_PORT
      echo ""
      ;;
    3)
      echo "❌ Exiting as requested."
      exit 0
      ;;
    *)
      echo "❌ Invalid choice. Exiting."
      exit 1
      ;;
  esac
else
  echo "✅ Port $DESIRED_PORT is available"
  echo ""
fi

# Start server
echo "================================================"
echo "🚀 Starting orchestrator server on port $DESIRED_PORT..."
echo "================================================"
echo ""

# Set PORT environment variable for this session
export PORT=$DESIRED_PORT

npm --workspace orchestrator run start
