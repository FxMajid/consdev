import React from 'react';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Building
} from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo, SessionKey } from '../types';
import { calculateSessionStats } from '../utils/consumptionUtils';

interface OverallSummaryProps {
  sessions: SessionInfo[];
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
  onSelectSession: (key: SessionKey) => void;
}

export const OverallSummary: React.FC<OverallSummaryProps> = ({
  sessions,
  recipients,
  pickupRecords,
  onSelectSession
}) => {
  // Aggregate stats across all sessions
  let grandTotalTarget = 0;
  let grandTotalTaken = 0;

  const sessionAggregates = sessions.map(session => {
    const stats = calculateSessionStats(recipients, session.key, pickupRecords);
    grandTotalTarget += stats.totalPortionsTarget;
    grandTotalTaken += stats.totalPortionsTaken;
    return {
      session,
      stats
    };
  });

  const grandRemaining = Math.max(0, grandTotalTarget - grandTotalTaken);
  const grandPercent = grandTotalTarget > 0 ? Math.round((grandTotalTaken / grandTotalTarget) * 100) : 0;

  // Internal vs Eksternal overall breakdown
  let internalTarget = 0;
  let eksternalTarget = 0;

  sessions.forEach(session => {
    recipients.forEach(r => {
      if (r.makan === 'YES' && r.schedule[session.key]?.hadir) {
        if (r.kategori === 'Internal') {
          internalTarget += r.qty;
        } else {
          eksternalTarget += r.qty;
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              REKAPITULASI KESELURUHAN ACARA
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2">
              Statistik & Pemenuhan Konsumsi Seluruh Sesi HBD
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Memantau pemenuhan kuota konsumsi panitia dan eksternal mulai dari H-2 persiapan hingga H+1 penutupan dan bongkaran.
            </p>
          </div>

          {/* Grand Stats Chips */}
          <div className="flex items-center gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Total Jatah Event
              </span>
              <span className="text-2xl font-black text-white">{grandTotalTarget}</span>
              <span className="text-xs text-slate-400 ml-1">Porsi</span>
            </div>
            <div className="h-8 w-px bg-slate-700 mx-1" />
            <div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
                Telah Terdistribusi
              </span>
              <span className="text-2xl font-black text-emerald-400">{grandTotalTaken}</span>
              <span className="text-xs text-emerald-500/80 ml-1">({grandPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal vs Eksternal Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              Konsumsi Panitia Internal
            </span>
            <span className="text-xs font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
              {internalTarget} Total Porsi
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Mencakup divisi Main Dealer, AM Retail, Pijar Dealer/Retail, LO, Stage, Registrasi, Perlengkapan, dan Konsumsi.
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-purple-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Konsumsi Eksternal & Mitra
            </span>
            <span className="text-xs font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
              {eksternalTarget} Total Porsi
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Mencakup Komunitas Bikers (50 pax), Kepolisian (50 pax), Keamanan lokal & parkir (40 pax), Relawan, Medis, UPTD, dan Damkar.
          </p>
        </div>
      </div>

      {/* Sessions Table Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-600" />
            Matriks Distribusi Konsumsi per Sesi Jadwal
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Klik pada baris atau tombol untuk beralih langsung ke daftar distribusi sesi tersebut.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Sesi & Waktu</th>
                <th className="py-3 px-4">Fase Jadwal</th>
                <th className="py-3 px-4 text-center">Penerima Hadir</th>
                <th className="py-3 px-4 text-center">Target Porsi</th>
                <th className="py-3 px-4 text-center">Sudah Diambil</th>
                <th className="py-3 px-4 text-center">Belum Diambil</th>
                <th className="py-3 px-4 w-48">Progress Pemenuhan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionAggregates.map(({ session, stats }) => {
                const isComplete = stats.totalPortionsTarget > 0 && stats.percentageTaken === 100;

                return (
                  <tr
                    key={session.key}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onSelectSession(session.key)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {session.label}
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{session.timeEstimate}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {session.dateLabel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {stats.totalEligiblePeople} rombongan
                    </td>

                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 text-sm">
                      {stats.totalPortionsTarget} porsi
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {stats.totalPortionsTaken} porsi
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                      {stats.totalPortionsRemaining} porsi
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-700">{stats.percentageTaken}%</span>
                        {isComplete && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                            Selesai
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stats.percentageTaken}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(session.key);
                        }}
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span>Pantau</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
