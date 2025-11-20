# Inventory Data Model Analysis - Summary

## Analysis Completed

Two comprehensive documents have been created to help you understand the inventory data model:

### 1. INVENTORY_DATA_MODEL.md (17KB)
**Complete technical reference** with detailed information on:
- Data structures for each inventory type
- Database schemas and relationships
- IMEI lookup functions and implementation
- Google Sheets integration details
- Sync processes and data flows
- Configuration and performance indexes

**Best for**: Understanding the architecture, database design, and data flow patterns

### 2. IMEI_LOOKUP_QUICK_REFERENCE.md (8KB)
**Practical developer guide** with:
- Quick copy-paste code examples
- Common query patterns
- API endpoint reference
- SQL queries for direct DB access
- Troubleshooting tips
- Performance best practices

**Best for**: Implementing features, debugging issues, and writing queries

---

## Key Findings

### Three Distinct Inventory Systems

1. **Physical Inventory** (Database-backed, persistent)
   - Source: Google Sheets `PHYSICAL INVENTORY` sheet
   - Storage: PostgreSQL `inventory_items` table
   - Lookup: `searchByIMEI()`, `batchSearchIMEIs()`, `getIMEIHistory()`
   - IMEI Tracking: Unique index, full audit trail in `inventoryMovements`
   - Real-time: Yes (from database)

2. **Raw Inventory** (Sheet-based, fresh on demand)
   - Source: Google Sheets `Dump` sheet (columns M:S) + `Inbound` sheet mapping
   - Storage: NOT in database (fetched fresh each time)
   - Lookup: None (client-side filtering only)
   - IMEI Tracking: Via Master Carton ID mapping from Inbound sheet
   - Real-time: Yes (fresh from sheets on every request)

3. **DUMP Inventory** (User-managed, for exclusions)
   - Source: User manual input via UI
   - Storage: PostgreSQL `shipped_imeis` table (or in-memory fallback)
   - Lookup: Simple list fetch via `/api/shipped-imeis`
   - IMEI Tracking: Simple unique constraint
   - Activity Logging: Full audit trail in `userActivityLog`

### Key Relationships

```
Physical Inventory View = 
  PHYSICAL INVENTORY sheet items MINUS DUMP list items
```

When a user marks an IMEI as "shipped" (adds to DUMP), it's automatically:
- Excluded from Physical Inventory count
- Logged in user activity
- Marked as "shipped" if synced to movements table

### IMEI Lookup Functions

| Function | Input | Output | Storage |
|----------|-------|--------|---------|
| `searchByIMEI(imei)` | Single IMEI | Detailed info + last movement | `inventory_items` + `inventory_movements` |
| `batchSearchIMEIs(imeis[])` | IMEI array | Array of results + summary | Same as above |
| `getIMEIHistory(imei)` | Single IMEI | Complete movement history | `inventory_movements` |

All three functions return comprehensive data including:
- Current status (in_stock, shipped, transferred, removed)
- Grade and lock status
- Model, GB, color information
- Last movement details
- Days in inventory

### Google Sheets Configuration

```
Spreadsheet 1 (Main):
  ID: 1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw
  Sheets:
    - PHYSICAL INVENTORY (primary inventory)
    - GRADED TO FALLOUT (not currently used)
    - outbound IMEIs (shipped tracking)

Spreadsheet 2 (Raw):
  ID: 1P7mchy-AJTYZoWggQhRJiPqNkIU2l_eOxmMhlvGzn5A
  Sheets:
    - Dump (raw inventory, columns M:S for REMAIN section)
    - Inbound (metadata: Master Carton ID → Grade + Supplier)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│            GOOGLE SHEETS                             │
├─────────────────────────────────────────────────────┤
│ Spreadsheet 1          │ Spreadsheet 2              │
│ • PHYSICAL INVENTORY   │ • Dump (raw)              │
│ • GRADED TO FALLOUT    │ • Inbound (metadata)      │
│ • outbound IMEIs       │                            │
└──────────┬──────────────┬──────────────────────────┘
           │              │
     (sync weekly)   (fresh on demand)
           │              │
           ↓              ↓
      ┌─────────────────────────────┐
      │    PostgreSQL Database      │
      ├─────────────────────────────┤
      │ • inventory_items           │ ← IMEI lookups here
      │ • inventory_movements       │ ← History/audit here
      │ • shipped_imeis (DUMP)      │ ← Exclusion list
      │ • user_activity_log         │ ← Activity tracking
      │ • inventory_locations       │
      └─────────────────────────────┘
           ↑              ↑
           │          (no persist)
           │              │
       (queries)      (UI displays)
           │              │
           ↓              ↓
      ┌─────────────────────────────┐
      │   React Frontend            │
      ├─────────────────────────────┤
      │ Physical Inventory View     │
      │ Raw Inventory View          │
      │ DUMP IMEI Manager           │
      │ Search Dialogs              │
      └─────────────────────────────┘
```

---

## Critical IMEI Fields

### In Physical Inventory
- `inventory_items.imei` - Primary IMEI (unique index)
- `inventory_items.id` - Internal reference for movements
- `inventory_movements.*` - All historical changes

### In Raw Inventory
- `Dump!B:B` - IMEI column
- `Dump!A:A` - Label (Master Carton ID)
- Mapped to `Inbound!A:A` for grade and supplier

### In DUMP List
- `shipped_imeis.imei` - IMEI marked as shipped
- `userActivityLog.metadata` - Who added/removed and when

---

## Important Notes

1. **Raw inventory is NOT stored in database** - It's always fetched fresh from Google Sheets
2. **IMEI is case-sensitive** - Normalizes via `.trim()` but not case conversion
3. **DUMP list filters Physical** - Not a separate inventory, just an exclusion filter
4. **Batch operations are optimized** - Use `batchSearchIMEIs()` not looped `searchByIMEI()`
5. **Movement audit is complete** - Every change tracked (grade, lock status, location, status)

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Number of inventory types | 3 |
| Primary IMEI storage locations | 2 (Physical + DUMP) |
| Google Sheets connected | 2 separate spreadsheets |
| Database lookup functions | 3 |
| API endpoints for IMEI ops | 4+ |
| Movement types tracked | 6 (added, shipped, transferred, status_changed, grade_changed, removed) |

---

## Next Steps for Development

If you're building features that interact with IMEI data:

1. **For searching/lookups** → Use functions in `/server/lib/searchService.ts`
2. **For adding/removing from DUMP** → Use routes in `/server/routes.ts` (lines 171-282)
3. **For raw inventory access** → Import from `/server/lib/googleSheets.ts`
4. **For database queries** → Use Drizzle ORM with imported schemas from `/server/db/schema.ts`

---

## File Locations

- Complete specs: `/Users/brandonin/GENTLE TOOLS DASH/INVENTORY_DATA_MODEL.md`
- Quick ref: `/Users/brandonin/GENTLE TOOLS DASH/IMEI_LOOKUP_QUICK_REFERENCE.md`
- Analysis: `/Users/brandonin/GENTLE TOOLS DASH/ANALYSIS_SUMMARY.md` (this file)

