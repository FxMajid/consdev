var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/serverApp.ts
import express from "express";
import dotenv from "dotenv";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  pickupRecords: () => pickupRecords,
  recipients: () => recipients,
  users: () => users
});
import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow()
});
var pickupRecords = pgTable("pickup_records", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull(),
  sessionKey: text("session_key").notNull(),
  isTaken: boolean("is_taken").notNull().default(true),
  takenAt: text("taken_at"),
  takenBy: text("taken_by"),
  portionsTaken: integer("portions_taken").notNull().default(1),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  uniqueIndex("recipient_session_idx").on(table.recipientId, table.sessionKey)
]);
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  logId: text("log_id").notNull(),
  timestamp: text("timestamp").notNull(),
  recipientId: integer("recipient_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  sessionKey: text("session_key").notNull(),
  action: text("action").notNull(),
  picPengambilan: text("pic_pengambilan").notNull(),
  qty: integer("qty").notNull(),
  operatorNotes: text("operator_notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var recipients = pgTable("recipients", {
  id: integer("id").primaryKey(),
  nama: text("nama").notNull(),
  picHbd: text("pic_hbd").notNull(),
  employee: text("employee").notNull(),
  areaKerja: text("area_kerja").notNull(),
  picPengambilan: text("pic_pengambilan").notNull(),
  kontakWa: text("kontak_wa"),
  qty: integer("qty").notNull().default(1),
  kategori: text("kategori").notNull().default("Internal"),
  makan: text("makan").notNull().default("YES"),
  schedule: text("schedule").notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (connectionString) {
      const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
      global._postgresPool = new Pool({
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15e3,
        idleTimeoutMillis: 3e4
      });
    } else {
      const isUnixSocket = (process.env.SQL_HOST || "").startsWith("/");
      const isSupabase = (process.env.SQL_HOST || "").includes("supabase");
      const useSsl = !isUnixSocket && (process.env.SQL_SSL === "true" || isSupabase);
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST || "localhost",
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        connectionTimeoutMillis: 15e3,
        idleTimeoutMillis: 3e4
      });
    }
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/queries.ts
import { eq, and, desc } from "drizzle-orm";
var tablesChecked = false;
async function ensureTablesExist() {
  if (tablesChecked) return;
  try {
    const pool2 = createPool();
    await pool2.query(`
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
    console.warn("Notice when ensuring database tables exist:", error);
  }
}
async function getAllPickupRecords() {
  await ensureTablesExist();
  try {
    return await db.select().from(pickupRecords);
  } catch (error) {
    console.error("Failed to fetch pickup records from Cloud SQL:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
async function upsertPickupRecord(data) {
  try {
    const existing = await db.select().from(pickupRecords).where(
      and(
        eq(pickupRecords.recipientId, data.recipientId),
        eq(pickupRecords.sessionKey, data.sessionKey)
      )
    ).limit(1);
    if (existing.length > 0) {
      const updated = await db.update(pickupRecords).set({
        isTaken: data.isTaken,
        takenAt: data.takenAt || null,
        takenBy: data.takenBy || null,
        portionsTaken: data.portionsTaken ?? 1,
        notes: data.notes || null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(
        and(
          eq(pickupRecords.recipientId, data.recipientId),
          eq(pickupRecords.sessionKey, data.sessionKey)
        )
      ).returning();
      return updated[0];
    } else {
      const inserted = await db.insert(pickupRecords).values({
        recipientId: data.recipientId,
        sessionKey: data.sessionKey,
        isTaken: data.isTaken,
        takenAt: data.takenAt || null,
        takenBy: data.takenBy || null,
        portionsTaken: data.portionsTaken ?? 1,
        notes: data.notes || null,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("Failed to upsert pickup record in Cloud SQL:", error);
    throw new Error("Database update failed. Please try again later.", { cause: error });
  }
}
async function batchUpsertPickupRecords(items) {
  try {
    const results = [];
    for (const item of items) {
      const res = await upsertPickupRecord(item);
      results.push(res);
    }
    return results;
  } catch (error) {
    console.error("Failed to batch upsert pickup records in Cloud SQL:", error);
    throw new Error("Database batch update failed.", { cause: error });
  }
}
async function resetAllPickupRecords() {
  try {
    await db.delete(pickupRecords);
    await db.delete(auditLogs);
    return { success: true };
  } catch (error) {
    console.error("Failed to reset records:", error);
    throw new Error("Database reset failed.", { cause: error });
  }
}
async function getAuditLogs(limitCount = 100) {
  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limitCount);
  } catch (error) {
    console.error("Failed to fetch audit logs from Cloud SQL:", error);
    throw new Error("Database log query failed.", { cause: error });
  }
}
async function insertAuditLog(log) {
  try {
    const res = await db.insert(auditLogs).values({
      logId: log.logId,
      timestamp: log.timestamp,
      recipientId: log.recipientId,
      recipientName: log.recipientName,
      sessionKey: log.sessionKey,
      action: log.action,
      picPengambilan: log.picPengambilan,
      qty: log.qty,
      operatorNotes: log.operatorNotes || null
    }).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to insert audit log in Cloud SQL:", error);
    throw new Error("Database log insertion failed.", { cause: error });
  }
}
async function clearAuditLogs() {
  try {
    await db.delete(auditLogs);
    return { success: true };
  } catch (error) {
    console.error("Failed to clear audit logs:", error);
    throw new Error("Database log clearance failed.", { cause: error });
  }
}
async function getOrCreateUser(uid, email, name) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(users).values({
      uid,
      email,
      name: name || null
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error("Failed to sync user in Cloud SQL:", error);
    throw new Error("User sync failed.", { cause: error });
  }
}
async function getAllRecipients() {
  await ensureTablesExist();
  try {
    const rows = await db.select().from(recipients).orderBy(recipients.id);
    return rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      picHbd: r.picHbd,
      employee: r.employee,
      areaKerja: r.areaKerja,
      picPengambilan: r.picPengambilan,
      kontakWa: r.kontakWa || "",
      qty: r.qty,
      kategori: r.kategori || "Internal",
      makan: r.makan || "YES",
      schedule: JSON.parse(r.schedule || "{}")
    }));
  } catch (error) {
    console.error("Failed to fetch recipients from Cloud SQL:", error);
    throw new Error("Database query for recipients failed.", { cause: error });
  }
}
async function upsertRecipient(item) {
  try {
    const scheduleStr = JSON.stringify(item.schedule || {});
    const existing = await db.select().from(recipients).where(eq(recipients.id, item.id)).limit(1);
    if (existing.length > 0) {
      const updated = await db.update(recipients).set({
        nama: item.nama,
        picHbd: item.picHbd,
        employee: item.employee,
        areaKerja: item.areaKerja,
        picPengambilan: item.picPengambilan,
        kontakWa: item.kontakWa || "",
        qty: item.qty,
        kategori: item.kategori,
        makan: item.makan,
        schedule: scheduleStr,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(recipients.id, item.id)).returning();
      return updated[0];
    } else {
      const inserted = await db.insert(recipients).values({
        id: item.id,
        nama: item.nama,
        picHbd: item.picHbd,
        employee: item.employee,
        areaKerja: item.areaKerja,
        picPengambilan: item.picPengambilan,
        kontakWa: item.kontakWa || "",
        qty: item.qty,
        kategori: item.kategori,
        makan: item.makan,
        schedule: scheduleStr,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return inserted[0];
    }
  } catch (error) {
    console.error("Failed to upsert recipient:", error);
    throw new Error("Database upsert recipient failed.", { cause: error });
  }
}
async function batchUpsertRecipients(items) {
  try {
    for (const item of items) {
      await upsertRecipient(item);
    }
    return { success: true, count: items.length };
  } catch (error) {
    console.error("Failed to batch upsert recipients:", error);
    throw new Error("Database batch upsert recipients failed.", { cause: error });
  }
}
async function replaceRecipients(items) {
  try {
    await db.delete(recipients);
    if (items.length > 0) {
      const dbRows = items.map((item) => ({
        id: item.id,
        nama: item.nama,
        picHbd: item.picHbd,
        employee: item.employee,
        areaKerja: item.areaKerja,
        picPengambilan: item.picPengambilan,
        kontakWa: item.kontakWa || "",
        qty: item.qty,
        kategori: item.kategori,
        makan: item.makan,
        schedule: JSON.stringify(item.schedule || {}),
        updatedAt: /* @__PURE__ */ new Date()
      }));
      const chunkSize = 50;
      for (let i = 0; i < dbRows.length; i += chunkSize) {
        const chunk = dbRows.slice(i, i + chunkSize);
        await db.insert(recipients).values(chunk);
      }
    }
    return { success: true, count: items.length };
  } catch (error) {
    console.error("Failed to replace recipients in Cloud SQL:", error);
    throw new Error("Database replace recipients failed.", { cause: error });
  }
}
async function seedRecipientsIfEmpty(defaultItems) {
  try {
    const existing = await db.select().from(recipients).limit(1);
    if (existing.length === 0 && defaultItems.length > 0) {
      console.log(`Seeding ${defaultItems.length} initial recipients into Cloud SQL...`);
      await replaceRecipients(defaultItems);
      console.log("Seeding completed successfully.");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to seed initial recipients:", error);
    return false;
  }
}

// src/data/initialData.ts
var INITIAL_RECIPIENTS = [
  {
    id: 1,
    nama: "KRIS KURNIANTO",
    picHbd: "STEERING COMMITTEE",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 2,
    nama: "DIMAS GENTUR TRIYOGO",
    picHbd: "STEERING COMMITTEE",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 3,
    nama: "DONY RONALDO",
    picHbd: "STEERING COMMITTEE",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 4,
    nama: "SINDY PRAMADHITA",
    picHbd: "STEERING COMMITTEE",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 5,
    nama: "NURHAYATI",
    picHbd: "MIC SPONSORSHIP & PUBLICATION",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 6,
    nama: "BAGUS KURNIAWAN",
    picHbd: "MIC COMMUNITY, PRODUCTION MANAGER",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 7,
    nama: "WIWID DARNIATI",
    picHbd: "MIC SALES PEOPLE ACTIVITY",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 8,
    nama: "RIKI ZUBRI",
    picHbd: "MIC DEVELOPMENT SYSTEM & REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 9,
    nama: "SAHRI MAULUDIN",
    picHbd: "MIC LOGISTICS & PROCUREMENT",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 10,
    nama: "JONI SAPUTRA",
    picHbd: "KEAMANAN",
    employee: "AM DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 11,
    nama: "ROHMANSYAH",
    picHbd: "KEAMANAN",
    employee: "AM DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 12,
    nama: "SYAMSUL ANWAR",
    picHbd: "PIC HSE & PERMIT",
    employee: "AM RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 13,
    nama: "M SATRIA PUTRA",
    picHbd: "MIC MARKETING",
    employee: "AM RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 14,
    nama: "ACHMAD IQWAN IQBAL",
    picHbd: "LO",
    employee: "AM RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 15,
    nama: "HADDY KURNIAWAN SP",
    picHbd: "MIC SPONSORSHIP (FINCOY)",
    employee: "AM RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 16,
    nama: "TANGGUH PRAMONO",
    picHbd: "KEAMANAN",
    employee: "AM RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "NO",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 17,
    nama: "ADI CHANSERRIO",
    picHbd: "MIC CROWD ENGAGEMENT",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 18,
    nama: "BAMBANG TRI ATMOJO",
    picHbd: "MIC MODIFIKASI KONTES",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 19,
    nama: "RADITE NOVANDY SADOSO",
    picHbd: "MIC SHOW DIRECTOR",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 20,
    nama: "M HAIKHAL ARCHI VALIAN",
    picHbd: "MIC FINANCE & ADMINISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 21,
    nama: "M IBNU ASYAIRI",
    picHbd: "KETUA PELAKSANA, PIC PRODUCTION",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 22,
    nama: "YANDA YONATHAN",
    picHbd: "REGISTRASI",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "82282205984",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 23,
    nama: "JEFRI KRISNA PUTRA",
    picHbd: "PIC CROWD ENGAGEMENT",
    employee: "MAIN DEALER",
    areaKerja: "Second Stage",
    picPengambilan: "FADLILLAH AZHAR",
    kontakWa: "81323624952",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 24,
    nama: "FADLILLAH AZHAR",
    picHbd: "ZONE 1 PIC DOUBLE DECK",
    employee: "MAIN DEALER",
    areaKerja: "Second Stage",
    picPengambilan: "FADLILLAH AZHAR",
    kontakWa: "81323624952",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 25,
    nama: "LEO FERIYANTO",
    picHbd: "ZONE 2 PIC UMKM",
    employee: "MAIN DEALER",
    areaKerja: "UMKM",
    picPengambilan: "LEO FERIYANTO",
    kontakWa: "82182344045",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "Loading UMKM" },
      malamHMinus1: { hadir: true, kegiatan: "Loading UMKM" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 26,
    nama: "JUWITA SOFIYANTI",
    picHbd: "ZONE 2 UMKM",
    employee: "MAIN DEALER",
    areaKerja: "UMKM",
    picPengambilan: "LEO FERIYANTO",
    kontakWa: "82182344045",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "Loading UMKM" },
      malamHMinus1: { hadir: true, kegiatan: "Loading UMKM" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 27,
    nama: "FEBRIANESA PARENGKUAN",
    picHbd: "ZONE 3 PIC BOOTH GAMES",
    employee: "MAIN DEALER",
    areaKerja: "BOOTH GAMES",
    picPengambilan: "AHMAD FARHAN LUBIS",
    kontakWa: "82183856996",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 28,
    nama: "AHMAD FARHAN LUBIS",
    picHbd: "ZONE 3 BOOTH GAMES",
    employee: "MAIN DEALER",
    areaKerja: "BOOTH GAMES",
    picPengambilan: "AHMAD FARHAN LUBIS",
    kontakWa: "82183856996",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 29,
    nama: "EL VITO KUMALA",
    picHbd: "ZONE 4 PIC FOTO CORNER",
    employee: "MAIN DEALER",
    areaKerja: "FOTO BOOTH",
    picPengambilan: "EL VITO KUMALA",
    kontakWa: "85788745064",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 30,
    nama: "DICKI PERMATASARI JABAT",
    picHbd: "ZONE 4 FOTO CORNER",
    employee: "MAIN DEALER",
    areaKerja: "FOTO BOOTH",
    picPengambilan: "EL VITO KUMALA",
    kontakWa: "85788745064",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 31,
    nama: "MUHAMMAD BEBE",
    picHbd: "ZONE 5 RIDING TEST",
    employee: "MAIN DEALER",
    areaKerja: "RIDING TEST",
    picPengambilan: "KOKOH JAYA ADILLAH",
    kontakWa: "85769929890",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 32,
    nama: "AZZAH YUMNA FAIZA",
    picHbd: "ZONE 6 PIC MOTORAN",
    employee: "MAIN DEALER",
    areaKerja: "MOTORAN",
    picPengambilan: "AZZAH YUMNA FAIZA",
    kontakWa: "89631046388",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 33,
    nama: "RISKA ANDINI",
    picHbd: "ZONE 6 MOTORAN",
    employee: "MAIN DEALER",
    areaKerja: "MOTORAN",
    picPengambilan: "AZZAH YUMNA FAIZA",
    kontakWa: "89631046388",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 34,
    nama: "UTOMO BAHTIAR MAZID",
    picHbd: "PIC MODIFIKASI",
    employee: "MAIN DEALER",
    areaKerja: "MODIFIKASI",
    picPengambilan: "M ANAM SAPUTRA",
    kontakWa: "82282205984",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 35,
    nama: "DINA NABILA",
    picHbd: "ZONE 7 WP",
    employee: "MAIN DEALER",
    areaKerja: "WP",
    picPengambilan: "ALDIANSYAH",
    kontakWa: "8972001250",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 36,
    nama: "ALDIANSYAH",
    picHbd: "ZONE 7 WP",
    employee: "MAIN DEALER",
    areaKerja: "WP",
    picPengambilan: "ALDIANSYAH",
    kontakWa: "8972001250",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 37,
    nama: "DHANAWA RYLLA INSANI",
    picHbd: "ACARA",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 38,
    nama: "IGO RELINDO",
    picHbd: "H2",
    employee: "MAIN DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true, kegiatan: "Loading Service" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 39,
    nama: "MELI YUSTIKA HADI",
    picHbd: "KONSUMSI",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true, kegiatan: "persiapan Loding keperluan Kebutuhan Konsumsi panitia" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 40,
    nama: "WIDIARTI EKA PUTRI",
    picHbd: "KONSUMSI",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "persiapan Loding keperluan Kebutuhan Konsumsi panitia" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 41,
    nama: "RIZKI ASRI RAMADHANI",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 42,
    nama: "NOVAN RIYADI",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 43,
    nama: "FERI ANGGARA",
    picHbd: "ZONE 1 DOUBLE DECK",
    employee: "MAIN DEALER",
    areaKerja: "Second stage",
    picPengambilan: "FADLILLAH AZHAR",
    kontakWa: "81323624952",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 44,
    nama: "KOKOH JAYA ADILLAH",
    picHbd: "RIDING TEST",
    employee: "MAIN DEALER",
    areaKerja: "RIDING TEST",
    picPengambilan: "KOKOH JAYA ADILLAH",
    kontakWa: "85769929890",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 45,
    nama: "FARID ADI SUSILO",
    picHbd: "KEAMANAN",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 46,
    nama: "ROMANIARTINI DESIWI",
    picHbd: "LO",
    employee: "MAIN DEALER",
    areaKerja: "backstage",
    picPengambilan: "FERNANDO HOSE",
    kontakWa: "81373917286",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 47,
    nama: "WIJI LESTARI",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 48,
    nama: "RIO NURMAN SAPUTRA",
    picHbd: "H2",
    employee: "MAIN DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 49,
    nama: "JOHANES RICHARD",
    picHbd: "Konsumsi",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 50,
    nama: "ACHMAD TESSAR SULISTIONO",
    picHbd: "PIC SHOW DIRECTOR",
    employee: "MAIN DEALER",
    areaKerja: "backstage",
    picPengambilan: "FERNANDO HOSE",
    kontakWa: "81373917286",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 51,
    nama: "IIN NOVIYANTI",
    picHbd: "PIC CONCERT",
    employee: "MAIN DEALER",
    areaKerja: "backstage",
    picPengambilan: "FERNANDO HOSE",
    kontakWa: "81373917286",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 52,
    nama: "FERNANDO HOSE",
    picHbd: "CONCERT",
    employee: "MAIN DEALER",
    areaKerja: "backstage",
    picPengambilan: "FERNANDO HOSE",
    kontakWa: "81373917286",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 53,
    nama: "KURNIAWAN",
    picHbd: "PIC DIGITAL CAMPAIGN",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "82243674367",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 54,
    nama: "NOVI YANTI",
    picHbd: "PIC PRESS RELEASE",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "85349269000",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 55,
    nama: "NITAMI SUGIYATI",
    picHbd: "PRESS RELEASE, PIC CSR",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 56,
    nama: "RIDHO AKBAR MENDOVA",
    picHbd: "ATL",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 57,
    nama: "DEASY KUSUMA ANGGRAENY",
    picHbd: "LO",
    employee: "MAIN DEALER",
    areaKerja: "backstage",
    picPengambilan: "Desi",
    kontakWa: "82278511022",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 58,
    nama: "FEBTRY MARISKA PUTRI",
    picHbd: "LO",
    employee: "MAIN DEALER",
    areaKerja: "backstage",
    picPengambilan: "Desi",
    kontakWa: "82278511022",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 59,
    nama: "KHAIRUNNISA",
    picHbd: "PIC SPONSORSHIP & PARTNERSHIP",
    employee: "MAIN DEALER",
    areaKerja: "UMKM",
    picPengambilan: "LEO FERIYANTO",
    kontakWa: "82182344045",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 60,
    nama: "ASTRI LINDA WOU MULEI",
    picHbd: "SEKRETARIS PERIZINAN",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "82175867890",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 61,
    nama: "LINTANG YANUARI",
    picHbd: "CSR",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 62,
    nama: "TRIDOYO AFIT WIJAYA",
    picHbd: "PIC LOGISTICS & PROCUREMENT",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 63,
    nama: "INDRA JAYA PUTRA (PIC)",
    picHbd: "PIC KONSUMSI HBD",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true, kegiatan: "Persiapan Loding dan meyiapkan kebutuhan konsumsi panitia" },
      malamHMinus1: { hadir: true, kegiatan: "menyiapkan kebutuhan konsumsi panitia" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 64,
    nama: "INDRA JAYA PUTRA",
    picHbd: "KONSUMSI HBD",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true, kegiatan: "Persiapan Loding dan meyiapkan kebutuhan konsumsi panitia" },
      malamHMinus1: { hadir: true, kegiatan: "menyiapkan kebutuhan konsumsi panitia" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 65,
    nama: "AMANDA BELLA PUSPITA",
    picHbd: "KONSUMSI HBD",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "Persiapan Loding dan meyiapkan kebutuhan konsumsi panitia" },
      malamHMinus1: { hadir: true, kegiatan: "menyiapkan kebutuhan konsumsi panitia" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 66,
    nama: "FADILA FITRIYANI",
    picHbd: "KONSUMSI HBD",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "Persiapan Loding dan meyiapkan kebutuhan konsumsi panitia" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 67,
    nama: "GITA APRILLIA FAJRIN",
    picHbd: "KONSUMSI HBD",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "Persiapan Loding dan meyiapkan kebutuhan konsumsi panitia" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 68,
    nama: "FADLIN MAJID",
    picHbd: "KONSUMSI HBD",
    employee: "MAIN DEALER",
    areaKerja: "KONSUMSI",
    picPengambilan: "GITA APRILLIA FAJRIN",
    kontakWa: "8996423769",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true, kegiatan: "Persiapan Loding dan meyiapkan kebutuhan konsumsi panitia" },
      malamHMinus1: { hadir: true, kegiatan: "menyiapkan kebutuhan konsumsi panitia" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 69,
    nama: "NUR ROHMAN",
    picHbd: "PROCUREMENT",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 70,
    nama: "MUHAMMAD AMIN",
    picHbd: "PIC PERLENGKAPAN HBD",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 71,
    nama: "VERDY ANGGRIZAL",
    picHbd: "PERLENGKAPAN HBD",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 72,
    nama: "M ANAM SAPUTRA",
    picHbd: "MODIFIKASI",
    employee: "MAIN DEALER",
    areaKerja: "MODIFIKASI",
    picPengambilan: "M ANAM SAPUTRA",
    kontakWa: "82282205984",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 73,
    nama: "YOGI DWI YANTO SM",
    picHbd: "PERLENGKAPAN HBD",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 74,
    nama: "JOKO HERIYANTO",
    picHbd: "PERLENGKAPAN HBD",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 75,
    nama: "SANDY PRATAMA",
    picHbd: "PERLENGKAPAN HBD",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 76,
    nama: "DEFRY RAMANDA MIFTA",
    picHbd: "DISPLAY H1",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 77,
    nama: "RIDWAN TAUFIK",
    picHbd: "DISPLAY H3",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 78,
    nama: "MARDIANA M",
    picHbd: "PIC HEALTH, SAFETY & ENVIRONMENT & PERMIT",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "87780641800",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 79,
    nama: "MOHAMMAD SYARIFUDIN",
    picHbd: "PERLENGKAPAN HBD",
    employee: "MAIN DEALER",
    areaKerja: "PERLENGKAPAN",
    picPengambilan: "SANDY PRATAMA",
    kontakWa: "83113107236",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      siangHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      malamHMinus1: { hadir: true, kegiatan: "Loading Perlengkapan di semua area devisi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 80,
    nama: "NAGARA",
    picHbd: "PIC DEVELOPMENT SYSTEM & REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true, kegiatan: "Gladi?" },
      malamHMinus1: { hadir: true, kegiatan: "Gladi?" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 81,
    nama: "KURNIA ANNISA",
    picHbd: "PIC REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: true, kegiatan: "cek lokasi registrasi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 82,
    nama: "MARIA APRICHRISNA",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: true, kegiatan: "cek lokasi registrasi" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 83,
    nama: "LOLA AMELIA RAHMAYANTI",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 84,
    nama: "JESSIKA WIDYA ARDINI",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 85,
    nama: "TRI OKTA RIANA",
    picHbd: "REGISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "REGISTRASI",
    picPengambilan: "NAGARA",
    kontakWa: "81379055589",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 86,
    nama: "REZA AGNESTASIA",
    picHbd: "PIC FINANCE & ADMINISTRATION",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "85814772016",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "cek lokasi" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 87,
    nama: "ZARRA VIERN C",
    picHbd: "REPORT FINANCE",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "85814772016",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "cek lokasi" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 88,
    nama: "ADELLA DANNURA PUTRI S",
    picHbd: "ADMIN SECRETARY",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "85814772016",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true, kegiatan: "cek lokasi" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 89,
    nama: "SAFIRA DAMAYANTI RISSAL",
    picHbd: "PIC SALES PEOPLE ACTIVITY",
    employee: "MAIN DEALER",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "85764139093",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true, kegiatan: "Cek lokasi untuk FLP" },
      siangHMinus1: { hadir: true, kegiatan: "Gladi?" },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 90,
    nama: "WAHYUNAN ARIEF",
    picHbd: "H2",
    employee: "MAIN DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true, kegiatan: "Loading Service" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 91,
    nama: "RONI FAJRI ARSANI",
    picHbd: "ZONE 1 DOUBLE DECK",
    employee: "PIJAR DEALER",
    areaKerja: "Second Stage",
    picPengambilan: "FADLILLAH AZHAR",
    kontakWa: "81323624952",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 92,
    nama: "CICIL",
    picHbd: "UMKM",
    employee: "PIJAR DEALER",
    areaKerja: "UMKM",
    picPengambilan: "LEO FERIYANTO",
    kontakWa: "82182344045",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 93,
    nama: "TENGKU ARDIANSYAH",
    picHbd: "ZONE 1 DOUBLE DECK",
    employee: "PIJAR RETAIL",
    areaKerja: "Second Stage",
    picPengambilan: "FADLILLAH AZHAR",
    kontakWa: "81323624952",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 94,
    nama: "AGUNG WIDYA UTAMA",
    picHbd: "MODIFIKASI",
    employee: "PIJAR RETAIL",
    areaKerja: "MODIFIKASI",
    picPengambilan: "M ANAM SAPUTRA",
    kontakWa: "82282205984",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 95,
    nama: "TRI MUNARDI",
    picHbd: "MODIFIKASI",
    employee: "PIJAR RETAIL",
    areaKerja: "MODIFIKASI",
    picPengambilan: "M ANAM SAPUTRA",
    kontakWa: "82282205984",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 96,
    nama: "APRI YANTO",
    picHbd: "PIC PERIZINAN",
    employee: "PIJAR RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 97,
    nama: "ZUL FIKRI",
    picHbd: "PIC KEAMANAN",
    employee: "PIJAR RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 98,
    nama: "ROYYAN AKBAR",
    picHbd: "LO",
    employee: "PIJAR RETAIL",
    areaKerja: "backstage",
    picPengambilan: "FERNANDO HOSE",
    kontakWa: "81373917286",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 99,
    nama: "HENDRI YURNI",
    picHbd: "KEAMANAN",
    employee: "PIJAR RETAIL",
    areaKerja: "mobile",
    picPengambilan: "mobile",
    kontakWa: "",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 100,
    nama: "BADIA",
    picHbd: "H2",
    employee: "KABENG DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 101,
    nama: "AGUS PRATAMA",
    picHbd: "H2",
    employee: "KABENG RETAIL",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 102,
    nama: "RADIT",
    picHbd: "H2",
    employee: "KABENG RETAIL",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 103,
    nama: "ROBY ASTRA MOTOR",
    picHbd: "H2",
    employee: "KABENG DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 104,
    nama: "FATUR BKJ",
    picHbd: "H2",
    employee: "KABENG DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 105,
    nama: "ARIF NSS",
    picHbd: "H2",
    employee: "KABENG DEALER",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 106,
    nama: "SANTO RI",
    picHbd: "H2",
    employee: "KABENG RETAIL",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 107,
    nama: "ALDO PRAMUKA",
    picHbd: "H2",
    employee: "KABENG RETAIL",
    areaKerja: "SERVICE MOTOR",
    picPengambilan: "WAHYUNAN ARIEF",
    kontakWa: "85664421758",
    qty: 1,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 108,
    nama: "Panitia Community",
    picHbd: "Panitia Komunitas Bikers",
    employee: "Eksternal",
    areaKerja: "Area Acara & Gate",
    picPengambilan: "PIC Community",
    kontakWa: "",
    qty: 50,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: true, kegiatan: "prefare persiapan kedatangan bikers" },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 109,
    nama: "External Polisi",
    picHbd: "Keamanan Kepolisian",
    employee: "Eksternal",
    areaKerja: "Pos Keamanan Luar",
    picPengambilan: "Komandan Polisi",
    kontakWa: "",
    qty: 50,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: false },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 110,
    nama: "External Keamanan Lokal, Parkir & Gate",
    picHbd: "Keamanan lokal (20), parkir (20), konsumsi 6 gate",
    employee: "Eksternal",
    areaKerja: "Gate & Parkir",
    picPengambilan: "Pak Da",
    kontakWa: "82175808600",
    qty: 40,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 111,
    nama: "Babinsa PKOR",
    picHbd: "Babinsa Wilayah",
    employee: "Eksternal",
    areaKerja: "Pos Pantau PKOR",
    picPengambilan: "Wijianto",
    kontakWa: "85886594642",
    qty: 6,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 112,
    nama: "Loading Renold",
    picHbd: "Tim Bongkar Muat",
    employee: "Eksternal",
    areaKerja: "Loading Dock",
    picPengambilan: "Renold",
    kontakWa: "89673313183",
    qty: 6,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 113,
    nama: "Team Loading Vendor (SNR)",
    picHbd: "Vendor Panggung & Rigging",
    employee: "Eksternal",
    areaKerja: "Panggung Utama",
    picPengambilan: "Sunar",
    kontakWa: "87805164646",
    qty: 15,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: true }
    }
  },
  {
    id: 114,
    nama: "Volunteer (Mahasiswa)",
    picHbd: "Relawan Lapangan",
    employee: "Eksternal",
    areaKerja: "Semua Zone",
    picPengambilan: "Koordinator Volunteer",
    kontakWa: "",
    qty: 30,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 115,
    nama: "OB",
    picHbd: "DIANA",
    employee: "Internal",
    areaKerja: "OB",
    picPengambilan: "Amar",
    kontakWa: "83850780503",
    qty: 5,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: true },
      siangHMinus1: { hadir: true },
      malamHMinus1: { hadir: true },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 116,
    nama: "Security",
    picHbd: "DIANA",
    employee: "Internal",
    areaKerja: "Perimeter & Gate",
    picPengambilan: "Danru Security",
    kontakWa: "",
    qty: 30,
    kategori: "Internal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: true },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 117,
    nama: "Team Medis",
    picHbd: "DIANA",
    employee: "Eksternal",
    areaKerja: "Tenda Medis",
    picPengambilan: "Dokter / PIC Medis",
    kontakWa: "",
    qty: 5,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 118,
    nama: "UPTD Area",
    picHbd: "DIANA",
    employee: "Eksternal",
    areaKerja: "Kawasan PKOR",
    picPengambilan: "Agung Pkor",
    kontakWa: "85378721705",
    qty: 10,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 119,
    nama: "UPTD Kebersihan",
    picHbd: "DIANA",
    employee: "Eksternal",
    areaKerja: "Area Kebersihan & Sampah",
    picPengambilan: "Arifin Pkor",
    kontakWa: "82181101429",
    qty: 15,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 120,
    nama: "Trafis (Service Massage)",
    picHbd: "Service Massage",
    employee: "Eksternal",
    areaKerja: "Tenda Relaksasi",
    picPengambilan: "PIC Terapis",
    kontakWa: "",
    qty: 10,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 121,
    nama: "Damkar",
    picHbd: "Pemadam Kebakaran",
    employee: "Eksternal",
    areaKerja: "Standby Damkar",
    picPengambilan: "Komandan Damkar",
    kontakWa: "",
    qty: 10,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  },
  {
    id: 122,
    nama: "SMK (Bantuan Pendukung)",
    picHbd: "Siswa Magang SMK",
    employee: "Eksternal",
    areaKerja: "Area Pendukung",
    picPengambilan: "Pa syarif",
    kontakWa: "81808511983",
    qty: 6,
    kategori: "Eksternal",
    makan: "YES",
    schedule: {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true },
      malamH: { hadir: true },
      hPlus1: { hadir: false }
    }
  }
];

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";
var adminAuthInstance = null;
try {
  if (!getApps().length) {
    let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      try {
        const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, "utf-8");
          const config = JSON.parse(raw);
          projectId = config.projectId;
        }
      } catch {
      }
    }
    if (projectId) {
      initializeApp({ projectId });
    }
  }
  if (getApps().length > 0) {
    adminAuthInstance = getAuth();
  }
} catch (err) {
  console.warn("Firebase admin initialization notice:", err);
}
var adminAuth = adminAuthInstance;

// src/middleware/auth.ts
var optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || !adminAuth) {
    return next();
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
  } catch (error) {
    console.warn("Optional auth token verification skipped or invalid:", error);
  }
  next();
};

// src/serverApp.ts
dotenv.config();
function createExpressApp() {
  const app2 = express();
  app2.use(express.json());
  const router = express.Router();
  router.get("/", (req, res) => {
    res.json({ status: "ok", service: "konsumsi-hbd-api" });
  });
  router.get("/health", async (req, res) => {
    try {
      const pool2 = createPool();
      const testRes = await pool2.query("SELECT current_database(), current_user");
      res.json({
        status: "ok",
        database: "postgresql",
        dbName: testRes.rows[0]?.current_database,
        dbUser: testRes.rows[0]?.current_user
      });
    } catch (err) {
      res.json({
        status: "warning",
        message: "Server is running, but database connection has an issue",
        error: err.message
      });
    }
  });
  router.get("/recipients", async (req, res) => {
    try {
      let list = await getAllRecipients();
      if (list.length === 0) {
        await seedRecipientsIfEmpty(INITIAL_RECIPIENTS);
        list = await getAllRecipients();
      }
      res.json({ success: true, count: list.length, data: list });
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/recipients/batch", optionalAuth, async (req, res) => {
    try {
      const { recipients: items, mode } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, error: "recipients must be an array" });
      }
      if (mode === "replace") {
        await replaceRecipients(items);
      } else {
        await batchUpsertRecipients(items);
      }
      const updatedList = await getAllRecipients();
      res.json({ success: true, count: updatedList.length, data: updatedList });
    } catch (error) {
      console.error("Error batch updating recipients in Cloud SQL:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/recipients/update", optionalAuth, async (req, res) => {
    try {
      const { recipient } = req.body;
      if (!recipient || !recipient.id) {
        return res.status(400).json({ success: false, error: "Invalid recipient data" });
      }
      const updated = await upsertRecipient(recipient);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating recipient in Cloud SQL:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/recipients/reset", optionalAuth, async (req, res) => {
    try {
      await replaceRecipients(INITIAL_RECIPIENTS);
      const list = await getAllRecipients();
      res.json({ success: true, count: list.length, data: list });
    } catch (error) {
      console.error("Error resetting recipients in Cloud SQL:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.get("/pickups", async (req, res) => {
    try {
      const records = await getAllPickupRecords();
      const map = {};
      records.forEach((r) => {
        const key = `${r.recipientId}_${r.sessionKey}`;
        map[key] = {
          recipientId: r.recipientId,
          sessionKey: r.sessionKey,
          isTaken: r.isTaken,
          takenAt: r.takenAt || void 0,
          takenBy: r.takenBy || void 0,
          portionsTaken: r.portionsTaken,
          notes: r.notes || void 0
        };
      });
      res.json({ success: true, data: map });
    } catch (error) {
      console.error("Error fetching pickups:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/pickups/toggle", optionalAuth, async (req, res) => {
    try {
      const { recipientId, sessionKey, isTaken, takenAt, takenBy, portionsTaken, notes, log } = req.body;
      const record = await upsertPickupRecord({
        recipientId,
        sessionKey,
        isTaken,
        takenAt,
        takenBy,
        portionsTaken,
        notes
      });
      if (log) {
        await insertAuditLog(log);
      }
      res.json({ success: true, data: record });
    } catch (error) {
      console.error("Error toggling pickup:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/pickups/batch", optionalAuth, async (req, res) => {
    try {
      const { items, logs } = req.body;
      if (Array.isArray(items) && items.length > 0) {
        await batchUpsertPickupRecords(items);
      }
      if (Array.isArray(logs) && logs.length > 0) {
        for (const log of logs) {
          await insertAuditLog(log);
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error batch updating pickups:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/pickups/update", optionalAuth, async (req, res) => {
    try {
      const { record, log } = req.body;
      const updated = await upsertPickupRecord(record);
      if (log) {
        await insertAuditLog(log);
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("Error updating pickup details:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/pickups/reset", optionalAuth, async (req, res) => {
    try {
      await resetAllPickupRecords();
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting pickups:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.get("/logs", async (req, res) => {
    try {
      const logs = await getAuditLogs(150);
      const mapped = logs.map((l) => ({
        id: l.logId,
        timestamp: l.timestamp,
        recipientId: l.recipientId,
        recipientName: l.recipientName,
        sessionKey: l.sessionKey,
        action: l.action,
        picPengambilan: l.picPengambilan,
        qty: l.qty,
        operatorNotes: l.operatorNotes || void 0
      }));
      res.json({ success: true, data: mapped });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.delete("/logs", optionalAuth, async (req, res) => {
    try {
      await clearAuditLogs();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing audit logs:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.post("/auth/sync", optionalAuth, async (req, res) => {
    try {
      if (req.user) {
        const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name);
        return res.json({ success: true, user });
      }
      res.json({ success: false, message: "No user token provided" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.use("/api", router);
  app2.use("/", router);
  return app2;
}

// api/index.ts
var app = createExpressApp();
var index_default = app;
export {
  index_default as default
};
