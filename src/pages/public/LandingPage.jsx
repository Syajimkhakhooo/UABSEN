import {
  ArrowRight,
  BellRing,
  Building2,
  Clock3,
  FileSpreadsheet,
  MapPinned,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageFrame from '../../components/PublicPageFrame';
import { useAuth } from '../../hooks/useAuth';

const featureCards = [
  {
    icon: MapPinned,
    title: 'Absensi Berbasis Lokasi',
    description:
      'Validasi absen masuk dan absen keluar memakai koordinat, radius, dan akurasi GPS agar absensi lebih disiplin.',
  },
  {
    icon: Clock3,
    title: 'Jadwal Absensi yang Jelas',
    description:
      'Siswa dapat mengikuti alur absen masuk, batas hadir, toleransi terlambat, dan absen keluar dengan aturan yang konsisten.',
  },
  {
    icon: BellRing,
    title: 'Notifikasi yang Ringkas',
    description:
      'Informasi penting, pembaruan pengajuan, dan pesan operasional hadir dalam alur yang rapi dan mudah dipantau siswa.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Riwayat yang Mudah Dilihat',
    description:
      'Riwayat absensi, catatan pengajuan, dan rekap aktivitas harian tersusun rapi untuk memudahkan pemantauan.',
  },
];

const workflowItems = [
  {
    title: 'Siswa membuka portal absensi',
    description: 'Portal dirancang agar siswa bisa langsung masuk ke alur absensi dengan tampilan yang ringkas dan mudah dipahami.',
  },
  {
    title: 'Siswa melakukan absen masuk dan absen keluar',
    description: 'Aplikasi mengambil GPS perangkat lalu mencocokkan lokasi dan waktu dengan aturan yang sudah ditetapkan.',
  },
  {
    title: 'Semua aktivitas langsung tercatat',
    description: 'Riwayat absensi, notifikasi, pengajuan izin/sakit, dan audit perubahan tersimpan dalam satu sistem.',
  },
];

export default function LandingPage() {
  const { profile } = useAuth();
  const dashboardTarget = profile?.role === 'admin' ? '/admin' : '/student';
  const primaryCtaTarget = profile ? dashboardTarget : '/login';
  const primaryCtaLabel = profile ? 'Masuk ke Dashboard' : 'Masuk ke Aplikasi';

  return (
    <PublicPageFrame currentPath="/" sectionBasePath="">
      <section className="public-hero-grid pb-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="public-badge-primary">
              <ShieldCheck size={14} />
              UABSEN | Sistem Absensi Digital
            </div>

            <h1 className="public-heading-xl lg:max-w-[36rem] lg:text-[3.65rem]">
              Platform absensi siswa LPK SO Bahtera Mitra Unggulan
            </h1>

            <p className="public-copy">
              UABSEN membantu siswa menjalani absensi harian dalam satu alur yang sederhana: validasi lokasi,
              pengaturan jam, notifikasi, pengajuan izin/sakit, dan riwayat aktivitas tanpa tampilan yang terasa kaku.
            </p>

            <div className="public-action-row">
              <Link to={primaryCtaTarget} className="btn-primary">
                {primaryCtaLabel}
                <ArrowRight size={17} />
              </Link>
              <a href="#fitur" className="btn-secondary">
                Lihat Fitur Utama
              </a>
            </div>

            <div className="public-chip-grid sm:grid-cols-3">
              {[
                { value: 'GPS', label: 'Validasi lokasi real-time' },
                { value: 'Jam', label: 'Kontrol absen masuk dan absen keluar' },
                { value: 'Log', label: 'Audit dan notifikasi terpusat' },
              ].map((item) => (
                <div key={item.value} className="public-panel-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.value}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 translate-x-3 translate-y-5 rounded-[28px] bg-sky-100/50 blur-2xl" />
            <div className="public-panel relative rounded-[28px] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                    Snapshot Sistem
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">
                    Satu tampilan untuk ritme kerja harian
                  </h2>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-primary">
                  <Building2 size={22} />
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="public-panel-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Absen masuk berbasis radius</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Sistem menilai lokasi, akurasi GPS, dan aturan waktu dalam satu proses.
                      </p>
                    </div>
                    <MapPinned size={20} className="shrink-0 text-primary" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card border-slate-200/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Absensi</p>
                    <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink">
                      Absen masuk dan absen keluar terasa lebih jelas dengan validasi lokasi dan waktu yang konsisten.
                    </p>
                  </div>
                  <div className="card border-slate-200/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Riwayat</p>
                    <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-ink">
                      Riwayat absensi, notifikasi, dan pengajuan siswa tersusun dalam portal yang sama.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ['Lokasi', 'Koordinat dan radius absensi aktif'],
                    ['Notifikasi', 'Broadcast dan update individual'],
                    ['Ekspor', 'Rekap operasional siap unduh'],
                  ].map(([title, desc]) => (
                    <div key={title} className="rounded-[18px] border border-slate-200/80 bg-slate-50/90 p-4">
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
      </section>

      <section id="fitur" className="public-section">
          <div className="mb-6 md:mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Fitur Utama</p>
            <h2 className="public-heading-lg">
              Dibangun untuk kebutuhan absensi siswa sehari-hari
            </h2>
            <p className="public-copy-sm">
              Seluruh pengalaman publik ini mengikuti bahasa visual yang sama dengan halaman login dan dashboard:
              bersih, ringan, dan fokus pada kebutuhan siswa.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featureCards.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="card p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-[18px] border border-sky-100 bg-sky-50 p-3 text-primary">
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-ink">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
      </section>

      <section id="alur" className="public-section">
        <div className="page-hero rounded-[28px]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Alur Kerja</p>
            <h2 className="public-heading-lg">
              Dari buka portal sampai absensi selesai
            </h2>
            <p className="public-copy-sm">
              Sistem dirancang supaya proses terasa singkat dan jelas: siswa membuka portal, mengisi absensi,
              lalu seluruh aktivitas tersimpan rapi dalam satu alur.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {workflowItems.map((item, index) => (
              <div key={item.title} className="public-panel-soft h-full p-5 md:p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="keunggulan" className="public-section">
          <div className="card overflow-hidden p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Keunggulan</p>
                <h2 className="public-heading-lg">
                  Antarmuka tenang untuk proses yang sering dipakai setiap hari
                </h2>
                <p className="public-copy-sm max-w-2xl">
                  UABSEN menggabungkan validasi lokasi, pengajuan, notifikasi, dan riwayat aktivitas ke dalam alur yang
                  tidak terasa berat. Tampilan dibuat ringan di mata, tetapi tetap informatif untuk penggunaan harian siswa.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  'Selaras dengan halaman login dan portal siswa',
                  'Mudah dipakai di desktop maupun mobile',
                  'Visual lembut dengan fokus kuat pada isi',
                  'Navigasi jelas untuk siswa yang ingin langsung masuk ke aplikasi',
                ].map((item) => (
                  <div key={item} className="surface-subtle bg-slate-50/90 p-4">
                    <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </section>

      <section id="mulai" className="pb-14 pt-6 md:pb-20 md:pt-10">
          <div className="page-hero rounded-[28px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Mulai Sekarang</p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="public-heading-lg mt-0">
                  Buka portal siswa dan lanjutkan absensi harian tanpa alur yang berbelit.
                </h2>
                <p className="public-copy-sm">
                  Siswa bisa langsung fokus pada absensi, notifikasi, pengajuan, dan riwayat hariannya dari satu tempat.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to={primaryCtaTarget} className="btn-primary">
                  {primaryCtaLabel}
                  <ArrowRight size={17} />
                </Link>
                {!profile && (
                  <Link to="/login" className="btn-secondary">
                    Login Sekarang
                  </Link>
                )}
              </div>
            </div>
          </div>
      </section>
    </PublicPageFrame>
  );
}
