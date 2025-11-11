import { pgTable, text, timestamp, uuid, boolean, integer, numeric, jsonb, date, index, uniqueIndex, serial } from "drizzle-orm/pg-core";

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================
// User accounts for authentication and authorization
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  googleId: text("google_id").unique(),
  role: text("role").notNull().default("power_user"), // 'power_user' or 'admin'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("idx_users_email").on(table.email),
  googleIdIdx: uniqueIndex("idx_users_google_id").on(table.googleId),
  roleIdx: index("idx_users_role").on(table.role),
  activeIdx: index("idx_users_active").on(table.isActive),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================================
// INVENTORY LOCATIONS
// ============================================================================
// Stores multiple inventory locations (warehouses, storage facilities)
export const inventoryLocations = pgTable("inventory_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g., "Main Warehouse", "Secondary Storage"
  code: text("code").notNull().unique(), // e.g., "MAIN", "SEC1"
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("idx_locations_code").on(table.code),
  activeIdx: index("idx_locations_active").on(table.isActive),
}));

export type InventoryLocation = typeof inventoryLocations.$inferSelect;
export type NewInventoryLocation = typeof inventoryLocations.$inferInsert;

// ============================================================================
// INVENTORY ITEMS
// ============================================================================
// Central repository for all devices that have ever been in inventory
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  imei: text("imei").notNull().unique(),

  // Device attributes (from Google Sheets)
  model: text("model"),
  gb: text("gb"),
  color: text("color"),
  sku: text("sku"),

  // Current state
  currentGrade: text("current_grade"),
  currentLockStatus: text("current_lock_status"),
  currentLocationId: uuid("current_location_id").references(() => inventoryLocations.id),
  currentStatus: text("current_status").notNull(), // 'in_stock', 'shipped', 'transferred', 'removed'

  // Metadata
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  imeiIdx: uniqueIndex("idx_items_imei").on(table.imei),
  statusIdx: index("idx_items_status").on(table.currentStatus),
  locationIdx: index("idx_items_location").on(table.currentLocationId),
  modelIdx: index("idx_items_model").on(table.model),
  gradeIdx: index("idx_items_grade").on(table.currentGrade),
  lastSeenIdx: index("idx_items_last_seen").on(table.lastSeenAt),
}));

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

// ============================================================================
// INVENTORY MOVEMENTS
// ============================================================================
// Complete audit trail of every inventory transaction
export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),

  // Movement details
  movementType: text("movement_type").notNull(),
    // 'added', 'shipped', 'transferred', 'status_changed', 'grade_changed', 'removed'

  // Location tracking
  fromLocationId: uuid("from_location_id").references(() => inventoryLocations.id),
  toLocationId: uuid("to_location_id").references(() => inventoryLocations.id),

  // Status tracking
  fromStatus: text("from_status"),
  toStatus: text("to_status"),

  // Attribute changes
  fromGrade: text("from_grade"),
  toGrade: text("to_grade"),
  fromLockStatus: text("from_lock_status"),
  toLockStatus: text("to_lock_status"),

  // Metadata
  notes: text("notes"),
  source: text("source").notNull(), // 'manual', 'google_sheets_sync', 'api', 'bulk_import'
  performedBy: text("performed_by"),
  performedAt: timestamp("performed_at").defaultNow().notNull(),

  // Snapshot of item at time of movement (for historical accuracy)
  snapshotData: jsonb("snapshot_data"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  itemIdx: index("idx_movements_item").on(table.itemId, table.performedAt),
  typeIdx: index("idx_movements_type").on(table.movementType),
  dateIdx: index("idx_movements_date").on(table.performedAt),
  locationFromIdx: index("idx_movements_location_from").on(table.fromLocationId),
  locationToIdx: index("idx_movements_location_to").on(table.toLocationId),
  sourceIdx: index("idx_movements_source").on(table.source),
}));

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;

// ============================================================================
// DAILY INVENTORY SNAPSHOTS
// ============================================================================
// End-of-day inventory state for reporting and historical analysis
export const dailyInventorySnapshots = pgTable("daily_inventory_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  snapshotDate: date("snapshot_date").notNull(),
  locationId: uuid("location_id").references(() => inventoryLocations.id),

  // Aggregated counts
  totalDevices: integer("total_devices").notNull(),
  totalValue: numeric("total_value"),

  // Breakdown by grade (JSON for flexibility)
  gradeBreakdown: jsonb("grade_breakdown").notNull(),
  modelBreakdown: jsonb("model_breakdown").notNull(),
  lockStatusBreakdown: jsonb("lock_status_breakdown").notNull(),

  // Daily movement summary
  dailyAdded: integer("daily_added").default(0).notNull(),
  dailyShipped: integer("daily_shipped").default(0).notNull(),
  dailyTransferred: integer("daily_transferred").default(0).notNull(),
  dailyStatusChanges: integer("daily_status_changes").default(0).notNull(),

  // Full snapshot (for detailed queries)
  fullSnapshot: jsonb("full_snapshot").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateLocationIdx: uniqueIndex("idx_snapshots_date_location").on(table.snapshotDate, table.locationId),
  dateIdx: index("idx_snapshots_date").on(table.snapshotDate),
}));

export type DailyInventorySnapshot = typeof dailyInventorySnapshots.$inferSelect;
export type NewDailyInventorySnapshot = typeof dailyInventorySnapshots.$inferInsert;

// ============================================================================
// GOOGLE SHEETS SYNC LOG
// ============================================================================
// Track synchronization with Google Sheets for debugging and audit
export const googleSheetsSyncLog = pgTable("google_sheets_sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  syncStartedAt: timestamp("sync_started_at").defaultNow().notNull(),
  syncCompletedAt: timestamp("sync_completed_at"),

  status: text("status").notNull(), // 'in_progress', 'completed', 'failed'

  // Sync results
  itemsProcessed: integer("items_processed").default(0),
  itemsAdded: integer("items_added").default(0),
  itemsUpdated: integer("items_updated").default(0),
  itemsUnchanged: integer("items_unchanged").default(0),

  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),

  // For reconciliation
  sheetsRowCount: integer("sheets_row_count"),
  dbItemCount: integer("db_item_count"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("idx_sync_log_status").on(table.status),
  startedIdx: index("idx_sync_log_started").on(table.syncStartedAt),
}));

export type GoogleSheetsSyncLog = typeof googleSheetsSyncLog.$inferSelect;
export type NewGoogleSheetsSyncLog = typeof googleSheetsSyncLog.$inferInsert;

// ============================================================================
// OUTBOUND IMEIs CACHE
// ============================================================================
// Cache table for fast searching of outbound IMEIs from Google Sheets
export const outboundImeis = pgTable("outbound_imeis", {
  id: uuid("id").defaultRandom().primaryKey(),
  imei: text("imei").notNull(),
  model: text("model"),
  capacity: text("capacity"),
  color: text("color"),
  lockStatus: text("lock_status"),
  graded: text("graded"),
  price: text("price"),
  updatedAt: text("updated_at"),
  invno: text("invno"),
  invtype: text("invtype"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
}, (table) => ({
  imeiIdx: index("outbound_imeis_imei_idx").on(table.imei),
  modelIdx: index("outbound_imeis_model_idx").on(table.model),
  invnoIdx: index("outbound_imeis_invno_idx").on(table.invno),
  syncedAtIdx: index("outbound_imeis_synced_at_idx").on(table.syncedAt),
}));

export type OutboundImei = typeof outboundImeis.$inferSelect;
export type NewOutboundImei = typeof outboundImeis.$inferInsert;

// ============================================================================
// OUTBOUND SYNC LOG
// ============================================================================
// Track outbound IMEIs cache synchronization
export const outboundSyncLog = pgTable("outbound_sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  syncStartedAt: timestamp("sync_started_at").defaultNow().notNull(),
  syncCompletedAt: timestamp("sync_completed_at"),
  status: text("status").notNull(), // 'in_progress', 'completed', 'failed'
  rowsProcessed: integer("rows_processed").default(0),
  rowsInserted: integer("rows_inserted").default(0),
  timeTaken: integer("time_taken_ms"), // Duration in milliseconds
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("outbound_sync_log_status_idx").on(table.status),
  startedIdx: index("outbound_sync_log_started_idx").on(table.syncStartedAt),
}));

export type OutboundSyncLog = typeof outboundSyncLog.$inferSelect;
export type NewOutboundSyncLog = typeof outboundSyncLog.$inferInsert;

// ============================================================================
// SHIPPED IMEIs (LEGACY - Keep for backward compatibility)
// ============================================================================
export const shippedImeis = pgTable("shipped_imeis", {
  id: uuid("id").defaultRandom().primaryKey(),
  imei: text("imei").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ShippedImei = typeof shippedImeis.$inferSelect;
export type NewShippedImei = typeof shippedImeis.$inferInsert;
