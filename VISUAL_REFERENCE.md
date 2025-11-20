# Visual Reference: Inventory Data Model

## 1. Database Schema Diagram

```
┌─────────────────────────────────┐
│      INVENTORY_LOCATIONS        │
├─────────────────────────────────┤
│ • id (UUID)                     │
│ • name (Main Warehouse)         │
│ • code (MAIN)                   │
│ • isActive                      │
└────────────┬────────────────────┘
             │
             │ References
             │
             ↓
┌──────────────────────────────────────────────────────┐
│        INVENTORY_ITEMS (Primary)                    │
├──────────────────────────────────────────────────────┤
│ • id (UUID, PK)                                     │
│ • imei (TEXT, UNIQUE INDEX) ← MAIN LOOKUP KEY      │
│ • model, gb, color, sku                            │
│ • currentGrade, currentLockStatus                  │
│ • currentStatus ('in_stock'|'shipped'|...)         │
│ • currentLocationId (FK)                           │
│ • firstSeenAt, lastSeenAt                          │
└──────────────┬─────────────────────────────────────┘
               │
               │ itemId (FK)
               │
               ↓
┌──────────────────────────────────────────────────────┐
│      INVENTORY_MOVEMENTS (Audit Trail)              │
├──────────────────────────────────────────────────────┤
│ • id (UUID, PK)                                     │
│ • itemId (FK) ← Links to item                       │
│ • movementType (added|shipped|grade_changed|...)   │
│ • fromLocationId, toLocationId (FK)                │
│ • fromStatus, toStatus                             │
│ • fromGrade, toGrade                               │
│ • performedAt (INDEX)                              │
│ • source ('google_sheets_sync'|'manual'|...)       │
│ • snapshotData (JSONB)                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│     SHIPPED_IMEIS (DUMP List)                       │
├──────────────────────────────────────────────────────┤
│ • id (UUID, PK)                                     │
│ • imei (TEXT, UNIQUE INDEX) ← DUMP IMEI LIST      │
│ • createdAt                                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│     USER_ACTIVITY_LOG (Activity Tracking)           │
├──────────────────────────────────────────────────────┤
│ • id (UUID, PK)                                     │
│ • userId (FK), userEmail                           │
│ • activityType ('imei_dump_add'|'imei_dump_delete')│
│ • itemCount (# of IMEIs affected)                  │
│ • metadata (JSONB - contains IMEI list)           │
│ • performedAt (INDEX)                              │
└──────────────────────────────────────────────────────┘
```

---

## 2. Data Lookup Flow

```
USER SEARCH FOR IMEI
        │
        ↓
  ┌─────────────┐
  │ Frontend    │
  │ IMEI input  │
  └──────┬──────┘
         │
         ↓
  ┌──────────────────────────┐
  │ IMEISearchDialog.tsx      │
  │ or BulkIMEISearchDialog   │
  └──────┬───────────────────┘
         │
         ├─ Single → searchByIMEI(imei)
         │
         └─ Multiple → batchSearchIMEIs([imeis])
                │
                ↓
    ┌───────────────────────────────┐
    │  GET /api/search/imei/:imei   │
    │  POST /api/search/batch       │
    └───────────┬───────────────────┘
                │
                ↓
    ┌──────────────────────────────┐
    │ searchService.ts functions   │
    └───────────┬──────────────────┘
                │
                ├─→ Query: inventory_items WHERE imei = ?
                │   + LEFT JOIN inventory_locations
                │   + SELECT from inventory_movements (last 1)
                │
                ↓
    ┌──────────────────────────┐
    │ PostgreSQL Database      │
    └───────────┬──────────────┘
                │
                ↓
    ┌──────────────────────────────┐
    │ IMEISearchResult             │
    │ {                            │
    │   found: boolean             │
    │   imei: string               │
    │   currentStatus: string      │
    │   currentGrade: string|null  │
    │   model, gb, color, sku      │
    │   lastMovement: {...}        │
    │   daysInInventory: number    │
    │ }                            │
    └───────────┬──────────────────┘
                │
                ↓
    ┌──────────────────────────────┐
    │ Display in UI Dialog         │
    └──────────────────────────────┘
```

---

## 3. Physical Inventory Display Logic

```
┌─────────────────────────────────────────────────────────┐
│         Dashboard.tsx (activeDataset = 'physical')      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─ Fetch: GET /api/inventory
                  │         └─ Returns: {physicalInventory, rawInventory}
                  │
                  ├─ Fetch: GET /api/shipped-imeis
                  │         └─ Returns: string[] (DUMP list)
                  │
                  ↓
    ┌─────────────────────────────────────┐
    │ useMemo: currentItems calculation   │
    ├─────────────────────────────────────┤
    │                                     │
    │ const shippedSet = new Set(         │
    │   shippedIMEIs  // DUMP list        │
    │ )                                   │
    │                                     │
    │ return physicalInventory.filter(    │
    │   item => !shippedSet.has(          │
    │     item.imei || ''                 │
    │   )                                 │
    │ )                                   │
    └─────────────────────────────────────┘
                  │
                  ↓ Result
    ┌──────────────────────────────────────────────────┐
    │ Physical Inventory Display                       │
    │ (PHYSICAL INVENTORY sheet MINUS DUMP list)      │
    │                                                 │
    │ Items shown = In Physical Inventory AND         │
    │              NOT in Shipped (DUMP) list        │
    └──────────────────────────────────────────────────┘
```

---

## 4. Raw Inventory Fetch & Display

```
GET /api/inventory request
        │
        ↓
┌──────────────────────────────────────────┐
│ fetchInventoryData()                     │
│ (server/lib/googleSheets.ts)            │
└────────────┬─────────────────────────────┘
             │
             ├─ Parallel execution:
             │
             ├─ fetchSheetData(PHYSICAL_INVENTORY_SHEET)
             │  └─ Google Sheets API → physicalInventory[]
             │
             └─ fetchRawInventoryData(auth)
                │
                ├─ fetchInboundMapping()
                │  └─ Inbound sheet A:M
                │     └─ Build: Map<masterCartonId, {grade, supplier}>
                │
                ├─ Fetch Dump sheet M:S
                │  └─ Extract: label, imei, model, gb, color, lockStatus, date
                │
                └─ Cross-reference each item
                   └─ Lookup label in Inbound map
                      └─ Add grade + supplier from map
                         └─ Filter: only items with valid IMEIs
                            └─ Return: RawInventoryRow[]
        │
        ↓
┌──────────────────────────────────────────┐
│ Response: InventoryDataResponse          │
│ {                                        │
│   physicalInventory: InventoryItem[]     │
│   gradedToFallout: InventoryItem[]       │
│   rawInventory: RawInventoryRow[]        │
│ }                                        │
└────────────┬─────────────────────────────┘
             │
             ↓ Frontend receives
┌──────────────────────────────────────────┐
│ Dashboard.tsx                            │
│ if (activeDataset === 'raw') {           │
│   Map rawInventory to InventoryItem[]    │
│   (repurpose age→supplier, concat→label) │
│ }                                        │
└────────────┬─────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│ RawInventoryView.tsx (memoized)          │
│                                          │
│ Group by:                                │
│  1. Model + GB (top level)               │
│  2. Supplier + Grade (expandable cards)  │
│  3. Master Cartons (inside cards)        │
│  4. Device list (detail table)           │
└──────────────────────────────────────────┘
```

---

## 5. DUMP (Shipped) IMEI Management

```
User in ShippedIMEIsManager Component
        │
        ├─ PASTE IMEIs (one per line)
        │
        └─ Click "Add IMEIs"
                │
                ↓
        ┌───────────────────────┐
        │ Parse input text      │
        │ Split by newline      │
        │ Trim whitespace       │
        │ Filter empties        │
        └──────┬────────────────┘
               │
               ↓
    ┌──────────────────────────┐
    │ POST /api/shipped-imeis  │
    │ Body: { imeis: [...] }   │
    └──────┬───────────────────┘
           │
           ├─ IF Database available:
           │  ├─ INSERT INTO shipped_imeis (imei)
           │  │  VALUES (...)
           │  │  ON CONFLICT DO NOTHING
           │  │
           │  └─ logImeiDumpAdd() → userActivityLog
           │
           └─ IF Database NOT available:
              └─ Add to inMemoryShippedIMEIs[]
        │
        ↓
    ┌──────────────────────────────────┐
    │ Invalidate React Query cache     │
    │ queryKey: ['/api/shipped-imeis'] │
    └──────┬───────────────────────────┘
           │
           ↓
    Physical Inventory View re-renders
    └─ Filters OUT newly added IMEIs
       └─ Count decreases
```

---

## 6. IMEI Tracking Across Systems

```
                ┌──────────────────────────────────────────┐
                │          SINGLE IMEI "355555754760571"   │
                └───────────┬────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ↓                 ↓                 ↓
    ┌─────────────┐   ┌─────────────┐   ┌──────────────┐
    │   PHYSICAL  │   │     RAW     │   │    DUMP      │
    │ INVENTORY   │   │ INVENTORY   │   │   (Shipped)  │
    └─────────────┘   └─────────────┘   └──────────────┘
          │                 │                 │
          │                 │                 │
    ┌─────────────┐   ┌─────────────┐   ┌──────────────┐
    │inventory_   │   │ Dump sheet  │   │shipped_imeis │
    │items table  │   │ (Google)    │   │   table      │
    │ (IMEI:      │   │ (IMEI:      │   │  (IMEI:      │
    │ unique)     │   │ not unique) │   │  unique)     │
    └─────────────┘   └─────────────┘   └──────────────┘
          │                 │                 │
          │                 │                 │
    ┌─────────────────────────────────────────────────┐
    │       MUTUALLY INCLUSIVE                        │
    │  (Item can be in MULTIPLE systems)              │
    │                                                 │
    │  • Physical + DUMP = Physical shows but marked  │
    │                      as shipped/ordered         │
    │  • Physical + Raw = Inconsistency (shouldn't)  │
    │  • Raw only = Not yet in Physical system       │
    │  • DUMP only = Was in Physical, now excluded   │
    └─────────────────────────────────────────────────┘
```

---

## 7. Sync Process Timeline

```
Periodic Sync (scheduled or manual)
        │
        ├─ Trigger: syncGoogleSheetsToDatabase()
        │
        ↓
┌────────────────────────────────────────────────┐
│ 1. Create sync log entry                       │
│    (status = 'in_progress')                    │
└────────────┬─────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────┐
│ 2. Fetch PHYSICAL INVENTORY from Google Sheets│
│    Filter: rows with valid IMEIs              │
└────────────┬─────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────┐
│ 3. Batch lookup existing items from DB         │
│    (chunked in groups of 1000)                 │
└────────────┬─────────────────────────────────────┘
             │
             ├─ NEW items → INSERT inventory_items
             │             + INSERT movement (type='added')
             │
             ├─ EXISTING items with changes
             │  └─ UPDATE inventory_items
             │     + INSERT movement (type='grade_changed'|'status_changed')
             │
             └─ UNCHANGED items → Skip
        │
        ↓
┌────────────────────────────────────────────────┐
│ 4. Update sync log                             │
│    (status = 'completed')                      │
│    Report: itemsProcessed, itemsAdded,         │
│            itemsUpdated, itemsUnchanged        │
└────────────────────────────────────────────────┘
```

---

## 8. Key Index Strategy

```
IMEI Lookups (Most Critical)
├─ inventory_items.imei
│  └─ Type: UNIQUE INDEX
│     Purpose: Direct IMEI search, prevents duplicates
│     Query: WHERE imei = ?
│
├─ outbound_imeis.imei
│  └─ Type: INDEX (not unique)
│     Purpose: Outbound sheet cache search
│
└─ shipped_imeis.imei
   └─ Type: Not explicitly indexed in code
      (but implied UNIQUE)
      Purpose: DUMP list exclusion filter

Status Lookups
├─ inventory_items.current_status
│  └─ Purpose: Find by status (in_stock|shipped|etc)
│
└─ inventory_items.current_grade
   └─ Purpose: Grade-based filtering

Movement History
└─ inventory_movements (item_id, performed_at)
   └─ Purpose: Efficient history queries

```

---

## 9. Component Hierarchy

```
Dashboard.tsx (Main view orchestrator)
├─ Header
├─ Tabs: Physical | Raw | Reconciled | Shipped | Outbound | Movements
│
├─ Physical Inventory Tab
│  ├─ InventoryFilters
│  ├─ DashboardStats
│  ├─ ExpandableGradeSection (by grade)
│  ├─ PivotView (by model/color)
│  └─ InventoryTable
│
├─ Raw Inventory Tab
│  ├─ RawInventoryRefreshCard
│  └─ RawInventoryView
│     ├─ Supplier+Grade Summary Cards
│     └─ Detailed Model+GB sections
│
├─ Shipped (DUMP) Tab
│  └─ ShippedIMEIsManager
│     ├─ Textarea input
│     ├─ Add/Clear/Copy buttons
│     └─ List display with remove icons
│
└─ Search Dialogs
   ├─ IMEISearchDialog (single)
   └─ BulkIMEISearchDialog (batch)
```

