import { Download, FileBarChart, History, PackageCheck, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { formatDayMonth } from '../../lib/dateFormat'
import { useOperationsStore } from '../../store/useOperationsStore'

const redemptionColumns = [
  { key: 'userName', label: 'Alumno' },
  { key: 'rewardName', label: 'Premio' },
  { key: 'visitsUsed', label: 'Visitas usadas' },
  { key: 'status', label: 'Estado' },
  { key: 'requestedAtCustom', label: 'Fecha' },
]

function RedemptionsReportsPage() {
  const redemptions = useOperationsStore((state) => state.redemptions)
  const resolveRedemptionStatus = useOperationsStore((state) => state.resolveRedemptionStatus)
  const activityFeed = useOperationsStore((state) => state.activityFeed)

  const approved = redemptions.filter((entry) => entry.status === 'approved').length
  const delivered = redemptions.filter((entry) => entry.status === 'delivered').length
  const rejected = redemptions.filter((entry) => entry.status === 'rejected').length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 5 · Step 4"
        title="Operación de canjes y reportes"
        description="Monitorea canjes, cambia estados y da seguimiento a trazabilidad operativa."
        action={
          <button
            type="button"
            onClick={() => toast.success('Exportación lista para conectar a CSV/PDF.')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> Exportar
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={History} label="Canjes registrados" value={redemptions.length} hint="Desde step operativo" />
        <StatCard icon={PackageCheck} label="Aprobados" value={approved} hint="Pendientes de entrega" />
        <StatCard icon={ShieldCheck} label="Entregados" value={delivered} hint="Cierre operativo" />
        <StatCard icon={FileBarChart} label="Rechazados" value={rejected} hint="Con razón de bloqueo" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard
          title="Bitácora de canjes"
          description="Panel de seguimiento con cambios de estado en un clic."
        >
          <TableCard
            columns={redemptionColumns}
            rows={redemptions}
            emptyMessage="No hay canjes registrados aún."
            renderCell={(column, row) => {
              if (column === 'userName') {
                return (
                  <div>
                    <p className="font-semibold text-ink">{row.userName}</p>
                    <p className="text-xs text-ink/60">{row.redemptionId}</p>
                  </div>
                )
              }

              if (column === 'status') {
                const statusLabel =
                  row.status === 'approved'
                    ? 'Pendiente'
                    : row.status === 'delivered'
                      ? 'Entregado'
                      : 'Pausado'

                return (
                  <div className="flex items-center gap-2">
                    <StatusBadge value={statusLabel} />
                    {row.status !== 'delivered' ? (
                      <button
                        type="button"
                        onClick={() => resolveRedemptionStatus(row.redemptionId, 'delivered', 'admin-ui')}
                        className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink"
                      >
                        Entregar
                      </button>
                    ) : null}
                  </div>
                )
              }

              if (column === 'requestedAtCustom') {
                return formatDayMonth(row.requestedAtCustom)
              }

              return row[column]
            }}
          />
        </SectionCard>

        <SectionCard
          title="Actividad reciente"
          description="Eventos operativos más recientes del sistema."
        >
          <div className="space-y-2">
            {activityFeed.slice(0, 8).map((activity) => (
              <article
                key={activity.id}
                className="rounded-xl border border-secondary/20 bg-surface/70 px-3 py-2"
              >
                <p className="text-sm font-semibold text-ink">{activity.message}</p>
                <p className="text-xs text-ink/60">{formatDayMonth(activity.createdAtCustom)}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  )
}

export default RedemptionsReportsPage

