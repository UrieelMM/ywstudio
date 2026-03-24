function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-secondary/15 bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-ink/70">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

export default SectionCard
