import { ConsumptionRecipient, PickupRecord, SessionInfo, SessionKey } from '../types';

export function isEligibleForSession(recipient: ConsumptionRecipient, sessionKey: SessionKey): boolean {
  if (recipient.makan !== 'YES') return false;
  return recipient.schedule[sessionKey]?.hadir === true;
}

export function getSessionTargetPortions(recipient: ConsumptionRecipient, sessionKey: SessionKey): number {
  return isEligibleForSession(recipient, sessionKey) ? recipient.qty : 0;
}

export interface SessionStats {
  totalEligiblePeople: number;
  totalPortionsTarget: number;
  totalPortionsTaken: number;
  totalPortionsRemaining: number;
  percentageTaken: number;
  completedPickupsCount: number;
  pendingPickupsCount: number;
}

export function calculateSessionStats(
  recipients: ConsumptionRecipient[],
  sessionKey: SessionKey,
  pickupRecords: Record<string, PickupRecord>
): SessionStats {
  let totalEligiblePeople = 0;
  let totalPortionsTarget = 0;
  let totalPortionsTaken = 0;
  let completedPickupsCount = 0;
  let pendingPickupsCount = 0;

  recipients.forEach(recipient => {
    if (isEligibleForSession(recipient, sessionKey)) {
      totalEligiblePeople++;
      totalPortionsTarget += recipient.qty;
      const recordKey = `${recipient.id}_${sessionKey}`;
      const record = pickupRecords[recordKey];
      if (record && record.isTaken) {
        completedPickupsCount++;
        totalPortionsTaken += (record.portionsTaken ?? recipient.qty);
      } else {
        pendingPickupsCount++;
      }
    }
  });

  const totalPortionsRemaining = Math.max(0, totalPortionsTarget - totalPortionsTaken);
  const percentageTaken = totalPortionsTarget > 0 ? Math.round((totalPortionsTaken / totalPortionsTarget) * 100) : 0;

  return {
    totalEligiblePeople,
    totalPortionsTarget,
    totalPortionsTaken,
    totalPortionsRemaining,
    percentageTaken,
    completedPickupsCount,
    pendingPickupsCount
  };
}

export function generateWhatsAppLink(
  phoneNumber: string,
  picName: string,
  recipientName: string,
  areaKerja: string,
  session: SessionInfo,
  qty: number
): string {
  // normalize indonesian phone number
  let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.slice(1);
  } else if (cleanNumber.startsWith('8')) {
    cleanNumber = '62' + cleanNumber;
  }

  const message = encodeURIComponent(
    `Halo Rekan *${picName || recipientName}*,\n\n` +
    `Pemberitahuan dari *Tim Konsumsi HBD*:\n` +
    `🍱 Konsumsi sesi *${session.label}* (${session.timeEstimate})\n` +
    `📍 Area/Divisi: *${areaKerja}*\n` +
    `👥 Penerima: *${recipientName}*\n` +
    `📦 Jumlah Porsi: *${qty} Porsi*\n\n` +
    `Konsumsi sudah *SIAP DIAMBIL* di Booth/Tenda Utama Konsumsi Panitia. Mohon segera diambil oleh PIC Penanggung Jawab ya. Terima kasih! 🙏`
  );

  return `https://wa.me/${cleanNumber}?text=${message}`;
}

export function exportToCSV(
  recipients: ConsumptionRecipient[],
  sessionKey: SessionKey,
  pickupRecords: Record<string, PickupRecord>,
  session: SessionInfo
): void {
  const headers = [
    'No ID',
    'Nama Penerima',
    'Jabatan / Divisi',
    'Employee',
    'Area Kerja',
    'PIC Pengambilan',
    'Kontak WA',
    'Jumlah Porsi (Qty)',
    'Kategori',
    'Status Pengambilan',
    'Waktu Diambil',
    'Diambil Oleh',
    'Catatan / Kegiatan'
  ];

  const eligibleList = recipients.filter(r => isEligibleForSession(r, sessionKey));

  const rows = eligibleList.map(r => {
    const recordKey = `${r.id}_${sessionKey}`;
    const record = pickupRecords[recordKey];
    const isTaken = record?.isTaken || false;
    const takenTime = record?.takenAt || '-';
    const takenBy = record?.takenBy || '-';
    const kegiatan = r.schedule[sessionKey]?.kegiatan || '-';

    return [
      r.id,
      `"${r.nama.replace(/"/g, '""')}"`,
      `"${r.picHbd.replace(/"/g, '""')}"`,
      `"${r.employee}"`,
      `"${r.areaKerja}"`,
      `"${r.picPengambilan}"`,
      `"${r.kontakWa}"`,
      r.qty,
      r.kategori,
      isTaken ? 'SUDAH DIAMBIL' : 'BELUM DIAMBIL',
      `"${takenTime}"`,
      `"${takenBy}"`,
      `"${kegiatan.replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `rekap_distribusi_konsumsi_${sessionKey}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
