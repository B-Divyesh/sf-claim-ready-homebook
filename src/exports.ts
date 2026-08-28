import type { HomeItem } from './types';
import { createPayload } from './crypto';
import { csvCell, download, money, todayStamp } from './utils';

const HEADERS = ['Item', 'Category', 'Room', 'Container', 'Estimated value', 'Purchase date', 'Serial/model', 'Photo', 'Receipt', 'Notes', 'Last updated'];

export function exportCsv(items: HomeItem[], currency: string): void {
  const rows = items.map(item => [
    item.name, item.category, item.room, item.container, item.value ?? '', item.purchaseDate, item.serial,
    item.photo ? 'Attached in Homebook backup' : '', item.receiptName ?? (item.receipt ? 'Attached' : ''), item.notes, item.updatedAt
  ]);
  const csv = '\uFEFF' + [
    [`Claim-Ready Homebook export (${currency})`],
    HEADERS,
    ...rows
  ].map(row => row.map(csvCell).join(',')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `homebook-claim-list-${todayStamp()}.csv`);
}

export async function exportJson(items: HomeItem[]): Promise<void> {
  const payload = await createPayload(items);
  download(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `homebook-backup-${todayStamp()}.json`);
}

async function imageData(blob: Blob): Promise<string | null> {
  if (!blob.type.startsWith('image/')) return null;
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.72);
}

export async function exportPdf(items: HomeItem[], currency: string, onProgress: (message: string) => void): Promise<void> {
  onProgress('Preparing the PDF engine…');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 44;

  const pageHeader = (title: string, subtitle: string) => {
    pdf.setFillColor(11, 16, 22);
    pdf.rect(0, 0, width, 112, 'F');
    pdf.setTextColor(89, 243, 227);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('CLAIM-READY HOMEBOOK', margin, 38);
    pdf.setTextColor(255, 246, 229);
    pdf.setFontSize(25);
    pdf.text(title, margin, 72);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(subtitle, margin, 94);
  };

  pageHeader('Household claim packet', `Created ${new Date().toLocaleDateString()} • ${items.length} ${items.length === 1 ? 'item' : 'items'}`);
  pdf.setTextColor(23, 32, 42);
  pdf.setFontSize(13);
  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  pdf.text(`Recorded estimated value: ${money(total, currency)}`, margin, 154);
  pdf.setFontSize(10);
  const note = 'This packet is a personal record, not a valuation or coverage guarantee. Insurer evidence requirements vary. Keep the encrypted Homebook backup separately if you need the original attachments.';
  pdf.text(pdf.splitTextToSize(note, width - margin * 2), margin, 182);

  let y = 242;
  items.forEach((item, index) => {
    if (y > height - 95) { pdf.addPage(); pageHeader('Item index', `Page ${pdf.getNumberOfPages()}`); y = 142; }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`${index + 1}. ${item.name}`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${item.room || 'Room not recorded'}${item.container ? ` / ${item.container}` : ''}`, margin + 250, y);
    pdf.text(money(item.value, currency), width - margin, y, { align: 'right' });
    pdf.setDrawColor(203, 196, 180);
    pdf.line(margin, y + 12, width - margin, y + 12);
    y += 30;
  });

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    onProgress(`Adding item ${index + 1} of ${items.length}…`);
    pdf.addPage();
    pageHeader(item.name, `${item.category || 'Uncategorised'} • Item ${index + 1} of ${items.length}`);
    pdf.setTextColor(23, 32, 42);
    let detailY = 146;
    const fields = [
      ['Estimated value', money(item.value, currency)],
      ['Purchase date', item.purchaseDate || 'Not recorded'],
      ['Serial / model', item.serial || 'Not recorded'],
      ['Stored in', [item.room, item.container].filter(Boolean).join(' / ') || 'Not recorded'],
      ['Receipt', item.receiptName || (item.receipt ? 'Attached in encrypted backup' : 'Not recorded')]
    ];
    fields.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.text(label!.toUpperCase(), margin, detailY);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(12); pdf.text(value!, margin + 110, detailY);
      detailY += 30;
    });
    if (item.notes) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.text('NOTES', margin, detailY + 4);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11);
      pdf.text(pdf.splitTextToSize(item.notes, width - margin * 2 - 110), margin + 110, detailY + 4);
      detailY += 65;
    }
    if (item.photo) {
      const data = await imageData(item.photo);
      if (data) {
        const imageY = Math.max(340, detailY);
        pdf.addImage(data, 'JPEG', margin, imageY, width - margin * 2, Math.min(330, height - imageY - 52), undefined, 'FAST');
      }
    }
    pdf.setFontSize(8); pdf.setTextColor(89, 99, 108);
    pdf.text(`Record updated ${new Date(item.updatedAt).toLocaleString()}`, margin, height - 24);
  }
  pdf.save(`homebook-claim-packet-${todayStamp()}.pdf`);
  onProgress('PDF downloaded.');
}
