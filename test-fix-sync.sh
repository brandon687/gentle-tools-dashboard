#!/bin/bash

# Test script for the fix-stuck sync endpoint
# This will fix any sync records that have been stuck for more than 10 minutes

echo "Testing /api/sync/fix-stuck endpoint..."
echo ""

# Make the POST request
curl -X POST http://localhost:5000/api/sync/fix-stuck \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "Done!"
