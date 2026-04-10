export default function SectionCard({ title, description, actions, children, className = '' }) {
  return (
    <section className={`card p-4 md:p-5 ${className}`.trim()}>
      {(title || actions) && (
        <div className="mb-4 flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title && <h3 className="section-title">{title}</h3>}
            {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          {actions && <div className="w-full md:w-auto md:shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
