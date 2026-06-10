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

export function exportAttendancePdf(records, filename = 'laporan-absensi.pdf', options = {}) {
  const { title = 'REKAPITULASI ABSENSI SISWA', periodText = 'PERIODE BULAN ....' } = options;
  
  const doc = new jsPDF();
  
  // Header
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
