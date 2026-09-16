export type SessionKey = 
  | 'siangHMinus2'
  | 'siangHMinus1'
  | 'malamHMinus1'
  | 'pagiH'
  | 'siangH'
  | 'malamH'
  | 'hPlus1';

export interface SessionInfo {
  key: SessionKey;
  label: string;
  shortLabel: string;
  timeEstimate: string;
  dateLabel: string;
  description: string;
}

export interface MealScheduleItem {
  hadir: boolean;
  kegiatan?: string;
}

export interface ConsumptionRecipient {
  id: number;
  nama: string;
  picHbd: string;
  employee: string;
  areaKerja: string;
  picPengambilan: string;
  kontakWa: string;
  qty: number;
  kategori: 'Internal' | 'Eksternal';
  makan: 'YES' | 'NO';
  schedule: Record<SessionKey, MealScheduleItem>;
}

export interface PickupRecord {
  recipientId: number;
  sessionKey: SessionKey;
  isTaken: boolean;
  takenAt?: string;
  takenBy?: string;
  portionsTaken?: number;
  notes?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  recipientId: number;
  recipientName: string;
  sessionKey: SessionKey;
  action: 'TAKEN' | 'UNTAKEN';
  picPengambilan: string;
  qty: number;
  operatorNotes?: string;
}
