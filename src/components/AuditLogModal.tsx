import React from 'react';
import { X, History, CheckCircle2, RotateCcw, Clock, Trash2 } from 'lucide-react';
import { LogEntry } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <History className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Log Riwayat Check-in Konsumsi</h3>
              <p className="text-xs text-slate-400">
                Pencatatan real-time seluruh aktivitas pengambilan konsumsi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 text-xs">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>Belum ada riwayat aktivitas check-in.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    {log.action === 'TAKEN' ? (
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {log.recipientName}
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        <span>Status: </span>
                        <strong className={log.action === 'TAKEN' ? 'text-emerald-700' : 'text-amber-700'}>
                          {log.action === 'TAKEN' ? 'Diambil' : 'Dibatalkan'}
                        </strong>
                        <span className="mx-1">•</span>
                        <span>PIC: {log.picPengambilan}</span>
                        <span className="mx-1">•</span>
                        <span className="font-semibold text-slate-800">{log.qty} Porsi</span>
                      </div>
                      {log.operatorNotes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          Ket: {log.operatorNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {log.timestamp}
                    </span>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 text-[10px]">
                      {log.sessionKey}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Bersihkan Log
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
