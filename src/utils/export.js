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

function getRecapData(records) {
  const recapMap = new Map();
  records.forEach((record) => {
    const studentId = record.students?.id || record.student_id;
    if (!studentId) return;

    if (!recapMap.has(studentId)) {
      recapMap.set(studentId, {
        name: record.students?.name || '-',
        student_number: record.students?.student_number || '-',
        present: 0,
        late: 0,
        leave: 0,
        sick: 0,
        absent: 0,
      });
    }

    const stat = recapMap.get(studentId);
    if (record.attendance_status === 'present' || record.attendance_status === 'corrected') {
      stat.present += 1;
    } else if (record.attendance_status === 'late') {
      stat.late += 1;
    } else if (record.attendance_status === 'leave') {
      stat.leave += 1;
    } else if (record.attendance_status === 'sick') {
      stat.sick += 1;
    } else if (record.attendance_status === 'absent') {
      stat.absent += 1;
    }
  });

  return Array.from(recapMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function exportAttendanceCsv(records, filename = 'laporan-absensi.csv') {
  const recapData = getRecapData(records);
  const csv = Papa.unparse(
    recapData.map((data) => ({
      'Nama Siswa': data.name,
      'No. Induk': data.student_number,
      'Hadir': data.present,
      'Terlambat': data.late,
      'Izin': data.leave,
      'Sakit': data.sick,
      'Alpa': data.absent,
    })),
  );

  downloadBlob(filename, csv, 'text/csv;charset=utf-8;');
}

export async function exportAttendancePdf(records, filename = 'laporan-absensi.pdf', options = {}) {
  const { title = 'REKAPITULASI ABSENSI SISWA', periodText = 'PERIODE BULAN ....' } = options;
  const recapData = getRecapData(records);
  
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
    head: [['Nama Siswa', 'No. Induk', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa']],
    body: recapData.map((data) => [
      data.name,
      data.student_number,
      data.present.toString(),
      data.late.toString(),
      data.leave.toString(),
      data.sick.toString(),
      data.absent.toString(),
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [11, 135, 237], halign: 'center' },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
    didDrawPage: function (data) {
      // Footer
      const str = 'Dicetak Otomatis melalui laman UABSEN BMU';
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
    }
  });

  doc.save(filename);
}
