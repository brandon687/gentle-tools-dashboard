#!/bin/bash

# IMEI Search Performance Testing Script
# Tests current search performance to establish baseline metrics

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
OUTPUT_FILE="performance-results-$(date +%Y%m%d-%H%M%S).txt"

echo "🚀 IMEI Search Performance Test" | tee "$OUTPUT_FILE"
echo "================================" | tee -a "$OUTPUT_FILE"
echo "Base URL: $BASE_URL" | tee -a "$OUTPUT_FILE"
echo "Started at: $(date)" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

# Color codes for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Single IMEI Search
echo "📊 Test 1: Single IMEI Search (100 requests)" | tee -a "$OUTPUT_FILE"
echo "--------------------------------------------" | tee -a "$OUTPUT_FILE"

SINGLE_IMEI="354155255208211"
TIMES=()

for i in {1..100}; do
  TIME=$(curl -s -w "%{time_total}" -o /dev/null \
    "$BASE_URL/api/search/imei/$SINGLE_IMEI" 2>/dev/null)
  TIMES+=("$TIME")

  # Show progress every 10 requests
  if [ $((i % 10)) -eq 0 ]; then
    echo -ne "\rProgress: $i/100"
  fi
done
echo "" # New line after progress

# Calculate statistics
AVG=$(printf '%s\n' "${TIMES[@]}" | awk '{sum+=$1; count++} END {print sum/count*1000}')
MIN=$(printf '%s\n' "${TIMES[@]}" | sort -n | head -1 | awk '{print $1*1000}')
MAX=$(printf '%s\n' "${TIMES[@]}" | sort -n | tail -1 | awk '{print $1*1000}')
P95=$(printf '%s\n' "${TIMES[@]}" | sort -n | awk '{all[NR]=$1} END {print all[int(NR*0.95)]*1000}')

echo "Results:" | tee -a "$OUTPUT_FILE"
echo "  Average: ${AVG}ms" | tee -a "$OUTPUT_FILE"
echo "  Min: ${MIN}ms" | tee -a "$OUTPUT_FILE"
echo "  Max: ${MAX}ms" | tee -a "$OUTPUT_FILE"
echo "  P95: ${P95}ms" | tee -a "$OUTPUT_FILE"

# Performance evaluation
if (( $(echo "$AVG < 100" | bc -l) )); then
  echo -e "  ${GREEN}✅ EXCELLENT: Target achieved (<100ms)${NC}" | tee -a "$OUTPUT_FILE"
elif (( $(echo "$AVG < 200" | bc -l) )); then
  echo -e "  ${GREEN}✓ GOOD: Close to target (<200ms)${NC}" | tee -a "$OUTPUT_FILE"
elif (( $(echo "$AVG < 500" | bc -l) )); then
  echo -e "  ${YELLOW}⚠ WARNING: Needs optimization (<500ms)${NC}" | tee -a "$OUTPUT_FILE"
else
  echo -e "  ${RED}❌ CRITICAL: Requires immediate attention (>500ms)${NC}" | tee -a "$OUTPUT_FILE"
fi

echo "" | tee -a "$OUTPUT_FILE"

# Test 2: Create sample bulk search payload
echo "📊 Test 2: Bulk IMEI Search - 10 IMEIs (10 requests)" | tee -a "$OUTPUT_FILE"
echo "-----------------------------------------------------" | tee -a "$OUTPUT_FILE"

# Sample IMEIs for bulk search
cat > /tmp/test-imeis-10.json <<EOF
{
  "imeis": [
    "354155255208211",
    "356226676664213",
    "354066787123440",
    "358057915125387",
    "356752985498415",
    "356752981004779",
    "358798482702138",
    "357879436105817",
    "355063663560695",
    "350447039179162"
  ]
}
EOF

BULK_TIMES=()
for i in {1..10}; do
  TIME=$(curl -s -w "%{time_total}" -o /dev/null \
    -X POST "$BASE_URL/api/search/imei/batch" \
    -H "Content-Type: application/json" \
    -d @/tmp/test-imeis-10.json 2>/dev/null)
  BULK_TIMES+=("$TIME")

  echo -ne "\rProgress: $i/10"
done
echo "" # New line

# Calculate bulk statistics
BULK_AVG=$(printf '%s\n' "${BULK_TIMES[@]}" | awk '{sum+=$1; count++} END {print sum/count*1000}')
BULK_MIN=$(printf '%s\n' "${BULK_TIMES[@]}" | sort -n | head -1 | awk '{print $1*1000}')
BULK_MAX=$(printf '%s\n' "${BULK_TIMES[@]}" | sort -n | tail -1 | awk '{print $1*1000}')

echo "Results (10 IMEIs per request):" | tee -a "$OUTPUT_FILE"
echo "  Average: ${BULK_AVG}ms" | tee -a "$OUTPUT_FILE"
echo "  Min: ${BULK_MIN}ms" | tee -a "$OUTPUT_FILE"
echo "  Max: ${BULK_MAX}ms" | tee -a "$OUTPUT_FILE"
echo "  Per-IMEI Average: $(echo "$BULK_AVG / 10" | bc -l | xargs printf "%.2f")ms" | tee -a "$OUTPUT_FILE"

if (( $(echo "$BULK_AVG < 500" | bc -l) )); then
  echo -e "  ${GREEN}✅ EXCELLENT: Efficient bulk processing${NC}" | tee -a "$OUTPUT_FILE"
elif (( $(echo "$BULK_AVG < 1000" | bc -l) )); then
  echo -e "  ${GREEN}✓ GOOD: Acceptable bulk performance${NC}" | tee -a "$OUTPUT_FILE"
elif (( $(echo "$BULK_AVG < 2000" | bc -l) )); then
  echo -e "  ${YELLOW}⚠ WARNING: Bulk search needs optimization${NC}" | tee -a "$OUTPUT_FILE"
else
  echo -e "  ${RED}❌ CRITICAL: Bulk search is too slow${NC}" | tee -a "$OUTPUT_FILE"
fi

echo "" | tee -a "$OUTPUT_FILE"

# Test 3: Larger bulk search (100 IMEIs)
echo "📊 Test 3: Bulk IMEI Search - 100 IMEIs (3 requests)" | tee -a "$OUTPUT_FILE"
echo "------------------------------------------------------" | tee -a "$OUTPUT_FILE"

# Generate 100 test IMEIs (using pattern)
cat > /tmp/test-imeis-100.json <<EOF
{
  "imeis": [
$(for i in {1..100}; do
  printf "    \"35415525520%04d\"" $i
  [ $i -lt 100 ] && echo "," || echo ""
done)
  ]
}
EOF

LARGE_BULK_TIMES=()
for i in {1..3}; do
  TIME=$(curl -s -w "%{time_total}" -o /dev/null \
    -X POST "$BASE_URL/api/search/imei/batch" \
    -H "Content-Type: application/json" \
    -d @/tmp/test-imeis-100.json 2>/dev/null)
  LARGE_BULK_TIMES+=("$TIME")

  echo -ne "\rProgress: $i/3"
done
echo "" # New line

LARGE_AVG=$(printf '%s\n' "${LARGE_BULK_TIMES[@]}" | awk '{sum+=$1; count++} END {print sum/count*1000}')
LARGE_MIN=$(printf '%s\n' "${LARGE_BULK_TIMES[@]}" | sort -n | head -1 | awk '{print $1*1000}')
LARGE_MAX=$(printf '%s\n' "${LARGE_BULK_TIMES[@]}" | sort -n | tail -1 | awk '{print $1*1000}')

echo "Results (100 IMEIs per request):" | tee -a "$OUTPUT_FILE"
echo "  Average: ${LARGE_AVG}ms" | tee -a "$OUTPUT_FILE"
echo "  Min: ${LARGE_MIN}ms" | tee -a "$OUTPUT_FILE"
echo "  Max: ${LARGE_MAX}ms" | tee -a "$OUTPUT_FILE"
echo "  Per-IMEI Average: $(echo "$LARGE_AVG / 100" | bc -l | xargs printf "%.2f")ms" | tee -a "$OUTPUT_FILE"

if (( $(echo "$LARGE_AVG < 1000" | bc -l) )); then
  echo -e "  ${GREEN}✅ EXCELLENT: Ready for 500K rows${NC}" | tee -a "$OUTPUT_FILE"
elif (( $(echo "$LARGE_AVG < 3000" | bc -l) )); then
  echo -e "  ${GREEN}✓ GOOD: Acceptable for current scale${NC}" | tee -a "$OUTPUT_FILE"
elif (( $(echo "$LARGE_AVG < 8000" | bc -l) )); then
  echo -e "  ${YELLOW}⚠ WARNING: Will struggle at 500K rows${NC}" | tee -a "$OUTPUT_FILE"
else
  echo -e "  ${RED}❌ CRITICAL: Cannot scale to 500K rows${NC}" | tee -a "$OUTPUT_FILE"
fi

echo "" | tee -a "$OUTPUT_FILE"

# Summary and Recommendations
echo "================================" | tee -a "$OUTPUT_FILE"
echo "📈 SUMMARY & RECOMMENDATIONS" | tee -a "$OUTPUT_FILE"
echo "================================" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

echo "Current Performance:" | tee -a "$OUTPUT_FILE"
echo "  • Single IMEI: ${AVG}ms (target: <100ms)" | tee -a "$OUTPUT_FILE"
echo "  • Bulk 10: ${BULK_AVG}ms total, $(echo "$BULK_AVG / 10" | bc -l | xargs printf "%.2f")ms per IMEI" | tee -a "$OUTPUT_FILE"
echo "  • Bulk 100: ${LARGE_AVG}ms total, $(echo "$LARGE_AVG / 100" | bc -l | xargs printf "%.2f")ms per IMEI" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

# Scaling projection
PROJECTED_500K=$(echo "$LARGE_AVG * 5" | bc -l | xargs printf "%.0f")
echo "Projected Performance at 500K rows:" | tee -a "$OUTPUT_FILE"
echo "  • Estimated: ${PROJECTED_500K}ms for bulk 100 IMEIs" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

echo "Next Steps:" | tee -a "$OUTPUT_FILE"
if (( $(echo "$AVG > 100" | bc -l) )); then
  echo "  1. ⚠️  Implement Phase 1 optimizations (see PERFORMANCE-OPTIMIZATION-GUIDE.md)" | tee -a "$OUTPUT_FILE"
  echo "  2. Add database indexes for IMEI lookups" | tee -a "$OUTPUT_FILE"
  echo "  3. Fix N+1 query pattern in searchByIMEI()" | tee -a "$OUTPUT_FILE"
else
  echo "  ✅ Performance is acceptable for current scale" | tee -a "$OUTPUT_FILE"
  echo "  📊 Continue monitoring as data grows" | tee -a "$OUTPUT_FILE"
fi

echo "" | tee -a "$OUTPUT_FILE"
echo "Completed at: $(date)" | tee -a "$OUTPUT_FILE"
echo "Results saved to: $OUTPUT_FILE" | tee -a "$OUTPUT_FILE"

# Cleanup temp files
rm -f /tmp/test-imeis-10.json /tmp/test-imeis-100.json

echo ""
echo "✅ Performance test complete!"
