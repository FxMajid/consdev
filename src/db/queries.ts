import { db, createPool } from './index.ts';
import { pickupRecords, auditLogs, users, recipients } from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import type { ConsumptionRecipient } from '../types.ts';

let tablesChecked = false;

export async function ensureTablesExist() {
  if (tablesChecked) return;
  try {
    const pool = createPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        uid text NOT NULL UNIQUE,
        email text NOT NULL,
        name text,
        created_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS pickup_records (
        id serial PRIMARY KEY,
        recipient_id integer NOT NULL,
        session_key text NOT NULL,
        is_taken boolean DEFAULT true NOT NULL,
        taken_at text,
        taken_by text,
        portions_taken integer DEFAULT 1 NOT NULL,
        notes text,
        updated_at timestamp DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS recipient_session_idx ON pickup_records(recipient_id, session_key);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id serial PRIMARY KEY,
        log_id text NOT NULL,
        timestamp text NOT NULL,
        recipient_id integer NOT NULL,
        recipient_name text NOT NULL,
        session_key text NOT NULL,
        action text NOT NULL,
        pic_pengambilan text NOT NULL,
        qty integer NOT NULL,
        operator_notes text,
        created_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS recipients (
        id integer PRIMARY KEY NOT NULL,
        nama text NOT NULL,
        pic_hbd text NOT NULL,
        employee text NOT NULL,
        area_kerja text NOT NULL,
        pic_pengambilan text NOT NULL,
        kontak_wa text,
        qty integer DEFAULT 1 NOT NULL,
        kategori text DEFAULT 'Internal' NOT NULL,
        makan text DEFAULT 'YES' NOT NULL,
        schedule text NOT NULL,
        updated_at timestamp DEFAULT now()
      );
    `);
    tablesChecked = true;
  } catch (error) {
    console.warn('Notice when ensuring database tables exist:', error);
  }
}

// Pickup records
export async function getAllPickupRecords() {
  await ensureTablesExist();
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
  if (!items || items.length === 0) return [];
  const pool = createPool();
  if (!pool) return [];

  await ensureTablesExist();

  try {
    const chunkSize = 50;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const values: any[] = [];
      const rowPlaceholders: string[] = [];

      chunk.forEach((item, index) => {
        const offset = index * 7;
        rowPlaceholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, NOW())`
        );
        values.push(
          item.recipientId,
          item.sessionKey,
          item.isTaken,
          item.takenAt || null,
          item.takenBy || null,
          item.portionsTaken ?? 1,
          item.notes || null
        );
      });

      const query = `
        INSERT INTO pickup_records (
          recipient_id, session_key, is_taken, taken_at, taken_by, portions_taken, notes, updated_at
        )
        VALUES ${rowPlaceholders.join(', ')}
        ON CONFLICT (recipient_id, session_key) DO UPDATE SET
          is_taken = EXCLUDED.is_taken,
          taken_at = EXCLUDED.taken_at,
          taken_by = EXCLUDED.taken_by,
          portions_taken = EXCLUDED.portions_taken,
          notes = EXCLUDED.notes,
          updated_at = NOW();
      `;

      await pool.query(query, values);
    }
    return items;
  } catch (error) {
    console.error('Failed to batch upsert pickup records in database:', error);
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

// Recipients (Master Directory)
export async function getAllRecipients(): Promise<ConsumptionRecipient[]> {
  await ensureTablesExist();
  try {
    const rows = await db.select().from(recipients).orderBy(recipients.id);
    return rows.map(r => ({
      id: r.id,
      nama: r.nama,
      picHbd: r.picHbd,
      employee: r.employee,
      areaKerja: r.areaKerja,
      picPengambilan: r.picPengambilan,
      kontakWa: r.kontakWa || '',
      qty: r.qty,
      kategori: (r.kategori as 'Internal' | 'Eksternal') || 'Internal',
      makan: (r.makan as 'YES' | 'NO') || 'YES',
      schedule: JSON.parse(r.schedule || '{}')
    }));
  } catch (error) {
    console.error('Failed to fetch recipients from Cloud SQL:', error);
    throw new Error('Database query for recipients failed.', { cause: error });
  }
}

export async function upsertRecipient(item: ConsumptionRecipient) {
  try {
    const scheduleStr = JSON.stringify(item.schedule || {});
    const existing = await db.select().from(recipients).where(eq(recipients.id, item.id)).limit(1);
    if (existing.length > 0) {
      const updated = await db.update(recipients)
        .set({
          nama: item.nama,
          picHbd: item.picHbd,
          employee: item.employee,
          areaKerja: item.areaKerja,
          picPengambilan: item.picPengambilan,
          kontakWa: item.kontakWa || '',
          qty: item.qty,
          kategori: item.kategori,
          makan: item.makan,
          schedule: scheduleStr,
          updatedAt: new Date()
        })
        .where(eq(recipients.id, item.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(recipients)
        .values({
          id: item.id,
          nama: item.nama,
          picHbd: item.picHbd,
          employee: item.employee,
          areaKerja: item.areaKerja,
          picPengambilan: item.picPengambilan,
          kontakWa: item.kontakWa || '',
          qty: item.qty,
          kategori: item.kategori,
          makan: item.makan,
          schedule: scheduleStr,
          updatedAt: new Date()
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Failed to upsert recipient:', error);
    throw new Error('Database upsert recipient failed.', { cause: error });
  }
}

export async function batchUpsertRecipients(items: ConsumptionRecipient[]) {
  if (!items || items.length === 0) {
    return { success: true, count: 0 };
  }
  const pool = createPool();
  if (!pool) {
    return { success: true, count: items.length };
  }

  await ensureTablesExist();

  try {
    const chunkSize = 50;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const values: any[] = [];
      const rowPlaceholders: string[] = [];

      chunk.forEach((item, index) => {
        const offset = index * 11;
        rowPlaceholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, NOW())`
        );
        values.push(
          item.id,
          item.nama,
          item.picHbd,
          item.employee,
          item.areaKerja,
          item.picPengambilan,
          item.kontakWa || '',
          item.qty,
          item.kategori || 'Internal',
          item.makan || 'YES',
          JSON.stringify(item.schedule || {})
        );
      });

      const query = `
        INSERT INTO recipients (
          id, nama, pic_hbd, employee, area_kerja, pic_pengambilan, 
          kontak_wa, qty, kategori, makan, schedule, updated_at
        )
        VALUES ${rowPlaceholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          nama = EXCLUDED.nama,
          pic_hbd = EXCLUDED.pic_hbd,
          employee = EXCLUDED.employee,
          area_kerja = EXCLUDED.area_kerja,
          pic_pengambilan = EXCLUDED.pic_pengambilan,
          kontak_wa = EXCLUDED.kontak_wa,
          qty = EXCLUDED.qty,
          kategori = EXCLUDED.kategori,
          makan = EXCLUDED.makan,
          schedule = EXCLUDED.schedule,
          updated_at = NOW();
      `;

      await pool.query(query, values);
    }
    return { success: true, count: items.length };
  } catch (error) {
    console.error('Failed to batch upsert recipients in database:', error);
    throw new Error('Database batch upsert recipients failed.', { cause: error });
  }
}

export async function replaceRecipients(items: ConsumptionRecipient[]) {
  try {
    await db.delete(recipients);
    if (items.length > 0) {
      const dbRows = items.map(item => ({
        id: item.id,
        nama: item.nama,
        picHbd: item.picHbd,
        employee: item.employee,
        areaKerja: item.areaKerja,
        picPengambilan: item.picPengambilan,
        kontakWa: item.kontakWa || '',
        qty: item.qty,
        kategori: item.kategori,
        makan: item.makan,
        schedule: JSON.stringify(item.schedule || {}),
        updatedAt: new Date()
      }));
      // Insert in chunks of 50 to stay well within Postgres parameter limits
      const chunkSize = 50;
      for (let i = 0; i < dbRows.length; i += chunkSize) {
        const chunk = dbRows.slice(i, i + chunkSize);
        await db.insert(recipients).values(chunk);
      }
    }
    return { success: true, count: items.length };
  } catch (error) {
    console.error('Failed to replace recipients in Cloud SQL:', error);
    throw new Error('Database replace recipients failed.', { cause: error });
  }
}

export async function seedRecipientsIfEmpty(defaultItems: ConsumptionRecipient[]) {
  try {
    const existing = await db.select().from(recipients).limit(1);
    if (existing.length === 0 && defaultItems.length > 0) {
      console.log(`Seeding ${defaultItems.length} initial recipients into Cloud SQL...`);
      await replaceRecipients(defaultItems);
      console.log('Seeding completed successfully.');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to seed initial recipients:', error);
    return false;
  }
}

