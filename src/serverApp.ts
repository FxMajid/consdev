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
import { createPool } from './db/index.ts';
import { optionalAuth } from './middleware/auth.ts';
import type { AuthRequest } from './middleware/auth.ts';

dotenv.config();

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  const router = express.Router();

  // Health & DB Connection check
  router.get('/health', async (req, res) => {
    try {
      const pool = createPool();
      const testRes = await pool.query('SELECT current_database(), current_user');
      res.json({ 
        status: 'ok', 
        database: 'postgresql',
        dbName: testRes.rows[0]?.current_database,
        dbUser: testRes.rows[0]?.current_user
      });
    } catch (err: any) {
      res.json({ 
        status: 'warning', 
        message: 'Server is running, but database connection has an issue', 
        error: err.message 
      });
    }
  });

  // Get all recipients (auto-seeds with INITIAL_RECIPIENTS if database table is empty)
  router.get('/recipients', async (req, res) => {
    try {
      let list = await getAllRecipients();
      if (list.length === 0) {
        await seedRecipientsIfEmpty(INITIAL_RECIPIENTS);
        list = await getAllRecipients();
      }
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Batch import / update recipients (used by CSV import or mass update)
  router.post('/recipients/batch', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { recipients: items, mode } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'recipients must be an array' });
      }
      if (mode === 'replace') {
        await replaceRecipients(items);
      } else {
        await batchUpsertRecipients(items);
      }
      const updatedList = await getAllRecipients();
      res.json({ success: true, count: updatedList.length, data: updatedList });
    } catch (error: any) {
      console.error('Error batch updating recipients in Cloud SQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update single recipient (e.g. from recipient modal edit)
  router.post('/recipients/update', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { recipient } = req.body;
      if (!recipient || !recipient.id) {
        return res.status(400).json({ success: false, error: 'Invalid recipient data' });
      }
      const updated = await upsertRecipient(recipient);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating recipient in Cloud SQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Reset recipients to factory default (122 original recipients)
  router.post('/recipients/reset', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await replaceRecipients(INITIAL_RECIPIENTS);
      const list = await getAllRecipients();
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      console.error('Error resetting recipients in Cloud SQL:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all pickup records
  router.get('/pickups', async (req, res) => {
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
      console.error('Error fetching pickups:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Toggle single pickup record
  router.post('/pickups/toggle', optionalAuth, async (req: AuthRequest, res) => {
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
    } catch (error: any) {
      console.error('Error toggling pickup:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Batch pickup records (PIC collective)
  router.post('/pickups/batch', optionalAuth, async (req: AuthRequest, res) => {
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
    } catch (error: any) {
      console.error('Error batch updating pickups:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update specific pickup details (manual edit)
  router.post('/pickups/update', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { record, log } = req.body;
      const updated = await upsertPickupRecord(record);
      if (log) {
        await insertAuditLog(log);
      }
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating pickup details:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Reset all records
  router.post('/pickups/reset', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await resetAllPickupRecords();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error resetting pickups:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get audit logs
  router.get('/logs', async (req, res) => {
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
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Clear audit logs
  router.delete('/logs', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await clearAuditLogs();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error clearing audit logs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // User auth sync
  router.post('/auth/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        const user = await getOrCreateUser(req.user.uid, req.user.email || '', req.user.name);
        return res.json({ success: true, user });
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
