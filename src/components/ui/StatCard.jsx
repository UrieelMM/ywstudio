function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="rounded-2xl border border-secondary/15 bg-white p-4 shadow-soft animate-rise">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          {label}
        </p>
        {Icon ? (
          <span className="rounded-lg bg-primary/60 p-2 text-ink">
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-sm text-ink/65">{hint}</p>
    </article>
  )
}

export default StatCard
