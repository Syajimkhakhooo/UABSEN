import { useEffect, useState } from 'react';
import SectionCard from '../../components/SectionCard';
import { DEFAULT_SETTINGS, SETTINGS_HELP_TEXT } from '../../lib/constants';
import { getAttendanceSettings, logAudit, saveAttendanceSettings, cleanupOldAttendancePhotos } from '../../lib/uabsenApi';

export default function SettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [ids, setIds] = useState({ settings_id: '', point_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [cleanupMonths, setCleanupMonths] = useState(3);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { settings, attendancePoint } = await getAttendanceSettings();
      if (settings || attendancePoint) {
        setForm({
          location_name: attendancePoint?.name ?? DEFAULT_SETTINGS.location_name,
          latitude: attendancePoint?.latitude ?? DEFAULT_SETTINGS.latitude,
          longitude: attendancePoint?.longitude ?? DEFAULT_SETTINGS.longitude,
          radius_meters: attendancePoint?.radius_meters ?? DEFAULT_SETTINGS.radius_meters,
          check_in_start: settings?.check_in_start ?? DEFAULT_SETTINGS.check_in_start,
          present_cutoff: settings?.present_cutoff ?? DEFAULT_SETTINGS.present_cutoff,
          late_cutoff: settings?.late_cutoff ?? DEFAULT_SETTINGS.late_cutoff,
          check_in_end: settings?.check_in_end ?? DEFAULT_SETTINGS.check_in_end,
          check_out_start: settings?.check_out_start ?? DEFAULT_SETTINGS.check_out_start,
          check_out_end: settings?.check_out_end ?? DEFAULT_SETTINGS.check_out_end,
          gps_accuracy_threshold:
            settings?.gps_accuracy_threshold ?? DEFAULT_SETTINGS.gps_accuracy_threshold,
        });
        setIds({
          settings_id: settings?.id ?? '',
          point_id: attendancePoint?.id ?? '',
        });
      }
    }

    load();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess('');
    setError('');

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radiusMeters = Number(form.radius_meters);
    const gpsAccuracyThreshold = Number(form.gps_accuracy_threshold);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError('Latitude tidak valid. Masukkan angka antara -90 sampai 90.');
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Longitude tidak valid. Masukkan angka antara -180 sampai 180.');
      setSubmitting(false);
      return;
    }

    if (!Number.isInteger(radiusMeters) || radiusMeters <= 0) {
      setError('Radius absensi harus berupa angka bulat lebih dari 0 meter.');
      setSubmitting(false);
      return;
    }

    if (!Number.isInteger(gpsAccuracyThreshold) || gpsAccuracyThreshold <= 0) {
      setError('Batas akurasi GPS harus berupa angka bulat lebih dari 0 meter.');
      setSubmitting(false);
      return;
    }

    try {
      const normalizedForm = {
        ...form,
        latitude,
        longitude,
        radius_meters: radiusMeters,
        gps_accuracy_threshold: gpsAccuracyThreshold,
      };

      await saveAttendanceSettings({ ...normalizedForm, ...ids });
      await logAudit('settings_update', 'Admin memperbarui pengaturan absensi.', normalizedForm);
      setSuccess('Pengaturan absensi berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pengaturan absensi gagal disimpan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCleanup() {
    if (!window.confirm(`Yakin ingin menghapus semua foto absensi yang usianya lebih dari ${cleanupMonths} bulan?\n\nTindakan ini tidak bisa dibatalkan! (Hanya menghapus file foto, riwayat jam absen tetap aman).`)) {
      return;
    }

    setCleaningUp(true);
    setCleanupMsg('Memproses pembersihan... jangan tutup halaman ini.');
    try {
      const deletedCount = await cleanupOldAttendancePhotos(cleanupMonths);
      setCleanupMsg(`Selesai! Berhasil menghapus ${deletedCount} foto lama.`);
    } catch (err) {
      setCleanupMsg(err instanceof Error ? err.message : 'Gagal membersihkan penyimpanan.');
    } finally {
      setCleaningUp(false);
    }
  }

  return (
    <div className="grid gap-6">
      <SectionCard title="Pengaturan Absensi" description={SETTINGS_HELP_TEXT}>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="surface-subtle p-4 md:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-ink">Titik Absensi</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Tentukan nama lokasi, radius valid absensi, dan koordinat titik utama.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Nama Lokasi</label>
              <p className="mb-2 text-xs text-slate-400">Nama titik absensi yang tampil di pengaturan admin.</p>
              <input
                value={form.location_name}
                onChange={(event) => setForm((value) => ({ ...value, location_name: event.target.value }))}
                placeholder="Contoh: Kampus Utama"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Radius Absensi</label>
              <p className="mb-2 text-xs text-slate-400">Jarak maksimal siswa dari titik lokasi, satuan meter.</p>
              <input
                type="number"
                step="1"
                value={form.radius_meters}
                onChange={(event) => setForm((value) => ({ ...value, radius_meters: Number(event.target.value) }))}
                placeholder="Contoh: 150"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Latitude</label>
              <p className="mb-2 text-xs text-slate-400">Koordinat lintang lokasi absensi.</p>
              <input
                type="number"
                step="0.000001"
                value={form.latitude}
                onChange={(event) => setForm((value) => ({ ...value, latitude: Number(event.target.value) }))}
                placeholder="Contoh: -6.200000"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Longitude</label>
              <p className="mb-2 text-xs text-slate-400">Koordinat bujur lokasi absensi.</p>
              <input
                type="number"
                step="0.000001"
                value={form.longitude}
                onChange={(event) => setForm((value) => ({ ...value, longitude: Number(event.target.value) }))}
                placeholder="Contoh: 106.816666"
              />
            </div>
          </div>
        </div>

        <div className="surface-subtle p-4 md:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-ink">Jam Absen Masuk</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Atur kapan siswa boleh mulai absen, kapan status hadir berakhir, dan batas akhir absen masuk.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="h-full">
              <label className="mb-2 block text-sm font-semibold text-slate-600">Mulai Absen Masuk</label>
              <p className="mb-2 min-h-[40px] text-xs leading-5 text-slate-400">
                Jam paling awal siswa boleh absen masuk.
              </p>
              <input
                type="time"
                value={form.check_in_start}
                onChange={(event) => setForm((value) => ({ ...value, check_in_start: event.target.value }))}
              />
            </div>
            <div className="h-full">
              <label className="mb-2 block text-sm font-semibold text-slate-600">Batas Hadir</label>
              <p className="mb-2 min-h-[40px] text-xs leading-5 text-slate-400">
                Sebelum jam ini status akan tercatat sebagai hadir.
              </p>
              <input
                type="time"
                value={form.present_cutoff}
                onChange={(event) => setForm((value) => ({ ...value, present_cutoff: event.target.value }))}
              />
            </div>
            <div className="h-full">
              <label className="mb-2 block text-sm font-semibold text-slate-600">Batas Terlambat</label>
              <p className="mb-2 min-h-[40px] text-xs leading-5 text-slate-400">
                Setelah batas hadir, sampai jam ini status menjadi terlambat.
              </p>
              <input
                type="time"
                value={form.late_cutoff}
                onChange={(event) => setForm((value) => ({ ...value, late_cutoff: event.target.value }))}
              />
            </div>
            <div className="h-full">
              <label className="mb-2 block text-sm font-semibold text-slate-600">Akhir Absen Masuk</label>
              <p className="mb-2 min-h-[40px] text-xs leading-5 text-slate-400">
                Setelah jam ini siswa tidak bisa absen masuk lagi.
              </p>
              <input
                type="time"
                value={form.check_in_end}
                onChange={(event) => setForm((value) => ({ ...value, check_in_end: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="surface-subtle p-4 md:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-ink">Jam Absen Keluar</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Atur jam mulai dan akhir ketika siswa diizinkan melakukan absen keluar.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Mulai Absen Keluar</label>
              <p className="mb-2 text-xs text-slate-400">Jam paling awal siswa boleh absen keluar.</p>
              <input
                type="time"
                value={form.check_out_start}
                onChange={(event) => setForm((value) => ({ ...value, check_out_start: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Akhir Absen Keluar</label>
              <p className="mb-2 text-xs text-slate-400">Setelah jam ini absen keluar tidak diterima sistem.</p>
              <input
                type="time"
                value={form.check_out_end}
                onChange={(event) => setForm((value) => ({ ...value, check_out_end: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="surface-subtle p-4 md:p-5">
          <div className="max-w-md">
            <label className="mb-2 block text-sm font-semibold text-slate-600">Batas Akurasi GPS</label>
            <p className="mb-2 text-xs text-slate-400">
              Akurasi GPS maksimal yang masih dianggap valid, satuan meter. Semakin kecil, semakin ketat.
            </p>
            <input
              type="number"
              step="1"
              value={form.gps_accuracy_threshold}
              onChange={(event) =>
                setForm((value) => ({ ...value, gps_accuracy_threshold: Number(event.target.value) }))
              }
              placeholder="Contoh: 100"
            />
          </div>
        </div>

        {error && <p className="field-note border-rose-200 bg-rose-50 text-rose-700">{error}</p>}
        {success && <p className="field-note border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p>}

        <div className="flex justify-stretch sm:justify-end">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
      </SectionCard>

      <SectionCard title="Pembersihan Penyimpanan (Storage)" description="Hapus foto absensi lama untuk menghemat kapasitas penyimpanan. Riwayat jam absensi akan tetap tersimpan di database secara permanen.">
        <div className="surface-subtle p-4 md:p-5 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-600">Usia Foto</label>
            <p className="mb-2 text-xs text-slate-400">Pilih foto usia berapa yang ingin dihapus.</p>
            <select
              className="custom-field"
              value={cleanupMonths}
              onChange={(e) => setCleanupMonths(Number(e.target.value))}
              disabled={cleaningUp}
            >
              <option value={1}>Lebih dari 1 Bulan</option>
              <option value={3}>Lebih dari 3 Bulan</option>
              <option value={6}>Lebih dari 6 Bulan</option>
              <option value={12}>Lebih dari 1 Tahun</option>
            </select>
          </div>
          <div>
            <button 
              type="button" 
              className="btn-danger w-full sm:w-auto mt-2 sm:mt-0"
              onClick={handleCleanup}
              disabled={cleaningUp}
            >
              {cleaningUp ? 'Membersihkan...' : 'Mulai Pembersihan'}
            </button>
          </div>
        </div>
        {cleanupMsg && (
          <div className="mt-4 p-4 rounded-xl border border-sky-200 bg-sky-50 text-sky-800 text-sm font-medium">
            {cleanupMsg}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
