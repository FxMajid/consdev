import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// 1. Users table (Firebase Auth linked)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Pickup Records table (Tracks meal pickup per recipient per session)
export const pickupRecords = pgTable('pickup_records', {
  id: serial('id').primaryKey(),
  recipientId: integer('recipient_id').notNull(),
  sessionKey: text('session_key').notNull(),
  isTaken: boolean('is_taken').notNull().default(true),
  takenAt: text('taken_at'),
  takenBy: text('taken_by'),
  portionsTaken: integer('portions_taken').notNull().default(1),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  uniqueIndex('recipient_session_idx').on(table.recipientId, table.sessionKey)
]);

// 3. Audit Logs table (Real-time log trail)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  logId: text('log_id').notNull(),
  timestamp: text('timestamp').notNull(),
  recipientId: integer('recipient_id').notNull(),
  recipientName: text('recipient_name').notNull(),
  sessionKey: text('session_key').notNull(),
  action: text('action').notNull(),
  picPengambilan: text('pic_pengambilan').notNull(),
  qty: integer('qty').notNull(),
  operatorNotes: text('operator_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Recipients table (Master recipient directory synced from CSV/seed)
export const recipients = pgTable('recipients', {
  id: integer('id').primaryKey(),
  nama: text('nama').notNull(),
  picHbd: text('pic_hbd').notNull(),
  employee: text('employee').notNull(),
  areaKerja: text('area_kerja').notNull(),
  picPengambilan: text('pic_pengambilan').notNull(),
  kontakWa: text('kontak_wa'),
  qty: integer('qty').notNull().default(1),
  kategori: text('kategori').notNull().default('Internal'),
  makan: text('makan').notNull().default('YES'),
  schedule: text('schedule').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

