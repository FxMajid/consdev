import React from 'react';
import { Database, CheckCircle2, AlertTriangle, XCircle, RefreshCw, X, Server, ExternalLink, ShieldCheck } from 'lucide-react';
import { DatabaseHealthStatus } from '../services/api';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DatabaseHealthStatus | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  isLoading,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="database-status-modal-content"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${status?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Status Database Supabase
              </h2>
              <p className="text-xs text-slate-400">Pemeriksaan koneksi cloud PostgreSQL</p>
            </div>
          </div>
          <button
            id="btn-close-db-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Main Status Badge Card */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            status?.connected 
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
              : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
          }`}>
            {status?.connected ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base">
                {status?.connected 
                  ? 'Sistem Terhubung ke Database Supabase' 
                  : 'Sistem Belum Terhubung ke Database Supabase'}
              </h3>
              <p className="text-xs mt-1 text-slate-300 leading-relaxed">
                {status?.connected 
                  ? 'Data pengambilan, kuota porsi, riwayat audit, dan daftar penerima tersinkronisasi realtime ke Cloud Database.' 
                  : (status?.message || 'Server API tidak dapat terhubung ke database. Sistem saat ini berjalan dalam mode Cache Lokal browser.')}
              </p>
              {status?.error && (
                <div className="mt-2.5 p-2.5 bg-black/40 rounded-lg text-xs font-mono text-rose-300 border border-rose-900/50 break-all">
                  Detail Error: {status.error}
                </div>
              )}
            </div>
          </div>

          {/* Connection Details Table */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 divide-y divide-slate-700/40 text-xs">
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Tipe Database
              </span>
              <span className="font-medium text-slate-200">Supabase (PostgreSQL 15+)</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Database Name</span>
              <span className="font-mono text-slate-200">{status?.dbName || 'postgres'}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Database User</span>
              <span className="font-mono text-slate-200">{status?.dbUser || 'postgres'}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Latency / Respon Ping</span>
              <span className={`font-mono font-semibold ${
                (status?.latencyMs || 0) < 300 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-slate-400">Waktu Pengecekan</span>
              <span className="text-slate-300">{status?.timestamp || '-'}</span>
            </div>
          </div>

          {/* Guide Note if Disconnected */}
          {!status?.connected && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3.5 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Catatan Konfigurasi Vercel:
              </div>
              <p className="text-slate-300">
                Pastikan Environment Variable <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-200 font-mono">DATABASE_URL</code> sudah ditambahkan di dashboard Vercel pada menu <strong className="text-white">Settings ➡️ Environment Variables</strong> dengan Connection String dari Supabase.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-800/40 border-t border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Mode aman offline-first aktif
          </span>
          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-db-status"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Memeriksa...' : 'Tes Ulang Koneksi'}
            </button>
            <button
              id="btn-close-db-modal-bottom"
              onClick={onClose}
              className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
