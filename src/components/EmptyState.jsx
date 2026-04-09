export default function EmptyState({ title, description }) {
  return (
    <div className="surface-subtle border-dashed px-5 py-8 text-center md:px-6 md:py-10">
      <h4 className="text-base font-semibold tracking-[-0.02em] text-ink">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
