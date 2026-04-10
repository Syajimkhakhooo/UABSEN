import { useEffect, useState } from 'react';
import SectionCard from '../../components/SectionCard';
import { DEFAULT_SETTINGS, SETTINGS_HELP_TEXT } from '../../lib/constants';
import { getAttendanceSettings, logAudit, saveAttendanceSettings } from '../../lib/uabsenApi';

export default function SettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [ids, setIds] = useState({ settings_id: '', point_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

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

    try {
      await saveAttendanceSettings({ ...form, ...ids });
      await logAudit('settings_update', 'Admin memperbarui pengaturan absensi.', form);
      setSuccess('Pengaturan absensi berhasil disimpan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
            <h3 className="text-sm font-semibold text-ink">Jam Check-In</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Atur kapan siswa boleh mulai absen, kapan status hadir berakhir, dan batas akhir check-in.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="h-full">
              <label className="mb-2 block text-sm font-semibold text-slate-600">Mulai Check-In</label>
              <p className="mb-2 min-h-[40px] text-xs leading-5 text-slate-400">
                Jam paling awal siswa boleh check-in.
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
              <label className="mb-2 block text-sm font-semibold text-slate-600">Akhir Check-In</label>
              <p className="mb-2 min-h-[40px] text-xs leading-5 text-slate-400">
                Setelah jam ini siswa tidak bisa check-in lagi.
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
            <h3 className="text-sm font-semibold text-ink">Jam Check-Out</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Atur jam mulai dan akhir ketika siswa diizinkan melakukan check-out.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Mulai Check-Out</label>
              <p className="mb-2 text-xs text-slate-400">Jam paling awal siswa boleh check-out.</p>
              <input
                type="time"
                value={form.check_out_start}
                onChange={(event) => setForm((value) => ({ ...value, check_out_start: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Akhir Check-Out</label>
              <p className="mb-2 text-xs text-slate-400">Setelah jam ini check-out tidak diterima sistem.</p>
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

        {success && <p className="field-note border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p>}

        <div className="flex justify-stretch sm:justify-end">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
