import { db } from './index.ts';
import { pickupRecords, auditLogs, users } from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';

// Pickup records
export async function getAllPickupRecords() {
  try {
    return await db.select().from(pickupRecords);
  } catch (error) {
    console.error('Failed to fetch pickup records from Cloud SQL:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertPickupRecord(data: {
  recipientId: number;
  sessionKey: string;
  isTaken: boolean;
  takenAt?: string;
  takenBy?: string;
  portionsTaken?: number;
  notes?: string;
}) {
  try {
    const existing = await db.select()
      .from(pickupRecords)
      .where(
        and(
          eq(pickupRecords.recipientId, data.recipientId),
          eq(pickupRecords.sessionKey, data.sessionKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db.update(pickupRecords)
        .set({
          isTaken: data.isTaken,
          takenAt: data.takenAt || null,
          takenBy: data.takenBy || null,
          portionsTaken: data.portionsTaken ?? 1,
          notes: data.notes || null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(pickupRecords.recipientId, data.recipientId),
            eq(pickupRecords.sessionKey, data.sessionKey)
          )
        )
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(pickupRecords)
        .values({
          recipientId: data.recipientId,
          sessionKey: data.sessionKey,
          isTaken: data.isTaken,
          takenAt: data.takenAt || null,
          takenBy: data.takenBy || null,
          portionsTaken: data.portionsTaken ?? 1,
          notes: data.notes || null,
          updatedAt: new Date()
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Failed to upsert pickup record in Cloud SQL:', error);
    throw new Error('Database update failed. Please try again later.', { cause: error });
  }
}

export async function batchUpsertPickupRecords(items: {
  recipientId: number;
  sessionKey: string;
  isTaken: boolean;
  takenAt?: string;
  takenBy?: string;
  portionsTaken?: number;
  notes?: string;
}[]) {
  try {
    const results = [];
    for (const item of items) {
      const res = await upsertPickupRecord(item);
      results.push(res);
    }
    return results;
  } catch (error) {
    console.error('Failed to batch upsert pickup records in Cloud SQL:', error);
    throw new Error('Database batch update failed.', { cause: error });
  }
}

export async function resetAllPickupRecords() {
  try {
    await db.delete(pickupRecords);
    await db.delete(auditLogs);
    return { success: true };
  } catch (error) {
    console.error('Failed to reset records:', error);
    throw new Error('Database reset failed.', { cause: error });
  }
}

// Audit logs
export async function getAuditLogs(limitCount = 100) {
  try {
    return await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitCount);
  } catch (error) {
    console.error('Failed to fetch audit logs from Cloud SQL:', error);
    throw new Error('Database log query failed.', { cause: error });
  }
}

export async function insertAuditLog(log: {
  logId: string;
  timestamp: string;
  recipientId: number;
  recipientName: string;
  sessionKey: string;
  action: string;
  picPengambilan: string;
  qty: number;
  operatorNotes?: string;
}) {
  try {
    const res = await db.insert(auditLogs)
      .values({
        logId: log.logId,
        timestamp: log.timestamp,
        recipientId: log.recipientId,
        recipientName: log.recipientName,
        sessionKey: log.sessionKey,
        action: log.action,
        picPengambilan: log.picPengambilan,
        qty: log.qty,
        operatorNotes: log.operatorNotes || null,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('Failed to insert audit log in Cloud SQL:', error);
    throw new Error('Database log insertion failed.', { cause: error });
  }
}

export async function clearAuditLogs() {
  try {
    await db.delete(auditLogs);
    return { success: true };
  } catch (error) {
    console.error('Failed to clear audit logs:', error);
    throw new Error('Database log clearance failed.', { cause: error });
  }
}

// Users (Firebase Auth sync)
export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(users).values({
      uid,
      email,
      name: name || null,
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error('Failed to sync user in Cloud SQL:', error);
    throw new Error('User sync failed.', { cause: error });
  }
}
