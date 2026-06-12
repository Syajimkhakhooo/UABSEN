import { LoaderCircle, MapPinned, Camera } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { toUserMessage } from '../../lib/errorMessages';
import { getStudentDashboardData, logAudit, performAttendanceAction, uploadAttendancePhoto, getAttendanceSettings } from '../../lib/uabsenApi';
import imageCompression from 'browser-image-compression';
import { getCurrentPosition, calculateDistance } from '../../utils/attendance';
import { formatDate, formatDateTime } from '../../utils/format';

async function addWatermark(file, location, action) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(14, Math.floor(img.width / 30));
      ctx.font = `${fontSize}px sans-serif`;
      
      const pad = fontSize;
      const text1 = `UABSEN BMU - ${action === 'check_in' ? 'Masuk' : 'Keluar'}`;
      const text2 = formatDateTime(new Date());
      const text3 = `Lat: ${location.latitude.toFixed(6)} Long: ${location.longitude.toFixed(6)}`;

      const rectHeight = (fontSize * 3) + (pad * 2);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, canvas.height - rectHeight, canvas.width, rectHeight);

      ctx.fillStyle = 'white';
      ctx.fillText(text1, pad, canvas.height - rectHeight + pad + (fontSize * 0.8));
      ctx.fillText(text2, pad, canvas.height - rectHeight + pad + (fontSize * 2.0));
      ctx.fillText(text3, pad, canvas.height - rectHeight + pad + (fontSize * 3.2));

      canvas.toBlob((blob) => {
        if (blob) {
           resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        } else {
           resolve(file); 
        }
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [submittingAction, setSubmittingAction] = useState('');
  const [message, setMessage] = useState('');
  const [attendancePoint, setAttendancePoint] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingAction, setPendingAction] = useState(null); 
  const [pendingLocation, setPendingLocation] = useState(null);

  function getAttendanceBlockMessage(action) {
    const todayAttendance = data?.todayAttendance;

    if (!todayAttendance) {
      return '';
    }

    if (['leave', 'sick'].includes(todayAttendance.attendance_status)) {
      return 'Absensi hari ini sudah ditandai sebagai izin/sakit. Hubungi admin jika memang perlu diubah.';
    }

    if (action === 'check_in' && todayAttendance.check_in_at) {
      return 'Absen masuk hari ini sudah tercatat.';
    }

    if (action === 'check_out' && !todayAttendance.check_in_at) {
      return 'Absen masuk belum tercatat untuk hari ini.';
    }

    if (action === 'check_out' && todayAttendance.check_out_at) {
      return 'Absen keluar hari ini sudah tercatat.';
    }

    return '';
  }

  async function loadDashboard() {
    if (!profile?.student_id) return;
    const [result, settingsResult] = await Promise.all([
       getStudentDashboardData(profile.student_id),
       getAttendanceSettings()
    ]);
    setData(result);
    setAttendancePoint(settingsResult.attendancePoint);
  }

  useEffect(() => {
    loadDashboard();
  }, [profile?.student_id]);

  async function handleAttendanceStart(action) {
    setSubmittingAction(action);
    setMessage('');

    try {
      const blockedMessage = getAttendanceBlockMessage(action);
      if (blockedMessage) {
        setMessage(blockedMessage);
        setSubmittingAction('');
        return;
      }

      if (!attendancePoint) {
         throw new Error("Pengaturan lokasi absensi belum dimuat. Coba refresh halaman.");
      }

      const position = await getCurrentPosition();
      
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        attendancePoint.latitude,
        attendancePoint.longitude
      );

      if (distance > attendancePoint.radius_meters) {
         throw new Error(`Anda berada di luar radius absensi. Jarak Anda: ${Math.round(distance)}m, Maksimal: ${Math.round(attendancePoint.radius_meters)}m`);
      }

      setPendingAction(action);
      setPendingLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        throw new Error("Kamera tidak dapat diakses.");
      }

    } catch (err) {
      setMessage(toUserMessage(err, 'Gagal memverifikasi lokasi.'));
      setSubmittingAction('');
    }
  }

  async function handlePhotoCapture(event) {
    const file = event.target.files?.[0];
    if (!file || !pendingAction || !pendingLocation) {
       setSubmittingAction('');
       return;
    }

    setMessage('Mengompres foto dan memproses absensi...');

    try {
       const options = {
         maxSizeMB: 0.2, // Maksimal 200KB
         maxWidthOrHeight: 800, // Dimensi maksimal 800px
         useWebWorker: true,
         fileType: 'image/jpeg',
       };
       const compressedFile = await imageCompression(file, options);
       const watermarkedFile = await addWatermark(compressedFile, pendingLocation, pendingAction);

       const photoUrl = await uploadAttendancePhoto(watermarkedFile, profile.student_id, pendingAction);
       
       await performAttendanceAction(
         pendingAction,
         pendingLocation.latitude,
         pendingLocation.longitude,
         photoUrl,
         pendingLocation.accuracy
       );

       await logAudit(
         pendingAction === 'check_in' ? 'attendance_check_in' : 'attendance_check_out',
         pendingAction === 'check_in' ? 'Siswa melakukan absen masuk dengan foto.' : 'Siswa melakukan absen keluar dengan foto.'
       );
       
       setMessage(pendingAction === 'check_in' ? 'Absen masuk berhasil diproses.' : 'Absen keluar berhasil diproses.');
       await loadDashboard();
    } catch (err) {
       setMessage(toUserMessage(err, 'Absensi gagal diproses. Coba lagi sebentar.'));
    } finally {
       setSubmittingAction('');
       setPendingAction(null);
       setPendingLocation(null);
       if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!profile?.student_id) {
    return (
      <div className="grid gap-6">
        <section className="page-hero">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
            Dashboard Siswa
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">
            Akun Student Aktif
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Role student sudah aktif. Data siswa belum ditautkan oleh admin.
          </p>
        </section>

        <SectionCard
          title="Akun student belum ditautkan"
          description="Anda sudah bisa masuk ke aplikasi. Fitur inti akan aktif setelah admin menautkan `profiles.student_id` akun ini ke data siswa."
        >
          <EmptyState
            title="Menunggu tautan data siswa"
            description="Minta admin mengisi `profiles.student_id` untuk akun ini agar absensi, riwayat, dan pengajuan bisa dipakai."
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="page-hero">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
          Dashboard Siswa
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">
          {profile?.students?.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Nomor induk {profile?.students?.student_number}
          <span className="hidden sm:inline"> | </span>
          <span className="block sm:inline">Program {profile?.students?.training_program || '-'}</span>
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Absensi Hari Ini" description={`Tanggal ${formatDate(new Date())}`}>
          <div className="surface-subtle p-4 md:p-5">
            <div className="flex items-center gap-3 text-slate-500">
              <MapPinned size={18} />
              <p className="text-sm">Gunakan GPS aktif dan pastikan berada dalam radius lokasi absensi.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleAttendanceStart('check_in')}
                disabled={Boolean(submittingAction)}
              >
                {submittingAction === 'check_in' && <LoaderCircle size={16} className="animate-spin" />}
                Absen Masuk
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleAttendanceStart('check_out')}
                disabled={Boolean(submittingAction)}
              >
                {submittingAction === 'check_out' && <LoaderCircle size={16} className="animate-spin" />}
                Absen Keluar
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoCapture}
            />
            {message && <p className="field-note mt-4 border-slate-200 bg-white text-slate-600">{message}</p>}

            {data?.todayAttendance ? (
              <div className="mt-5 grid gap-3 rounded-[16px] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-slate-500">Status</span>
                  <StatusBadge status={data.todayAttendance.attendance_status} />
                </div>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500">Absen Masuk</span>
                  <span className="font-semibold text-ink">{formatDateTime(data.todayAttendance.check_in_at)}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500">Absen Keluar</span>
                  <span className="font-semibold text-ink">{formatDateTime(data.todayAttendance.check_out_at)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Belum ada absensi hari ini"
                  description="Gunakan tombol absen masuk ketika sudah berada di lokasi absensi."
                />
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Riwayat Terbaru" description="6 catatan absensi terakhir">
          {data?.recentHistory?.length ? (
            <div className="grid gap-3">
              {data.recentHistory.map((item) => (
                <div key={item.id} className="surface-subtle p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{formatDate(item.attendance_date)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        In {formatDateTime(item.check_in_at)} | Out {formatDateTime(item.check_out_at)}
                      </p>
                    </div>
                    <StatusBadge status={item.attendance_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Riwayat belum tersedia" description="Absensi yang berhasil akan tampil di sini." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
