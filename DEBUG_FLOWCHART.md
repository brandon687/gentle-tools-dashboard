# Raw Inventory Fetch - Flow Diagram

## Current Flow (Broken - Returns 0 Items)

```
┌─────────────────────────────────────────────┐
│ User clicks "Refresh Raw Inventory"         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ fetchRawInventoryData() called              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ getAuthClient() - Get authentication        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Check for          │
         │ SERVICE_ACCOUNT_KEY│
         └────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼ NOT FOUND       ▼ FOUND
    ┌─────────┐       ┌──────────────┐
    │ Use API │       │ Use Service  │
    │ Key     │       │ Account JWT  │
    └────┬────┘       └──────┬───────┘
         │                   │
         │                   │
         └────────┬──────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Google Sheets API Request:                  │
│ Spreadsheet: 1P7mchy-AJT...                 │
│ Range: Dump!M:S                             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Spreadsheet        │
         │ Access Check       │
         └────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼ API KEY         ▼ SERVICE ACCOUNT
    ┌─────────────┐   ┌─────────────────┐
    │ ❌ DENIED   │   │ ✅ ALLOWED      │
    │             │   │                 │
    │ Spreadsheet │   │ Spreadsheet is  │
    │ is PRIVATE  │   │ shared with SA  │
    └──────┬──────┘   └────────┬────────┘
           │                   │
           ▼                   ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ Error 403:      │  │ Success:        │
    │ "Permission     │  │ Return 30,098   │
    │  Denied"        │  │ rows of data    │
    └──────┬──────────┘  └────────┬────────┘
           │                      │
           ▼                      │
    ┌─────────────────┐          │
    │ catch block:    │          │
    │ return []       │          │
    │ (empty array)   │          │
    └──────┬──────────┘          │
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ Return to UI     │
            └──────┬───────────┘
                   │
          ┌────────┴─────────┐
          │                  │
          ▼ API KEY          ▼ SERVICE ACCOUNT
    ┌──────────┐      ┌──────────────────┐
    │ Show 0   │      │ Show 30,098      │
    │ items ❌ │      │ items ✅         │
    └──────────┘      └──────────────────┘
```

## Key Points

### Why API Key Fails:
1. **API Keys** can only access publicly shared spreadsheets
2. The raw inventory spreadsheet (`1P7mchy-AJTYZoWggQhRJiPqNkIU2l_eOxmMhlvGzn5A`) is **private**
3. Google Sheets API returns **403 Permission Denied** error
4. Error is caught and handled silently → returns empty array

### Why Service Account Works:
1. **Service Accounts** can access spreadsheets shared with their email
2. The spreadsheet owner shares it with the service account email
3. Service account authenticates with JWT using private key
4. Google Sheets API returns **full data** (30,098 rows)

## Current Environment Configuration

```bash
# Current .env file (BROKEN)
GOOGLE_API_KEY=AIzaSyBqXX1BZgz7RULfyy3djQt6T-WlgP7va6U  ✅ Present
GOOGLE_SERVICE_ACCOUNT_KEY=                            ❌ MISSING

# Result: Falls back to API key → Permission denied → 0 items
```

```bash
# Fixed .env file (WORKING)
GOOGLE_API_KEY=AIzaSyBqXX1BZgz7RULfyy3djQt6T-WlgP7va6U     ✅ Present (fallback)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account"...} ✅ CONFIGURED

# Result: Uses service account → Permission granted → 30,098 items
```

## Code Path Breakdown

### File: `server/lib/googleSheets.ts`

**Lines 14-38**: Authentication Selection
```typescript
function getAuthClient(): string | JWT {
  // 1. Try service account first ← ❌ Not set in your env
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    return new google.auth.JWT({ /* ... */ });
  }

  // 2. Fall back to API key ← ✅ This path is taken
  const apiKey = process.env.GOOGLE_API_KEY;
  return apiKey;
}
```

**Lines 219-222**: API Request
```typescript
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: RAW_INVENTORY_SPREADSHEET_ID,  // Private sheet
  range: `${RAW_INVENTORY_SHEET}!M:S`,           // M:S columns
});
// ← Throws "Permission denied" error here
```

**Lines 278-285**: Error Handling (THE SILENT FAILURE)
```typescript
} catch (error: any) {
  console.error(`[${RAW_INVENTORY_SHEET}] Error fetching data:`, error.message);

  // Checks for permission error
  if (error.message?.includes('permission') || error.code === 403) {
    console.warn(`No access to raw inventory sheet - continuing without it`);
  }

  return [];  // ← Returns empty array instead of throwing
              // ← THIS IS WHY YOU SEE 0 ITEMS!
}
```

## Summary

```
┌───────────────────────────────────────────────┐
│ PROBLEM: Returns 0 items instead of 30,098    │
├───────────────────────────────────────────────┤
│ ROOT CAUSE: Permission denied (403 error)     │
├───────────────────────────────────────────────┤
│ WHY: Missing GOOGLE_SERVICE_ACCOUNT_KEY       │
├───────────────────────────────────────────────┤
│ FIX: Set up service account + share sheet     │
├───────────────────────────────────────────────┤
│ IMPACT: Feature completely broken             │
├───────────────────────────────────────────────┤
│ DIFFICULTY: Easy (just configuration)         │
└───────────────────────────────────────────────┘
```
