import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  SESSIONS, 
  INITIAL_RECIPIENTS 
} from './data/initialData';
import { 
  ConsumptionRecipient, 
  PickupRecord, 
  SessionKey, 
  LogEntry 
} from './types';
import { calculateSessionStats, exportToCSV } from './utils/consumptionUtils';
import { Header } from './components/Header';
import { SessionSelector } from './components/SessionSelector';
import { StatsCards } from './components/StatsCards';
import { RecipientList } from './components/RecipientList';
import { PicGroupingView } from './components/PicGroupingView';
import { OverallSummary } from './components/OverallSummary';
import { QuickPickupModal } from './components/QuickPickupModal';
import { EditPickupModal } from './components/EditPickupModal';
import { AuditLogModal } from './components/AuditLogModal';
import { PrintReportModal } from './components/PrintReportModal';
import { ImportCsvModal } from './components/ImportCsvModal';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';
import { LoginGate } from './components/LoginGate';
import {
  fetchPickupsFromDb,
  togglePickupInDb,
  batchPickupInDb,
  updatePickupInDb,
  resetPickupsInDb,
  fetchLogsFromDb,
  clearLogsInDb,
  fetchRecipientsFromDb,
  batchSaveRecipientsToDb,
  resetRecipientsInDb,
  checkDatabaseConnection,
  DatabaseHealthStatus
} from './services/api';


const STORAGE_KEY_RECORDS = 'hbd_consumption_pickup_records_v1';
const STORAGE_KEY_LOGS = 'hbd_consumption_logs_v1';
const STORAGE_KEY_OPERATOR = 'hbd_consumption_operator_v1';
const STORAGE_KEY_AUTH = 'hbd_auth_authenticated_v1';
const STORAGE_KEY_RECIPIENTS = 'hbd_consumption_recipients_v1';

export default function App() {
  const [activeSessionKey, setActiveSessionKey] = useState<SessionKey>('siangH');
  const [activeView, setActiveView] = useState<'list' | 'picGroups' | 'summary'>('list');

  // Dynamic Recipients State (can be updated via CSV Import)
  const [recipients, setRecipients] = useState<ConsumptionRecipient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECIPIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved recipients:', e);
    }
    return INITIAL_RECIPIENTS;
  });

  // Authentication gate state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    } catch {
      return false;
    }
  });

  // Operator / Pos identity
  const [currentOperator, setCurrentOperator] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_OPERATOR) || '';
    } catch {
      return '';
    }
  });

  const handleSaveOperator = useCallback((name: string) => {
    setCurrentOperator(name);
    try {
      localStorage.setItem(STORAGE_KEY_OPERATOR, name);
    } catch (e) {
      console.error('Failed to save operator name:', e);
    }
  }, []);

  const handleAuthenticate = useCallback((operator: string) => {
    setIsAuthenticated(true);
    handleSaveOperator(operator);
  }, [handleSaveOperator]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      console.error('Failed to logout:', e);
    }
  }, []);

  // Load pickup records from localStorage as initial cache
  const [pickupRecords, setPickupRecords] = useState<Record<string, PickupRecord>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved pickup records:', e);
    }
    return {};
  });

  // Load audit logs from localStorage as initial cache
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved logs:', e);
    }
    return [];
  });

  // Fetch from Cloud SQL PostgreSQL on mount & set up sync interval
  useEffect(() => {
    let isMounted = true;

    const syncWithDatabase = async () => {
      try {
        const [dbRecords, dbLogs, dbRecipients] = await Promise.all([
          fetchPickupsFromDb().catch(() => null),
          fetchLogsFromDb().catch(() => null),
          fetchRecipientsFromDb().catch(() => null),
        ]);

        if (isMounted) {
          if (dbRecipients && dbRecipients.length > 0) {
            setRecipients(dbRecipients);
            try {
              localStorage.setItem(STORAGE_KEY_RECIPIENTS, JSON.stringify(dbRecipients));
            } catch (e) {
              console.error('Failed to cache recipients locally:', e);
            }
          }
          if (dbRecords && Object.keys(dbRecords).length > 0) {
            setPickupRecords(prev => ({ ...prev, ...dbRecords }));
          }
          if (dbLogs && dbLogs.length > 0) {
            setLogs(dbLogs);
          }
        }
      } catch (err) {
        console.warn('Background Cloud SQL sync caught:', err);
      }
    };


    syncWithDatabase();

    // Periodic sync every 8 seconds to synchronize across all devices at the event
    const interval = setInterval(syncWithDatabase, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Modal states
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<ConsumptionRecipient | null>(null);

  // Database Connection Health State
  const [dbStatus, setDbStatus] = useState<DatabaseHealthStatus | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const handleCheckDbHealth = useCallback(async () => {
    setIsCheckingDb(true);
    try {
      const status = await checkDatabaseConnection();
      setDbStatus(status);
    } catch (e) {
      setDbStatus({
        connected: false,
        message: 'Koneksi gagal diperiksa',
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    } finally {
      setIsCheckingDb(false);
    }
  }, []);

  useEffect(() => {
    handleCheckDbHealth();
    // Re-check DB health periodically every 20 seconds
    const dbInterval = setInterval(handleCheckDbHealth, 20000);
    return () => clearInterval(dbInterval);
  }, [handleCheckDbHealth]);

  // Save recipients to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECIPIENTS, JSON.stringify(recipients));
    } catch (e) {
      console.error('Failed to save recipients', e);
    }
  }, [recipients]);

  // Save to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(pickupRecords));
    } catch (e) {
      console.error('Failed to save pickup records', e);
    }
  }, [pickupRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }, [logs]);

  // Current session object
  const activeSession = useMemo(() => {
    return SESSIONS.find(s => s.key === activeSessionKey) || SESSIONS[4];
  }, [activeSessionKey]);

  // Trigger celebration confetti
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, []);

  // Check if session reached 100%
  const checkCompletion = useCallback((updatedRecords: Record<string, PickupRecord>) => {
    const stats = calculateSessionStats(INITIAL_RECIPIENTS, activeSessionKey, updatedRecords);
    if (stats.totalPortionsTarget > 0 && stats.percentageTaken === 100) {
      triggerCelebration();
    }
  }, [activeSessionKey, triggerCelebration]);

  // Toggle single pickup
  const handleTogglePickup = useCallback((recipient: ConsumptionRecipient, isTaken: boolean) => {
    const recordKey = `${recipient.id}_${activeSessionKey}`;
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;

    const updatedRecord: PickupRecord = {
      recipientId: recipient.id,
      sessionKey: activeSessionKey,
      isTaken,
      takenAt: isTaken ? timeString : undefined,
      takenBy: isTaken ? (recipient.picPengambilan || recipient.nama) : undefined,
      portionsTaken: isTaken ? recipient.qty : 0
    };

    const newRecords = {
      ...pickupRecords,
      [recordKey]: updatedRecord
    };

    setPickupRecords(newRecords);

    // Add log entry
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: `${timeString} (${now.toLocaleDateString('id-ID')})`,
      recipientId: recipient.id,
      recipientName: recipient.nama,
      sessionKey: activeSessionKey,
      action: isTaken ? 'TAKEN' : 'UNTAKEN',
      picPengambilan: recipient.picPengambilan || recipient.nama,
      qty: recipient.qty,
      operatorNotes: currentOperator ? `Petugas: ${currentOperator}` : undefined
    };
    setLogs(prev => [newLog, ...prev.slice(0, 150)]);

    // Persist to Cloud SQL PostgreSQL
    togglePickupInDb(
      recipient,
      activeSessionKey,
      isTaken,
      updatedRecord.takenAt,
      updatedRecord.takenBy,
      updatedRecord.portionsTaken,
      updatedRecord.notes,
      newLog
    ).catch(err => console.error('Error persisting toggle to Cloud SQL:', err));

    if (isTaken) {
      checkCompletion(newRecords);
    }
  }, [activeSessionKey, pickupRecords, checkCompletion]);

  // Batch pickup for a PIC
  const handleBatchTakePic = useCallback((picName: string, recipientIds: number[], takeAll: boolean) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
    const updatedRecords = { ...pickupRecords };
    const newLogEntries: LogEntry[] = [];
    const dbItems: {
      recipientId: number;
      sessionKey: string;
      isTaken: boolean;
      takenAt?: string;
      takenBy?: string;
      portionsTaken?: number;
      notes?: string;
    }[] = [];

    recipientIds.forEach(id => {
      const recipient = recipients.find(r => r.id === id);
      if (!recipient) return;

      const recordKey = `${id}_${activeSessionKey}`;
      const rec = {
        recipientId: id,
        sessionKey: activeSessionKey,
        isTaken: takeAll,
        takenAt: takeAll ? timeString : undefined,
        takenBy: takeAll ? picName : undefined,
        portionsTaken: takeAll ? recipient.qty : 0
      };

      updatedRecords[recordKey] = rec;
      dbItems.push(rec);

      newLogEntries.push({
        id: (Date.now() + Math.random()).toString(),
        timestamp: `${timeString} (${now.toLocaleDateString('id-ID')})`,
        recipientId: id,
        recipientName: recipient.nama,
        sessionKey: activeSessionKey,
        action: takeAll ? 'TAKEN' : 'UNTAKEN',
        picPengambilan: picName,
        qty: recipient.qty,
        operatorNotes: `Kolektif PIC ${picName}`
      });
    });

    setPickupRecords(updatedRecords);
    setLogs(prev => [...newLogEntries, ...prev.slice(0, 150)]);

    // Persist batch to Cloud SQL PostgreSQL
    batchPickupInDb(dbItems, newLogEntries).catch(err =>
      console.error('Error persisting batch to Cloud SQL:', err)
    );

    if (takeAll) {
      checkCompletion(updatedRecords);
    }
  }, [activeSessionKey, pickupRecords, checkCompletion]);

  // Quick mark from Scan Modal
  const handleQuickMarkTaken = useCallback((
    recipient: ConsumptionRecipient,
    takenBy: string,
    notes: string
  ) => {
    const recordKey = `${recipient.id}_${activeSessionKey}`;
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;

    const updatedRecord: PickupRecord = {
      recipientId: recipient.id,
      sessionKey: activeSessionKey,
      isTaken: true,
      takenAt: timeString,
      takenBy: takenBy || recipient.picPengambilan || recipient.nama,
      portionsTaken: recipient.qty,
      notes: notes || undefined
    };

    const newRecords = {
      ...pickupRecords,
      [recordKey]: updatedRecord
    };

    setPickupRecords(newRecords);

    // Add log
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: `${timeString} (${now.toLocaleDateString('id-ID')})`,
      recipientId: recipient.id,
      recipientName: recipient.nama,
      sessionKey: activeSessionKey,
      action: 'TAKEN',
      picPengambilan: takenBy || recipient.picPengambilan || recipient.nama,
      qty: recipient.qty,
      operatorNotes: notes || 'Scan Cepat'
    };
    setLogs(prev => [newLog, ...prev.slice(0, 150)]);

    // Persist to Cloud SQL PostgreSQL
    togglePickupInDb(
      recipient,
      activeSessionKey,
      true,
      updatedRecord.takenAt,
      updatedRecord.takenBy,
      updatedRecord.portionsTaken,
      updatedRecord.notes,
      newLog
    ).catch(err => console.error('Error persisting quick scan to Cloud SQL:', err));

    checkCompletion(newRecords);
  }, [activeSessionKey, pickupRecords, checkCompletion]);

  // Save manual edit
  const handleSaveEdit = useCallback((record: PickupRecord) => {
    const recordKey = `${record.recipientId}_${record.sessionKey}`;
    const newRecords = {
      ...pickupRecords,
      [recordKey]: record
    };
    setPickupRecords(newRecords);

    const recipient = recipients.find(r => r.id === record.recipientId);
    let newLog: LogEntry | undefined;
    if (recipient) {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
      newLog = {
        id: Date.now().toString(),
        timestamp: `${timeString} (${now.toLocaleDateString('id-ID')})`,
        recipientId: recipient.id,
        recipientName: recipient.nama,
        sessionKey: record.sessionKey,
        action: record.isTaken ? 'TAKEN' : 'UNTAKEN',
        picPengambilan: record.takenBy || recipient.picPengambilan || recipient.nama,
        qty: record.portionsTaken ?? recipient.qty,
        operatorNotes: record.notes ? `Edit: ${record.notes}` : 'Edit rincian'
      };
      setLogs(prev => [newLog!, ...prev.slice(0, 150)]);
    }

    // Persist to Cloud SQL PostgreSQL
    updatePickupInDb(record, newLog).catch(err =>
      console.error('Error persisting edit to Cloud SQL:', err)
    );

    if (record.isTaken) {
      checkCompletion(newRecords);
    }
  }, [recipients, pickupRecords, checkCompletion]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    exportToCSV(recipients, activeSessionKey, pickupRecords, activeSession);
  }, [recipients, activeSessionKey, pickupRecords, activeSession]);

  // Apply CSV Import (Persists to Cloud SQL PostgreSQL and localStorage)
  const handleApplyImportRecipients = useCallback(async (
    newRecipients: ConsumptionRecipient[], 
    summaryMsg: string,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    setRecipients(newRecipients);
    try {
      localStorage.setItem(STORAGE_KEY_RECIPIENTS, JSON.stringify(newRecipients));
    } catch (e) {
      console.error('Error saving recipients to localStorage:', e);
    }
    
    // Add audit log for data import
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
    const importLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: `${timeString} (${now.toLocaleDateString('id-ID')})`,
      recipientId: 0,
      recipientName: 'PEMBARUAN DATA CSV',
      sessionKey: activeSessionKey,
      action: 'TAKEN',
      picPengambilan: currentOperator || 'Admin Logistik',
      qty: newRecipients.length,
      operatorNotes: summaryMsg
    };
    setLogs(prev => [importLog, ...prev.slice(0, 150)]);

    // Persist directly to Cloud SQL PostgreSQL
    try {
      const persisted = await batchSaveRecipientsToDb(newRecipients, mode);
      if (persisted && persisted.length > 0) {
        setRecipients(persisted);
      }
    } catch (err) {
      console.error('Failed to persist recipients to Cloud SQL database:', err);
    }
  }, [activeSessionKey, currentOperator]);

  // Reset recipients to factory default (122 recipients in DB & local)
  const handleResetRecipientsToDefault = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY_RECIPIENTS);
    setRecipients(INITIAL_RECIPIENTS);
    try {
      const resetList = await resetRecipientsInDb();
      if (resetList && resetList.length > 0) {
        setRecipients(resetList);
      }
    } catch (err) {
      console.error('Failed to reset recipients in Cloud SQL:', err);
    }
  }, []);


  // Reset confirmation
  const handleResetData = useCallback(() => {
    if (window.confirm('Apakah Anda yakin ingin mereset seluruh status pengambilan konsumsi ke kondisi awal?')) {
      localStorage.removeItem(STORAGE_KEY_RECORDS);
      localStorage.removeItem(STORAGE_KEY_LOGS);
      setPickupRecords({});
      setLogs([]);
      resetPickupsInDb().catch(err => console.error('Error resetting database:', err));
    }
  }, []);

  // Clear logs handler
  const handleClearLogs = useCallback(() => {
    setLogs([]);
    clearLogsInDb().catch(err => console.error('Error clearing logs in database:', err));
  }, []);

  // If not authenticated, display login & security gate
  if (!isAuthenticated) {
    return <LoginGate onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        activeSession={activeSession}
        currentOperator={currentOperator}
        onSaveOperator={handleSaveOperator}
        onLogout={handleLogout}
        onOpenQuickScan={() => setIsQuickScanOpen(true)}
        onOpenLogs={() => setIsAuditLogOpen(true)}
        onOpenPrint={() => setIsPrintOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenImportCSV={() => setIsImportCSVOpen(true)}
        onResetData={handleResetData}
        dbStatus={dbStatus}
        isCheckingDb={isCheckingDb}
        onOpenDbModal={() => setIsDbModalOpen(true)}
      />

      {/* Meal Sessions Tabs */}
      <SessionSelector
        sessions={SESSIONS}
        activeSessionKey={activeSessionKey}
        onSelectSession={(key) => {
          setActiveSessionKey(key);
          if (activeView === 'summary') {
            setActiveView('list');
          }
        }}
        recipients={recipients}
        pickupRecords={pickupRecords}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        {/* Active Session Overview & Metrics */}
        {activeView !== 'summary' && (
          <StatsCards
            session={activeSession}
            recipients={recipients}
            pickupRecords={pickupRecords}
            onBatchPickupClick={() => setActiveView('picGroups')}
          />
        )}

        {/* Dynamic Views */}
        {activeView === 'list' && (
          <RecipientList
            session={activeSession}
            recipients={recipients}
            pickupRecords={pickupRecords}
            onTogglePickup={handleTogglePickup}
            onOpenEditModal={(recipient) => setEditingRecipient(recipient)}
          />
        )}

        {activeView === 'picGroups' && (
          <PicGroupingView
            session={activeSession}
            recipients={recipients}
            pickupRecords={pickupRecords}
            onBatchTakePic={handleBatchTakePic}
          />
        )}

        {activeView === 'summary' && (
          <OverallSummary
            sessions={SESSIONS}
            recipients={recipients}
            pickupRecords={pickupRecords}
            onSelectSession={(key) => {
              setActiveSessionKey(key);
              setActiveView('list');
            }}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-700">Sistem Monitoring Konsumsi & Distribusi Logistik</span>
            <span className="mx-1.5">•</span>
            <span>Total {recipients.length} Penerima Panitia & Eksternal</span>
          </div>
          <div className="text-slate-400">
            Dikelola oleh Tim Konsumsi & Logistik Honda Bikers Day
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuickPickupModal
        isOpen={isQuickScanOpen}
        onClose={() => setIsQuickScanOpen(false)}
        session={activeSession}
        recipients={recipients}
        pickupRecords={pickupRecords}
        onMarkTaken={handleQuickMarkTaken}
      />

      <EditPickupModal
        isOpen={!!editingRecipient}
        onClose={() => setEditingRecipient(null)}
        recipient={editingRecipient}
        session={activeSession}
        pickupRecord={
          editingRecipient
            ? pickupRecords[`${editingRecipient.id}_${activeSessionKey}`]
            : undefined
        }
        onSave={handleSaveEdit}
      />

      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        logs={logs}
        onClearLogs={handleClearLogs}
      />

      <PrintReportModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        session={activeSession}
        recipients={recipients}
        pickupRecords={pickupRecords}
      />

      <ImportCsvModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
        recipients={recipients}
        onApplyRecipients={handleApplyImportRecipients}
        onResetToDefault={handleResetRecipientsToDefault}
      />

      <DatabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        status={dbStatus}
        isLoading={isCheckingDb}
        onRefresh={handleCheckDbHealth}
      />
    </div>
  );
}
