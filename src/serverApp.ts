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
  getOrCreateUser
} from './db/queries.ts';
import { optionalAuth, AuthRequest } from './middleware/auth.ts';

dotenv.config();

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'cloudsql-postgresql' });
  });

  // Get all pickup records
  app.get('/api/pickups', async (req, res) => {
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
  app.post('/api/pickups/toggle', optionalAuth, async (req: AuthRequest, res) => {
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
  app.post('/api/pickups/batch', optionalAuth, async (req: AuthRequest, res) => {
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
  app.post('/api/pickups/update', optionalAuth, async (req: AuthRequest, res) => {
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
  app.post('/api/pickups/reset', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await resetAllPickupRecords();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error resetting pickups:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get audit logs
  app.get('/api/logs', async (req, res) => {
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
  app.delete('/api/logs', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await clearAuditLogs();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error clearing audit logs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // User auth sync
  app.post('/api/auth/sync', optionalAuth, async (req: AuthRequest, res) => {
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

  return app;
}
