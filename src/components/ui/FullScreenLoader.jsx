import Spinner from './Spinner'

function FullScreenLoader({
  title = 'Validando sesión',
  subtitle = 'Cargando dashboard de ywstudio...',
}) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-warm px-6">
      <div className="pointer-events-none absolute -top-20 right-[-80px] h-72 w-72 rounded-full bg-primary/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-100px] h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <article className="relative w-full max-w-sm rounded-3xl border border-secondary/20 bg-white/95 p-6 text-center shadow-soft">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center text-secondary">
          <Spinner className="h-full w-full" />
        </div>

        <p className="font-display text-xl font-semibold text-ink">{title}</p>
        <p className="mt-2 text-sm text-ink/70">{subtitle}</p>
      </article>
    </section>
  )
}

export default FullScreenLoader
