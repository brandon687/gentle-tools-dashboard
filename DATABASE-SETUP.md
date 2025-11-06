# Gentle Tools Database Setup Guide

This guide will help you set up the PostgreSQL database for the new inventory tracking system.

## Overview

The new system adds comprehensive database tracking for:
- **All inventory movements** (added, shipped, transferred, status changes)
- **Daily inventory snapshots** for reporting
- **IMEI search functionality** ("IN INVENTORY?" lookups)
- **Multi-location inventory support** (future-ready)

## Database Schema

The system uses 5 new tables:
1. `inventory_locations` - Warehouse/storage locations
2. `inventory_items` - All devices that have been in inventory
3. `inventory_movements` - Complete audit trail of every transaction
4. `daily_inventory_snapshots` - End-of-day inventory state
5. `google_sheets_sync_log` - Sync history and debugging

## Setup Instructions

### Option 1: Use Neon.tech (Recommended for Railway)

1. **Create a Neon account** at https://neon.tech
2. **Create a new project** named "Gentle Tools Inventory"
3. **Get your connection string**:
   - Click "Connection Details"
   - Copy the connection string (it looks like `postgresql://username:password@host/database?sslmode=require`)

4. **Add to your .env file**:
   ```bash
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   ```

5. **Push the schema to the database**:
   ```bash
   npm run db:push
   ```

### Option 2: Use Railway PostgreSQL Plugin

1. **In Railway dashboard**, add PostgreSQL plugin to your project
2. **Copy the DATABASE_URL** from the plugin
3. **Add it to Railway environment variables**:
   - Go to your service → Variables
   - Add `DATABASE_URL` with the connection string

4. **Deploy** - Railway will automatically run migrations on next deploy

### Option 3: Local PostgreSQL (Development)

1. **Install PostgreSQL** locally:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create database**:
   ```bash
   createdb gentle_tools_inventory
   ```

3. **Add to .env**:
   ```bash
   DATABASE_URL=postgresql://localhost/gentle_tools_inventory
   ```

4. **Push schema**:
   ```bash
   npm run db:push
   ```

## Verifying the Setup

### 1. Start the Server

```bash
npm run dev
```

You should see:
```
✅ shipped_imeis table ready
✓ Created default location: Main Warehouse
```

### 2. Check Database Connection

Visit http://localhost:3000/api/health

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-05T...",
  "lastSync": null
}
```

### 3. Run Your First Sync

Trigger a manual sync to populate the database from Google Sheets:

```bash
curl -X POST http://localhost:3000/api/sync/sheets
```

Expected response:
```json
{
  "success": true,
  "itemsProcessed": 1250,
  "itemsAdded": 1250,
  "itemsUpdated": 0,
  "itemsUnchanged": 0,
  "movements": 1250,
  "syncLogId": "..."
}
```

### 4. Test IMEI Search

Search for a device:
```bash
curl http://localhost:3000/api/search/imei/355555754760571
```

Expected response:
```json
{
  "found": true,
  "imei": "355555754760571",
  "currentStatus": "in_stock",
  "currentLocation": {
    "id": "...",
    "name": "Main Warehouse",
    "code": "MAIN"
  },
  "currentGrade": "A+",
  "model": "iPhone 15 Pro",
  "gb": "256GB",
  "color": "Natural Titanium",
  "daysInInventory": 4
}
```

## API Endpoints Reference

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync/sheets` | Manually trigger Google Sheets sync |
| GET | `/api/sync/status` | Get latest sync status |

### Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/imei/:imei` | Search for single IMEI |
| POST | `/api/search/imei/batch` | Batch search multiple IMEIs |
| GET | `/api/movements/:imei/history` | Get movement history for IMEI |

### Movement Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/movements/ship` | Ship items (mark as shipped) |
| POST | `/api/movements/transfer` | Transfer items between locations |
| POST | `/api/movements/update-status` | Update item grade/lock status |

### Report Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/generate-snapshot` | Generate daily snapshot |
| GET | `/api/reports/daily/:date` | Get snapshot for specific date |
| GET | `/api/reports/daily/range` | Get snapshots for date range |
| GET | `/api/reports/summary` | Get summary for date range |

## Example API Usage

### Ship Items

```bash
curl -X POST http://localhost:3000/api/movements/ship \
  -H "Content-Type: application/json" \
  -d '{
    "imeis": ["355555754760571", "355555754760572"],
    "notes": "Shipped to customer - Order #12345",
    "performedBy": "user@example.com"
  }'
```

### Batch IMEI Search

```bash
curl -X POST http://localhost:3000/api/search/imei/batch \
  -H "Content-Type: application/json" \
  -d '{
    "imeis": ["355555754760571", "355555754760572", "355555754760573"]
  }'
```

### Generate Daily Snapshot

```bash
curl -X POST http://localhost:3000/api/reports/generate-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-05"
  }'
```

### Get Date Range Summary

```bash
curl "http://localhost:3000/api/reports/summary?startDate=2025-11-01&endDate=2025-11-05"
```

## Scheduled Tasks (Production)

For production, set up these scheduled tasks:

### 1. Auto-Sync Google Sheets (Every 30 minutes)

Add to Railway or use a cron service:
```bash
*/30 * * * * curl -X POST https://your-app.railway.app/api/sync/sheets
```

### 2. Generate Daily Snapshot (Every night at midnight)

```bash
0 0 * * * curl -X POST https://your-app.railway.app/api/reports/generate-snapshot
```

## Migration from Old System

The new system maintains backward compatibility:
- Old `/api/shipped-imeis` endpoints still work
- Data is synced to both old and new tables
- Gradual migration approach - no downtime required

### Migration Steps:

1. ✅ Set up database (this guide)
2. ✅ Run first sync to populate data
3. ⏳ Test new endpoints alongside old ones
4. ⏳ Update frontend to use new endpoints
5. ⏳ Monitor for 1-2 weeks
6. ⏳ Deprecate old endpoints (keep tables for safety)

## Troubleshooting

### "Database not available" Error

**Cause**: DATABASE_URL not set or connection failed

**Solution**:
1. Check `.env` file has `DATABASE_URL`
2. Verify database is accessible
3. Check connection string format
4. For Railway, ensure DATABASE_URL is in environment variables

### Sync Fails with "Table does not exist"

**Cause**: Schema not pushed to database

**Solution**:
```bash
npm run db:push
```

### "IMEI not found" When You Know It Exists

**Cause**: Sync hasn't run yet, or item not in Google Sheets

**Solution**:
1. Trigger manual sync: `POST /api/sync/sheets`
2. Check Google Sheets for the IMEI
3. Verify Google Sheets API key is valid

### Slow API Response Times

**Cause**: Missing indexes or large dataset

**Solution**:
1. Verify indexes were created (check `server/db/schema.ts`)
2. Run `npm run db:push` again to ensure indexes exist
3. Check database performance metrics

## Database Maintenance

### Backup Strategy

**Automated (Neon/Railway):**
- Both platforms auto-backup daily
- Point-in-time recovery available

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Data Retention

Current setup retains:
- All inventory items: Forever
- All movements: Forever (complete audit trail)
- Daily snapshots: Forever (can be pruned after 1 year if needed)
- Sync logs: 90 days (auto-cleanup recommended)

### Cleanup Old Sync Logs (Optional)

```sql
DELETE FROM google_sheets_sync_log
WHERE sync_started_at < NOW() - INTERVAL '90 days';
```

## Performance Metrics

Expected performance (with proper indexes):
- IMEI search: <10ms
- Movement history: <20ms
- Batch search (100 IMEIs): <100ms
- Daily snapshot generation: 2-5 seconds
- Google Sheets sync: 30-60 seconds (depends on item count)

## Next Steps

1. ✅ Complete database setup
2. ⏳ Build UI components for IMEI search
3. ⏳ Add movement history view to Item Detail Sheet
4. ⏳ Create Daily Reports dashboard tab
5. ⏳ Set up automated sync schedule
6. ⏳ Deploy to Railway with DATABASE_URL

## Support

If you encounter issues:
1. Check `/api/health` endpoint
2. Check `/api/sync/status` for sync errors
3. Review server logs for error messages
4. Verify DATABASE_URL is correct

---

**System Status**: ✅ Schema created, ✅ API endpoints ready, ⏳ Awaiting database connection
