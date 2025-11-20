# IMEI Lookup Quick Reference

## Quick Navigation

### I need to...

#### Search for a single IMEI
```typescript
import { searchByIMEI } from "@server/lib/searchService";

const result = await searchByIMEI("355555754760571");
// Returns: IMEISearchResult
// - found: boolean
// - currentStatus: 'in_stock' | 'shipped' | 'transferred' | 'removed'
// - currentGrade, currentLockStatus, model, gb, color
// - lastMovement: { type, date, notes }
// - daysInInventory: number
```

**HTTP API**: 
```bash
GET /api/search/imei/:imei
# Response: IMEISearchResult
```

---

#### Search for multiple IMEIs
```typescript
import { batchSearchIMEIs } from "@server/lib/searchService";

const result = await batchSearchIMEIs([
  "355555754760571",
  "354155251896506",
  "352803728976318"
]);
// Returns: BatchSearchResult
// - results: IMEISearchResult[]
// - summary: { total, found, notFound }
```

**HTTP API**:
```bash
POST /api/search/batch
Body: { imeis: string[] }
```

---

#### Get complete movement history for an IMEI
```typescript
import { getIMEIHistory } from "@server/lib/searchService";

const history = await getIMEIHistory("355555754760571", 50);
// Returns:
// - found: boolean
// - currentStatus, currentGrade, currentLockStatus, model, gb, color
// - movements: Array<{
//     movementType: 'added'|'shipped'|'transferred'|'status_changed'|'grade_changed'|'removed'
//     fromLocation, toLocation
//     fromGrade, toGrade
//     fromLockStatus, toLockStatus
//     notes, source, performedBy, performedAt
//   }>
```

**HTTP API**:
```bash
GET /api/search/history/:imei?limit=50
```

---

#### Check if IMEI is in DUMP (shipped) list
```typescript
// Frontend
const shippedIMEIs = await fetch('/api/shipped-imeis').then(r => r.json());
const isShipped = shippedIMEIs.includes(imei);

// Backend
import { shippedImeis } from "@server/db/schema";
const item = await db.select().from(shippedImeis).where(eq(shippedImeis.imei, imei));
```

---

#### Add IMEIs to DUMP list
```typescript
const response = await fetch('/api/shipped-imeis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imeis: [imei1, imei2, ...] })
});
// Activity logged automatically
```

---

#### Remove IMEI from DUMP list
```typescript
const response = await fetch(`/api/shipped-imeis/${encodeURIComponent(imei)}`, {
  method: 'DELETE'
});
// Activity logged automatically
```

---

## Physical Inventory

### Where is IMEI data stored?
- **Primary**: `inventory_items.imei` (unique, indexed)
- **Audit Trail**: `inventory_movements` (all changes)
- **Source**: Google Sheets `PHYSICAL INVENTORY` sheet (synced via `syncGoogleSheetsToDatabase()`)

### How to query directly in PostgreSQL?
```sql
-- Find an IMEI
SELECT * FROM inventory_items WHERE imei = '355555754760571';

-- Get IMEI history
SELECT * FROM inventory_movements 
WHERE item_id = (SELECT id FROM inventory_items WHERE imei = '355555754760571')
ORDER BY performed_at DESC;

-- Find all IMEIs with specific grade
SELECT imei, model, gb, color FROM inventory_items 
WHERE current_grade = 'A+';

-- Count IMEIs by status
SELECT current_status, COUNT(*) FROM inventory_items 
GROUP BY current_status;
```

### What fields are available?
```
id, imei, model, gb, color, sku,
currentGrade, currentLockStatus, currentLocationId, currentStatus,
firstSeenAt, lastSeenAt, createdAt, updatedAt
```

---

## Raw Inventory

### Where is IMEI data stored?
- **Primary**: Google Sheets `Dump` sheet, columns M:S
- **Metadata**: Google Sheets `Inbound` sheet, columns A:M (Master Carton ID → Grade + Supplier mapping)
- **NOT in database** - Fetched fresh on every request

### How to access Raw Inventory IMEIs?
```typescript
// Frontend
const { data: inventoryData } = useQuery({
  queryKey: ['/api/inventory']
});
const rawIMEIs = inventoryData.rawInventory.map(item => item.imei);

// Backend
import { fetchRawInventoryData } from "@server/lib/googleSheets";
const rawItems = await fetchRawInventoryData(auth);
```

### Important Notes
- ⚠️ **NO persistent lookup functions** - client-side filtering only
- ⚠️ Raw inventory is **read-only** - cannot be modified through the app
- ⚠️ Changes require editing the Google Sheets directly
- **Key Fields**: `label` (Master Carton), `imei`, `model`, `gb`, `color`, `lockStatus`, `date`, `grade`, `supplier`

---

## DUMP Inventory (Shipped IMEIs)

### Where is IMEI data stored?
- **Primary**: `shipped_imeis.imei` (unique, indexed)
- **Fallback**: In-memory array if database unavailable
- **Activity Log**: `userActivityLog` (who added/removed, when)
- **Source**: User-managed via UI, NOT from Google Sheets

### How to query directly in PostgreSQL?
```sql
-- Get all dump IMEIs
SELECT imei FROM shipped_imeis ORDER BY created_at DESC;

-- Check if IMEI is dumped
SELECT EXISTS(SELECT 1 FROM shipped_imeis WHERE imei = '355555754760571');

-- Get dump IMEIs created in last 7 days
SELECT imei FROM shipped_imeis 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Count dump IMEIs
SELECT COUNT(*) FROM shipped_imeis;
```

### What operations are logged?
- `imei_dump_add`: When user pastes IMEIs
- `imei_dump_delete`: When user removes single IMEI
- `imei_dump_clear`: When user clears all IMEIs

---

## The Three Inventories in Action

### Physical Inventory Display Logic
```typescript
// Dashboard.tsx
const shippedSet = new Set(shippedIMEIs);  // Get DUMP list

// Show only items that are:
// 1. In PHYSICAL INVENTORY sheet AND
// 2. NOT in DUMP list
return inventoryData.physicalInventory.filter(
  item => !shippedSet.has(item.imei)
);
```

### IMEI Can Be In...
- ✅ Physical Inventory (database `inventory_items`)
- ✅ Raw Inventory (Google Sheets)
- ✅ DUMP list (database `shipped_imeis`)
- ✅ Multiple places simultaneously!

**Example Scenarios:**
1. IMEI in Physical + DUMP → Physical count excludes it (marked as shipped)
2. IMEI in Raw only → Not yet in Physical system
3. IMEI in Physical only → Still in inventory, not shipped
4. IMEI in Physical + Raw → In both places (shouldn't happen, data inconsistency)

---

## Common Queries by Use Case

### "Is this IMEI still in inventory?"
```typescript
const result = await searchByIMEI(imei);
const isInInventory = result.found && result.currentStatus === 'in_stock' && !isShipped;
```

### "When was this IMEI added to inventory?"
```typescript
const history = await getIMEIHistory(imei);
const addedMovement = history.movements.find(m => m.movementType === 'added');
const addedDate = addedMovement?.performedAt;
```

### "What's the grade history for this IMEI?"
```typescript
const history = await getIMEIHistory(imei);
const gradeChanges = history.movements
  .filter(m => m.movementType === 'grade_changed')
  .map(m => ({ from: m.fromGrade, to: m.toGrade, date: m.performedAt }));
```

### "Show me all A+ grade IMEIs"
```typescript
const items = await db
  .select()
  .from(inventoryItems)
  .where(eq(inventoryItems.currentGrade, 'A+'));
```

### "How many IMEIs were shipped today?"
```typescript
const today = new Date().toISOString().split('T')[0];
const logs = await db
  .select()
  .from(userActivityLog)
  .where(
    and(
      eq(userActivityLog.activityType, 'imei_dump_add'),
      gte(userActivityLog.performedAt, new Date(today))
    )
  );
const count = logs.reduce((sum, log) => sum + (log.itemCount || 0), 0);
```

---

## Performance Tips

### Batch Operations
- Always use `batchSearchIMEIs()` for multiple IMEIs (parallel lookup)
- Don't loop `searchByIMEI()` - use batch version

### Indexes Used
- `idx_items_imei` - UNIQUE index on `inventory_items.imei`
- `idx_items_status` - Index on `currentStatus`
- `idx_movements_item` - Composite index (item_id, performed_at)

### Caching
- Raw inventory: No caching (always fresh from sheets)
- Physical inventory: React Query caches for 5 minutes
- DUMP list: React Query caches, invalidated on mutations

---

## Troubleshooting

### IMEI not found in Physical Inventory
**Check**:
1. Is it in Google Sheets PHYSICAL INVENTORY sheet?
2. Does it have a valid IMEI field?
3. Has sync run recently? → Check `/api/sync/status`
4. Is it in DUMP list? → Check `/api/shipped-imeis`

### IMEI in Raw but not Physical
**This is normal**:
- Raw Inventory = Not yet processed
- Physical Inventory = Processed items only
- These are separate data sources

### Activity log showing wrong user for dump operations
**Check**: Ensure `req.user` is properly authenticated before calling:
```typescript
await logImeiDumpAdd(req.user.id, req.user.email, imeis, req);
```

---

## API Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/inventory` | Get Physical + Raw inventories | Yes |
| GET | `/api/shipped-imeis` | Get all dump IMEIs | Yes |
| POST | `/api/shipped-imeis` | Add IMEIs to dump | Yes |
| DELETE | `/api/shipped-imeis` | Clear all dump IMEIs | Yes |
| DELETE | `/api/shipped-imeis/:imei` | Remove single IMEI from dump | Yes |
| GET | `/api/search/imei/:imei` | Search single IMEI | Yes |
| POST | `/api/search/batch` | Batch search IMEIs | Yes |
| GET | `/api/search/history/:imei` | Get IMEI movement history | Yes |

