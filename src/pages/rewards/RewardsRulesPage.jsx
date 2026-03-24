import { useMemo, useState } from 'react'
import { Gift, PlusCircle, Settings2, ShieldCheck, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { useLoyaltyProgramStore } from '../../store/useLoyaltyProgramStore'
import { useOperationsStore } from '../../store/useOperationsStore'

const rewardColumns = [
  { key: 'name', label: 'Premio' },
  { key: 'requiredVisits', label: 'Visitas requeridas' },
  { key: 'stockAvailable', label: 'Stock' },
  { key: 'status', label: 'Estado' },
]

function RewardsRulesPage() {
  const rulebook = useLoyaltyProgramStore((state) => state.rulebook)
  const health = useLoyaltyProgramStore((state) => state.health)
  const setMilestones = useLoyaltyProgramStore((state) => state.setMilestones)

  const users = useOperationsStore((state) => state.users)
  const rewards = useOperationsStore((state) => state.rewards)
  const redemptions = useOperationsStore((state) => state.redemptions)
  const upsertReward = useOperationsStore((state) => state.upsertReward)
  const updateRewardStatus = useOperationsStore((state) => state.updateRewardStatus)
  const redeemRewardOperation = useOperationsStore((state) => state.redeemRewardOperation)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rewardDraft, setRewardDraft] = useState({
    name: '',
    requiredVisits: 8,
    stockAvailable: 20,
    maxPerUser: 1,
    stockType: 'finite',
    status: 'active',
    validFromCustom: '2026-01-01T00:00:00.000-06:00',
    validUntilCustom: '2026-12-31T23:59:59.000-06:00',
  })
  const [redeemDraft, setRedeemDraft] = useState({
    userId: users[0]?.userId || '',
    rewardId: rewards[0]?.rewardId || '',
    notes: '',
  })

  const activeRewards = rewards.filter((reward) => reward.status === 'active').length
  const totalStock = rewards.reduce((acc, reward) => acc + Number(reward.stockAvailable || 0), 0)
  const pendingRedemptions = redemptions.filter((entry) => entry.status === 'approved').length

  const redemptionPreview = useMemo(() => redemptions.slice(0, 4), [redemptions])

  const handleRewardSave = (event) => {
    event.preventDefault()
    if (!rewardDraft.name.trim()) {
      toast.error('El nombre del premio es obligatorio.')
      return
    }
    upsertReward(rewardDraft, 'admin-ui')
    setRewardDraft((previous) => ({ ...previous, name: '' }))
    toast.success('Premio configurado en operación.')
  }

  const handleRedeem = async (event) => {
    event.preventDefault()
    if (!redeemDraft.userId || !redeemDraft.rewardId) {
      toast.error('Selecciona usuario y premio.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await redeemRewardOperation(redeemDraft)
      if (result.ok) {
        toast.success('Canje aprobado por motor transaccional.')
      } else {
        toast.error(`Canje rechazado: ${result.reason || 'UNKNOWN'}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 4 · Step 4"
        title="Operación de premios y regalías"
        description="Configura catálogo de premios, reglas de visita y ejecuta canjes en flujo operativo."
        action={
          <button
            type="button"
            onClick={() => setMilestones([8, 16, 24], 'admin-ui')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Restaurar milestones 8/16/24
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Gift} label="Premios activos" value={activeRewards} hint="Listos para canje" />
        <StatCard icon={Trophy} label="Stock total" value={totalStock} hint="Inventario operativo" />
        <StatCard icon={Settings2} label="Milestones" value={rulebook.milestones.join(' / ')} hint="Regla de acumulación" />
        <StatCard icon={ShieldCheck} label="Canjes recientes" value={pendingRedemptions} hint={health.ready ? 'Flujo consistente' : 'Revisar reglas'} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] items-start">
        <SectionCard
          title="Configurar premio"
          description="Alta rápida para promociones y recompensas del programa."
        >
          <form onSubmit={handleRewardSave} className="space-y-3">
            <input
              value={rewardDraft.name}
              onChange={(event) =>
                setRewardDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Nombre del premio"
            />
            <input
              value={rewardDraft.requiredVisits}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  requiredVisits: Number(event.target.value || 0),
                }))
              }
              type="number"
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Visitas requeridas"
            />
            <input
              value={rewardDraft.stockAvailable}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  stockAvailable: Number(event.target.value || 0),
                }))
              }
              type="number"
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Stock disponible"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <PlusCircle size={16} /> Guardar premio
              </span>
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Catálogo de premios"
          description="Control de estado para activar/pausar recompensas en tiempo real."
        >
          <TableCard
            columns={rewardColumns}
            rows={rewards}
            emptyMessage="No hay premios configurados."
            renderCell={(column, row) => {
              if (column === 'name') {
                return (
                  <div>
                    <p className="font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-ink/60">{row.rewardId}</p>
                  </div>
                )
              }

              if (column === 'requiredVisits') {
                return `${row.requiredVisits} visitas`
              }

              if (column === 'status') {
                return (
                  <div className="flex items-center gap-2">
                    <StatusBadge value={row.status === 'active' ? 'Activo' : 'Pausado'} />
                    <button
                      type="button"
                      onClick={() =>
                        updateRewardStatus(
                          row.rewardId,
                          row.status === 'active' ? 'paused' : 'active',
                          'admin-ui',
                        )
                      }
                      className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink"
                    >
                      {row.status === 'active' ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                )
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] items-start">
        <SectionCard
          title="Ejecutar canje"
          description="Flujo administrativo de canje contra saldo de visitas."
        >
          <form onSubmit={handleRedeem} className="space-y-3">
            <select
              value={redeemDraft.userId}
              onChange={(event) =>
                setRedeemDraft((previous) => ({ ...previous, userId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
            >
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.fullName} · saldo {user.visitBalanceCached}
                </option>
              ))}
            </select>
            <select
              value={redeemDraft.rewardId}
              onChange={(event) =>
                setRedeemDraft((previous) => ({ ...previous, rewardId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
            >
              {rewards.map((reward) => (
                <option key={reward.rewardId} value={reward.rewardId}>
                  {reward.name} · {reward.requiredVisits} visitas
                </option>
              ))}
            </select>
            <textarea
              value={redeemDraft.notes}
              onChange={(event) =>
                setRedeemDraft((previous) => ({ ...previous, notes: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Notas del canje (opcional)"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {isSubmitting ? 'Ejecutando...' : 'Ejecutar canje'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Últimos canjes del módulo"
          description="Monitoreo rápido del resultado de canjes recientes."
        >
          <div className="grid gap-3">
            {redemptionPreview.length ? (
              redemptionPreview.map((entry) => (
                <article
                  key={entry.redemptionId}
                  className="rounded-xl border border-secondary/20 bg-surface/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{entry.userName}</p>
                      <p className="text-xs text-ink/60">{entry.rewardName}</p>
                    </div>
                    <StatusBadge
                      value={
                        entry.status === 'approved'
                          ? 'Entregado'
                          : entry.status === 'pending'
                            ? 'Pendiente'
                            : 'Pausado'
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-ink/75">
                    {entry.reason ? `Bloqueo: ${entry.reason}` : `Visitas usadas: ${entry.visitsUsed}`}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-secondary/30 bg-surface/60 p-6 text-center text-sm text-ink/70">
                Sin canjes en este módulo todavía.
              </p>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  )
}

export default RewardsRulesPage

