export default function LoadingScreen({ label = 'Memuat...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-sm p-6 text-center md:p-7">
        <div className="mx-auto flex w-20 items-end justify-center gap-2">
          <span className="h-5 w-2.5 animate-pulse rounded-full bg-slate-200 [animation-delay:-0.2s]" />
          <span className="h-8 w-2.5 animate-pulse rounded-full bg-primary/70 [animation-delay:-0.1s]" />
          <span className="h-12 w-2.5 animate-pulse rounded-full bg-primary" />
          <span className="h-8 w-2.5 animate-pulse rounded-full bg-primary/70 [animation-delay:-0.1s]" />
          <span className="h-5 w-2.5 animate-pulse rounded-full bg-slate-200 [animation-delay:-0.2s]" />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-1 text-xs text-slate-400">Menyiapkan antarmuka yang rapi dan siap dipakai.</p>
      </div>
    </div>
  );
}
