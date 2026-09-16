import React from 'react';
import { 
  PackageCheck, 
  PackageX, 
  Users, 
  TrendingUp, 
  Info,
  CalendarCheck2
} from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo, SessionKey } from '../types';
import { calculateSessionStats } from '../utils/consumptionUtils';

interface StatsCardsProps {
  session: SessionInfo;
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
  onBatchPickupClick: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  session,
  recipients,
  pickupRecords,
  onBatchPickupClick
}) => {
  const stats = calculateSessionStats(recipients, session.key, pickupRecords);

  // Calculate unique PIC count for this session
  const activePics = new Set<string>();
  recipients.forEach(r => {
    if (r.makan === 'YES' && r.schedule[session.key]?.hadir) {
      if (r.picPengambilan && r.picPengambilan !== 'mobile' && r.picPengambilan !== '-') {
        activePics.add(r.picPengambilan);
      }
    }
  });

  return (
    <div className="space-y-4">
      {/* Session Title & Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1">
              <CalendarCheck2 className="w-3 h-3" />
              {session.dateLabel}
            </span>
            <span className="text-slate-300 text-xs font-medium">
              Waktu Distribusi: {session.timeEstimate}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            {session.label}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl flex items-center gap-1.5">
            <Info className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{session.description}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-trigger-batch-pic"
            onClick={onBatchPickupClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-red-950/40 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Pengambilan Kolektif per PIC</span>
          </button>
        </div>
      </div>

      {/* 4 Core Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Target Kebutuhan Porsi */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Target Porsi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.totalPortionsTarget}
            </span>
            <span className="text-xs font-medium text-slate-500">Porsi Box</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari <span className="font-semibold text-slate-700">{stats.totalEligiblePeople} entri/grup</span> penerima hadir
          </p>
        </div>

        {/* Card 2: Sudah Diambil */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Sudah Diambil</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {stats.totalPortionsTaken}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              ({stats.percentageTaken}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-1">
            <span className="font-semibold">{stats.completedPickupsCount} transaksi/penerima</span> telah diverifikasi
          </p>
        </div>

        {/* Card 3: Belum Diambil (Sisa) */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Belum Diambil</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {stats.totalPortionsRemaining}
            </span>
            <span className="text-xs font-medium text-amber-800">Porsi Sisa</span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">
            <span className="font-semibold">{stats.pendingPickupsCount} entri/grup</span> masih menunggu diambil
          </p>
        </div>

        {/* Card 4: PIC Penanggung Jawab */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">PIC Bertanggung Jawab</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {activePics.size}
            </span>
            <span className="text-xs font-medium text-slate-500">Koordinator PIC</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Pengambilan kolektif divisi panitia & eksternal
          </p>
        </div>
      </div>
    </div>
  );
};
