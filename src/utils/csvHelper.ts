import { ConsumptionRecipient, SessionKey } from '../types';

const SESSION_KEYS: SessionKey[] = [
  'siangHMinus2',
  'siangHMinus1',
  'malamHMinus1',
  'pagiH',
  'siangH',
  'malamH',
  'hPlus1'
];

export const SESSION_COLUMN_NAMES: Record<SessionKey, string> = {
  siangHMinus2: 'Siang H-2',
  siangHMinus1: 'Siang H-1',
  malamHMinus1: 'Malam H-1',
  pagiH: 'Pagi Hari-H',
  siangH: 'Siang Hari-H',
  malamH: 'Malam Hari-H',
  hPlus1: 'H+1 (Bongkaran)'
};

/**
 * Parses raw CSV or TSV string into 2D array of strings
 * Handles standard commas, semicolons (Indonesian Excel), and tabs (copy-paste)
 */
export function parseCSVToRows(rawText: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  // Detect delimiter: check first line
  const firstLine = cleanText.split('\n')[0] || '';
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip Windows CRLF
        }
        currentRow.push(currentField.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseBooleanValue(val: string | undefined): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  return (
    clean === '1' ||
    clean === 'yes' ||
    clean === 'ya' ||
    clean === 'true' ||
    clean === 'hadir' ||
    clean === 'y' ||
    clean === 'aktif'
  );
}

export interface ParseResult {
  success: boolean;
  recipients: ConsumptionRecipient[];
  detectedColumns: string[];
  totalRows: number;
  newCount: number;
  updateCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Transforms parsed CSV rows into ConsumptionRecipient array
 */
export function processCSVData(
  rows: string[][],
  existingRecipients: ConsumptionRecipient[],
  mode: 'merge' | 'replace'
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length < 2) {
    return {
      success: false,
      recipients: [],
      detectedColumns: [],
      totalRows: 0,
      newCount: 0,
      updateCount: 0,
      errors: ['File CSV kosong atau tidak memiliki baris data setelah header.'],
      warnings: []
    };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(normalizeHeader);

  // Map header column indices
  const getColIndex = (aliases: string[]): number => {
    return headers.findIndex(h => aliases.some(alias => h === alias || h.includes(alias)));
  };

  const idCol = getColIndex(['id', 'noid', 'no']);
  const nameCol = getColIndex(['nama', 'namapenerima', 'name', 'penerima']);
  const picHbdCol = getColIndex(['pichbd', 'divisi', 'jabatan', 'unit', 'bagian']);
  const employeeCol = getColIndex(['employee', 'instansi', 'perusahaan', 'karyawan', 'afiliasi']);
  const areaKerjaCol = getColIndex(['areakerja', 'area', 'lokasi', 'pos', 'posisi']);
  const picPengambilanCol = getColIndex(['picpengambilan', 'pic', 'koordinator', 'penanggungjawab']);
  const kontakWaCol = getColIndex(['kontakwa', 'wa', 'nohp', 'hp', 'telepon', 'whatsapp']);
  const qtyCol = getColIndex(['qty', 'porsi', 'jumlahporsi', 'jumlah']);
  const kategoriCol = getColIndex(['kategori', 'category', 'tipe']);
  const makanCol = getColIndex(['makan', 'statusmakan', 'jatahmakan']);

  if (nameCol === -1) {
    return {
      success: false,
      recipients: [],
      detectedColumns: rawHeaders,
      totalRows: rows.length - 1,
      newCount: 0,
      updateCount: 0,
      errors: ['Kolom "Nama" atau "Nama Penerima" tidak ditemukan di baris header CSV.'],
      warnings: []
    };
  }

  // Session columns mapping
  const sessionColIndices: Partial<Record<SessionKey, number>> = {};
  SESSION_KEYS.forEach(key => {
    const aliases: string[] = [
      key.toLowerCase(),
      normalizeHeader(SESSION_COLUMN_NAMES[key])
    ];
    if (key === 'siangHMinus2') aliases.push('siangh2', 'h2siang');
    if (key === 'siangHMinus1') aliases.push('siangh1', 'h1siang');
    if (key === 'malamHMinus1') aliases.push('malamh1', 'h1malam');
    if (key === 'pagiH') aliases.push('pagih', 'sarapan', 'hpagi');
    if (key === 'siangH') aliases.push('siangh', 'hsiang');
    if (key === 'malamH') aliases.push('malamh', 'hmalam');
    if (key === 'hPlus1') aliases.push('hplus1', 'h1', 'bongkaran');

    const idx = getColIndex(aliases);
    if (idx !== -1) {
      sessionColIndices[key] = idx;
    }
  });

  const existingMap = new Map<number, ConsumptionRecipient>();
  const existingByName = new Map<string, ConsumptionRecipient>();
  existingRecipients.forEach(r => {
    existingMap.set(r.id, r);
    existingByName.set(r.nama.trim().toLowerCase(), r);
  });

  let maxId = existingRecipients.reduce((max, r) => Math.max(max, r.id || 0), 0);

  const importedList: ConsumptionRecipient[] = [];
  let updateCount = 0;
  let newCount = 0;

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rawName = (nameCol !== -1 ? row[nameCol] : '') || '';
    const cleanName = rawName.trim();

    if (!cleanName) continue; // Skip empty rows

    // Parse ID
    let rowId: number | null = null;
    if (idCol !== -1 && row[idCol]) {
      const parsedId = parseInt(row[idCol].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        rowId = parsedId;
      }
    }

    // Check if matching existing
    let matchedExisting: ConsumptionRecipient | undefined;
    if (rowId !== null && existingMap.has(rowId)) {
      matchedExisting = existingMap.get(rowId);
    } else if (existingByName.has(cleanName.toLowerCase())) {
      matchedExisting = existingByName.get(cleanName.toLowerCase());
      if (rowId === null && matchedExisting) {
        rowId = matchedExisting.id;
      }
    }

    if (matchedExisting) {
      updateCount++;
    } else {
      newCount++;
      if (rowId === null) {
        maxId++;
        rowId = maxId;
      } else if (rowId > maxId) {
        maxId = rowId;
      }
    }

    // Parse Qty
    let qty = 1;
    if (qtyCol !== -1 && row[qtyCol]) {
      const parsedQty = parseInt(row[qtyCol].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedQty) && parsedQty >= 0) {
        qty = parsedQty;
      }
    } else if (matchedExisting) {
      qty = matchedExisting.qty;
    }

    // Parse Kategori
    let kategori: 'Internal' | 'Eksternal' = 'Internal';
    if (kategoriCol !== -1 && row[kategoriCol]) {
      const cleanKat = row[kategoriCol].trim().toLowerCase();
      if (cleanKat.includes('eksternal') || cleanKat.includes('external')) {
        kategori = 'Eksternal';
      }
    } else if (matchedExisting) {
      kategori = matchedExisting.kategori;
    }

    // Parse Makan YES / NO
    let makan: 'YES' | 'NO' = 'YES';
    if (makanCol !== -1 && row[makanCol]) {
      const cleanMakan = row[makanCol].trim().toUpperCase();
      if (cleanMakan === 'NO' || cleanMakan === 'TIDAK' || cleanMakan === '0') {
        makan = 'NO';
      }
    } else if (matchedExisting) {
      makan = matchedExisting.makan;
    }

    // Parse schedules
    const defaultSchedule: Record<SessionKey, { hadir: boolean; kegiatan?: string }> = {
      siangHMinus2: { hadir: false },
      siangHMinus1: { hadir: false },
      malamHMinus1: { hadir: false },
      pagiH: { hadir: false },
      siangH: { hadir: true }, // Default hari-H siang hadir
      malamH: { hadir: false },
      hPlus1: { hadir: false }
    };

    const schedule = matchedExisting
      ? { ...matchedExisting.schedule }
      : { ...defaultSchedule };

    // If session columns are provided in CSV, override schedule
    let hasExplicitScheduleInCSV = false;
    SESSION_KEYS.forEach(key => {
      const colIdx = sessionColIndices[key];
      if (colIdx !== undefined && colIdx < row.length) {
        hasExplicitScheduleInCSV = true;
        const cellVal = row[colIdx];
        schedule[key] = {
          hadir: parseBooleanValue(cellVal),
          kegiatan: schedule[key]?.kegiatan
        };
      }
    });

    // If no session columns were provided and this is a new row, mark default hadir based on makan status
    if (!hasExplicitScheduleInCSV && !matchedExisting) {
      if (makan === 'YES') {
        schedule.siangH.hadir = true;
      }
    }

    const recipientItem: ConsumptionRecipient = {
      id: rowId,
      nama: cleanName,
      picHbd: (picHbdCol !== -1 ? row[picHbdCol]?.trim() : '') || matchedExisting?.picHbd || 'PANITIA',
      employee: (employeeCol !== -1 ? row[employeeCol]?.trim() : '') || matchedExisting?.employee || 'MAIN DEALER',
      areaKerja: (areaKerjaCol !== -1 ? row[areaKerjaCol]?.trim() : '') || matchedExisting?.areaKerja || 'mobile',
      picPengambilan: (picPengambilanCol !== -1 ? row[picPengambilanCol]?.trim() : '') || matchedExisting?.picPengambilan || cleanName,
      kontakWa: (kontakWaCol !== -1 ? row[kontakWaCol]?.trim() : '') || matchedExisting?.kontakWa || '',
      qty,
      kategori,
      makan,
      schedule
    };

    importedList.push(recipientItem);
  }

  // Final list depending on mode
  let finalList: ConsumptionRecipient[] = [];
  if (mode === 'replace') {
    finalList = importedList;
  } else {
    // Merge mode: retain existing recipients not in CSV, update those in CSV, add new ones
    const importedIds = new Set(importedList.map(r => r.id));
    const retained = existingRecipients.filter(r => !importedIds.has(r.id));
    finalList = [...retained, ...importedList].sort((a, b) => a.id - b.id);
  }

  return {
    success: true,
    recipients: finalList,
    detectedColumns: rawHeaders,
    totalRows: importedList.length,
    newCount,
    updateCount,
    errors,
    warnings
  };
}

/**
 * Generates full CSV export of all recipients including schedule columns
 */
export function generateFullRecipientsCSV(recipients: ConsumptionRecipient[]): string {
  const headers = [
    'No ID',
    'Nama Penerima',
    'Divisi / PIC HBD',
    'Employee',
    'Area Kerja',
    'PIC Pengambilan',
    'Kontak WA',
    'Jumlah Porsi (Qty)',
    'Kategori',
    'Status Makan (YES/NO)',
    'Siang H-2',
    'Siang H-1',
    'Malam H-1',
    'Pagi Hari-H',
    'Siang Hari-H',
    'Malam Hari-H',
    'H+1'
  ];

  const rows = recipients.map(r => [
    r.id,
    `"${r.nama.replace(/"/g, '""')}"`,
    `"${r.picHbd.replace(/"/g, '""')}"`,
    `"${r.employee.replace(/"/g, '""')}"`,
    `"${r.areaKerja.replace(/"/g, '""')}"`,
    `"${r.picPengambilan.replace(/"/g, '""')}"`,
    `"${r.kontakWa}"`,
    r.qty,
    r.kategori,
    r.makan,
    r.schedule.siangHMinus2?.hadir ? 'YES' : 'NO',
    r.schedule.siangHMinus1?.hadir ? 'YES' : 'NO',
    r.schedule.malamHMinus1?.hadir ? 'YES' : 'NO',
    r.schedule.pagiH?.hadir ? 'YES' : 'NO',
    r.schedule.siangH?.hadir ? 'YES' : 'NO',
    r.schedule.malamH?.hadir ? 'YES' : 'NO',
    r.schedule.hPlus1?.hadir ? 'YES' : 'NO'
  ].join(','));

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Downloads a string as a CSV file in browser
 */
export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
