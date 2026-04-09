export default function SetupRequiredScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-10">
      <div className="mb-6 flex w-full max-w-4xl items-center gap-3 lg:hidden">
        <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
        <p className="text-sm font-bold tracking-wide text-primary/80">UABSEN</p>
      </div>
      <div className="flex w-full max-w-4xl flex-col-reverse gap-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <section className="page-hero">
          <div className="hidden items-center gap-3 lg:flex">
            <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
            <p className="text-sm font-bold tracking-wide text-primary/80">UABSEN</p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink md:text-4xl">Konfigurasi project belum lengkap.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Aplikasi tidak blank lagi, tetapi login belum bisa dipakai sebelum kredensial Supabase
            dimasukkan ke file environment.
          </p>
        </section>

        <section className="card p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Langkah Cepat
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">Isi file `.env`</h2>
          <div className="surface-subtle mt-5 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-500">
            Salin dari `.env.example`, lalu restart `npm run dev`. Setelah itu halaman login
            akan tampil normal.
          </p>
        </section>
      </div>
    </div>
  );
}
