import { History, FileBarChart, PackageCheck, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { redemptions } from '../../data/mvpData'
import { formatDayMonth, formatDayMonthYear } from '../../lib/dateFormat'

const redemptionColumns = [
  { key: 'alumno', label: 'Alumno' },
  { key: 'premio', label: 'Premio' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'visitasUsadas', label: 'Visitas usadas' },
  { key: 'estado', label: 'Estado' },
]

function RedemptionsReportsPage() {
  const delivered = redemptions.filter((item) => item.estado === 'Entregado').length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 5"
        title="Historial y reportes de canjes"
        description="Consolida canjes por periodo, premios más solicitados y trazabilidad de entrega."
        action={
          <button
            type="button"
            onClick={() => toast.success('Exportador de reportes base disponible.')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> Exportar reporte
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={History} label="Canjes del mes" value={redemptions.length} hint="Periodo actual" />
        <StatCard icon={PackageCheck} label="Canjes entregados" value={delivered} hint="Cierre operativo" />
        <StatCard icon={FileBarChart} label="Tasa de entrega" value="67%" hint="Efectividad del flujo" />
        <StatCard icon={History} label="Último corte" value={formatDayMonth()} hint="Actualizado" />
      </section>

      <SectionCard
        title="Bitácora de canjes"
        description="Registro listo para conexión con historial persistente en Firestore."
      >
        <TableCard
          columns={redemptionColumns}
          rows={redemptions}
          emptyMessage="No hay canjes registrados en este periodo."
          renderCell={(column, row) => {
            if (column === 'alumno') {
              return (
                <div>
                  <p className="font-semibold text-ink">{row.alumno}</p>
                  <p className="text-xs text-ink/60">{row.id}</p>
                </div>
              )
            }

            if (column === 'fecha') {
              return formatDayMonthYear(row.fecha)
            }

            if (column === 'estado') {
              return <StatusBadge value={row.estado} />
            }

            return row[column]
          }}
        />
      </SectionCard>
    </div>
  )
}

export default RedemptionsReportsPage
