import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Gift, Pencil, PlusCircle, ShieldCheck, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { getFriendlyReason, getFriendlyRedemptionStatus } from '../../lib/loyaltyMessages'
import { uploadEntityImage } from '../../services/storageUploadService'
import { useOperationsStore } from '../../store/useOperationsStore'

const rewardColumns = [
  { key: 'name', label: 'Premio' },
  { key: 'disciplineId', label: 'Disciplina' },
  { key: 'requiredVisits', label: 'Visitas requeridas' },
  { key: 'stockAvailable', label: 'Stock' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acciones' },
]

const toDateTimeLocal = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm') : ''
}

const toCustomTimestamp = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : ''
}

const MAX_IMAGE_SIZE_MB = 5

const createRewardId = () =>
  `reward_${dayjs().format('YYYYMMDDHHmmss')}_${Math.random().toString(36).slice(2, 6)}`

const createDefaultRewardDraft = () => ({
  rewardId: '',
  name: '',
  description: '',
  requiredVisits: 8,
  stockAvailable: 20,
  maxPerUser: 1,
  stockType: 'finite',
  status: 'active',
  rewardImageUrl: '',
  disciplineId: 'all',
  validFromLocal: toDateTimeLocal('2026-01-01T00:00:00.000-06:00'),
  validUntilLocal: toDateTimeLocal('2026-12-31T23:59:59.000-06:00'),
})

const readImagePreview = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No fue posible leer la imagen seleccionada.'))
    reader.readAsDataURL(file)
  })

function RewardsRulesPage() {
  const users = useOperationsStore((state) => state.users)
  const rewards = useOperationsStore((state) => state.rewards)
  const redemptions = useOperationsStore((state) => state.redemptions)
  const tenantId = useOperationsStore((state) => state.tenantId)
  const appConfig = useOperationsStore((state) => state.appConfig)
  const disciplineOptions = useMemo(() => appConfig.disciplines || [], [appConfig.disciplines])
  const upsertReward = useOperationsStore((state) => state.upsertReward)
  const updateRewardStatus = useOperationsStore((state) => state.updateRewardStatus)
  const redeemRewardOperation = useOperationsStore((state) => state.redeemRewardOperation)
  const [isSavingReward, setIsSavingReward] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)
  const [isRewardDetailModalOpen, setIsRewardDetailModalOpen] = useState(false)
  const [rewardDraft, setRewardDraft] = useState(createDefaultRewardDraft())
  const [selectedRewardDetail, setSelectedRewardDetail] = useState(null)
  const [rewardImageFile, setRewardImageFile] = useState(null)
  const [rewardImagePreview, setRewardImagePreview] = useState('')
  const [redeemDraft, setRedeemDraft] = useState({
    userId: users[0]?.userId || '',
    rewardId: rewards[0]?.rewardId || '',
    notes: '',
  })

  const activeRewards = rewards.filter((reward) => reward.status === 'active').length
  const totalStock = rewards.reduce((acc, reward) => acc + Number(reward.stockAvailable || 0), 0)
  const pendingRedemptions = redemptions.filter((entry) => entry.status === 'approved').length
  const averageVisitsToRedeem = rewards.length
    ? Math.round(rewards.reduce((acc, reward) => acc + Number(reward.requiredVisits || 0), 0) / rewards.length)
    : 0

  const redemptionPreview = useMemo(() => redemptions.slice(0, 4), [redemptions])

  useEffect(() => {
    if (!selectedRewardDetail?.rewardId) {
      return
    }

    const updatedReward = rewards.find((entry) => entry.rewardId === selectedRewardDetail.rewardId)
    if (!updatedReward) {
      setSelectedRewardDetail(null)
      setIsRewardDetailModalOpen(false)
      return
    }

    setSelectedRewardDetail(updatedReward)
  }, [rewards, selectedRewardDetail?.rewardId])

  const openCreateRewardModal = () => {
    setRewardDraft(createDefaultRewardDraft())
    setRewardImageFile(null)
    setRewardImagePreview('')
    setIsRewardModalOpen(true)
  }

  const openRewardDetails = (reward) => {
    setSelectedRewardDetail(reward)
    setIsRewardDetailModalOpen(true)
  }

  const startEditReward = (reward) => {
    setRewardDraft({
      rewardId: reward.rewardId || '',
      name: reward.name || '',
      description: reward.description || '',
      requiredVisits: Number(reward.requiredVisits || 1),
      stockAvailable: Number(reward.stockAvailable || 0),
      maxPerUser: 1,
      stockType: reward.stockType || 'finite',
      status: reward.status || 'active',
      rewardImageUrl: reward.rewardImageUrl || '',
      disciplineId: reward.disciplineId || 'all',
      validFromLocal: toDateTimeLocal(reward.validFromCustom),
      validUntilLocal: toDateTimeLocal(reward.validUntilCustom),
    })
    setRewardImageFile(null)
    setRewardImagePreview(reward.rewardImageUrl || '')
    setIsRewardModalOpen(true)
  }

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

    const rewardId = rewardDraft.rewardId || createRewardId()
    let rewardImageUrl = rewardDraft.rewardImageUrl || ''
    if (rewardImageFile) {
      try {
        const uploadResult = await uploadEntityImage({
          tenantId,
          entityType: 'rewards',
          entityId: rewardId,
          file: rewardImageFile,
        })
        rewardImageUrl = uploadResult.downloadURL
      } catch (error) {
        toast.error(error?.message || 'No fue posible subir la imagen del regalo.')
        setIsSavingReward(false)
        return
      }
    }

    const result = await upsertReward(
      {
        ...rewardDraft,
        rewardId,
        rewardImageUrl,
        maxPerUser: 1,
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

    setRewardDraft(createDefaultRewardDraft())
    setRewardImageFile(null)
    setRewardImagePreview('')
    setIsRewardModalOpen(false)
    toast.success('Premio guardado correctamente.')
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
        toast.success('Canje registrado correctamente.')
        setIsRedeemModalOpen(false)
        setRedeemDraft((previous) => ({ ...previous, notes: '' }))
      } else {
        toast.error(getFriendlyReason(result.reason))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRewardImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setRewardImageFile(null)
      setRewardImagePreview('')
      return
    }

    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error('La imagen supera el límite de 5 MB.')
      event.target.value = ''
      return
    }

    try {
      const preview = await readImagePreview(file)
      setRewardImageFile(file)
      setRewardImagePreview(preview)
    } catch (error) {
      toast.error(error?.message || 'No fue posible cargar la vista previa.')
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Premios"
        title="Premios y canjes"
        description="Configura tu catálogo de premios y procesa canjes de alumnos desde recepción."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateRewardModal}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
            >
              <span className="inline-flex items-center gap-2">
                <Gift size={16} /> Configurar premio
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsRedeemModalOpen(true)}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
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
        <StatCard
          icon={ShieldCheck}
          label="Visitas promedio para canje"
          value={averageVisitsToRedeem || 'N/A'}
          hint="Meta media del catálogo"
        />
        <StatCard icon={ShieldCheck} label="Canjes aprobados" value={pendingRedemptions} hint="Pendientes de entregar" />
      </section>

      <section className="grid gap-6 items-start">

        <SectionCard
          title="Catálogo de premios"
          description="Da clic sobre un premio para ver el detalle o editar su configuración."
        >
          <TableCard
            columns={rewardColumns}
            rows={rewards}
            emptyMessage="No hay premios configurados."
            onRowClick={(row) => openRewardDetails(row)}
            renderCell={(column, row) => {
              if (column === 'name') {
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-secondary/20 bg-surface shadow-sm">
                      {row.rewardImageUrl ? (
                        <img src={row.rewardImageUrl} alt={row.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-secondary">
                          <Gift size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{row.name}</p>
                      <p className="text-xs text-ink/60">{row.rewardId}</p>
                    </div>
                  </div>
                )
              }

              if (column === 'requiredVisits') {
                return `${row.requiredVisits} visitas`
              }

              if (column === 'disciplineId') {
                return row.disciplineId === 'all' ? 'Todas las disciplinas' : row.disciplineId
              }

              if (column === 'status') {
                return <StatusBadge value={row.status === 'active' ? 'Activo' : 'Pausado'} />
              }

              if (column === 'actions') {
                return (
                  <button
                    type="button"
                    onClick={() => startEditReward(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
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
                  className="rounded-xl border border-secondary/15 bg-surface/70 p-4 shadow-sm transition-shadow duration-300 hover:shadow-soft hover:border-secondary/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{entry.userName}</p>
                      <p className="text-xs text-ink/60">{entry.rewardName}</p>
                    </div>
                    <StatusBadge
                      value={getFriendlyRedemptionStatus(entry.status)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-ink/75">
                    {entry.reason
                      ? `Motivo: ${getFriendlyReason(entry.reason)}`
                      : `Visitas usadas: ${entry.visitsUsed}`}
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
        onClose={() => {
          setIsRewardModalOpen(false)
          setRewardDraft(createDefaultRewardDraft())
          setRewardImageFile(null)
          setRewardImagePreview('')
        }}
        title={rewardDraft.rewardId ? 'Editar premio' : 'Configurar premio'}
        subtitle="Registro de promociones y recompensas del programa."
        size="max-w-xl"
      >
        <form onSubmit={handleRewardSave} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="rewardImage" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Imagen del premio
            </label>
            <div className="rounded-xl border border-secondary/20 bg-surface/60 p-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-secondary/20 bg-white shadow-sm">
                  {rewardImagePreview ? (
                    <img src={rewardImagePreview} alt="Preview del premio" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-secondary">
                      <Gift size={20} />
                    </div>
                  )}
                </div>
                <input
                  id="rewardImage"
                  type="file"
                  accept="image/*"
                  onChange={handleRewardImageChange}
                  className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-secondary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary hover:border-secondary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <p className="mt-2 text-xs text-ink/60">PNG, JPG o WEBP. Máximo 5 MB.</p>
            </div>
          </div>

          {rewardDraft.rewardId ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
                Estado rápido
              </label>
              <div className="rounded-xl border border-secondary/20 bg-surface/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge value={rewardDraft.status === 'active' ? 'Activo' : 'Pausado'} />
                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = rewardDraft.status === 'active' ? 'paused' : 'active'
                      const result = await updateRewardStatus(
                        rewardDraft.rewardId,
                        nextStatus,
                        'admin-ui',
                      )
                      if (!result.ok) {
                        toast.error(result.message || 'No se pudo actualizar el estado del premio.')
                        return
                      }
                      setRewardDraft((previous) => ({
                        ...previous,
                        status: nextStatus,
                      }))
                      toast.success('Estado del premio actualizado.')
                    }}
                    className="rounded-lg border border-secondary/25 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  >
                    {rewardDraft.status === 'active' ? 'Pausar premio' : 'Activar premio'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Clase extra gratis"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="rewardDescription" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Descripción
            </label>
            <textarea
              id="rewardDescription"
              value={rewardDraft.description}
              onChange={(event) =>
                setRewardDraft((previous) => ({ ...previous, description: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. Canjea una clase adicional para cualquier disciplina."
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="rewardDiscipline" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Disciplina del premio *
            </label>
            <select
              id="rewardDiscipline"
              value={rewardDraft.disciplineId}
              onChange={(event) =>
                setRewardDraft((previous) => ({
                  ...previous,
                  disciplineId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            >
              <option value="all">Todas las disciplinas</option>
              {disciplineOptions.map((discipline) => (
                <option key={discipline} value={discipline}>
                  {discipline}
                </option>
              ))}
            </select>
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            >
              <option value="finite">Finito</option>
              <option value="infinite">Infinito</option>
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. 20"
              required
              disabled={rewardDraft.stockType === 'infinite'}
            />
          </div>

          <div className="rounded-xl border border-secondary/20 bg-surface/60 px-3 py-2 text-sm text-ink/80">
            Política de canje: este premio se puede canjear una sola vez por alumno.
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSavingReward}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Opcional. Ej. entrega en recepción por la tarde"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
             {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <ShieldCheck size={16} />}
             <span>{isSubmitting ? 'Ejecutando...' : 'Ejecutar canje'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isRewardDetailModalOpen}
        onClose={() => {
          setIsRewardDetailModalOpen(false)
          setSelectedRewardDetail(null)
        }}
        title="Detalle del premio"
        subtitle="Resumen claro de disponibilidad y condiciones de canje."
        size="max-w-2xl"
      >
        {selectedRewardDetail ? (
          <div className="space-y-4">
            <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-secondary/20 bg-white shadow-sm">
                  {selectedRewardDetail.rewardImageUrl ? (
                    <img
                      src={selectedRewardDetail.rewardImageUrl}
                      alt={selectedRewardDetail.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-secondary">
                      <Gift size={20} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{selectedRewardDetail.name}</p>
                  <p className="text-xs text-ink/60">{selectedRewardDetail.rewardId}</p>
                </div>
              </div>
              {selectedRewardDetail.description ? (
                <p className="mt-3 text-sm text-ink/75">{selectedRewardDetail.description}</p>
              ) : null}
            </article>

            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Condiciones</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Visitas necesarias</dt>
                    <dd className="font-semibold text-ink">{selectedRewardDetail.requiredVisits}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Disciplina</dt>
                    <dd className="font-semibold text-ink">
                      {selectedRewardDetail.disciplineId === 'all'
                        ? 'Todas las disciplinas'
                        : selectedRewardDetail.disciplineId || 'No registrado'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Canjes por alumno</dt>
                    <dd className="font-semibold text-ink">1 vez</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Estado</dt>
                    <dd className="font-semibold text-ink">
                      {selectedRewardDetail.status === 'active' ? 'Activo' : 'Pausado'}
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Disponibilidad</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Existencias actuales</dt>
                    <dd className="font-semibold text-ink">
                      {selectedRewardDetail.stockType === 'infinite'
                        ? 'Ilimitadas'
                        : Number(selectedRewardDetail.stockAvailable || 0)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Vigencia desde</dt>
                    <dd className="font-semibold text-ink">
                      {dayjs(selectedRewardDetail.validFromCustom).format('DD MMM YYYY · HH:mm')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Vigencia hasta</dt>
                    <dd className="font-semibold text-ink">
                      {dayjs(selectedRewardDetail.validUntilCustom).format('DD MMM YYYY · HH:mm')}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>

            <button
              type="button"
              onClick={() => {
                startEditReward(selectedRewardDetail)
                setIsRewardDetailModalOpen(false)
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-secondary/5 hover:border-secondary/45"
            >
              <Pencil size={14} />
              Editar premio
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default RewardsRulesPage
