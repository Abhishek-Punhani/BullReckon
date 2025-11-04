#!/bin/bash

# Test runner script for Transcript Server

cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./start.sh first."
    exit 1
fi

# Activate venv
source venv/bin/activate

# Install dependencies if needed
echo "📦 Ensuring all dependencies are installed..."
pip install -q -r requirements.txt

# Check if server is running
if ! curl -s http://localhost:5006/health > /dev/null 2>&1; then
    echo "⚠️  Server is not running. Starting server in background..."
    python server.py > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 3
    
    # Check if server started successfully
    if ! curl -s http://localhost:5006/health > /dev/null 2>&1; then
        echo "❌ Failed to start server"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    
    echo "✅ Server started (PID: $SERVER_PID)"
    STARTED_SERVER=true
else
    echo "✅ Server is already running"
    STARTED_SERVER=false
fi

# Run tests
echo ""
echo "🧪 Running tests..."
echo "===================="
python test_api.py
TEST_EXIT_CODE=$?

# Cleanup - stop server if we started it
if [ "$STARTED_SERVER" = true ]; then
    echo ""
    echo "🧹 Cleaning up - stopping server..."
    kill $SERVER_PID 2>/dev/null
fi

# Exit with test exit code
exit $TEST_EXIT_CODE

