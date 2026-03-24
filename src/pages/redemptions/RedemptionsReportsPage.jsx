import { useMemo, useState } from 'react'
import {
  AlertTriangle,
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
import { useGovernanceStore } from '../../store/useGovernanceStore'
import { useOperationsStore } from '../../store/useOperationsStore'

const redemptionColumns = [
  { key: 'userName', label: 'Alumno' },
  { key: 'rewardName', label: 'Premio' },
  { key: 'visitsUsed', label: 'Visitas usadas' },
  { key: 'status', label: 'Estado' },
  { key: 'requestedAtCustom', label: 'Fecha' },
]

function RedemptionsReportsPage() {
  const users = useOperationsStore((state) => state.users)
  const rewards = useOperationsStore((state) => state.rewards)
  const checkIns = useOperationsStore((state) => state.checkIns)
  const redemptions = useOperationsStore((state) => state.redemptions)
  const resolveRedemptionStatus = useOperationsStore((state) => state.resolveRedemptionStatus)
  const activityFeed = useOperationsStore((state) => state.activityFeed)

  const riskRegister = useGovernanceStore((state) => state.riskRegister)
  const incidentLog = useGovernanceStore((state) => state.incidentLog)
  const lastReview = useGovernanceStore((state) => state.lastReview)
  const updateRiskStatus = useGovernanceStore((state) => state.updateRiskStatus)
  const addIncident = useGovernanceStore((state) => state.addIncident)
  const resolveIncident = useGovernanceStore((state) => state.resolveIncident)
  const runGovernanceReview = useGovernanceStore((state) => state.runGovernanceReview)
  const [incidentDraft, setIncidentDraft] = useState({
    title: '',
    severity: 'medium',
    summary: '',
  })

  const approved = redemptions.filter((entry) => entry.status === 'approved').length
  const delivered = redemptions.filter((entry) => entry.status === 'delivered').length
  const rejected = redemptions.filter((entry) => entry.status === 'rejected').length

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

  const activeIncidents = incidentLog.filter((incident) => incident.status === 'open').length

  const handleRunReview = () => {
    const metrics = runGovernanceReview({
      users,
      rewards,
      checkIns,
      redemptions,
    })
    toast.success(`Revisión ejecutada. Score ${metrics.score}%`)
  }

  const handleCreateIncident = (event) => {
    event.preventDefault()
    if (!incidentDraft.title.trim() || !incidentDraft.summary.trim()) {
      toast.error('Completa título y resumen del incidente.')
      return
    }
    const saveIncident = async () => {
      const result = await addIncident(incidentDraft, 'ops-ui')
      if (!result.ok) {
        toast.error(result.message || 'No fue posible registrar el incidente.')
        return
      }

      setIncidentDraft({ title: '', severity: 'medium', summary: '' })
      toast.success('Incidente registrado.')
    }

    saveIncident()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 5 · Step 5"
        title="Canjes, reportes e inteligencia operativa"
        description="Control operativo de canjes, salud del programa y seguimiento de incidentes."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRunReview}
              className="rounded-xl border border-secondary/30 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-secondary/60"
            >
              Ejecutar revisión
            </button>
            <button
              type="button"
              onClick={() => toast.success('Exportación lista para conectar a CSV/PDF.')}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
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
        <StatCard icon={AlertTriangle} label="Incidentes abiertos" value={activeIncidents} hint="Requieren atención" />
      </section>

      <SectionCard
        title="KPIs de gobernanza"
        description="Métricas premium para salud operativa y riesgo de producción."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {liveMetrics.kpis.map((kpi) => (
            <article
              key={kpi.id}
              className="rounded-xl border border-secondary/20 bg-surface/70 p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-ink/60">{kpi.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">
                {kpi.value}
                {kpi.unit}
              </p>
              <div className="mt-2">
                <StatusBadge value={kpi.status} />
              </div>
              <p className="mt-2 text-xs text-ink/65">Target {kpi.target}%</p>
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

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Incidentes"
          description="Registro y resolución de incidentes operativos."
        >
          <form onSubmit={handleCreateIncident} className="mb-4 space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="incidentTitle"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
              >
                Título del incidente *
              </label>
              <input
                id="incidentTitle"
                value={incidentDraft.title}
                onChange={(event) =>
                  setIncidentDraft((previous) => ({ ...previous, title: event.target.value }))
                }
                className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
                placeholder="Ej. Error de stock al aprobar canje"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="incidentSeverity"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
              >
                Severidad *
              </label>
              <select
                id="incidentSeverity"
                value={incidentDraft.severity}
                onChange={(event) =>
                  setIncidentDraft((previous) => ({ ...previous, severity: event.target.value }))
                }
                className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
                required
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="incidentSummary"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
              >
                Resumen operativo *
              </label>
              <textarea
                id="incidentSummary"
                value={incidentDraft.summary}
                onChange={(event) =>
                  setIncidentDraft((previous) => ({ ...previous, summary: event.target.value }))
                }
                className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
                placeholder="Describe el impacto, alcance y estado actual del incidente."
                required
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Crear incidente
            </button>
          </form>

          <div className="space-y-2">
            {incidentLog.length ? (
              incidentLog.map((incident) => (
                <article
                  key={incident.id}
                  className="rounded-xl border border-secondary/20 bg-surface/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{incident.title}</p>
                      <p className="text-xs text-ink/60">
                        {incident.severity} · {formatDayMonth(incident.createdAtCustom)}
                      </p>
                    </div>
                    <StatusBadge value={incident.status === 'open' ? 'Bloqueado' : 'Entregado'} />
                  </div>
                  <p className="mt-2 text-sm text-ink/75">{incident.summary}</p>
                  {incident.status === 'open' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await resolveIncident(incident.id, 'ops-ui')
                        if (!result?.ok) {
                          toast.error(result?.message || 'No fue posible resolver el incidente.')
                          return
                        }
                        toast.success('Incidente resuelto.')
                      }}
                      className="mt-2 rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink"
                    >
                      Resolver
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-secondary/30 bg-surface/60 p-4 text-sm text-ink/70">
                No hay incidentes registrados.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Registro de riesgos"
          description="Seguimiento de riesgos de negocio y mitigación."
        >
          <div className="space-y-2">
            {riskRegister.map((risk) => (
              <article
                key={risk.id}
                className="rounded-xl border border-secondary/20 bg-surface/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{risk.title}</p>
                    <p className="text-xs text-ink/60">Severidad: {risk.severity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={risk.status === 'open' ? 'Riesgo' : 'Entregado'} />
                    <button
                      type="button"
                      onClick={() =>
                        updateRiskStatus(risk.id, risk.status === 'open' ? 'mitigated' : 'open', 'ops-ui')
                      }
                      className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink"
                    >
                      {risk.status === 'open' ? 'Mitigar' : 'Reabrir'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink/75">{risk.mitigation}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  )
}

export default RedemptionsReportsPage
