import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const shippedImeis = pgTable("shipped_imeis", {
  id: uuid("id").defaultRandom().primaryKey(),
  imei: text("imei").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ShippedImei = typeof shippedImeis.$inferSelect;
export type NewShippedImei = typeof shippedImeis.$inferInsert;
