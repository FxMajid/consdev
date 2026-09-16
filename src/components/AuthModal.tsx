import React, { useState } from 'react';
import { X, User, ShieldCheck, LogIn, LogOut, AlertCircle, Check, Info } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOperator: string;
  onSaveOperator: (name: string) => void;
  firebaseUser: FirebaseUser | null;
  onGoogleSignIn: () => Promise<{ success: boolean; error?: string }>;
  onGoogleSignOut: () => Promise<void>;
}

const PRESET_ROLES = [
  'Pos Konsumsi Utama',
  'Pos Loading Dock',
  'Pos Pintu Masuk / Registrasi',
  'Pos VIP & Pengisi Acara',
  'Koordinator Konsumsi'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentOperator,
  onSaveOperator,
  firebaseUser,
  onGoogleSignIn,
  onGoogleSignOut
}) => {
  const [operatorInput, setOperatorInput] = useState(currentOperator || '');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (operatorInput.trim()) {
      onSaveOperator(operatorInput.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    }
  };

  const handlePresetSelect = (preset: string) => {
    setOperatorInput(preset);
  };

  const handleGoogleAuth = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    const result = await onGoogleSignIn();
    setIsSigningIn(false);
    if (!result.success && result.error) {
      setAuthError(result.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Identitas Petugas Pos Konsumsi</h3>
              <p className="text-xs text-slate-400">Pilih pos atau login agar nama tercatat pada riwayat serah terima</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Petugas Aktif */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
                {(currentOperator || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Petugas Saat Ini</span>
                <span className="text-sm font-bold text-white">
                  {currentOperator || 'Belum diatur (Default Pos)'}
                </span>
              </div>
            </div>
            {currentOperator && (
              <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" /> Aktif
              </span>
            )}
          </div>

          {/* Opsi 1: Set Nama Petugas Lapangan Cepat */}
          <form onSubmit={handleSaveLocal} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-400" />
                Nama Petugas / Pos Anda
              </label>
              <span className="text-[11px] text-slate-400">Bisa diubah kapan saja</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                placeholder="Contoh: Akhfadlin / Pos 1"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-red-500 transition-colors"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : 'Simpan'}
              </button>
            </div>

            {/* Quick preset buttons */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Pilihan Cepat Pos:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handlePresetSelect(role)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      operatorInput === role
                        ? 'bg-red-600/30 text-red-200 border-red-500'
                        : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-700/60'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Separator */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold absolute">
              atau Login Google (Opsional)
            </span>
          </div>

          {/* Opsi 2: Google Sign-in */}
          <div className="space-y-3">
            {firebaseUser ? (
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{firebaseUser.displayName || 'Akun Google'}</div>
                    <div className="text-[11px] text-slate-400">{firebaseUser.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignOut}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSigningIn}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                {isSigningIn ? 'Menghubungkan ke Google...' : 'Masuk dengan Akun Google'}
              </button>
            )}

            {/* Error handling message if popup fails */}
            {authError && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Gagal Membuka Popup Google Auth
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  {authError.includes('unauthorized-domain')
                    ? 'Domain Vercel ini belum ditambahkan ke daftar "Authorized Domains" di Firebase Console.'
                    : authError.includes('popup-blocked')
                    ? 'Popup diblokir oleh browser (terutama di Brave Browser). Izinkan popup untuk website ini.'
                    : authError}
                </p>
                <div className="pt-1 text-[11px] text-amber-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Cukup gunakan <strong>Nama Petugas / Pos</strong> di atas untuk langsung mencatat serah terima tanpa login Google.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
