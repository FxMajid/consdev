import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Download, 
  Upload,
  Printer, 
  History, 
  ScanLine, 
  RotateCcw,
  Users,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';
import { SessionInfo } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  activeView: 'list' | 'picGroups' | 'summary';
  setActiveView: (view: 'list' | 'picGroups' | 'summary') => void;
  activeSession: SessionInfo;
  currentOperator: string;
  onSaveOperator: (name: string) => void;
  onLogout?: () => void;
  onOpenQuickScan: () => void;
  onOpenLogs: () => void;
  onOpenPrint: () => void;
  onExportCSV: () => void;
  onOpenImportCSV: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  activeSession,
  currentOperator,
  onSaveOperator,
  onLogout,
  onOpenQuickScan,
  onOpenLogs,
  onOpenPrint,
  onExportCSV,
  onOpenImportCSV,
  onResetData
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && !currentOperator) {
        const name = user.displayName || user.email?.split('@')[0] || '';
        if (name) onSaveOperator(name);
      }
    });
    return () => unsubscribe();
  }, [currentOperator, onSaveOperator]);

  const handleGoogleSignIn = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        setCurrentUser(result.user);
        const name = result.user.displayName || result.user.email?.split('@')[0] || '';
        if (name) onSaveOperator(name);
        return { success: true };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Sign-in error:', err);
      return { 
        success: false, 
        error: err.code || err.message || 'Gagal login ke Google' 
      };
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-900/30">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  HBD LOGISTIK
                </span>
                <span className="text-xs text-slate-400">Event Monitoring System</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Monitoring Distribusi & Pengambilan Konsumsi
              </h1>
            </div>
          </div>

          {/* Navigation Views & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 flex items-center text-xs font-medium">
              <button
                id="btn-view-list"
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'list'
                    ? 'bg-red-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Daftar Penerima
              </button>
              <button
                id="btn-view-pic"
                onClick={() => setActiveView('picGroups')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeView === 'picGroups'
                    ? 'bg-red-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Kolektif per PIC
              </button>
              <button
                id="btn-view-summary"
                onClick={() => setActiveView('summary')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'summary'
                    ? 'bg-red-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Rekap Total Sesi
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-quick-scan"
                onClick={onOpenQuickScan}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="Pencarian cepat atau scan nomor ID penerima"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cari Cepat / ID</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Ekspor data sesi ini ke CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Ekspor CSV</span>
              </button>

              <button
                id="btn-import-csv"
                onClick={onOpenImportCSV}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                title="Impor atau perbarui data penerima konsumsi dari file CSV"
              >
                <Upload className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline">Impor CSV</span>
              </button>

              <button
                id="btn-print-report"
                onClick={onOpenPrint}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Cetak formulir tanda terima distribusi"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Cetak Slip</span>
              </button>

              <button
                id="btn-open-logs"
                onClick={onOpenLogs}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white p-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Log Riwayat Aktivitas Pengambilan"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                id="btn-reset-data"
                onClick={onResetData}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-300 p-2 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Reset status pengambilan ke default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Operator Sign-in status */}
              {currentOperator || currentUser ? (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer group"
                    title="Klik untuk ganti nama petugas / pos konsumsi"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300" />
                    <span className="text-[11px] text-slate-200 max-w-[120px] truncate font-medium">
                      {currentOperator || currentUser?.displayName || currentUser?.email?.split('@')[0]}
                    </span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors cursor-pointer"
                      title="Kunci Layar / Logout Petugas"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  title="Login atau Tentukan Nama Petugas Pos Konsumsi"
                >
                  <LogIn className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Login Petugas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operator & Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentOperator={currentOperator}
        onSaveOperator={onSaveOperator}
        firebaseUser={currentUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
      />
    </header>
  );
};

