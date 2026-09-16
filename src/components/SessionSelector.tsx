import React from 'react';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo, SessionKey } from '../types';
import { calculateSessionStats } from '../utils/consumptionUtils';

interface SessionSelectorProps {
  sessions: SessionInfo[];
  activeSessionKey: SessionKey;
  onSelectSession: (key: SessionKey) => void;
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  activeSessionKey,
  onSelectSession,
  recipients,
  pickupRecords
}) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Pilih Sesi Konsumsi (Total 7 Sesi Jadwal)</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Pilih sesi untuk melihat daftar & rekap distribusi
          </span>
        </div>

        {/* Horizontal scrollable session chips */}
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {sessions.map((session) => {
            const isActive = session.key === activeSessionKey;
            const stats = calculateSessionStats(recipients, session.key, pickupRecords);
            const isFinished = stats.totalPortionsTarget > 0 && stats.percentageTaken === 100;

            return (
              <button
                key={session.key}
                id={`session-tab-${session.key}`}
                onClick={() => onSelectSession(session.key)}
                className={`flex-shrink-0 text-left rounded-xl px-3.5 py-2.5 border transition-all duration-150 cursor-pointer min-w-[170px] sm:min-w-[190px] relative ${
                  isActive
                    ? 'bg-red-50/90 border-red-500 shadow-xs ring-2 ring-red-500/20'
                    : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isActive ? 'text-red-700' : 'text-slate-800'
                    }`}
                  >
                    {session.shortLabel}
                  </span>
                  {isFinished ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                      100%
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-red-200/70 text-red-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {stats.percentageTaken}%
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <div className="flex items-center text-slate-500 text-[10px]">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    <span>{session.timeEstimate}</span>
                  </div>
                  <div className="font-semibold text-slate-800 text-[11px]">
                    <span className="text-emerald-600 font-bold">{stats.totalPortionsTaken}</span>
                    <span className="text-slate-400">/{stats.totalPortionsTarget}</span>
                    <span className="text-[9px] text-slate-400 ml-0.5">porsi</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isFinished
                        ? 'bg-emerald-500'
                        : isActive
                        ? 'bg-red-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, stats.percentageTaken)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
