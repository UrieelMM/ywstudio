function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="mb-6 rounded-2xl border border-secondary/20 bg-white/90 p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/75">{description}</p>
        </div>

        {action ? <div className="sm:pt-1">{action}</div> : null}
      </div>
    </header>
  )
}

export default PageHeader
