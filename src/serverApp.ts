import express from 'express';
import dotenv from 'dotenv';
import { 
  getAllPickupRecords, 
  upsertPickupRecord, 
  batchUpsertPickupRecords, 
  resetAllPickupRecords,
  getAuditLogs,
  insertAuditLog,
  clearAuditLogs,
  getOrCreateUser,
  getAllRecipients,
  upsertRecipient,
  batchUpsertRecipients,
  replaceRecipients,
  seedRecipientsIfEmpty
} from './db/queries.ts';
import { INITIAL_RECIPIENTS } from './data/initialData.ts';
import { createPool, isDatabaseEnabled } from './db/index.ts';
import { optionalAuth } from './middleware/auth.ts';
import type { AuthRequest } from './middleware/auth.ts';

dotenv.config();

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  const router = express.Router();

  // Root health check
  router.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'konsumsi-hbd-api' });
  });

  // Health & DB Connection check
  router.get('/health', async (req, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ 
        status: 'disconnected', 
        database: 'none',
        message: 'Google Cloud SQL diputus. Aplikasi berjalan dalam mode aman Offline-First / Penyimpanan Lokal.',
        isLocalMode: true
      });
    }

    try {
      const testRes = await pool.query('SELECT current_database(), current_user');
      res.json({ 
        status: 'ok', 
        database: 'postgresql',
        dbName: testRes.rows[0]?.current_database,
        dbUser: testRes.rows[0]?.current_user,
        isLocalMode: false
      });
    } catch (err: any) {
      res.json({ 
        status: 'warning', 
        message: 'Database belum dapat dihubungi, mode lokal aktif', 
        error: err.message,
        isLocalMode: true
      });
    }
  });

  // Get all recipients (falls back to INITIAL_RECIPIENTS if database not connected)
  router.get('/recipients', async (req, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, count: INITIAL_RECIPIENTS.length, data: INITIAL_RECIPIENTS, mode: 'local' });
    }
    try {
      let list = await getAllRecipients();
      if (list.length === 0) {
        await seedRecipientsIfEmpty(INITIAL_RECIPIENTS);
        list = await getAllRecipients();
      }
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      console.warn('Database query skipped, returning default initial recipients:', error.message);
      res.json({ success: true, count: INITIAL_RECIPIENTS.length, data: INITIAL_RECIPIENTS, mode: 'local' });
    }
  });

  // Batch import / update recipients (used by CSV import or mass update)
  router.post('/recipients/batch', optionalAuth, async (req: AuthRequest, res) => {
    const { recipients: items, mode } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'recipients must be an array' });
    }

    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, count: items.length, data: items, mode: 'local' });
    }

    try {
      if (mode === 'replace') {
        await replaceRecipients(items);
      } else {
        await batchUpsertRecipients(items);
      }
      const updatedList = await getAllRecipients();
      res.json({ success: true, count: updatedList.length, data: updatedList });
    } catch (error: any) {
      console.warn('Database batch update fallback to local response:', error.message);
      res.json({ success: true, count: items.length, data: items, mode: 'local' });
    }
  });

  // Update single recipient (e.g. from recipient modal edit)
  router.post('/recipients/update', optionalAuth, async (req: AuthRequest, res) => {
    const { recipient } = req.body;
    if (!recipient || !recipient.id) {
      return res.status(400).json({ success: false, error: 'Invalid recipient data' });
    }

    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, data: recipient, mode: 'local' });
    }

    try {
      const updated = await upsertRecipient(recipient);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.warn('Database recipient update fallback:', error.message);
      res.json({ success: true, data: recipient, mode: 'local' });
    }
  });

  // Reset recipients to factory default (122 original recipients)
  router.post('/recipients/reset', optionalAuth, async (req: AuthRequest, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, count: INITIAL_RECIPIENTS.length, data: INITIAL_RECIPIENTS, mode: 'local' });
    }

    try {
      await replaceRecipients(INITIAL_RECIPIENTS);
      const list = await getAllRecipients();
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      console.warn('Database recipients reset fallback:', error.message);
      res.json({ success: true, count: INITIAL_RECIPIENTS.length, data: INITIAL_RECIPIENTS, mode: 'local' });
    }
  });

  // Get all pickup records
  router.get('/pickups', async (req, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, data: {}, mode: 'local' });
    }

    try {
      const records = await getAllPickupRecords();
      const map: Record<string, any> = {};
      records.forEach(r => {
        const key = `${r.recipientId}_${r.sessionKey}`;
        map[key] = {
          recipientId: r.recipientId,
          sessionKey: r.sessionKey,
          isTaken: r.isTaken,
          takenAt: r.takenAt || undefined,
          takenBy: r.takenBy || undefined,
          portionsTaken: r.portionsTaken,
          notes: r.notes || undefined,
        };
      });
      res.json({ success: true, data: map });
    } catch (error: any) {
      console.warn('Database pickups fetch fallback:', error.message);
      res.json({ success: true, data: {}, mode: 'local' });
    }
  });

  // Toggle single pickup record
  router.post('/pickups/toggle', optionalAuth, async (req: AuthRequest, res) => {
    const { recipientId, sessionKey, isTaken, takenAt, takenBy, portionsTaken, notes, log } = req.body;
    const pool = createPool();

    if (!pool) {
      return res.json({ 
        success: true, 
        data: { recipientId, sessionKey, isTaken, takenAt, takenBy, portionsTaken, notes },
        mode: 'local' 
      });
    }

    try {
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
    } catch (error: any) {
      console.warn('Database toggle pickup fallback:', error.message);
      res.json({ 
        success: true, 
        data: { recipientId, sessionKey, isTaken, takenAt, takenBy, portionsTaken, notes },
        mode: 'local' 
      });
    }
  });

  // Batch pickup records (PIC collective)
  router.post('/pickups/batch', optionalAuth, async (req: AuthRequest, res) => {
    const { items, logs } = req.body;
    const pool = createPool();

    if (!pool) {
      return res.json({ success: true, count: items?.length || 0, mode: 'local' });
    }

    try {
      if (Array.isArray(items) && items.length > 0) {
        await batchUpsertPickupRecords(items);
      }
      if (Array.isArray(logs) && logs.length > 0) {
        for (const log of logs) {
          await insertAuditLog(log);
        }
      }
      res.json({ success: true, count: items?.length || 0 });
    } catch (error: any) {
      console.warn('Database batch pickup fallback:', error.message);
      res.json({ success: true, count: items?.length || 0, mode: 'local' });
    }
  });

  // Update specific pickup details (manual edit)
  router.post('/pickups/update', optionalAuth, async (req: AuthRequest, res) => {
    const { record, log } = req.body;
    const pool = createPool();

    if (!pool) {
      return res.json({ success: true, data: record, mode: 'local' });
    }

    try {
      const updated = await upsertPickupRecord(record);
      if (log) {
        await insertAuditLog(log);
      }
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.warn('Database pickup update fallback:', error.message);
      res.json({ success: true, data: record, mode: 'local' });
    }
  });

  // Reset all records
  router.post('/pickups/reset', optionalAuth, async (req: AuthRequest, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, mode: 'local' });
    }

    try {
      await resetAllPickupRecords();
      res.json({ success: true });
    } catch (error: any) {
      console.warn('Database reset fallback:', error.message);
      res.json({ success: true, mode: 'local' });
    }
  });

  // Get audit logs
  router.get('/logs', async (req, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, data: [], mode: 'local' });
    }

    try {
      const logs = await getAuditLogs(150);
      const mapped = logs.map(l => ({
        id: l.logId,
        timestamp: l.timestamp,
        recipientId: l.recipientId,
        recipientName: l.recipientName,
        sessionKey: l.sessionKey,
        action: l.action as 'TAKEN' | 'UNTAKEN',
        picPengambilan: l.picPengambilan,
        qty: l.qty,
        operatorNotes: l.operatorNotes || undefined,
      }));
      res.json({ success: true, data: mapped });
    } catch (error: any) {
      console.warn('Database logs fetch fallback:', error.message);
      res.json({ success: true, data: [], mode: 'local' });
    }
  });

  // Clear audit logs
  router.delete('/logs', optionalAuth, async (req: AuthRequest, res) => {
    const pool = createPool();
    if (!pool) {
      return res.json({ success: true, mode: 'local' });
    }

    try {
      await clearAuditLogs();
      res.json({ success: true });
    } catch (error: any) {
      console.warn('Database clear logs fallback:', error.message);
      res.json({ success: true, mode: 'local' });
    }
  });

  // User auth sync
  router.post('/auth/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        const pool = createPool();
        if (pool) {
          const user = await getOrCreateUser(req.user.uid, req.user.email || '', req.user.name);
          return res.json({ success: true, user });
        }
        return res.json({ success: true, user: { uid: req.user.uid, email: req.user.email, name: req.user.name } });
      }
      res.json({ success: false, message: 'No user token provided' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Mount router at both /api and root / to handle any rewrite style
  app.use('/api', router);
  app.use('/', router);

  return app;
}
