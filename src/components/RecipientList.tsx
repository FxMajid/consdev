import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  UserCheck, 
  MapPin, 
  AlertCircle,
  FileEdit,
  ExternalLink,
  Phone,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { ConsumptionRecipient, PickupRecord, SessionInfo } from '../types';
import { isEligibleForSession, generateWhatsAppLink } from '../utils/consumptionUtils';

interface RecipientListProps {
  session: SessionInfo;
  recipients: ConsumptionRecipient[];
  pickupRecords: Record<string, PickupRecord>;
  onTogglePickup: (recipient: ConsumptionRecipient, isTaken: boolean) => void;
  onOpenEditModal: (recipient: ConsumptionRecipient) => void;
  initialSearchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const RecipientList: React.FC<RecipientListProps> = ({
  session,
  recipients,
  pickupRecords,
  onTogglePickup,
  onOpenEditModal,
  initialSearchQuery = '',
  onSearchChange
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'TAKEN'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Internal' | 'Eksternal'>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [picFilter, setPicFilter] = useState<string>('ALL');

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  // Filter only eligible recipients for this session
  const eligibleRecipients = useMemo(() => {
    return recipients.filter(r => isEligibleForSession(r, session.key));
  }, [recipients, session.key]);

  // Extract unique areas & PICs for filters
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    eligibleRecipients.forEach(r => {
      if (r.areaKerja) set.add(r.areaKerja);
    });
    return Array.from(set).sort();
  }, [eligibleRecipients]);

  const uniquePics = useMemo(() => {
    const set = new Set<string>();
    eligibleRecipients.forEach(r => {
      if (r.picPengambilan && r.picPengambilan !== 'mobile' && r.picPengambilan !== '-') {
        set.add(r.picPengambilan);
      }
    });
    return Array.from(set).sort();
  }, [eligibleRecipients]);

  // Apply filters
  const filteredRecipients = useMemo(() => {
    return eligibleRecipients.filter(r => {
      const recordKey = `${r.id}_${session.key}`;
      const isTaken = pickupRecords[recordKey]?.isTaken || false;

      // Status filter
      if (statusFilter === 'PENDING' && isTaken) return false;
      if (statusFilter === 'TAKEN' && !isTaken) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && r.kategori !== categoryFilter) return false;

      // Area filter
      if (areaFilter !== 'ALL' && r.areaKerja !== areaFilter) return false;

      // PIC filter
      if (picFilter !== 'ALL' && r.picPengambilan !== picFilter) return false;

      // Search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchName = r.nama.toLowerCase().includes(query);
        const matchPicHbd = r.picHbd.toLowerCase().includes(query);
        const matchPicPengambil = r.picPengambilan.toLowerCase().includes(query);
        const matchArea = r.areaKerja.toLowerCase().includes(query);
        const matchId = String(r.id) === query;
        const matchWa = r.kontakWa.includes(query);

        if (!matchName && !matchPicHbd && !matchPicPengambil && !matchArea && !matchId && !matchWa) {
          return false;
        }
      }

      return true;
    });
  }, [eligibleRecipients, session.key, pickupRecords, statusFilter, categoryFilter, areaFilter, picFilter, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input for Attendees by Name */}
          <div className="relative flex-1">
            <label htmlFor="search-attendees" className="sr-only">
              Search attendees by name
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-attendees"
              data-testid="search-attendees-input"
              name="searchAttendees"
              type="text"
              placeholder="Search attendees by name..."
              aria-label="Search attendees by name"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-14 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                id="btn-clear-attendee-search"
                aria-label="Clear search"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl self-start md:self-auto text-xs font-medium">
            <button
              id="filter-status-all"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({eligibleRecipients.length})
            </button>
            <button
              id="filter-status-pending"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
            >
              Belum Diambil
            </button>
            <button
              id="filter-status-taken"
              onClick={() => setStatusFilter('TAKEN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'TAKEN'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-emerald-800 hover:text-emerald-900'
              }`}
            >
              Sudah Diambil
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-slate-200/60 text-xs">
          <div className="flex items-center text-slate-500 gap-1.5 mr-1 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Tambahan:</span>
          </div>

          {/* Kategori Filter */}
          <select
            id="select-filter-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | 'Internal' | 'Eksternal')}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="ALL">Kategori: Semua</option>
            <option value="Internal">Internal (Dealer / Retail)</option>
            <option value="Eksternal">Eksternal (Vendor, Polisi, dll)</option>
          </select>

          {/* Area Kerja Filter */}
          <select
            id="select-filter-area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer max-w-[200px]"
          >
            <option value="ALL">Area Kerja: Semua ({uniqueAreas.length})</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {/* PIC Filter */}
          <select
            id="select-filter-pic"
            value={picFilter}
            onChange={(e) => setPicFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-red-500 cursor-pointer max-w-[220px]"
          >
            <option value="ALL">PIC Pengambil: Semua ({uniquePics.length})</option>
            {uniquePics.map((pic) => (
              <option key={pic} value={pic}>
                PIC: {pic}
              </option>
            ))}
          </select>

          {(categoryFilter !== 'ALL' || areaFilter !== 'ALL' || picFilter !== 'ALL' || searchTerm) && (
            <button
              id="btn-reset-filters"
              onClick={() => {
                setCategoryFilter('ALL');
                setAreaFilter('ALL');
                setPicFilter('ALL');
                setSearchTerm('');
              }}
              className="text-red-600 hover:text-red-700 font-medium ml-auto cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Menampilkan <strong className="text-slate-800">{filteredRecipients.length}</strong> dari {eligibleRecipients.length} penerima hadir di sesi ini
        </span>
        <span className="text-[11px] text-slate-400">
          Tip: Klik tombol hijau untuk menandai pengambilan satu per satu
        </span>
      </div>

      {/* Table of Recipients */}
      {filteredRecipients.length === 0 ? (
        <div className="p-12 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">
            {searchTerm.trim() ? `Tidak ada nama yang cocok dengan "${searchTerm}"` : 'Tidak ada data yang cocok'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm.trim()
              ? 'Periksa kembali ejaan nama peserta / penerima, atau reset pencarian di atas.'
              : 'Coba ubah kata kunci pencarian atau sesuaikan filter status di atas.'}
          </p>
          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
            >
              Hapus Filter Nama
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 uppercase font-semibold tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5">Penerima & Divisi</th>
                <th className="py-3 px-3.5">Area Kerja</th>
                <th className="py-3 px-3.5">PIC Pengambil & WA</th>
                <th className="py-3 px-3.5 text-center">Porsi</th>
                <th className="py-3 px-3.5">Status Pengambilan</th>
                <th className="py-3 px-3.5 text-center">Aksi Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecipients.map((recipient, idx) => {
                const recordKey = `${recipient.id}_${session.key}`;
                const record = pickupRecords[recordKey];
                const isTaken = record?.isTaken || false;
                const kegiatan = recipient.schedule[session.key]?.kegiatan;
                const isBulk = recipient.qty > 1;

                return (
                  <tr
                    key={recipient.id}
                    id={`recipient-row-${recipient.id}`}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isTaken ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Number / ID */}
                    <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        #{recipient.id}
                      </span>
                    </td>

                    {/* Nama & Divisi */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {recipient.nama}
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-700">{recipient.picHbd}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{recipient.employee}</span>
                      </div>
                      {kegiatan && (
                        <div className="mt-1 inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                          <span>Catatan: {kegiatan}</span>
                        </div>
                      )}
                    </td>

                    {/* Area Kerja */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span>{recipient.areaKerja}</span>
                      </div>
                      <span
                        className={`inline-block text-[10px] px-1.5 py-0.2 rounded mt-1 font-medium ${
                          recipient.kategori === 'Internal'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                        }`}
                      >
                        {recipient.kategori}
                      </span>
                    </td>

                    {/* PIC Pengambil & Kontak WA */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>{recipient.picPengambilan || recipient.nama}</span>
                      </div>
                      {recipient.kontakWa ? (
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={`https://wa.me/62${recipient.kontakWa.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 hover:underline"
                            title="Chat PIC WhatsApp"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>+{recipient.kontakWa}</span>
                          </a>
                          <a
                            href={generateWhatsAppLink(
                              recipient.kontakWa,
                              recipient.picPengambilan,
                              recipient.nama,
                              recipient.areaKerja,
                              session,
                              recipient.qty
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1"
                            title="Kirim pesan pemberitahuan bahwa makanan siap diambil"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            Ingatkan
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No WhatsApp -</span>
                      )}
                    </td>

                    {/* Qty Porsi */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div
                        className={`inline-flex items-center justify-center font-extrabold px-2.5 py-1 rounded-lg ${
                          isBulk
                            ? 'bg-red-100 text-red-800 text-xs ring-1 ring-red-300'
                            : 'bg-slate-100 text-slate-800 text-xs'
                        }`}
                      >
                        {recipient.qty} Porsi
                      </div>
                      {isBulk && (
                        <div className="text-[9px] text-red-600 font-semibold mt-0.5">
                          Kolektif Group
                        </div>
                      )}
                    </td>

                    {/* Status Pengambilan */}
                    <td className="py-3 px-3.5">
                      {isTaken ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            SUDAH DIAMBIL
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex flex-col">
                            <span>Jam: {record?.takenAt || '-'}</span>
                            {record?.takenBy && (
                              <span className="text-slate-700 font-medium truncate max-w-[130px]">
                                Oleh: {record.takenBy}
                              </span>
                            )}
                            {record?.notes && (
                              <span className="text-slate-500 italic">Ket: {record.notes}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-amber-600" />
                            BELUM DIAMBIL
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Menunggu PIC mengambil
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Action / Check-in */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {isTaken ? (
                          <button
                            id={`btn-untake-${recipient.id}`}
                            onClick={() => onTogglePickup(recipient, false)}
                            className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg font-medium text-[11px] border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                            title="Batalkan tanda sudah diambil"
                          >
                            Batal Ambil
                          </button>
                        ) : (
                          <button
                            id={`btn-take-${recipient.id}`}
                            onClick={() => onTogglePickup(recipient, true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tandai Ambil
                          </button>
                        )}

                        <button
                          id={`btn-detail-${recipient.id}`}
                          onClick={() => onOpenEditModal(recipient)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ubah detail pengambil atau catatan"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
