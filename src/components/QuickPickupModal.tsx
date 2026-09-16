import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  MapPin, 
  Hash,
  ScanLine
} from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo } from '../types';
import { isEligibleForSession } from '../utils/consumptionUtils';

interface QuickPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionInfo;
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
  onMarkTaken: (recipient: ConsumptionRecipient, takenBy: string, notes: string) => void;
}

export const QuickPickupModal: React.FC<QuickPickupModalProps> = ({
  isOpen,
  onClose,
  session,
  recipients,
  pickupRecords,
  onMarkTaken
}) => {
  const [query, setQuery] = useState('');
  const [takerNameInput, setTakerNameInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const eligible = useMemo(() => {
    return recipients.filter(r => isEligibleForSession(r, session.key));
  }, [recipients, session.key]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return eligible.slice(0, 8); // show first few pending if empty

    const clean = query.trim().toLowerCase();
    return eligible.filter(r => {
      const matchId = String(r.id) === clean;
      const matchName = r.nama.toLowerCase().includes(clean);
      const matchPic = r.picPengambilan.toLowerCase().includes(clean);
      const matchArea = r.areaKerja.toLowerCase().includes(clean);
      const matchDivision = r.picHbd.toLowerCase().includes(clean);
      return matchId || matchName || matchPic || matchArea || matchDivision;
    });
  }, [eligible, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Mode Cepat / Scan Check-in ID
              </h3>
              <p className="text-xs text-slate-300">
                Sesi: <span className="font-semibold text-emerald-300">{session.label}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ketik No ID (misal: 25) atau nama PIC/penerima..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Nama Pengambil (Opsional):
              </label>
              <input
                type="text"
                placeholder="Kosongkan jika sesuai PIC default"
                value={takerNameInput}
                onChange={(e) => setTakerNameInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">
                Catatan Pengambilan (Opsional):
              </label>
              <input
                type="text"
                placeholder="Misal: Sudah lengkap, dibawa ke panggung"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Result List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Hasil Pencarian ({searchResults.length} ditemukan)
          </div>

          {searchResults.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Tidak ditemukan penerima dengan kata kunci tersebut di sesi ini.
            </div>
          ) : (
            searchResults.map(r => {
              const recordKey = `${r.id}_${session.key}`;
              const record = pickupRecords[recordKey];
              const isTaken = record?.isTaken || false;

              return (
                <div
                  key={r.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTaken ? 'opacity-80' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                        #{r.id}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{r.nama}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        {r.qty} Porsi
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-700">{r.picHbd}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-red-500" />
                        {r.areaKerja}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-slate-700 font-medium">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        PIC: {r.picPengambilan || r.nama}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isTaken ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Sudah Diambil ({record?.takenAt || 'OK'})
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onMarkTaken(
                            r,
                            takerNameInput.trim() || r.picPengambilan || r.nama,
                            notesInput.trim()
                          );
                          // clear optional inputs
                          setTakerNameInput('');
                          setNotesInput('');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verifikasi Ambil</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
