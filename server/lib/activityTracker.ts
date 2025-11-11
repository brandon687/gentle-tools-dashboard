/**
 * User Activity Tracking Service
 * Logs user actions and maintains aggregated statistics
 */

import { db } from '../db';
import { userActivityLog, userActivityStats } from '../db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import type { Request } from 'express';

export interface ActivityLogEntry {
  userId: number;
  userEmail: string;
  activityType: string;
  resourceType?: string;
  resourceId?: string;
  itemCount?: number;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a user activity event
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  if (!db) {
    console.warn('⚠️  Database not available, skipping activity log');
    return;
  }

  try {
    // Insert activity log entry
    await db.insert(userActivityLog).values({
      userId: entry.userId,
      userEmail: entry.userEmail,
      activityType: entry.activityType,
      resourceType: entry.resourceType || null,
      resourceId: entry.resourceId || null,
      itemCount: entry.itemCount || null,
      metadata: entry.metadata || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
    });

    console.log(`📊 Activity logged: ${entry.userEmail} - ${entry.activityType}${entry.itemCount ? ` (${entry.itemCount} items)` : ''}`);

    // Update aggregated stats asynchronously (don't await)
    updateUserStats(entry).catch(err => {
      console.error('❌ Error updating user stats:', err);
    });
  } catch (error) {
    console.error('❌ Error logging activity:', error);
  }
}

/**
 * Update aggregated user statistics
 */
async function updateUserStats(entry: ActivityLogEntry): Promise<void> {
  if (!db) return;

  try {
    // Check if stats record exists
    const existing = await db
      .select()
      .from(userActivityStats)
      .where(eq(userActivityStats.userId, entry.userId))
      .limit(1);

    const now = new Date();

    if (existing.length === 0) {
      // Create new stats record
      await db.insert(userActivityStats).values({
        userId: entry.userId,
        userEmail: entry.userEmail,
        totalImeisDumped: entry.activityType === 'imei_dump_add' ? (entry.itemCount || 0) : 0,
        totalImeisDeleted: entry.activityType === 'imei_dump_delete' ? (entry.itemCount || 0) : 0,
        totalLogins: entry.activityType === 'login' ? 1 : 0,
        totalSyncsTriggered: entry.activityType === 'sync_triggered' ? 1 : 0,
        firstActivityAt: now,
        lastActivityAt: now,
        dailyBreakdown: {},
        weeklyBreakdown: {},
        monthlyBreakdown: {},
      });
    } else {
      // Update existing stats
      const updates: any = {
        lastActivityAt: now,
        updatedAt: now,
      };

      if (entry.activityType === 'imei_dump_add') {
        updates.totalImeisDumped = sql`${userActivityStats.totalImeisDumped} + ${entry.itemCount || 0}`;
      } else if (entry.activityType === 'imei_dump_delete') {
        updates.totalImeisDeleted = sql`${userActivityStats.totalImeisDeleted} + ${entry.itemCount || 0}`;
      } else if (entry.activityType === 'login') {
        updates.totalLogins = sql`${userActivityStats.totalLogins} + 1`;
      } else if (entry.activityType === 'sync_triggered') {
        updates.totalSyncsTriggered = sql`${userActivityStats.totalSyncsTriggered} + 1`;
      }

      await db
        .update(userActivityStats)
        .set(updates)
        .where(eq(userActivityStats.userId, entry.userId));
    }
  } catch (error) {
    console.error('❌ Error updating user stats:', error);
    throw error;
  }
}

/**
 * Helper function to extract request metadata
 */
export function extractRequestMetadata(req: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Log IMEI dump activity (add)
 */
export async function logImeiDumpAdd(
  userId: number,
  userEmail: string,
  imeis: string[],
  req?: Request
): Promise<void> {
  const metadata = req ? extractRequestMetadata(req) : {};

  await logActivity({
    userId,
    userEmail,
    activityType: 'imei_dump_add',
    resourceType: 'imei',
    itemCount: imeis.length,
    metadata: {
      imeiCount: imeis.length,
      sampleImeis: imeis.slice(0, 5), // Store first 5 IMEIs as sample
    },
    ...metadata,
  });
}

/**
 * Log IMEI dump activity (delete)
 */
export async function logImeiDumpDelete(
  userId: number,
  userEmail: string,
  imei: string,
  req?: Request
): Promise<void> {
  const metadata = req ? extractRequestMetadata(req) : {};

  await logActivity({
    userId,
    userEmail,
    activityType: 'imei_dump_delete',
    resourceType: 'imei',
    resourceId: imei,
    itemCount: 1,
    metadata: {
      imei,
    },
    ...metadata,
  });
}

/**
 * Log IMEI dump activity (clear all)
 */
export async function logImeiDumpClear(
  userId: number,
  userEmail: string,
  count: number,
  req?: Request
): Promise<void> {
  const metadata = req ? extractRequestMetadata(req) : {};

  await logActivity({
    userId,
    userEmail,
    activityType: 'imei_dump_clear',
    resourceType: 'imei',
    itemCount: count,
    metadata: {
      clearedCount: count,
    },
    ...metadata,
  });
}

/**
 * Log user login
 */
export async function logUserLogin(
  userId: number,
  userEmail: string,
  req?: Request
): Promise<void> {
  const metadata = req ? extractRequestMetadata(req) : {};

  await logActivity({
    userId,
    userEmail,
    activityType: 'login',
    resourceType: 'user',
    resourceId: userId.toString(),
    ...metadata,
  });
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(userId: number) {
  if (!db) {
    return null;
  }

  try {
    const stats = await db
      .select()
      .from(userActivityStats)
      .where(eq(userActivityStats.userId, userId))
      .limit(1);

    return stats[0] || null;
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    return null;
  }
}

/**
 * Get all user activity statistics (admin view)
 */
export async function getAllUserActivityStats() {
  if (!db) {
    return [];
  }

  try {
    const stats = await db
      .select()
      .from(userActivityStats)
      .orderBy(sql`${userActivityStats.totalImeisDumped} DESC`);

    return stats;
  } catch (error) {
    console.error('❌ Error getting all user stats:', error);
    return [];
  }
}

/**
 * Get recent activity for a user
 */
export async function getUserRecentActivity(userId: number, limit = 50) {
  if (!db) {
    return [];
  }

  try {
    const activities = await db
      .select()
      .from(userActivityLog)
      .where(eq(userActivityLog.userId, userId))
      .orderBy(sql`${userActivityLog.performedAt} DESC`)
      .limit(limit);

    return activities;
  } catch (error) {
    console.error('❌ Error getting user recent activity:', error);
    return [];
  }
}

/**
 * Get activity stats for a date range
 */
export async function getActivityStatsForDateRange(
  userId: number,
  startDate: Date,
  endDate: Date
) {
  if (!db) {
    return {
      totalImeisDumped: 0,
      totalImeisDeleted: 0,
      totalActions: 0,
    };
  }

  try {
    const activities = await db
      .select()
      .from(userActivityLog)
      .where(
        and(
          eq(userActivityLog.userId, userId),
          gte(userActivityLog.performedAt, startDate),
          sql`${userActivityLog.performedAt} <= ${endDate}`
        )
      );

    const stats = {
      totalImeisDumped: 0,
      totalImeisDeleted: 0,
      totalActions: activities.length,
      activityByType: {} as Record<string, number>,
    };

    activities.forEach(activity => {
      // Count by type
      stats.activityByType[activity.activityType] =
        (stats.activityByType[activity.activityType] || 0) + 1;

      // Sum item counts
      if (activity.activityType === 'imei_dump_add') {
        stats.totalImeisDumped += activity.itemCount || 0;
      } else if (activity.activityType === 'imei_dump_delete') {
        stats.totalImeisDeleted += activity.itemCount || 0;
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ Error getting activity stats for date range:', error);
    return {
      totalImeisDumped: 0,
      totalImeisDeleted: 0,
      totalActions: 0,
    };
  }
}
