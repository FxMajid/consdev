import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Building,
  Layers,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
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
  const [chartMetric, setChartMetric] = useState<'portions' | 'rate'>('portions');

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

  // Chart dataset for Recharts
  const chartData = useMemo(() => {
    return sessions.map(session => {
      const stats = calculateSessionStats(recipients, session.key, pickupRecords);
      return {
        key: session.key,
        name: session.shortLabel || session.label,
        fullName: session.label,
        date: session.dateLabel,
        time: session.timeEstimate,
        target: stats.totalPortionsTarget,
        taken: stats.totalPortionsTaken,
        remaining: stats.totalPortionsRemaining,
        rate: stats.percentageTaken,
        eligiblePeople: stats.totalEligiblePeople
      };
    });
  }, [sessions, recipients, pickupRecords]);

  // Insights from data
  const peakSession = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.target - a.target)[0];
  }, [chartData]);

  const mostTakenSession = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.taken - a.taken)[0];
  }, [chartData]);

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

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[220px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-bold text-sm text-white">{data.fullName}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {data.date}
            </span>
          </div>
          <div className="text-slate-400 text-[11px] mb-2.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Estimasi: {data.time}</span>
          </div>

          <div className="space-y-1.5 border-t border-slate-800 pt-2 text-[11px]">
            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-400">Target Alokasi:</span>
              <span className="font-bold text-white">{data.target} porsi</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Sudah Diambil:
              </span>
              <span className="font-bold text-emerald-400">{data.taken} porsi ({data.rate}%)</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Belum Diambil:
              </span>
              <span className="font-bold text-amber-400">{data.remaining} porsi</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-slate-300 pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Penerima Hadir:</span>
              <span className="font-semibold text-slate-200">{data.eligiblePeople} rombongan</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-red-400 flex items-center justify-center gap-1">
            <span>Klik batang grafik untuk buka sesi ini</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>
      );
    }
    return null;
  };

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

      {/* Recharts Bar Chart: Tren Pengambilan Konsumsi per Sesi */}
      <div id="consumption-trend-chart-card" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header with Title & Metric Toggle */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Tren Pengambilan Konsumsi per Sesi
                </h3>
                <p className="text-xs text-slate-500">
                  Perbandingan target alokasi kuota vs realisasi porsi yang telah diambil di setiap sesi acara
                </p>
              </div>
            </div>
          </div>

          {/* Metric Selector Controls */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            <button
              type="button"
              id="btn-metric-portions"
              onClick={() => setChartMetric('portions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMetric === 'portions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Jumlah Porsi</span>
            </button>
            <button
              type="button"
              id="btn-metric-rate"
              onClick={() => setChartMetric('rate')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                chartMetric === 'rate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>% Pemenuhan</span>
            </button>
          </div>
        </div>

        {/* Legend / Quick Indicators */}
        <div className="px-4 sm:px-6 pt-4 pb-1 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {chartMetric === 'portions' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-400" />
                  <span className="text-slate-600 font-medium">Target Alokasi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-slate-700 font-bold">Sudah Diambil (Tersalurkan)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-400" />
                  <span className="text-slate-600 font-medium">Sisa Belum Diambil</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-700 font-medium">Persentase Pengambilan per Sesi (%)</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            💡 Tips: Klik batang grafik sesi mana pun untuk langsung membuka detail distribusinya.
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="p-2 sm:p-4 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
              onClick={(state: any) => {
                if (state?.activePayload?.[0]?.payload?.key) {
                  const clickedKey = state.activePayload[0].payload.key as SessionKey;
                  onSelectSession(clickedKey);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={45}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={chartMetric === 'rate' ? [0, 100] : [0, 'auto']}
                unit={chartMetric === 'rate' ? '%' : ''}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} 
              />
              {chartMetric === 'portions' ? (
                <>
                  <Bar 
                    dataKey="target" 
                    name="Target Alokasi" 
                    fill="#94a3b8" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={38}
                  />
                  <Bar 
                    dataKey="taken" 
                    name="Sudah Diambil" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={38}
                  />
                  <Bar 
                    dataKey="remaining" 
                    name="Belum Diambil" 
                    fill="#fbbf24" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={38}
                  />
                </>
              ) : (
                <Bar 
                  dataKey="rate" 
                  name="% Pemenuhan" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={48}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.rate === 100 
                          ? '#059669' 
                          : entry.rate >= 50 
                            ? '#10b981' 
                            : entry.rate > 0 
                              ? '#f59e0b' 
                              : '#cbd5e1'
                      } 
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insight Badges Under Chart */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
              MAX
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Target Terbesar</div>
              <div className="text-xs font-bold text-slate-800">
                {peakSession ? `${peakSession.fullName} (${peakSession.target} porsi)` : '-'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Pengambilan Terbanyak</div>
              <div className="text-xs font-bold text-slate-800">
                {mostTakenSession ? `${mostTakenSession.fullName} (${mostTakenSession.taken} porsi)` : '-'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              AVG
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Rata-Rata Pemenuhan</div>
              <div className="text-xs font-bold text-slate-800">
                {grandPercent}% ({grandTotalTaken} dari {grandTotalTarget} porsi)
              </div>
            </div>
          </div>
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
