# Sync Status Fix Endpoint

## Problem
The sync system can sometimes get stuck with status "in_progress" due to:
- Server crashes or restarts during sync
- Network timeouts
- Unhandled exceptions
- Long-running operations

When this happens, the sync status remains frozen and doesn't reflect the actual state of the database.

## Solution
A new endpoint `/api/sync/fix-stuck` has been added to automatically fix frozen sync records.

## Endpoint Details

### URL
```
POST /api/sync/fix-stuck
```

### What It Does
1. Finds all sync records with status "in_progress" that started more than 10 minutes ago
2. Counts the actual number of items currently in the database
3. Updates each stuck sync record to "completed" status with accurate counts
4. Adds a note indicating the sync was auto-completed

### Safety Features
- **Read-only on inventory data**: Only updates sync log records, never touches actual inventory items
- **Time threshold**: Only affects syncs older than 10 minutes (prevents fixing active syncs)
- **Accurate counts**: Uses actual database counts rather than estimates
- **Audit trail**: Preserves original timestamps and adds completion notes

### Response Format
```json
{
  "success": true,
  "message": "Fixed 1 stuck sync(s)",
  "fixed": 1,
  "totalItemsInDatabase": 20308,
  "fixedSyncs": [
    {
      "id": "7352822b-28b5-4060-ac57-851276c17bee",
      "startedAt": "2025-11-06T10:30:00.000Z",
      "wasProcessed": 15000,
      "nowProcessed": 20308
    }
  ]
}
```

## Usage Examples

### Using curl
```bash
curl -X POST http://localhost:5000/api/sync/fix-stuck
```

### Using the test script
```bash
./test-fix-sync.sh
```

### Using JavaScript/fetch
```javascript
const response = await fetch('/api/sync/fix-stuck', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(`Fixed ${result.fixed} sync(s)`);
console.log(`Database now contains ${result.totalItemsInDatabase} items`);
```

## When to Use
Run this endpoint when:
- The sync status shows "in_progress" for an extended period
- You've confirmed the sync is actually stuck (not actively running)
- You need to clear the way for a new sync to run
- After a server restart that interrupted a sync

## What Gets Updated
The endpoint updates the `google_sheets_sync_log` table:

| Field | Updated Value |
|-------|--------------|
| `status` | Set to "completed" |
| `syncCompletedAt` | Set to current timestamp |
| `itemsProcessed` | Set to actual count of items in database |
| `itemsUnchanged` | Calculated based on total minus added/updated |
| `errorMessage` | Set to "Auto-completed by fix-stuck endpoint after timeout" |

## Database Query
The endpoint uses this query to find stuck syncs:
```sql
SELECT * FROM google_sheets_sync_log
WHERE status = 'in_progress'
  AND sync_started_at < NOW() - INTERVAL '10 minutes'
```

## Code Location
- **File**: `/Users/brandonin/GENTLE TOOLS DASH/server/routes.ts`
- **Lines**: 210-288
- **Function**: POST handler for `/api/sync/fix-stuck`

## Related Endpoints
- `GET /api/sync/status` - Check current sync status
- `POST /api/sync/sheets` - Manually trigger a new sync

## Notes
- This is a safe operation that only affects metadata, not actual inventory data
- Can be run multiple times without side effects
- Won't fix syncs that are less than 10 minutes old (to protect active syncs)
- Requires database connection (won't work with in-memory mode)
