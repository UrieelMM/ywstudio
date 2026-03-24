import { useState } from 'react'
import dayjs from 'dayjs'
import { MapPin, PlusCircle, QrCode, ScanLine, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { formatDayMonthYear } from '../../lib/dateFormat'
import { useOperationsStore } from '../../store/useOperationsStore'

const qrColumns = [
  { key: 'name', label: 'Campaña QR' },
  { key: 'branchId', label: 'Sede' },
  { key: 'disciplineId', label: 'Disciplina' },
  { key: 'scans', label: 'Escaneos' },
  { key: 'status', label: 'Estado' },
  { key: 'validity', label: 'Vigencia' },
]

const toDateTimeLocal = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm') : ''
}

const toCustomTimestamp = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : ''
}

function QrManagementPage() {
  const qrCampaigns = useOperationsStore((state) => state.qrCampaigns)
  const createQrCampaign = useOperationsStore((state) => state.createQrCampaign)
  const updateQrStatus = useOperationsStore((state) => state.updateQrStatus)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    branchId: 'Centro',
    disciplineId: 'Ballet',
    mode: 'session',
    validFromLocal: toDateTimeLocal('2026-04-01T00:00:00.000-06:00'),
    validUntilLocal: toDateTimeLocal('2026-06-30T23:59:59.000-06:00'),
    cooldownMinutes: 90,
    maxScansPerUserPerDay: 2,
  })

  const activeQrs = qrCampaigns.filter((item) => item.status === 'active').length
  const totalScans = qrCampaigns.reduce((acc, item) => acc + Number(item.scans || 0), 0)

  const handleCreateQr = async (event) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      toast.error('El nombre del QR es obligatorio.')
      return
    }

    const validFromCustom = toCustomTimestamp(draft.validFromLocal)
    const validUntilCustom = toCustomTimestamp(draft.validUntilLocal)
    const validFromDate = dayjs(validFromCustom)
    const validUntilDate = dayjs(validUntilCustom)

    if (!validFromDate.isValid() || !validUntilDate.isValid()) {
      toast.error('Selecciona fechas de vigencia válidas.')
      return
    }

    if (!validUntilDate.isAfter(validFromDate)) {
      toast.error('La fecha de vigencia final debe ser mayor que la inicial.')
      return
    }

    setIsSubmitting(true)
    const result = await createQrCampaign(
      {
        ...draft,
        validFromCustom,
        validUntilCustom,
      },
      'admin-ui',
    )

    if (!result.ok) {
      toast.error(result.message || 'No fue posible crear la campaña QR.')
      setIsSubmitting(false)
      return
    }

    setDraft((previous) => ({
      ...previous,
      name: '',
    }))
    toast.success('Campaña QR creada en Firebase.')
    setIsCreateModalOpen(false)
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 2 · Step 4"
        title="Operación de códigos QR"
        description="Crear campañas, pausar/activar QR y controlar condiciones operativas por disciplina."
        action={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <PlusCircle size={16} /> Crear campaña
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={QrCode} label="QRs activos" value={activeQrs} hint="Disponibles para escaneo" />
        <StatCard icon={ScanLine} label="Escaneos acumulados" value={totalScans} hint="En campañas vigentes" />
        <StatCard icon={MapPin} label="Sedes en operación" value="2" hint="Centro / Norte" />
        <StatCard icon={Settings2} label="Modo principal" value="session" hint="Control por clase" />
      </section>

      <section className="grid gap-6 items-start">

        <SectionCard
          title="Campañas QR activas"
          description="Controla estado y trazabilidad operativa de cada QR."
        >
          <TableCard
            columns={qrColumns}
            rows={qrCampaigns}
            emptyMessage="No hay campañas registradas."
            renderCell={(column, row) => {
              if (column === 'name') {
                return (
                  <div>
                    <p className="font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-ink/60">{row.qrCodeId}</p>
                  </div>
                )
              }

              if (column === 'status') {
                const label = row.status === 'active' ? 'Activo' : 'Pausado'
                return (
                  <div className="flex items-center gap-2">
                    <StatusBadge value={label} />
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await updateQrStatus(
                          row.qrCodeId,
                          row.status === 'active' ? 'paused' : 'active',
                          'admin-ui',
                        )
                        if (!result.ok) {
                          toast.error(result.message || 'No se pudo actualizar el estado del QR.')
                          return
                        }
                        toast.success('Estado de QR actualizado.')
                      }}
                      className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink"
                    >
                      {row.status === 'active' ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                )
              }

              if (column === 'validity') {
                return `${formatDayMonthYear(row.validFromCustom)} - ${formatDayMonthYear(
                  row.validUntilCustom,
                )}`
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear campaña QR"
        subtitle="Configura vigencia y límites operativos para validación de asistencia."
        size="max-w-xl"
      >
        <form onSubmit={handleCreateQr} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="qrName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Nombre de campaña *
            </label>
            <input
              id="qrName"
              value={draft.name}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. Ballet matutino abril"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="qrBranch" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Sede *
            </label>
            <select
              id="qrBranch"
              value={draft.branchId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, branchId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              <option>Centro</option>
              <option>Norte</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="qrDiscipline"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Disciplina *
            </label>
            <select
              id="qrDiscipline"
              value={draft.disciplineId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, disciplineId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              <option>Ballet</option>
              <option>Jazz</option>
              <option>Contemporáneo</option>
              <option>Hip Hop</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="validFromLocal"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Vigencia desde *
            </label>
            <input
              id="validFromLocal"
              type="datetime-local"
              value={draft.validFromLocal}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, validFromLocal: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="validUntilLocal"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Vigencia hasta *
            </label>
            <input
              id="validUntilLocal"
              type="datetime-local"
              value={draft.validUntilLocal}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, validUntilLocal: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="cooldownMinutes"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Cooldown por usuario (minutos) *
            </label>
            <input
              id="cooldownMinutes"
              type="number"
              min="1"
              value={draft.cooldownMinutes}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  cooldownMinutes: Number(event.target.value || 0),
                }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. 90"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="maxScans"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Máximo de escaneos por día *
            </label>
            <input
              id="maxScans"
              type="number"
              min="1"
              value={draft.maxScansPerUserPerDay}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  maxScansPerUserPerDay: Number(event.target.value || 0),
                }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. 2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <PlusCircle size={16} />}
            <span>{isSubmitting ? 'Creando...' : 'Crear QR'}</span>
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default QrManagementPage
