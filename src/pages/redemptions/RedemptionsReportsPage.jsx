import { useMemo } from 'react'
import dayjs from 'dayjs'
import {
  Bell,
  Download,
  FileBarChart,
  History,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { buildGovernanceMetrics } from '../../domain/loyalty/governanceMetrics'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { formatDayMonth } from '../../lib/dateFormat'
import { getFriendlyReason, getFriendlyRedemptionStatus } from '../../lib/loyaltyMessages'
import { useGovernanceStore } from '../../store/useGovernanceStore'
import { useOperationsStore } from '../../store/useOperationsStore'

const redemptionColumns = [
  { key: 'userName', label: 'Alumno' },
  { key: 'rewardName', label: 'Premio' },
  { key: 'visitsUsed', label: 'Visitas usadas' },
  { key: 'status', label: 'Estado' },
  { key: 'requestedAtCustom', label: 'Fecha' },
]

const getRedemptionBadge = (status) => {
  if (status === 'approved') {
    return 'Pendiente de entrega'
  }
  return getFriendlyRedemptionStatus(status)
}

const BIRTHDAY_NOTIFICATION_TYPE = 'birthday_today'

function RedemptionsReportsPage() {
  const users = useOperationsStore((state) => state.users)
  const rewards = useOperationsStore((state) => state.rewards)
  const checkIns = useOperationsStore((state) => state.checkIns)
  const redemptions = useOperationsStore((state) => state.redemptions)
  const notifications = useOperationsStore((state) => state.notifications)
  const resolveRedemptionStatus = useOperationsStore((state) => state.resolveRedemptionStatus)

  const lastReview = useGovernanceStore((state) => state.lastReview)
  const runGovernanceReview = useGovernanceStore((state) => state.runGovernanceReview)

  const approved = redemptions.filter((entry) => entry.status === 'approved').length
  const delivered = redemptions.filter((entry) => entry.status === 'delivered').length
  const rejected = redemptions.filter((entry) => entry.status === 'rejected').length
  const unreadNotifications = notifications.filter((entry) => !entry.isRead).length

  const liveMetrics = useMemo(
    () =>
      buildGovernanceMetrics({
        users,
        rewards,
        checkIns,
        redemptions,
      }),
    [users, rewards, checkIns, redemptions],
  )

  const recentNotifications = useMemo(
    () => [...notifications].sort((a, b) => dayjs(b.createdAtCustom).valueOf() - dayjs(a.createdAtCustom).valueOf()).slice(0, 10),
    [notifications],
  )

  const handleRunReview = () => {
    const metrics = runGovernanceReview({
      users,
      rewards,
      checkIns,
      redemptions,
    })
    toast.success(`Indicadores actualizados. Salud general: ${metrics.score}%.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reportes"
        title="Canjes e historial"
        description="Da seguimiento a canjes y al estado general del programa."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRunReview}
              className="rounded-xl border border-secondary/30 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:bg-secondary/5 hover:border-secondary/60 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
            >
              Actualizar indicadores
            </button>
            <button
              type="button"
              onClick={() => toast.success('Exportación lista para conectar a CSV/PDF.')}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
            >
              <span className="inline-flex items-center gap-2">
                <Download size={16} /> Exportar
              </span>
            </button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={History} label="Canjes registrados" value={redemptions.length} hint="Operación actual" />
        <StatCard icon={PackageCheck} label="Aprobados" value={approved} hint="Pendientes de entrega" />
        <StatCard icon={ShieldCheck} label="Entregados" value={delivered} hint="Cierre operativo" />
        <StatCard icon={FileBarChart} label="Rechazados" value={rejected} hint="Con bloqueo aplicado" />
        <StatCard icon={Bell} label="Notificaciones sin leer" value={unreadNotifications} hint="Revisar en el header" />
      </section>

      <SectionCard
        title="Salud del programa"
        description="Indicadores clave para monitorear el rendimiento del plan de lealtad."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {liveMetrics.kpis.map((kpi) => (
            <article
              key={kpi.id}
              className="rounded-xl border border-secondary/15 bg-surface/70 p-4 shadow-sm transition-shadow duration-300 hover:shadow-soft"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-ink/60">{kpi.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">
                {kpi.value}
                {kpi.unit}
              </p>
              <div className="mt-2">
                <StatusBadge value={kpi.status} />
              </div>
              <p className="mt-2 text-xs text-ink/65">Meta: {kpi.target}%</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink/75">
          Última revisión guardada:{' '}
          <span className="font-semibold text-ink">
            {lastReview ? `${lastReview.score}% (${formatDayMonth(lastReview.createdAtCustom)})` : 'Sin revisión aún'}
          </span>
        </p>
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard
          title="Historial de canjes"
          description="Seguimiento de canjes con actualización rápida de estado."
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
                return (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge value={getRedemptionBadge(row.status)} />
                      {row.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await resolveRedemptionStatus(
                              row.redemptionId,
                              'delivered',
                              'admin-ui',
                            )
                            if (!result?.ok) {
                              toast.error(result?.message || 'No fue posible actualizar el canje.')
                              return
                            }
                            toast.success('Canje marcado como entregado.')
                          }}
                          className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                        >
                          Entregar
                        </button>
                      ) : null}
                    </div>
                    {row.status === 'rejected' && row.reason ? (
                      <p className="text-xs text-ink/70">{getFriendlyReason(row.reason)}</p>
                    ) : null}
                  </div>
                )
              }

              if (column === 'rewardName') {
                return (
                  <div>
                    <p className="font-semibold text-ink">{row.rewardName}</p>
                    {row.reason ? (
                      <p className="text-xs text-ink/60">Motivo: {getFriendlyReason(row.reason)}</p>
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
          description="Eventos importantes del programa para el equipo."
        >
          <div className="space-y-2">
            {recentNotifications.length ? (
              recentNotifications.map((notification) => (
                <article
                  key={notification.notificationId}
                  className={`rounded-xl border px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-soft ${
                    notification.type === BIRTHDAY_NOTIFICATION_TYPE
                      ? 'border-secondary/35 bg-gradient-to-r from-primary/35 to-white hover:border-secondary/45'
                      : 'border-secondary/15 bg-surface/70 hover:border-secondary/30'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{notification.title}</p>
                  <p className="text-xs text-ink/70">{notification.message}</p>
                  <p className="mt-1 text-xs text-ink/60">
                    {dayjs(notification.createdAtCustom).format('DD MMM YYYY · HH:mm')}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-secondary/30 bg-surface/60 p-4 text-sm text-ink/70">
                Aún no hay actividad relevante para mostrar.
              </p>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  )
}

export default RedemptionsReportsPage
