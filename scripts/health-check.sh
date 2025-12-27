#!/bin/bash
set -e

echo "=================="
echo "  Health Check"
echo "=================="

# Configuration
FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}
TIMEOUT=5

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Check backend health
echo "[1/3] Checking backend..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BACKEND_URL/health")

if [ "$STATUS" -eq 200 ]; then
    echo "✓ Backend is healthy (HTTP $STATUS)"
else
    echo "✗ Backend is unhealthy (HTTP $STATUS)"
    exit 1
fi

# Check frontend
echo "[2/3] Checking frontend..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$FRONTEND_URL")

if [ "$STATUS" -eq 200 ]; then
    echo "✓ Frontend is accessible (HTTP $STATUS)"
else
    echo "✗ Frontend is not accessible (HTTP $STATUS)"
    exit 1
fi

# Check WebSocket (if backend is up)
echo "[3/3] Checking WebSocket..."
# Note: This is a simple check, real WebSocket test would need a proper client
nc -z -w$TIMEOUT localhost 3000 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ WebSocket port is open"
else
    echo "⚠ WebSocket port check failed (non-critical)"
fi

echo ""
echo "=================="
echo "  All checks passed!"
echo "=================="
exit 0
