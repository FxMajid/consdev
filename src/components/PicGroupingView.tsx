import React, { useMemo } from 'react';
import { 
  UserCheck, 
  Users, 
  Phone, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  Package,
  Layers
} from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo } from '../types';
import { isEligibleForSession, generateWhatsAppLink } from '../utils/consumptionUtils';

interface PicGroupingViewProps {
  session: SessionInfo;
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
  onBatchTakePic: (picName: string, recipientIds: number[], takeAll: boolean) => void;
}

export const PicGroupingView: React.FC<PicGroupingViewProps> = ({
  session,
  recipients,
  pickupRecords,
  onBatchTakePic
}) => {
  // Group eligible recipients by PIC Penanggung Jawab
  const picGroups = useMemo(() => {
    const eligible = recipients.filter(r => isEligibleForSession(r, session.key));
    const groups: Record<
      string,
      {
        picName: string;
        kontakWa: string;
        areaKerja: string;
        recipients: ConsumptionRecipient[];
        totalPortionsTarget: number;
        totalPortionsTaken: number;
        isFullyTaken: boolean;
      }
    > = {};

    eligible.forEach(r => {
      const picKey = (r.picPengambilan && r.picPengambilan.trim() !== '' && r.picPengambilan !== 'mobile')
        ? r.picPengambilan.trim().toUpperCase()
        : (r.nama.trim().toUpperCase() + ' (MANDIRI)');

      if (!groups[picKey]) {
        groups[picKey] = {
          picName: r.picPengambilan && r.picPengambilan !== 'mobile' ? r.picPengambilan : r.nama,
          kontakWa: r.kontakWa,
          areaKerja: r.areaKerja,
          recipients: [],
          totalPortionsTarget: 0,
          totalPortionsTaken: 0,
          isFullyTaken: false
        };
      }

      // If kontakWa wasn't found before, update if this row has it
      if (!groups[picKey].kontakWa && r.kontakWa) {
        groups[picKey].kontakWa = r.kontakWa;
      }

      groups[picKey].recipients.push(r);
      groups[picKey].totalPortionsTarget += r.qty;

      const recordKey = `${r.id}_${session.key}`;
      const record = pickupRecords[recordKey];
      if (record && record.isTaken) {
        groups[picKey].totalPortionsTaken += (record.portionsTaken ?? r.qty);
      }
    });

    Object.values(groups).forEach(g => {
      g.isFullyTaken = g.totalPortionsTarget > 0 && g.totalPortionsTaken >= g.totalPortionsTarget;
    });

    // Sort by largest target portions first
    return Object.values(groups).sort((a, b) => b.totalPortionsTarget - a.totalPortionsTarget);
  }, [recipients, session.key, pickupRecords]);

  return (
    <div className="space-y-4">
      {/* Informational Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-red-600" />
            Distribusi Kolektif per PIC Penanggung Jawab ({picGroups.length} Koordinator)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cocok untuk antrean cepat di pos konsumsi. Anda dapat menandai pengambilan satu rombongan / divisi sekaligus.
          </p>
        </div>
      </div>

      {/* Grid of PIC Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {picGroups.map(group => {
          const recipientIds = group.recipients.map(r => r.id);
          const percent = group.totalPortionsTarget > 0 
            ? Math.round((group.totalPortionsTaken / group.totalPortionsTarget) * 100) 
            : 0;

          return (
            <div
              key={group.picName}
              id={`pic-card-${group.picName.replace(/\s+/g, '-').toLowerCase()}`}
              className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                group.isFullyTaken
                  ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                  : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      PIC Pengambilan
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{group.picName}</span>
                    </h4>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      Area: <strong className="text-slate-700">{group.areaKerja}</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                        group.isFullyTaken
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {group.isFullyTaken ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          LENGKAP
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          {group.totalPortionsTarget - group.totalPortionsTaken} Sisa
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Portions Progress */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-2.5">
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="text-slate-600 font-medium">Total Jatah Konsumsi:</span>
                    <span className="font-extrabold text-slate-900">
                      <span className="text-emerald-700 text-sm">{group.totalPortionsTaken}</span>
                      <span className="text-slate-400">/{group.totalPortionsTarget}</span> Porsi
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        group.isFullyTaken ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* List of Recipients under this PIC */}
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Anggota / Divisi ({group.recipients.length} grup):
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1 text-xs divide-y divide-slate-100">
                    {group.recipients.map(r => {
                      const recordKey = `${r.id}_${session.key}`;
                      const isTaken = pickupRecords[recordKey]?.isTaken;
                      return (
                        <div key={r.id} className="pt-1 flex items-center justify-between text-[11px]">
                          <div className="truncate pr-2">
                            <span className="font-medium text-slate-800">{r.nama}</span>
                            <span className="text-slate-400 text-[10px] block truncate">{r.picHbd}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="font-bold text-slate-700">{r.qty} porsi</span>
                            {isTaken ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                {group.kontakWa && (
                  <a
                    href={generateWhatsAppLink(
                      group.kontakWa,
                      group.picName,
                      group.picName,
                      group.areaKerja,
                      session,
                      group.totalPortionsTarget
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors cursor-pointer"
                    title="Kirim pesan WhatsApp pengingat ke PIC"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}

                {group.isFullyTaken ? (
                  <button
                    onClick={() => onBatchTakePic(group.picName, recipientIds, false)}
                    className="flex-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                  >
                    Batalkan Semua ({group.totalPortionsTarget} Porsi)
                  </button>
                ) : (
                  <button
                    onClick={() => onBatchTakePic(group.picName, recipientIds, true)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ambil Kolektif ({group.totalPortionsTarget} Porsi)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
