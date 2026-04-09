export default function StatCard({ label, value, accent = 'text-primary', helper }) {
  return (
    <div className="card p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${accent}`}>{value}</p>
      {helper && <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>}
    </div>
  );
}
