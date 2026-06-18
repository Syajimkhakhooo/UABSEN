import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatDateTime, getAttendanceStatusLabel } from './format';

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAttendanceCsv(records, filename = 'laporan-absensi.csv') {
  const csv = Papa.unparse(
    records.map((record) => ({
      tanggal: formatDate(record.attendance_date),
      siswa: record.students?.name ?? '-',
      nomor_induk: record.students?.student_number ?? '-',
      status: getAttendanceStatusLabel(record.attendance_status),
      check_in: formatDateTime(record.check_in_at),
      check_out: formatDateTime(record.check_out_at),
      catatan: record.correction_note ?? '',
    })),
  );

  downloadBlob(filename, csv, 'text/csv;charset=utf-8;');
}

export async function exportAttendancePdf(records, filename = 'laporan-absensi.pdf', options = {}) {
  const { title = 'REKAPITULASI ABSENSI SISWA', periodText = 'PERIODE BULAN ....' } = options;
  
  const doc = new jsPDF();
  
  // Load Logo
  const img = new Image();
  img.src = '/logo.png';
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve; // Continue even if logo fails
  });

  // Header
  // If logo loaded successfully, draw it.
  if (img.complete && img.naturalWidth > 0) {
    // Create a canvas to draw the image with a white background
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the original image over the white background
    ctx.drawImage(img, 0, 0);
    
    // Convert to JPEG data URL
    const imgDataUrl = canvas.toDataURL('image/jpeg');

    // A4 width is 210mm. Center is 105. Logo on the left side of the title.
    // Let's put it around x=20, y=10, width=22, height=22
    doc.addImage(imgDataUrl, 'JPEG', 20, 10, 22, 22);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 15, { align: 'center' });
  doc.text('LPK SO BAHTERA MITRA UNGGULAN', 105, 22, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(periodText, 105, 28, { align: 'center' });

  autoTable(doc, {
    startY: 35,
    head: [['Tanggal', 'Siswa', 'No. Induk', 'Status', 'Absen Masuk', 'Absen Keluar']],
    body: records.map((record) => [
      formatDate(record.attendance_date),
      record.students?.name ?? '-',
      record.students?.student_number ?? '-',
      getAttendanceStatusLabel(record.attendance_status),
      formatDateTime(record.check_in_at),
      formatDateTime(record.check_out_at),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [11, 135, 237] },
    didDrawPage: function (data) {
      // Footer
      const str = 'Dicetak Otomatis melalu laman UABSEN BMU';
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    }
  });

  doc.save(filename);
}
