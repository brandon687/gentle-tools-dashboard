# Inventory Data Model Analysis - Complete Documentation

Created: November 20, 2025

## Overview

This analysis provides comprehensive documentation of the three distinct inventory systems in GENTLE TOOLS DASH:
1. **Physical Inventory** - Database-backed, persistent
2. **Raw Inventory** - Sheet-based, fresh on demand  
3. **DUMP Inventory** - User-managed exclusion list

---

## Documentation Files

### 1. INVENTORY_DATA_MODEL.md (17 KB, 584 lines)
**The Complete Technical Reference**

Start here for deep understanding of:
- Detailed data structures for each inventory type
- PostgreSQL database schemas and relationships
- Complete IMEI lookup function specifications
- Google Sheets integration and column mappings
- Sync processes and data flow patterns
- Database indexes and performance optimization
- Configuration and environment variables

**Best for:** Architecture review, database design, understanding data flow

---

### 2. IMEI_LOOKUP_QUICK_REFERENCE.md (9 KB, 334 lines)
**Practical Developer Quick Reference**

Use this for day-to-day development:
- Copy-paste code examples for IMEI operations
- TypeScript function imports and usage
- HTTP API endpoint reference with examples
- Direct SQL queries for PostgreSQL
- Common query patterns by use case
- Troubleshooting guide
- Performance tips and best practices

**Best for:** Implementing features, debugging, writing queries

---

### 3. VISUAL_REFERENCE.md (21 KB, 364 lines)
**Visual Diagrams and Flow Charts**

Understand the system visually:
- Database schema diagram with relationships
- IMEI data lookup flow with all steps
- Physical inventory display logic
- Raw inventory fetch and display process
- DUMP IMEI management workflow
- IMEI tracking across all three systems
- Sync process timeline
- Index strategy for performance
- Component hierarchy and structure

**Best for:** Visual learners, presentations, onboarding

---

### 4. ANALYSIS_SUMMARY.md (7.6 KB, 201 lines)
**Executive Summary & Quick Stats**

High-level overview:
- Key findings about each inventory system
- IMEI lookup function comparison table
- Google Sheets configuration details
- Data flow diagram (text-based)
- Critical IMEI field locations
- Important notes and gotchas
- Quick statistics about the system
- Next steps for development

**Best for:** Getting started quickly, management overview

---

## Quick Navigation

### I want to...

**Understand the architecture**
→ Start with ANALYSIS_SUMMARY.md, then INVENTORY_DATA_MODEL.md

**Implement a feature using IMEI data**
→ Use IMEI_LOOKUP_QUICK_REFERENCE.md for code examples

**Debug an issue**
→ Check IMEI_LOOKUP_QUICK_REFERENCE.md troubleshooting section

**See how data flows**
→ Review VISUAL_REFERENCE.md diagrams

**Learn about database schema**
→ Check INVENTORY_DATA_MODEL.md section 1 and VISUAL_REFERENCE.md diagram 1

**Understand IMEI lookups**
→ Read INVENTORY_DATA_MODEL.md "IMEI Lookup Functions" sections

**See how Raw Inventory works**
→ Read INVENTORY_DATA_MODEL.md section 2 and VISUAL_REFERENCE.md diagram 4

**Learn about DUMP operations**
→ Read INVENTORY_DATA_MODEL.md section 3 and VISUAL_REFERENCE.md diagram 5

---

## Key Concepts at a Glance

### The Three Inventories

| Aspect | Physical | Raw | DUMP |
|--------|----------|-----|------|
| **Source** | Google Sheets `PHYSICAL INVENTORY` | Google Sheets `Dump` + `Inbound` | User input (UI) |
| **Storage** | PostgreSQL `inventory_items` | NOT stored (fresh fetch) | PostgreSQL `shipped_imeis` |
| **Purpose** | Track live inventory | Unprocessed/incoming inventory | Mark items as shipped/excluded |
| **IMEI Lookup** | Database queries (fast) | Client-side filter (no DB) | Simple list retrieval |
| **Audit Trail** | `inventory_movements` table | None | `userActivityLog` table |
| **Update Frequency** | Synced weekly | Fresh on every request | Real-time as users input |

### IMEI Lookup Functions

```
searchByIMEI(imei)           → Find single IMEI with full details
batchSearchIMEIs(imeis[])    → Find multiple IMEIs efficiently
getIMEIHistory(imei, limit)  → Get complete movement history
```

All return: Current status, grade, location, last movement, days in inventory

### Physical Inventory Display Logic

```
Displayed Items = PHYSICAL INVENTORY sheet items MINUS DUMP list
```

When a user marks an IMEI as "shipped", it's automatically excluded from the Physical count.

---

## File Cross-References

### By Topic

**Database Schema**
- INVENTORY_DATA_MODEL.md → Section 1
- VISUAL_REFERENCE.md → Diagram 1

**IMEI Lookups**
- INVENTORY_DATA_MODEL.md → Sections 1.3, 2, 3
- IMEI_LOOKUP_QUICK_REFERENCE.md → First 6 sections
- VISUAL_REFERENCE.md → Diagram 2

**Raw Inventory**
- INVENTORY_DATA_MODEL.md → Section 2
- IMEI_LOOKUP_QUICK_REFERENCE.md → "Raw Inventory" section
- VISUAL_REFERENCE.md → Diagram 4

**DUMP Operations**
- INVENTORY_DATA_MODEL.md → Section 3
- IMEI_LOOKUP_QUICK_REFERENCE.md → "DUMP Inventory" section
- VISUAL_REFERENCE.md → Diagram 5

**Data Flows**
- INVENTORY_DATA_MODEL.md → Section 6
- VISUAL_REFERENCE.md → Diagrams 2-7
- ANALYSIS_SUMMARY.md → "Data Flow Diagram"

**Integration Points**
- INVENTORY_DATA_MODEL.md → Section 7 "Key Files & Locations"
- ANALYSIS_SUMMARY.md → "Next Steps for Development"

**Performance & Indexes**
- INVENTORY_DATA_MODEL.md → Section 8
- IMEI_LOOKUP_QUICK_REFERENCE.md → "Performance Tips"
- VISUAL_REFERENCE.md → Diagram 8

**Configuration**
- INVENTORY_DATA_MODEL.md → Section 9
- ANALYSIS_SUMMARY.md → "Google Sheets Configuration"

---

## Important Discoveries

### 1. Three Distinct Systems (Not One)
Physical, Raw, and DUMP are completely separate systems with different:
- Data sources (Google Sheets vs database vs user input)
- Storage mechanisms
- Lookup approaches
- Update frequencies

An IMEI can exist in multiple systems simultaneously.

### 2. Raw Inventory is NOT Persistent
Unlike Physical Inventory, Raw data is:
- Never stored in the database
- Fetched fresh from Google Sheets on every request
- Mapped via Inbound sheet for metadata
- Client-side filtered only

### 3. DUMP is a Filter, Not a Separate Inventory
The DUMP list doesn't represent a separate inventory. It's:
- A set of IMEIs to exclude from Physical Inventory display
- Used by the UI to filter what's shown
- Logged for activity tracking
- The mechanism for marking items as "shipped"

### 4. Comprehensive Audit Trail
Every change to Physical Inventory is tracked:
- All grade changes
- All lock status changes
- All location transfers
- All status changes
- Complete snapshot captured for each movement

### 5. Google Sheets Integration
Two separate Google Sheets:
- **Sheet 1**: Main inventory (PHYSICAL INVENTORY, outbound IMEIs)
- **Sheet 2**: Raw inventory (Dump sheet + Inbound metadata)

---

## Code Locations

### For IMEI Operations

| Operation | File | Function |
|-----------|------|----------|
| Single IMEI search | `server/lib/searchService.ts` | `searchByIMEI()` |
| Batch IMEI search | `server/lib/searchService.ts` | `batchSearchIMEIs()` |
| IMEI history | `server/lib/searchService.ts` | `getIMEIHistory()` |
| Add to DUMP | `server/routes.ts:171` | POST `/api/shipped-imeis` |
| Remove from DUMP | `server/routes.ts:260` | DELETE `/api/shipped-imeis/:imei` |
| Get DUMP list | `server/routes.ts:153` | GET `/api/shipped-imeis` |

### For Data Fetching

| Data | File | Function |
|------|------|----------|
| Physical Inventory | `server/lib/googleSheets.ts` | `fetchSheetData()` |
| Raw Inventory | `server/lib/googleSheets.ts` | `fetchRawInventoryData()` |
| Inbound mapping | `server/lib/googleSheets.ts` | `fetchInboundMapping()` |
| All inventory data | `server/routes.ts:139` | GET `/api/inventory` |

### For Sync

| Operation | File | Function |
|-----------|------|----------|
| Sync Physical → DB | `server/lib/inventorySync.ts` | `syncGoogleSheetsToDatabase()` |
| Sync status | `server/routes.ts:318` | GET `/api/sync/status` |
| Manual sync trigger | `server/routes.ts:293` | POST `/api/sync/sheets` |

---

## Database Queries

### Find an IMEI
```sql
SELECT * FROM inventory_items WHERE imei = '355555754760571';
```

### Get IMEI history
```sql
SELECT * FROM inventory_movements 
WHERE item_id = (SELECT id FROM inventory_items WHERE imei = '355555754760571')
ORDER BY performed_at DESC;
```

### Check if IMEI is shipped (DUMP)
```sql
SELECT EXISTS(SELECT 1 FROM shipped_imeis WHERE imei = '355555754760571');
```

### Count by grade
```sql
SELECT current_grade, COUNT(*) FROM inventory_items 
GROUP BY current_grade ORDER BY COUNT(*) DESC;
```

---

## Common Issues & Solutions

### IMEI not found in Physical Inventory
**Check:**
1. Is it in the Google Sheets PHYSICAL INVENTORY sheet?
2. Has sync run recently? Check `/api/sync/status`
3. Is it in the DUMP list? Check `/api/shipped-imeis`

### Raw Inventory showing but not in Physical
**This is normal!** They're separate data sources:
- Raw = Not yet processed into Physical system
- Physical = Processed items only

### Performance issues with IMEI searches
**Solutions:**
- Use `batchSearchIMEIs()` for multiple lookups (not looped `searchByIMEI()`)
- Ensure indexes are present on `inventory_items.imei`
- Check database query logs for slow queries

---

## Statistics

- **Total documentation**: 1,549 lines across 4 files (44 KB)
- **Number of inventory types**: 3
- **Primary IMEI storage locations**: 2 (Physical + DUMP)
- **Google Sheets connected**: 2 separate spreadsheets
- **Database IMEI lookup functions**: 3
- **API endpoints for IMEI operations**: 4+
- **Movement types tracked**: 6

---

## Related Documentation

Other existing docs in the project:
- `INVENTORY-SYSTEM-SUMMARY.md` - Previous summary (kept for reference)
- `RAW_INVENTORY_FIX.md` - Previous fix notes (kept for reference)

---

## Version Info

- **Created**: November 20, 2025
- **Analysis Date**: November 20, 2025
- **Codebase Analyzed**: Current main branch state
- **Analysis Tool**: Claude Code (file search specialist)

---

## How to Use This Documentation

### For New Team Members
1. Start with ANALYSIS_SUMMARY.md (5 min read)
2. Review VISUAL_REFERENCE.md diagrams (10 min)
3. Deep dive into INVENTORY_DATA_MODEL.md sections as needed

### For Feature Implementation
1. Check IMEI_LOOKUP_QUICK_REFERENCE.md for your specific use case
2. Copy code examples as starting point
3. Reference INVENTORY_DATA_MODEL.md for detailed specifications

### For Debugging
1. Consult IMEI_LOOKUP_QUICK_REFERENCE.md troubleshooting section
2. Use SQL queries from that file to inspect data
3. Refer to VISUAL_REFERENCE.md to trace data flow

### For Architecture Review
1. Read ANALYSIS_SUMMARY.md for overview
2. Study VISUAL_REFERENCE.md diagrams
3. Deep dive into INVENTORY_DATA_MODEL.md for details

---

## Questions?

All key information is in one of these four documents. Find what you need using:
- ANALYSIS_SUMMARY.md - For quick answers
- IMEI_LOOKUP_QUICK_REFERENCE.md - For practical examples
- INVENTORY_DATA_MODEL.md - For complete specifications
- VISUAL_REFERENCE.md - For visual understanding

