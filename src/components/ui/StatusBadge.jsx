const stylesByVariant = {
  activo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactivo: 'bg-slate-100 text-slate-600 border-slate-200',
  archivado: 'bg-slate-100 text-slate-700 border-slate-200',
  estable: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  bloqueado: 'bg-rose-100 text-rose-700 border-rose-200',
  abierto: 'bg-rose-100 text-rose-700 border-rose-200',
  cerrado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  riesgo: 'bg-amber-100 text-amber-700 border-amber-200',
  pausado: 'bg-orange-100 text-orange-700 border-orange-200',
  vigente: 'bg-blue-100 text-blue-700 border-blue-200',
  entregado: 'bg-teal-100 text-teal-700 border-teal-200',
  pendiente: 'bg-violet-100 text-violet-700 border-violet-200',
}

function StatusBadge({ value }) {
  const normalized = (value || '').toLowerCase()
  const variant =
    normalized.includes('inactivo')
      ? 'inactivo'
        : normalized.includes('riesgo')
          ? 'riesgo'
        : normalized.includes('estab')
          ? 'estable'
        : normalized.includes('bloque')
          ? 'bloqueado'
        : normalized.includes('abierto')
          ? 'abierto'
        : normalized.includes('cerrado')
          ? 'cerrado'
        : normalized.includes('complet')
          ? 'completado'
        : normalized.includes('archiv')
          ? 'archivado'
        : normalized.includes('pausado')
            ? 'pausado'
            : normalized.includes('vigente')
              ? 'vigente'
              : normalized.includes('entregado')
                ? 'entregado'
                : normalized.includes('activo')
                  ? 'activo'
                  : 'pendiente'

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stylesByVariant[variant]}`}
    >
      {value}
    </span>
  )
}

export default StatusBadge
