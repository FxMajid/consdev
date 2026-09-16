import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, FileText, UserCheck, Shield } from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo } from '../types';

interface EditPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: ConsumptionRecipient | null;
  session: SessionInfo;
  pickupRecord?: PickupRecord;
  onSave: (record: PickupRecord) => void;
}

export const EditPickupModal: React.FC<EditPickupModalProps> = ({
  isOpen,
  onClose,
  recipient,
  session,
  pickupRecord,
  onSave
}) => {
  const [isTaken, setIsTaken] = useState(false);
  const [takenBy, setTakenBy] = useState('');
  const [portionsTaken, setPortionsTaken] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (recipient) {
      setIsTaken(pickupRecord?.isTaken || false);
      setTakenBy(pickupRecord?.takenBy || recipient.picPengambilan || recipient.nama);
      setPortionsTaken(pickupRecord?.portionsTaken ?? recipient.qty);
      setNotes(pickupRecord?.notes || '');
    }
  }, [recipient, pickupRecord]);

  if (!isOpen || !recipient) return null;

  const handleSave = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    onSave({
      recipientId: recipient.id,
      sessionKey: session.key,
      isTaken,
      takenAt: isTaken ? (pickupRecord?.takenAt || `${formattedTime} WIB`) : undefined,
      takenBy: isTaken ? takenBy.trim() : undefined,
      portionsTaken: isTaken ? Number(portionsTaken) : 0,
      notes: notes.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-red-300 uppercase tracking-wider block">
              Detail Pengambilan Konsumsi
            </span>
            <h3 className="font-bold text-base">{recipient.nama}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Divisi / PIC HBD:</span>
              <span className="font-semibold text-slate-800">{recipient.picHbd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Area Kerja:</span>
              <span className="font-semibold text-slate-800">{recipient.areaKerja}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jatah Alokasi:</span>
              <span className="font-bold text-red-700">{recipient.qty} Porsi Box</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sesi:</span>
              <span className="font-medium text-slate-700">{session.label}</span>
            </div>
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Status Pengambilan:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsTaken(false)}
                className={`py-2 px-3 rounded-xl font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isTaken
                    ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                Belum Diambil
              </button>
              <button
                type="button"
                onClick={() => setIsTaken(true)}
                className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isTaken
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Sudah Diambil
              </button>
            </div>
          </div>

          {/* If Taken, extra fields */}
          {isTaken && (
            <>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama PIC / Orang Yang Mengambil:
                </label>
                <input
                  type="text"
                  value={takenBy}
                  onChange={(e) => setTakenBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Nama PIC penanggung jawab"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Jumlah Porsi Diambil:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={recipient.qty}
                    value={portionsTaken}
                    onChange={(e) => setPortionsTaken(Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-bold text-center"
                  />
                  <span className="text-slate-500">dari total {recipient.qty} porsi jatah</span>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Catatan Khusus (Opsional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="Misal: Diberikan kupon ekstra, atau diambil bertahap..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
