# Inventory Data Model Analysis: GENTLE TOOLS DASH

## Executive Summary

The application manages three distinct inventory types, each with different purposes and data sources:

1. **Physical Inventory** - Live database-backed inventory from Google Sheets (PHYSICAL INVENTORY sheet)
2. **Raw Inventory** - Unprocessed/incoming inventory from a separate Google Sheet (Dump sheet + Inbound sheet mapping)
3. **DUMP Inventory** - User-managed list of shipped/ordered IMEIs (in-memory or database-backed, not from sheets)

Each inventory type has unique IMEI tracking, data structures, and lookup mechanisms.

---

## 1. Physical Inventory

### Data Source
- **Google Sheet**: `PHYSICAL INVENTORY` sheet in spreadsheet `1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw`
- **Sheet Range**: `PHYSICAL INVENTORY!A:K`
- **Location in Code**: `server/lib/googleSheets.ts` - `fetchSheetData()` function

### Data Structure

#### On Google Sheets
```
Headers: _ROW, _FIVETRAN_SYNCED, DATE, PRICE, COLOR, GRADE, IMEI, MODEL, GB, LOCK_STATUS, AGE
Row 1: Coefficient banner
Row 2: Headers (index 1)
Row 3+: Data rows (index 2+)
```

#### In Database
Stored in **PostgreSQL `inventory_items` table** with full audit trail:

```typescript
// Primary IMEI Lookup Table
inventoryItems {
  id: UUID (primary key)
  imei: TEXT (unique index) ← KEY FIELD FOR LOOKUPS
  
  // Device Attributes (from Google Sheets)
  model: TEXT
  gb: TEXT
  color: TEXT
  sku: TEXT
  
  // Current State
  currentGrade: TEXT
  currentLockStatus: TEXT
  currentLocationId: UUID (fk → inventoryLocations)
  currentStatus: TEXT ('in_stock', 'shipped', 'transferred', 'removed')
  
  // Metadata
  firstSeenAt: TIMESTAMP
  lastSeenAt: TIMESTAMP
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}

// Audit Trail
inventoryMovements {
  id: UUID
  itemId: UUID (fk → inventoryItems)
  movementType: TEXT ('added', 'shipped', 'transferred', 'status_changed', 'grade_changed', 'removed')
  fromLocationId: UUID (fk)
  toLocationId: UUID (fk)
  fromStatus: TEXT
  toStatus: TEXT
  fromGrade: TEXT
  toGrade: TEXT
  fromLockStatus: TEXT
  toLockStatus: TEXT
  notes: TEXT
  source: TEXT ('manual', 'google_sheets_sync', 'api', 'bulk_import')
  performedBy: TEXT
  performedAt: TIMESTAMP
  snapshotData: JSONB (item snapshot at time of movement)
}
```

### Sync Process
```
Google Sheets (PHYSICAL INVENTORY)
        ↓
fetchSheetData() - Downloads sheet data
        ↓
syncGoogleSheetsToDatabase() - Main sync function
  ├─ Creates/updates inventoryItems records
  ├─ Tracks changes (grade, lock_status)
  └─ Creates inventoryMovements records for all changes
        ↓
PostgreSQL inventoryItems table
```

### IMEI Lookup Functions

#### 1. Single IMEI Search
**Function**: `searchByIMEI(imei: string)`
**Location**: `server/lib/searchService.ts`
**Returns**: `IMEISearchResult`

```typescript
export interface IMEISearchResult {
  found: boolean;
  imei: string;
  currentStatus?: string;
  currentLocation?: { id, name, code };
  currentGrade?: string | null;
  currentLockStatus?: string | null;
  model?: string | null;
  gb?: string | null;
  color?: string | null;
  sku?: string | null;
  lastMovement?: { type, date, notes };
  daysInInventory?: number;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
}

// Query:
SELECT * FROM inventory_items 
WHERE imei = normalized_imei
LEFT JOIN inventory_locations ON current_location_id
```

#### 2. Batch IMEI Search
**Function**: `batchSearchIMEIs(imeis: string[])`
**Location**: `server/lib/searchService.ts`
**Returns**: `BatchSearchResult`

```typescript
export interface BatchSearchResult {
  results: IMEISearchResult[];
  summary: { total, found, notFound };
}

// Query:
SELECT * FROM inventory_items 
WHERE imei = ANY(normalized_imeis)
LEFT JOIN inventory_locations
// Also fetches last movements for efficiency
```

#### 3. IMEI History
**Function**: `getIMEIHistory(imei: string, limit = 50)`
**Location**: `server/lib/searchService.ts`
**Returns**: Complete movement history with location changes

```typescript
SELECT * FROM inventory_movements
WHERE item_id = (SELECT id FROM inventory_items WHERE imei = ?)
ORDER BY performed_at DESC
LIMIT 50
// Joins location tables for both from_location and to_location
```

#### 4. API Endpoint
**GET** `/api/search/imei/:imei` - Single lookup
**POST** `/api/search/batch` - Batch lookup
**GET** `/api/search/history/:imei` - Movement history

---

## 2. Raw Inventory

### Data Sources
**Source 1**: Dump sheet from separate Google Sheet
- **Google Sheet**: `1P7mchy-AJTYZoWggQhRJiPqNkIU2l_eOxmMhlvGzn5A`
- **Sheet**: `Dump` sheet, columns M:S (REMAIN section)
- **Range**: `Dump!M:S`

**Source 2**: Inbound sheet (for metadata mapping)
- **Sheet**: `Inbound` sheet, columns A:M
- **Purpose**: Provides Master Carton ID → Grade and Supplier mapping

### Data Structure

#### Raw Inventory Item Schema
```typescript
// From Google Sheets
export interface RawInventoryRow {
  label?: string;           // Master Carton ID (from Dump sheet LABEL column)
  imei?: string;           // IMEI (from Dump sheet)
  model?: string;          // Model
  gb?: string;             // GB capacity
  color?: string;          // Color
  lockStatus?: string;     // Lock status
  date?: string;           // Date
  grade?: string;          // Populated from Inbound sheet column H (GRADE - Raw)
  supplier?: string;       // Populated from Inbound sheet column M (SUPPLIER)
}

// API Type
export type RawInventoryItem = z.infer<typeof rawInventoryItemSchema>;
```

### Fetch Process
```
1. Fetch Inbound mapping (Master Carton ID → {grade, supplier})
   - Read Inbound sheet columns A:M
   - Build map: masterCartonId → {grade (col H), supplier (col M)}

2. Fetch Dump sheet (columns M:S, REMAIN section)
   - Find header row (contains LABEL, IMEI, MODEL)
   - Extract: label (master carton), imei, model, gb, color, lockStatus, date

3. Cross-reference: For each Dump item
   - Lookup Master Carton ID (label) in Inbound mapping
   - Add grade and supplier from mapping
   - Filter: Only keep items with valid IMEIs

4. Return RawInventoryRow[] to frontend
   (NOT stored in database for Physical Inventory table)
```

### IMEI Lookup Functions

**NO DEDICATED LOOKUP FUNCTIONS** - Raw inventory is:
- Fetched fresh from Google Sheets on each request
- Displayed in UI with hierarchical grouping
- NOT stored in the persistent database
- Filtered/searched client-side only

### Data Retrieval
**API Endpoint**: `GET /api/inventory`
**Location**: `server/routes.ts` line 139

```typescript
app.get('/api/inventory', requireAuth, async (req, res) => {
  const data = await fetchInventoryData();
  // Returns { physicalInventory, gradedToFallout, rawInventory }
});

// fetchInventoryData() in server/lib/googleSheets.ts
// Runs in parallel:
await Promise.all([
  fetchSheetData(PHYSICAL_INVENTORY_SHEET, auth),
  fetchRawInventoryData(auth)  // Includes Inbound mapping
]);
```

### UI Display Hierarchy
```
Raw Inventory View (RawInventoryView component)
├─ Supplier+Grade Summary Cards (across all models)
│  ├─ Model+GB (inside each card when expanded)
│  │  └─ Master Cartons with device list
│
└─ Detailed Breakdown by Model+GB
   └─ Supplier+Grade groups
      └─ Master Cartons
         └─ Device details table (IMEI, model, gb, color, lock status, grade)
```

**Key Mapping for UI**:
- `model` field → Model display
- `gb` field → GB display
- `age` field (repurposed) → Supplier
- `concat` field (repurposed) → Master Carton label (from `label`)
- `grade` field → Grade display

---

## 3. DUMP Inventory

### Data Source
- **User Input**: Manually managed via UI
- **Storage**: Either in-memory array or PostgreSQL `shipped_imeis` table
- **Purpose**: Track IMEIs that have been shipped/ordered (removed from Physical Inventory count)

### Data Structure

#### Database Schema
```typescript
shippedImeis {
  id: UUID (primary key)
  imei: TEXT (not null)
  createdAt: TIMESTAMP
}

// Constraints: imei is unique
```

#### In-Memory Fallback
```typescript
let inMemoryShippedIMEIs: string[] = [];
// Used when database is not available
```

### IMEI Management Functions

#### 1. Get All Dump IMEIs
**GET** `/api/shipped-imeis`
**Location**: `server/routes.ts` line 153

```typescript
// Database:
SELECT imei FROM shipped_imeis;

// In-Memory:
return inMemoryShippedIMEIs;
```

#### 2. Add Dump IMEIs (Bulk)
**POST** `/api/shipped-imeis`
**Location**: `server/routes.ts` line 171

```typescript
// Body: { imeis: string[] }
// Database:
INSERT INTO shipped_imeis (imei) VALUES (...)
ON CONFLICT DO NOTHING;  // Ignore duplicates

// Activity Logging:
logImeiDumpAdd(userId, email, imeis, request)
```

#### 3. Delete Dump IMEI (Single)
**DELETE** `/api/shipped-imeis/:imei`
**Location**: `server/routes.ts` line 260

```typescript
DELETE FROM shipped_imeis WHERE imei = ?;

// Activity Logging:
logImeiDumpDelete(userId, email, imei, request)
```

#### 4. Clear All Dump IMEIs
**DELETE** `/api/shipped-imeis`
**Location**: `server/routes.ts` line 230

```typescript
DELETE FROM shipped_imeis;

// Activity Logging:
logImeiDumpClear(userId, email, count, request)
```

### Activity Tracking
All DUMP operations are logged in `userActivityLog` table:

```typescript
userActivityLog {
  activityType: 'imei_dump_add' | 'imei_dump_delete' | 'imei_dump_clear'
  itemCount: number  // Number of IMEIs affected
  metadata: JSONB    // {imei, imeiList}
  performedAt: TIMESTAMP
  // ... plus user, IP, user agent
}
```

---

## 4. Relationship & Interaction Between Inventory Types

### Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                    INVENTORY ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│   Google Sheets #1           │
│  (Main Spreadsheet)          │
│  1CbvbPL...vw                │
├──────────────────────────────┤
│ PHYSICAL INVENTORY sheet     │ ──→ fetchSheetData()
│ GRADED TO FALLOUT sheet      │
│ OUTBOUND IMEIs sheet         │
└──────────────────────────────┘
                │
                ↓
    syncGoogleSheetsToDatabase()
                │
                ↓
        ┌───────────────────┐
        │   PostgreSQL DB   │
        ├───────────────────┤
        │ • inventory_items │────→ searchByIMEI()
        │ • movements       │────→ batchSearchIMEIs()
        │ • shipped_imeis   │────→ getIMEIHistory()
        │ • locations       │
        └───────────────────┘


┌──────────────────────────────┐
│   Google Sheets #2           │
│  (Raw Inventory)             │
│  1P7mchy...5A                │
├──────────────────────────────┤
│ Dump sheet (cols M:S)        │ ──→ fetchRawInventoryData()
│ Inbound sheet (cols A:M)     │
│  (grade + supplier mapping)  │
└──────────────────────────────┘
                │
                ├─ NOT stored in DB
                ├─ Fresh fetch each time
                └─ Client-side filtering
                │
                ↓
            RawInventoryView
            (UI Component)


┌──────────────────────────────┐
│   User Manual Input          │
│   (Via ShippedIMEIsManager   │
│    Component UI)             │
├──────────────────────────────┤
│ Paste IMEIs from clipboard   │
│ (shipped/ordered items)      │
└──────────────────────────────┘
                │
                ├─→ POST /api/shipped-imeis
                │
                ↓
        ┌──────────────────┐
        │ shipped_imeis    │──→ Physical Inventory uses this
        │ table            │    to EXCLUDE from count
        │ (or in-memory)   │
        └──────────────────┘
```

### Physical Inventory View Logic
```typescript
// From Dashboard.tsx

if (activeDataset === 'physical') {
  // GET all items from Physical Inventory sheet
  const shippedSet = new Set(shippedIMEIs);
  
  // FILTER OUT any items that are in the DUMP list
  return inventoryData.physicalInventory.filter(
    item => !shippedSet.has(item.imei || '')
  );
}

// Result: Shows only items that are:
// - In PHYSICAL INVENTORY sheet AND
// - NOT in DUMP inventory (shipped_imeis table)
```

### Key Interactions
1. **Physical → DUMP**: Physical inventory item marked as shipped → Added to DUMP list → Physical count decreases
2. **Physical ↔ Raw**: Independent views, no direct interaction
3. **Raw → Nothing**: Raw inventory is read-only, no direct updates to Physical or DUMP
4. **Outbound (3rd sheet)**: Separate tracking of shipped items (syncOutboundImeis.ts)

---

## 5. IMEI Tracking Summary

| Inventory Type | IMEI Storage | Lookup Method | Real-time? | Audit Trail |
|---|---|---|---|---|
| **Physical** | PostgreSQL `inventory_items.imei` (unique) | `searchByIMEI()`, `batchSearchIMEIs()` | Yes (from DB) | Complete in `inventoryMovements` |
| **Raw** | Google Sheets `Dump!` column + Inbound mapping | None (client-side filter) | Fresh on demand | None |
| **DUMP** | PostgreSQL `shipped_imeis.imei` (unique) OR in-memory array | API GET endpoint | Yes | User activity log only |

---

## 6. Data Flow Examples

### Example 1: Search for IMEI in Physical Inventory
```
User enters IMEI in search box
        ↓
IMEISearchDialog component
        ↓
searchByIMEI(imei) function
        ↓
SELECT * FROM inventory_items WHERE imei = ?
        ↓
Left JOIN with locations table
        ↓
SELECT last movement from inventory_movements
        ↓
Return IMEISearchResult with full details
        ↓
Display in dialog with history
```

### Example 2: View Raw Inventory
```
User clicks "Raw Inventory" tab
        ↓
Dashboard.tsx activeDataset = 'raw'
        ↓
Re-fetches /api/inventory
        ↓
fetchRawInventoryData() in googleSheets.ts
  ├─ fetchInboundMapping() → Build Map<masterCarton, {grade, supplier}>
  └─ Fetch Dump!M:S sheet
     └─ Cross-reference each item with Inbound mapping
        ↓
Return RawInventoryRow[]
        ↓
Map to InventoryItem format:
  - repurpose 'age' field → supplier
  - repurpose 'concat' field → master carton (label)
        ↓
RawInventoryView renders hierarchical UI:
  Model+GB → Supplier+Grade → Master Cartons → Items
```

### Example 3: Mark IMEI as Shipped
```
User opens Dump IMEI tab
        ↓
User pastes IMEIs in ShippedIMEIsManager
        ↓
Click "Add IMEIs"
        ↓
POST /api/shipped-imeis
        ↓
INSERT INTO shipped_imeis (imei) VALUES (...)
ON CONFLICT DO NOTHING
        ↓
logImeiDumpAdd() - Log activity
        ↓
Invalidate query cache ['/api/shipped-imeis']
        ↓
Physical Inventory view re-renders:
  - Filter OUT IMEIs that are now in shipped_imeis
  - Count decreases automatically
```

---

## 7. Key Files & Locations

| Component | File | Purpose |
|---|---|---|
| **Schemas** | `shared/schema.ts` | Zod schemas for InventoryItem, RawInventoryItem |
| | `server/db/schema.ts` | Drizzle ORM schema definitions |
| **Data Fetch** | `server/lib/googleSheets.ts` | Fetch from all sheets |
| **Sync** | `server/lib/inventorySync.ts` | Sync Physical → DB |
| | `server/lib/outboundSync.ts` | Sync Outbound sheet |
| **Search** | `server/lib/searchService.ts` | IMEI lookup functions |
| **Routes** | `server/routes.ts` | API endpoints |
| **UI** | `client/src/pages/Dashboard.tsx` | Main view orchestration |
| | `client/src/components/RawInventoryView.tsx` | Raw inventory display |
| | `client/src/components/ShippedIMEIsManager.tsx` | DUMP inventory UI |
| | `client/src/components/IMEISearchDialog.tsx` | Search UI |

---

## 8. Database Indexes for Performance

```sql
-- IMEI Lookups (critical for search performance)
CREATE UNIQUE INDEX idx_items_imei ON inventory_items(imei);
CREATE INDEX outbound_imeis_imei_idx ON outbound_imeis(imei);

-- Status & Location Lookups
CREATE INDEX idx_items_status ON inventory_items(current_status);
CREATE INDEX idx_items_location ON inventory_items(current_location_id);

-- Movement History
CREATE INDEX idx_movements_item ON inventory_movements(item_id, performed_at);

-- Shipped IMEIs (for rapid exclusion)
CREATE INDEX shipped_imeis_imei_idx ON shipped_imeis(imei);
```

---

## 9. Configuration & Environment

```bash
# Google Sheets Configuration
SPREADSHEET_ID=1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw        # Physical + Outbound
RAW_INVENTORY_SPREADSHEET_ID=1P7mchy-AJTYZoWggQhRJiPqNkIU2l_eOxmMhlvGzn5A  # Raw

# Sheet Names
PHYSICAL_INVENTORY_SHEET='PHYSICAL INVENTORY'
GRADED_TO_FALLOUT_SHEET='GRADED TO FALLOUT'
OUTBOUND_IMEIS_SHEET='outbound IMEIs'
RAW_INVENTORY_SHEET='Dump'

# Google API
GOOGLE_SERVICE_ACCOUNT_KEY=<JSON>     # Or GOOGLE_API_KEY
```

