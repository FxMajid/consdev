import React from 'react';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo } from '../types';
import { isEligibleForSession, calculateSessionStats } from '../utils/consumptionUtils';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionInfo;
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  session,
  recipients,
  pickupRecords
}) => {
  if (!isOpen) return null;

  const eligible = recipients.filter(r => isEligibleForSession(r, session.key));
  const stats = calculateSessionStats(recipients, session.key, pickupRecords);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Toolbar (hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Pratinjau Lembar Distribusi & Tanda Terima
              </h3>
              <p className="text-xs text-slate-400">
                Format siap cetak untuk arsip berita acara & verifikasi lapangan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-red-700">
                  HONDA BIKERS DAY (HBD) - TIM KONSUMSI & LOGISTIK
                </div>
                <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 mt-0.5">
                  FORMULIR DISTRIBUSI & TANDA TERIMA KONSUMSI
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Sesi: <strong>{session.label}</strong> ({session.timeEstimate}) • Tanggal: {session.dateLabel}
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-slate-800">STATUS REKAPITULASI:</div>
                <div className="text-slate-600">
                  Target: <strong>{stats.totalPortionsTarget} Porsi</strong>
                </div>
                <div className="text-emerald-700 font-bold">
                  Terambil: {stats.totalPortionsTaken} Porsi ({stats.percentageTaken}%)
                </div>
                <div className="text-amber-700 font-bold">
                  Sisa: {stats.totalPortionsRemaining} Porsi
                </div>
              </div>
            </div>
          </div>

          {/* Table of Receivers */}
          <table className="w-full text-left text-[11px] border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-8">No</th>
                <th className="p-2 border-r border-slate-300">Nama Penerima & Divisi</th>
                <th className="p-2 border-r border-slate-300">Area Kerja</th>
                <th className="p-2 border-r border-slate-300">PIC Pengambilan / Kontak</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">Jatah Qty</th>
                <th className="p-2 border-r border-slate-300 text-center w-28">Status Diambil</th>
                <th className="p-2 text-center w-36">Tanda Tangan / Paraf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {eligible.map((r, index) => {
                const recordKey = `${r.id}_${session.key}`;
                const record = pickupRecords[recordKey];
                const isTaken = record?.isTaken || false;

                return (
                  <tr key={r.id} className="leading-tight">
                    <td className="p-2 border-r border-slate-200 text-center font-mono">
                      {index + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{r.nama}</div>
                      <div className="text-slate-500 text-[10px]">{r.picHbd} ({r.employee})</div>
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div>{r.areaKerja}</div>
                      <div className="text-[10px] text-slate-500">{r.kategori}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-semibold">{r.picPengambilan || r.nama}</div>
                      <div className="text-[10px] text-slate-500">{r.kontakWa ? `+${r.kontakWa}` : '-'}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-900">
                      {r.qty} box
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center">
                      {isTaken ? (
                        <span className="font-bold text-emerald-800 text-[10px]">
                          [SUDAH] {record?.takenAt || ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">[BELUM]</span>
                      )}
                    </td>
                    <td className="p-2 text-center border-slate-200">
                      {isTaken ? (
                        <div className="text-[10px] text-slate-600 font-medium">
                          ✓ {record?.takenBy || 'PIC'}
                        </div>
                      ) : (
                        <div className="h-6 border-b border-dashed border-slate-300 mx-2" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature Block for Event Operations */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-700">
            <div className="text-center w-52">
              <p>Petugas Pos Konsumsi,</p>
              <div className="h-16" />
              <p className="font-bold underline">( Tim Konsumsi HBD )</p>
            </div>
            <div className="text-center w-52">
              <p>Mengetahui,</p>
              <p>Koordinator Logistik & Acara</p>
              <div className="h-12" />
              <p className="font-bold underline">( Indra Jaya / Gita A. )</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
