import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  Layers, 
  Database,
  ArrowRight,
  Info,
  Loader2
} from 'lucide-react';
import { ConsumptionRecipient } from '../types';
import { 
  parseCSVToRows, 
  processCSVData, 
  ParseResult, 
  generateFullRecipientsCSV, 
  downloadCSVFile 
} from '../utils/csvHelper';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: ConsumptionRecipient[];
  onApplyRecipients: (newRecipients: ConsumptionRecipient[], summaryMsg: string, mode: 'merge' | 'replace') => Promise<void> | void;
  onResetToDefault: () => Promise<void> | void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onApplyRecipients,
  onResetToDefault
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      processText(text, importMode);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const processText = (text: string, mode: 'merge' | 'replace') => {
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const rows = parseCSVToRows(text);
    const res = processCSVData(rows, recipients, mode);
    setParseResult(res);
  };

  const handleTextChange = (val: string) => {
    setRawText(val);
    processText(val, importMode);
  };

  const handleModeChange = (mode: 'merge' | 'replace') => {
    setImportMode(mode);
    if (rawText.trim()) {
      processText(rawText, mode);
    }
  };

  const handleDownloadCurrent = () => {
    const csv = generateFullRecipientsCSV(recipients);
    downloadCSVFile(csv, `data_penerima_konsumsi_hbd_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleDownloadTemplate = () => {
    // A sample template with 3 clean rows
    const sampleRows = [
      'No ID,Nama Penerima,Divisi / PIC HBD,Employee,Area Kerja,PIC Pengambilan,Kontak WA,Jumlah Porsi (Qty),Kategori,Status Makan (YES/NO),Siang H-2,Siang H-1,Malam H-1,Pagi Hari-H,Siang Hari-H,Malam Hari-H,H+1',
      '1,"CONTOH PANITIA 1","LOGISTIK","MAIN DEALER","Tenda Konsumsi","Budi Santoso","08123456789",5,Internal,YES,NO,YES,YES,YES,YES,YES,NO',
      '2,"CONTOH VENDOR RIGGING","PANGGUNG","VENDOR LUAR","Main Stage","Doni Stage","08987654321",10,Eksternal,YES,YES,YES,YES,NO,YES,YES,YES'
    ].join('\n');
    downloadCSVFile('\uFEFF' + sampleRows, 'template_impor_konsumsi_hbd.csv');
  };

  const handleApply = async () => {
    if (!parseResult || !parseResult.success || isSaving) return;
    
    const summary = importMode === 'replace'
      ? `Mengganti seluruh daftar dengan ${parseResult.recipients.length} penerima dan disimpan ke database`
      : `Memperbarui ${parseResult.updateCount} data & menambahkan ${parseResult.newCount} data baru ke database`;

    setIsSaving(true);
    try {
      await onApplyRecipients(parseResult.recipients, summary, importMode);
      setApplySuccess(true);
      setTimeout(() => {
        setApplySuccess(false);
        setIsSaving(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error applying recipients:', err);
      setIsSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                Impor & Update Data Penerima (.CSV)
              </h3>
              <p className="text-xs text-slate-400">
                Perbarui kuota porsi, nama penerima, PIC pengambilan, atau jadwal sesi makan secara massal
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

        {/* Toolbar & Template Downloads */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Bantuan Template:</span>
            <button
              onClick={handleDownloadCurrent}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition-colors cursor-pointer"
              title="Unduh seluruh data 122 penerima saat ini dalam format CSV untuk diedit di Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Unduh Data Saat Ini (.CSV)
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition-colors cursor-pointer"
              title="Unduh template format CSV kosong dengan kolom lengkap"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Template Kosong
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Kembalikan seluruh daftar penerima ke data awal (122 penerima asli)?')) {
                onResetToDefault();
                onClose();
              }
            }}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 text-xs font-medium transition-colors cursor-pointer"
            title="Reset daftar penerima ke 122 data default bawaan"
          >
            <RefreshCw className="w-3 h-3" />
            Reset ke Data Awal Pabrikan
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Method Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload File CSV / Excel
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Tempel Teks (Paste dari Excel / Spreadsheet)
            </button>
          </div>

          {/* Mode Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">Mode Impor:</span>
            </div>

            <div className="flex items-center gap-2">
              <label
                onClick={() => handleModeChange('merge')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  importMode === 'merge'
                    ? 'bg-red-50 border-red-300 text-red-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => handleModeChange('merge')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span>
                  <strong>Perbarui & Gabungkan</strong> (Rekomendasi)
                </span>
              </label>

              <label
                onClick={() => handleModeChange('replace')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  importMode === 'replace'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => handleModeChange('replace')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>
                  <strong>Ganti Seluruh Data</strong>
                </span>
              </label>
            </div>
          </div>

          {/* Tab 1: Upload File Drag & Drop */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-red-500 bg-red-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {fileName ? (
                    <span className="text-emerald-700 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      File Terpilih: <strong>{fileName}</strong>
                    </span>
                  ) : (
                    'Klik untuk memilih file CSV atau drag & drop ke sini'
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung format .CSV (koma, titik koma Excel, atau TSV tab)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw Text */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Tempelkan data baris CSV atau salin langsung dari Excel:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Pastikan baris pertama berisi nama kolom (Header)
                </span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="No ID,Nama Penerima,Divisi / PIC HBD,Area Kerja,PIC Pengambilan,Jumlah Porsi (Qty)&#10;1,KRIS KURNIANTO,STEERING COMMITTEE,mobile,mobile,1&#10;2,DIMAS GENTUR,STEERING COMMITTEE,mobile,mobile,1"
                rows={7}
                className="w-full font-mono text-xs p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>
          )}

          {/* Parse Result Summary & Errors */}
          {parseResult && (
            <div className="space-y-3">
              {parseResult.success ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-800">
                      Format CSV Valid! Terdeteksi total {parseResult.totalRows} baris data penerima.
                    </p>
                    <p className="text-emerald-700">
                      {importMode === 'merge' ? (
                        <>
                          • <strong>{parseResult.updateCount}</strong> penerima akan diperbarui informasinya.
                          <br />• <strong>{parseResult.newCount}</strong> penerima baru akan ditambahkan ke daftar.
                        </>
                      ) : (
                        <>• Seluruh <strong>{parseResult.recipients.length}</strong> data penerima baru akan menggantikan daftar sebelumnya.</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Terjadi kesalahan pada data CSV:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-700">
                      {parseResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              {parseResult.success && parseResult.recipients.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Pratinjau Hasil Impor (Menampilkan 5 Data Teratas)
                    </span>
                    <span className="text-slate-500 font-medium">
                      Total Data Baru: {parseResult.recipients.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-52">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">ID</th>
                          <th className="py-2 px-3">Nama Penerima</th>
                          <th className="py-2 px-3">Divisi / PIC HBD</th>
                          <th className="py-2 px-3">Area Kerja</th>
                          <th className="py-2 px-3">PIC Pengambilan</th>
                          <th className="py-2 px-3 text-center">Porsi</th>
                          <th className="py-2 px-3 text-center">Kategori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.recipients.slice(0, 5).map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-semibold text-slate-700">#{r.id}</td>
                            <td className="py-2 px-3 font-medium text-slate-900">{r.nama}</td>
                            <td className="py-2 px-3 text-slate-600">{r.picHbd}</td>
                            <td className="py-2 px-3 text-slate-600">{r.areaKerja}</td>
                            <td className="py-2 px-3 text-slate-600">{r.picPengambilan}</td>
                            <td className="py-2 px-3 text-center font-bold text-red-600">{r.qty}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.kategori === 'Internal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {r.kategori}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Sinkronisasi Database:</strong> Data hasil impor akan langsung disimpan ke <strong>Database Cloud SQL PostgreSQL</strong> dan langsung tersinkron ke semua perangkat panitia. Anda juga dapat mengunduh CSV saat ini, mengeditnya di Excel/Google Sheets, dan mengunggah kembali.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>

          <button
            onClick={handleApply}
            disabled={!parseResult || !parseResult.success || applySuccess || isSaving}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-red-900/20 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                Menyimpan ke Database...
              </>
            ) : applySuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                Tersimpan di Database!
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Simpan ke Database ({parseResult?.totalRows || 0} Data)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
