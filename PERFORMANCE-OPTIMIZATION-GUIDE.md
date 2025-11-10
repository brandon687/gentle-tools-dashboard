# Performance Optimization Guide for GENTLE TOOLS Dashboard

## 🎯 Mission Critical Goal
**Achieve sub-100ms IMEI search times across 500K+ rows with instantaneous user experience**

---

## 📊 Current State

### Database Size
- **Current**: ~100,000 inventory items + movements
- **Target**: 500,000+ inventory items (5x growth)
- **Growth Rate**: Continuous (daily outbound orders)

### Current Performance Issues
1. **IMEI Search**: Not instantaneous for single/bulk searches
2. **Movement History Queries**: N+1 query pattern detected
3. **Bulk Operations**: No batching strategy for 1000+ IMEIs
4. **Missing Indexes**: Several critical indexes not optimized for read patterns

---

## 🔍 Performance Bottlenecks Identified

### 1. **searchByIMEI() - Single IMEI Search**
**File**: `server/lib/searchService.ts:48-128`

#### Current Implementation Issues:
```typescript
// ❌ ISSUE 1: Separate query for last movement (N+1 problem)
const [lastMovement] = await db
  .select()
  .from(inventoryMovements)
  .where(eq(inventoryMovements.itemId, item.item.id))
  .orderBy(desc(inventoryMovements.performedAt))
  .limit(1);
```

**Impact**: 2 database round trips per IMEI search
- Query 1: Get item + location (with JOIN)
- Query 2: Get last movement

**Solution**: Use window functions or materialized views to pre-compute last movement

---

### 2. **batchSearchIMEIs() - Bulk IMEI Search**
**File**: `server/lib/searchService.ts:134-256`

#### Current Implementation Issues:
```typescript
// ❌ ISSUE 2: Fetches ALL movements for ALL items, then filters in-memory
lastMovements = await db
  .select()
  .from(inventoryMovements)
  .where(inArray(inventoryMovements.itemId, foundItemIds))
  .orderBy(desc(inventoryMovements.performedAt));

// Then loops through to find the first occurrence per itemId
for (const movement of lastMovements) {
  if (!movementMap.has(movement.itemId)) {
    movementMap.set(movement.itemId, movement);
  }
}
```

**Impact**:
- For 1000 items with avg 10 movements each = 10,000 rows fetched
- Only needs 1000 rows (1 per item)
- 10x more data transferred than necessary

**Solution**: Use SQL window function `ROW_NUMBER()` to get only the latest movement per item

---

### 3. **Missing Database Indexes**
**File**: `server/db/schema.ts:27-55`

#### Current Indexes on `inventory_items`:
```typescript
imeiIdx: uniqueIndex("idx_items_imei").on(table.imei),  // ✅ Good
statusIdx: index("idx_items_status").on(table.currentStatus),
locationIdx: index("idx_items_location").on(table.currentLocationId),
modelIdx: index("idx_items_model").on(table.model),
gradeIdx: index("idx_items_grade").on(table.currentGrade),
lastSeenIdx: index("idx_items_last_seen").on(table.lastSeenAt),
```

#### Missing Indexes:
```sql
-- ❌ MISSING: Composite index for common filter patterns
CREATE INDEX idx_items_status_location ON inventory_items(current_status, current_location_id);

-- ❌ MISSING: Covering index for search results (includes columns in SELECT)
CREATE INDEX idx_items_imei_covering ON inventory_items(imei)
  INCLUDE (model, gb, color, current_status, current_grade, current_lock_status);
```

---

### 4. **inventory_movements Table Performance**
**File**: `server/db/schema.ts:64-103`

#### Current Indexes:
```typescript
itemIdx: index("idx_movements_item").on(table.itemId, table.performedAt), // ✅ Good
typeIdx: index("idx_movements_type").on(table.movementType),
dateIdx: index("idx_movements_date").on(table.performedAt),
```

#### Issues:
- ❌ No index on `(item_id, performed_at DESC)` with INCLUDE for covering queries
- ❌ Movement history queries scan entire table when filtering by IMEI pattern

---

## 🚀 Optimization Strategy

### Phase 1: Quick Wins (Est. 2-3 days)

#### 1.1 Add Covering Indexes
```sql
-- Covering index for IMEI lookups (90% of queries)
CREATE INDEX idx_items_imei_search_covering ON inventory_items(imei)
INCLUDE (
  model, gb, color, sku,
  current_status, current_grade, current_lock_status,
  current_location_id, first_seen_at, last_seen_at
);

-- Composite index for filtered searches
CREATE INDEX idx_items_status_location_active ON inventory_items(current_status, current_location_id)
WHERE current_status = 'in_stock';
```

**Expected Impact**: 40-60% reduction in query time

---

#### 1.2 Fix N+1 Query in `searchByIMEI()`
Use a CTE (Common Table Expression) with window functions:

```sql
WITH latest_movements AS (
  SELECT
    im.*,
    ROW_NUMBER() OVER (PARTITION BY im.item_id ORDER BY im.performed_at DESC) as rn
  FROM inventory_movements im
  WHERE im.item_id IN (SELECT id FROM inventory_items WHERE imei = $1)
)
SELECT
  ii.*,
  il.*,
  lm.movement_type,
  lm.performed_at,
  lm.notes
FROM inventory_items ii
LEFT JOIN inventory_locations il ON ii.current_location_id = il.id
LEFT JOIN latest_movements lm ON lm.item_id = ii.id AND lm.rn = 1
WHERE ii.imei = $1;
```

**Expected Impact**: Single round-trip, 50% faster

---

#### 1.3 Optimize `batchSearchIMEIs()`
```sql
WITH latest_movements AS (
  SELECT
    im.*,
    ROW_NUMBER() OVER (PARTITION BY im.item_id ORDER BY im.performed_at DESC) as rn
  FROM inventory_movements im
  WHERE im.item_id IN (
    SELECT id FROM inventory_items WHERE imei = ANY($1::text[])
  )
)
SELECT
  ii.*,
  il.*,
  lm.movement_type,
  lm.performed_at,
  lm.notes
FROM inventory_items ii
LEFT JOIN inventory_locations il ON ii.current_location_id = il.id
LEFT JOIN latest_movements lm ON lm.item_id = ii.id AND lm.rn = 1
WHERE ii.imei = ANY($1::text[]);
```

**Expected Impact**: 10x reduction in data transfer for bulk searches

---

### Phase 2: Advanced Optimizations (Est. 1-2 weeks)

#### 2.1 Implement Materialized View for Last Movement
Create a materialized view that maintains the last movement per item:

```sql
CREATE MATERIALIZED VIEW item_last_movement AS
SELECT DISTINCT ON (item_id)
  item_id,
  movement_type,
  performed_at,
  notes,
  to_status,
  to_grade,
  to_lock_status
FROM inventory_movements
ORDER BY item_id, performed_at DESC;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_item_last_movement_item_id ON item_last_movement(item_id);

-- Refresh strategy: trigger-based or scheduled
CREATE OR REPLACE FUNCTION refresh_item_last_movement()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY item_last_movement;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_last_movement
AFTER INSERT ON inventory_movements
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_item_last_movement();
```

**Expected Impact**: Eliminates JOIN to movements table entirely, 70% faster queries

---

#### 2.2 Add Redis Cache Layer
Implement Redis caching for:
1. **Frequently Searched IMEIs** (TTL: 5 minutes)
2. **Bulk Search Results** (TTL: 2 minutes)
3. **Movement History** (TTL: 10 minutes)

```typescript
// Pseudocode
async function searchByIMEI(imei: string): Promise<IMEISearchResult> {
  const cacheKey = `imei:${imei}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query database
  const result = await dbSearchByIMEI(imei);

  // Cache result
  await redis.setex(cacheKey, 300, JSON.stringify(result));

  return result;
}
```

**Expected Impact**: 95% hit rate = 20x faster for repeated searches

---

#### 2.3 Database Connection Pooling Optimization
**Current**: Default connection pool settings
**Optimize**:
```typescript
// server/db/index.ts
const pool = new Pool({
  max: 50,                    // Increase from default 10
  min: 10,                    // Keep warm connections
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000,    // Kill slow queries
});
```

**Expected Impact**: Handles 5x more concurrent users

---

### Phase 3: Architecture Changes (Est. 3-4 weeks)

#### 3.1 Implement Read Replicas
- **Write**: Primary database (Google Sheets sync, movements)
- **Read**: Read replica(s) for all IMEI searches

```typescript
// server/db/index.ts
export const primaryDb = drizzle(primaryPool);  // Writes
export const replicaDb = drizzle(replicaPool);  // Reads

// server/lib/searchService.ts
export async function searchByIMEI(imei: string) {
  // Use read replica for all searches
  return replicaDb.select()...
}
```

**Expected Impact**: Isolates read load from writes, 2x throughput

---

#### 3.2 Implement Full-Text Search (PostgreSQL FTS or ElasticSearch)
For IMEI partial search (currently using `LIKE '%imei%'`):

```sql
-- Add tsvector column
ALTER TABLE inventory_items
ADD COLUMN imei_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('simple', imei)) STORED;

-- Add GIN index
CREATE INDEX idx_items_imei_fts ON inventory_items USING GIN(imei_tsv);

-- Query becomes:
SELECT * FROM inventory_items
WHERE imei_tsv @@ to_tsquery('simple', '354155255');
```

**Expected Impact**: 100x faster for partial IMEI searches

---

#### 3.3 Denormalize Last Movement into inventory_items
Add columns directly to `inventory_items`:
```sql
ALTER TABLE inventory_items ADD COLUMN last_movement_type text;
ALTER TABLE inventory_items ADD COLUMN last_movement_date timestamp;
ALTER TABLE inventory_items ADD COLUMN last_movement_notes text;

-- Update via trigger
CREATE TRIGGER trg_update_last_movement_denorm
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_item_last_movement_denorm();
```

**Trade-offs**:
- ✅ Pro: Single-table query = ultra-fast
- ❌ Con: Data duplication, trigger overhead on writes
- ✅ Pro: Writes are rare compared to reads (10:1 ratio)

**Expected Impact**: 80% faster queries, eliminates JOINs

---

## 📈 Expected Performance Improvements

| Optimization | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|--------------|---------|---------------|---------------|---------------|
| Single IMEI Search | ~200-500ms | ~80-150ms | ~20-50ms | **~5-20ms** |
| Bulk Search (100 IMEIs) | ~2-5s | ~800ms-1.5s | ~200-500ms | **~50-150ms** |
| Bulk Search (1000 IMEIs) | ~20-30s | ~5-8s | ~1-2s | **~200-500ms** |
| Concurrent Users | ~10 | ~30 | ~100 | **~500+** |

---

## 🔧 Implementation Checklist

### Phase 1 (Quick Wins)
- [ ] Add covering indexes to `inventory_items`
- [ ] Add composite indexes for common filters
- [ ] Rewrite `searchByIMEI()` with single-query approach
- [ ] Rewrite `batchSearchIMEIs()` with window functions
- [ ] Add query performance monitoring (log slow queries >100ms)

### Phase 2 (Advanced)
- [ ] Create materialized view for last movements
- [ ] Implement Redis cache layer
- [ ] Optimize connection pool settings
- [ ] Add database query plan analysis
- [ ] Implement query result streaming for large batches

### Phase 3 (Architecture)
- [ ] Set up read replica(s)
- [ ] Implement full-text search for partial IMEI matching
- [ ] Denormalize last movement data
- [ ] Add application-level query caching
- [ ] Implement GraphQL DataLoader pattern for batching

---

## 🧪 Testing & Benchmarking

### Load Testing Script
Create a load test to measure improvements:

```bash
# test-search-performance.sh
#!/bin/bash

# Test 1: Single IMEI search (100 requests)
echo "Testing single IMEI search..."
for i in {1..100}; do
  curl -s -w "%{time_total}\n" -o /dev/null \
    http://localhost:5000/api/search/imei/354155255208211
done | awk '{sum+=$1; count++} END {print "Avg:", sum/count*1000, "ms"}'

# Test 2: Bulk search (10 batches of 100 IMEIs)
echo "Testing bulk IMEI search..."
for i in {1..10}; do
  curl -s -w "%{time_total}\n" -o /dev/null \
    -X POST http://localhost:5000/api/search/imei/batch \
    -H "Content-Type: application/json" \
    -d @test-imeis-100.json
done | awk '{sum+=$1; count++} END {print "Avg:", sum/count*1000, "ms"}'
```

### Performance Metrics to Track
```typescript
// Add to searchService.ts
import { performance } from 'perf_hooks';

export async function searchByIMEI(imei: string) {
  const start = performance.now();

  try {
    const result = await /* ... query ... */;
    const duration = performance.now() - start;

    // Log slow queries
    if (duration > 100) {
      console.warn(`⚠️ Slow IMEI search: ${imei} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`❌ IMEI search failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
```

---

## 🎓 Required Skills for New Developers

1. **PostgreSQL Performance Tuning**
   - Query plan analysis (`EXPLAIN ANALYZE`)
   - Index design and maintenance
   - Window functions and CTEs

2. **Caching Strategies**
   - Redis basics
   - Cache invalidation patterns
   - TTL strategies

3. **Database Architecture**
   - Read replicas setup
   - Connection pooling
   - Query optimization

4. **Monitoring & Observability**
   - Query performance logging
   - APM tools (e.g., New Relic, DataDog)
   - Database metrics

---

## 📚 Resources

- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Drizzle ORM Performance](https://orm.drizzle.team/docs/performance)
- [Redis Caching Patterns](https://redis.io/docs/manual/patterns/)
- [Database Indexing Explained](https://use-the-index-luke.com/)

---

## 🤝 Getting Started

1. **Profile Current Performance**: Run `test-search-performance.sh` to establish baseline
2. **Analyze Query Plans**: Add `EXPLAIN ANALYZE` to slowest queries
3. **Implement Phase 1**: Start with indexes (lowest risk, high reward)
4. **Measure & Iterate**: Re-run benchmarks after each change
5. **Document Findings**: Update this guide with actual results

---

**Last Updated**: 2025-11-10
**Target Completion**: Phase 1 by Q1 2026, Phase 3 by Q2 2026
