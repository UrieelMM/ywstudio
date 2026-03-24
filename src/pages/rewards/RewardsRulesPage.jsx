import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Gift, PlusCircle, Settings2, ShieldCheck, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
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

const toDateTimeLocal = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm') : ''
}

const toCustomTimestamp = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : ''
}

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
  const [isSavingReward, setIsSavingReward] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)
  const [rewardDraft, setRewardDraft] = useState({
    name: '',
    requiredVisits: 8,
    stockAvailable: 20,
    maxPerUser: 1,
    stockType: 'finite',
    status: 'active',
    validFromLocal: toDateTimeLocal('2026-01-01T00:00:00.000-06:00'),
    validUntilLocal: toDateTimeLocal('2026-12-31T23:59:59.000-06:00'),
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

  const handleRewardSave = async (event) => {
    event.preventDefault()
    if (!rewardDraft.name.trim()) {
      toast.error('El nombre del premio es obligatorio.')
      return
    }

    const validFromCustom = toCustomTimestamp(rewardDraft.validFromLocal)
    const validUntilCustom = toCustomTimestamp(rewardDraft.validUntilLocal)
    const validFromDate = dayjs(validFromCustom)
    const validUntilDate = dayjs(validUntilCustom)

    if (!validFromDate.isValid() || !validUntilDate.isValid()) {
      toast.error('Selecciona una vigencia válida para el premio.')
      return
    }

    if (!validUntilDate.isAfter(validFromDate)) {
      toast.error('La vigencia final del premio debe ser mayor a la inicial.')
      return
    }

    setIsSavingReward(true)

    const result = await upsertReward(
      {
        ...rewardDraft,
        validFromCustom,
        validUntilCustom,
      },
      'admin-ui',
    )

    if (!result.ok) {
      toast.error(result.message || 'No fue posible guardar el premio.')
      setIsSavingReward(false)
      return
    }

    setRewardDraft((previous) => ({ ...previous, name: '' }))
    setIsRewardModalOpen(false)
    toast.success('Premio guardado en Firebase.')
    setIsSavingReward(false)
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
        setIsRedeemModalOpen(false)
        setRedeemDraft(prev => ({...prev, notes: ''}))
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMilestones([8, 16, 24], 'admin-ui')}
              className="rounded-xl border border-secondary/25 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-95"
            >
              Restaurar milestones
            </button>
            <button
              type="button"
              onClick={() => setIsRewardModalOpen(true)}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <Gift size={16} /> Configurar premio
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsRedeemModalOpen(true)}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} /> Ejecutar canje
              </span>
            </button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Gift} label="Premios activos" value={activeRewards} hint="Listos para canje" />
        <StatCard icon={Trophy} label="Stock total" value={totalStock} hint="Inventario operativo" />
        <StatCard icon={Settings2} label="Milestones" value={rulebook.milestones.join(' / ')} hint="Regla de acumulación" />
        <StatCard icon={ShieldCheck} label="Canjes recientes" value={pendingRedemptions} hint={health.ready ? 'Flujo consistente' : 'Revisar reglas'} />
      </section>

      <section className="grid gap-6 items-start">

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
                      onClick={async () => {
                        const result = await updateRewardStatus(
                          row.rewardId,
                          row.status === 'active' ? 'paused' : 'active',
                          'admin-ui',
                        )
                        if (!result.ok) {
                          toast.error(result.message || 'No se pudo actualizar el estado del premio.')
                          return
                        }
                        toast.success('Estado de premio actualizado.')
                      }}
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

      <section className="grid gap-6 items-start">

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

      <Modal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        title="Configurar premio"
        subtitle="Registro de promociones y recompensas del programa."
        size="max-w-xl"
      >
        <form onSubmit={handleRewardSave} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="rewardName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Nombre del premio *
            </label>
            <input
              id="rewardName"
              value={rewardDraft.name}
              onChange={(event) =>
                setRewardDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. Clase extra gratis"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="requiredVisits"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Visitas requeridas *
            </label>
            <input
              id="requiredVisits"
              value={rewardDraft.requiredVisits}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  requiredVisits: Number(event.target.value || 0),
                }))
              }
              type="number"
              min="1"
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. 8"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="stockType" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Tipo de inventario *
            </label>
            <select
              id="stockType"
              value={rewardDraft.stockType}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  stockType: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              <option value="finite">Finite</option>
              <option value="infinite">Infinite</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="stockAvailable"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Stock disponible *
            </label>
            <input
              id="stockAvailable"
              value={rewardDraft.stockAvailable}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  stockAvailable: Number(event.target.value || 0),
                }))
              }
              type="number"
              min="0"
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. 20"
              required
              disabled={rewardDraft.stockType === 'infinite'}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="maxPerUser" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Máximo por usuario *
            </label>
            <input
              id="maxPerUser"
              value={rewardDraft.maxPerUser}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  maxPerUser: Number(event.target.value || 0),
                }))
              }
              type="number"
              min="1"
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. 1"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="rewardStatus" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Estado *
            </label>
            <select
              id="rewardStatus"
              value={rewardDraft.status}
              onChange={(event) =>
                setRewardDraft((previous) => ({ ...previous, status: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="retired">Retirado</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="rewardValidFrom"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Vigencia desde *
            </label>
            <input
              id="rewardValidFrom"
              type="datetime-local"
              value={rewardDraft.validFromLocal}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  validFromLocal: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="rewardValidUntil"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Vigencia hasta *
            </label>
            <input
              id="rewardValidUntil"
              type="datetime-local"
              value={rewardDraft.validUntilLocal}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  validUntilLocal: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSavingReward}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSavingReward ? <Spinner className="h-4 w-4 text-white" /> : <PlusCircle size={16} />}
            <span>{isSavingReward ? 'Guardando...' : 'Guardar premio'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        title="Ejecutar canje"
        subtitle="Flujo administrativo de canje contra saldo de visitas."
        size="max-w-xl"
      >
        <form onSubmit={handleRedeem} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="redeemUser" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Alumno *
            </label>
            <select
              id="redeemUser"
              value={redeemDraft.userId}
              onChange={(event) =>
                setRedeemDraft((previous) => ({ ...previous, userId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.fullName} · saldo {user.visitBalanceCached}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="redeemReward" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Premio *
            </label>
            <select
              id="redeemReward"
              value={redeemDraft.rewardId}
              onChange={(event) =>
                setRedeemDraft((previous) => ({ ...previous, rewardId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              {rewards.map((reward) => (
                <option key={reward.rewardId} value={reward.rewardId}>
                  {reward.name} · {reward.requiredVisits} visitas
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="redeemNotes" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Notas del canje
            </label>
            <textarea
              id="redeemNotes"
              value={redeemDraft.notes}
              onChange={(event) =>
                setRedeemDraft((previous) => ({ ...previous, notes: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Opcional. Ej. entrega en recepción por la tarde"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
             {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <ShieldCheck size={16} />}
             <span>{isSubmitting ? 'Ejecutando...' : 'Ejecutar canje'}</span>
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default RewardsRulesPage
