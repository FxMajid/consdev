import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  User, 
  LogIn, 
  AlertCircle, 
  UtensilsCrossed, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface LoginGateProps {
  onAuthenticate: (operatorName: string) => void;
}

const PRESET_ROLES = [
  'Pos Konsumsi Utama',
  'Pos Pintu Masuk / Registrasi',
  'Pos Loading Dock',
  'Pos VIP & Pengisi Acara',
  'Koordinator Lapangan'
];

// Accepted access PINs (case-insensitive)
const VALID_PINS = ['1234', 'HBD2024', 'KONSUMSI', 'ADMIN', 'LOGISTIK'];

export const LoginGate: React.FC<LoginGateProps> = ({ onAuthenticate }) => {
  const [operatorName, setOperatorName] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPin = pin.trim().toUpperCase();
    const cleanName = operatorName.trim();

    if (!cleanName) {
      setErrorMsg('Silakan pilih atau masukkan Nama Petugas / Pos Anda.');
      return;
    }

    if (!VALID_PINS.includes(cleanPin)) {
      setErrorMsg('Kode akses / PIN Panitia salah. (Gunakan PIN default: 1234 atau HBD2024)');
      return;
    }

    // Success!
    if (rememberMe) {
      localStorage.setItem('hbd_auth_authenticated_v1', 'true');
    }
    onAuthenticate(cleanName);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      const res = await signInWithPopup(auth, googleAuthProvider);
      if (res.user) {
        const name = res.user.displayName || res.user.email?.split('@')[0] || 'Petugas Google';
        if (rememberMe) {
          localStorage.setItem('hbd_auth_authenticated_v1', 'true');
        }
        onAuthenticate(name);
      }
    } catch (err: any) {
      console.warn('Google sign-in gate:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setGoogleError('Domain Vercel belum di-whitelist di Firebase. Gunakan Opsi 1 (PIN Panitia) di bawah untuk akses langsung.');
      } else if (err.code === 'auth/popup-blocked') {
        setGoogleError('Popup login diblokir browser (Brave / Safari). Gunakan Opsi 1 (PIN Panitia) di bawah.');
      } else {
        setGoogleError(err.message || 'Gagal login dengan Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-red-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Banner Brand Header */}
        <div className="relative p-6 sm:p-7 border-b border-slate-800/80 bg-gradient-to-b from-red-600/15 via-red-950/10 to-transparent text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-xl shadow-red-900/40 mb-3 border border-red-400/30">
            <UtensilsCrossed className="w-7 h-7 text-white" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            HBD LOGISTIK EVENT SYSTEM
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Autentikasi Petugas Pos
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Sistem monitoring & serah terima konsumsi tertutup khusus panitia bertugas.
          </p>
        </div>

        {/* Auth Body */}
        <div className="p-6 space-y-5">
          {/* Opsi 1: Form Akses Cepat Petugas & PIN */}
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-red-400" />
                Nama Petugas / Nama Pos Bertugas
              </label>
              <input
                id="input-operator-name"
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Misal: Akhfadlin / Pos 1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                autoFocus
              />

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setOperatorName(role)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      operatorName === role
                        ? 'bg-red-600/30 text-red-200 border-red-500'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700/60'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-red-400" />
                  PIN Akses Panitia
                </label>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  PIN Default: <strong className="text-slate-200">1234</strong>
                </span>
              </div>
              <input
                id="input-pin-code"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN (1234 atau HBD2024)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors tracking-widest"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Remember Me Option */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Dashboard Konsumsi
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold absolute">
              atau
            </span>
          </div>

          {/* Opsi 2: Google Login Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {isGoogleLoading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}
            </button>

            {googleError && (
              <p className="mt-2 text-[11px] text-amber-300/90 leading-tight">
                {googleError}
              </p>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3.5 bg-slate-950/70 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            Data tersinkronisasi real-time ke Cloud PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
};
