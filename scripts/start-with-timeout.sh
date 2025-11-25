#!/bin/bash

# Railway deployment startup script with timeout protection
echo "🚀 Starting application with timeout protection..."

# Set timeout for the entire startup process (2 minutes)
timeout 120 node dist/index.js &
PID=$!

# Monitor the process
for i in {1..120}; do
  if ! kill -0 $PID 2>/dev/null; then
    # Process has exited
    wait $PID
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      echo "✅ Application started successfully"
    else
      echo "❌ Application failed with exit code $EXIT_CODE"
    fi
    exit $EXIT_CODE
  fi

  # Check if server is responding (assuming it runs on PORT)
  if [ ! -z "$PORT" ]; then
    if curl -f -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
      echo "✅ Server is responding on port $PORT"
      wait $PID
      exit 0
    fi
  fi

  sleep 1
done

echo "❌ Application startup timeout after 120 seconds"
kill -9 $PID 2>/dev/null
exit 1