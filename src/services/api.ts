import { PickupRecord, LogEntry, ConsumptionRecipient, SessionKey } from '../types';
import { auth } from '../lib/firebase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Could not retrieve auth token:', err);
  }
  return headers;
}

export async function fetchPickupsFromDb(): Promise<Record<string, PickupRecord>> {
  try {
    const res = await fetch('/api/pickups');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || {};
  } catch (error) {
    console.warn('Fallback to local state while fetching from Cloud SQL:', error);
    throw error;
  }
}

export async function togglePickupInDb(
  recipient: ConsumptionRecipient,
  sessionKey: SessionKey,
  isTaken: boolean,
  takenAt?: string,
  takenBy?: string,
  portionsTaken?: number,
  notes?: string,
  log?: LogEntry
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/pickups/toggle', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      recipientId: recipient.id,
      sessionKey,
      isTaken,
      takenAt,
      takenBy,
      portionsTaken: portionsTaken ?? recipient.qty,
      notes,
      log
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to toggle pickup: HTTP ${res.status}`);
  }
}

export async function batchPickupInDb(
  items: {
    recipientId: number;
    sessionKey: string;
    isTaken: boolean;
    takenAt?: string;
    takenBy?: string;
    portionsTaken?: number;
    notes?: string;
  }[],
  logs: LogEntry[]
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/pickups/batch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ items, logs }),
  });
  if (!res.ok) {
    throw new Error(`Failed to batch update: HTTP ${res.status}`);
  }
}

export async function updatePickupInDb(
  record: PickupRecord,
  log?: LogEntry
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/pickups/update', {
    method: 'POST',
    headers,
    body: JSON.stringify({ record, log }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update pickup: HTTP ${res.status}`);
  }
}

export async function resetPickupsInDb(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/pickups/reset', {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to reset: HTTP ${res.status}`);
  }
}

export async function fetchLogsFromDb(): Promise<LogEntry[]> {
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.warn('Fallback to local logs:', error);
    throw error;
  }
}

export async function clearLogsInDb(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/logs', {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to clear logs: HTTP ${res.status}`);
  }
}

// Master Recipients Directory Database Operations
export async function fetchRecipientsFromDb(): Promise<ConsumptionRecipient[]> {
  try {
    const res = await fetch('/api/recipients');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.warn('Fallback to local recipient state:', error);
    throw error;
  }
}

export async function batchSaveRecipientsToDb(
  recipients: ConsumptionRecipient[],
  mode: 'merge' | 'replace'
): Promise<ConsumptionRecipient[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/recipients/batch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ recipients, mode }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save recipients to database: HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data || recipients;
}

export async function updateRecipientInDb(recipient: ConsumptionRecipient): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/recipients/update', {
    method: 'POST',
    headers,
    body: JSON.stringify({ recipient }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update recipient in database: HTTP ${res.status}`);
  }
}

export async function resetRecipientsInDb(): Promise<ConsumptionRecipient[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/recipients/reset', {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to reset recipients in database: HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data || [];
}

export interface DatabaseHealthStatus {
  connected: boolean;
  dbType?: string;
  dbName?: string;
  dbUser?: string;
  latencyMs?: number;
  message?: string;
  error?: string;
  timestamp: string;
}

export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  const startTime = performance.now();
  try {
    const res = await fetch('/api/health');
    const latency = Math.round(performance.now() - startTime);
    if (!res.ok) {
      return {
        connected: false,
        message: `HTTP ${res.status}: Server API merespons dengan error`,
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      };
    }
    const data = await res.json();
    if (data.status === 'ok') {
      return {
        connected: true,
        dbType: data.database || 'postgresql (Supabase)',
        dbName: data.dbName,
        dbUser: data.dbUser,
        latencyMs: latency,
        message: 'Terhubung ke database PostgreSQL Supabase',
        timestamp: new Date().toLocaleTimeString('id-ID'),
      };
    } else {
      return {
        connected: false,
        message: data.message || 'Koneksi database bermasalah',
        error: data.error,
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      connected: false,
      message: 'Gagal menghubungi endpoint server (/api/health)',
      error: err.message,
      latencyMs: latency,
      timestamp: new Date().toLocaleTimeString('id-ID'),
    };
  }
}


