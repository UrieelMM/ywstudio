import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ExternalLink, MapPin, PlusCircle, Printer, QrCode, ScanLine, Settings2, Trash2 } from 'lucide-react'
import { toDataURL } from 'qrcode'
import toast from 'react-hot-toast'
import defaultLogo from '../../assets/ywstudio_logo.jpg'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { formatDayMonthYear } from '../../lib/dateFormat'
import { getFriendlyQrMode } from '../../lib/loyaltyMessages'
import { useOperationsStore } from '../../store/useOperationsStore'

const qrColumns = [
  { key: 'name', label: 'Campaña QR' },
  { key: 'branchId', label: 'Sede' },
  { key: 'disciplineId', label: 'Disciplina' },
  { key: 'scans', label: 'Escaneos' },
  { key: 'status', label: 'Estado' },
  { key: 'validity', label: 'Vigencia' },
  { key: 'actions', label: 'Acciones' },
]

const toCustomTimestamp = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : ''
}

const getDefaultValidFromLocal = () => dayjs().startOf('day').format('YYYY-MM-DDTHH:mm')
const getDefaultValidUntilLocal = () => dayjs().add(90, 'day').endOf('day').format('YYYY-MM-DDTHH:mm')

const getPublicScanUrl = (qrCodeId) => {
  const origin = import.meta.env.VITE_PUBLIC_SCAN_BASE_URL || window.location.origin
  return `${String(origin).replace(/\/$/, '')}/scan/${encodeURIComponent(qrCodeId)}`
}

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function QrManagementPage() {
  const qrCampaigns = useOperationsStore((state) => state.qrCampaigns)
  const appConfig = useOperationsStore((state) => state.appConfig)
  const createQrCampaign = useOperationsStore((state) => state.createQrCampaign)
  const deleteQrCampaign = useOperationsStore((state) => state.deleteQrCampaign)
  const updateQrStatus = useOperationsStore((state) => state.updateQrStatus)
  const branchOptions = useMemo(() => appConfig.branches || [], [appConfig.branches])
  const disciplineOptions = useMemo(() => appConfig.disciplines || [], [appConfig.disciplines])
  const printableLogoUrl = appConfig.logoUrl || new URL(defaultLogo, window.location.origin).toString()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isQrDetailModalOpen, setIsQrDetailModalOpen] = useState(false)
  const [selectedQrDetail, setSelectedQrDetail] = useState(null)
  const [pendingDeleteQr, setPendingDeleteQr] = useState(null)
  const [selectedQr, setSelectedQr] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isGeneratingPrintQr, setIsGeneratingPrintQr] = useState(false)
  const [isDeletingQr, setIsDeletingQr] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    branchId: branchOptions[0] || '',
    disciplineId: 'all',
    mode: 'session',
    validFromLocal: getDefaultValidFromLocal(),
    validUntilLocal: getDefaultValidUntilLocal(),
    cooldownMinutes: 90,
    maxScansPerUserPerDay: 2,
  })

  useEffect(() => {
    setDraft((previous) => ({
      ...previous,
      branchId: branchOptions.includes(previous.branchId) ? previous.branchId : branchOptions[0] || '',
      disciplineId:
        previous.disciplineId === 'all' || disciplineOptions.includes(previous.disciplineId)
          ? previous.disciplineId
          : disciplineOptions[0] || 'all',
    }))
  }, [branchOptions, disciplineOptions])

  const activeQrs = qrCampaigns.filter((item) => item.status === 'active').length
  const pausedQrs = qrCampaigns.filter((item) => item.status !== 'active').length
  const expiringSoon = qrCampaigns.filter((item) => {
    if (item.status !== 'active') {
      return false
    }
    const validUntil = dayjs(item.validUntilCustom)
    if (!validUntil.isValid()) {
      return false
    }
    const now = dayjs()
    return !validUntil.isBefore(now) && validUntil.diff(now, 'day') <= 7
  }).length
  const totalScans = qrCampaigns.reduce((acc, item) => acc + Number(item.scans || 0), 0)
  const branchHint = branchOptions.slice(0, 3).join(' / ') || 'Configura sedes'

  const openQrDetails = (qr) => {
    setSelectedQrDetail(qr)
    setIsQrDetailModalOpen(true)
  }

  const requestDeleteQrCampaign = (qr) => {
    setPendingDeleteQr(qr)
  }

  const confirmDeleteQrCampaign = async () => {
    if (!pendingDeleteQr?.qrCodeId) {
      return
    }

    setIsDeletingQr(true)
    const result = await deleteQrCampaign(pendingDeleteQr.qrCodeId, 'admin-ui')
    setIsDeletingQr(false)
    if (!result.ok) {
      toast.error(result.message || 'No se pudo eliminar la campaña QR.')
      return
    }

    if (selectedQrDetail?.qrCodeId === pendingDeleteQr.qrCodeId) {
      setSelectedQrDetail(null)
      setIsQrDetailModalOpen(false)
    }

    if (selectedQr?.qrCodeId === pendingDeleteQr.qrCodeId) {
      setSelectedQr(null)
      setQrDataUrl('')
      setIsPrintModalOpen(false)
    }

    setPendingDeleteQr(null)
    toast.success('Campaña QR eliminada.')
  }

  const generatePrintableQr = async (campaign) => {
    setSelectedQr(campaign)
    setQrDataUrl('')
    setIsPrintModalOpen(true)
    setIsGeneratingPrintQr(true)
    try {
      const dataUrl = await toDataURL(getPublicScanUrl(campaign.qrCodeId), {
        width: 900,
        margin: 2,
        color: {
          dark: '#2f2219',
          light: '#fff9f5',
        },
      })
      setQrDataUrl(dataUrl)
    } catch {
      toast.error('No se pudo generar la imagen del QR para impresión.')
    } finally {
      setIsGeneratingPrintQr(false)
    }
  }

  const handlePrintQr = () => {
    if (!selectedQr || !qrDataUrl) {
      toast.error('Aún no hay QR listo para imprimir.')
      return
    }

    const publicUrl = getPublicScanUrl(selectedQr.qrCodeId)
    const safeName = escapeHtml(selectedQr.name)
    const safeBranch = escapeHtml(selectedQr.branchId)
    const safeDiscipline = escapeHtml(
      selectedQr.disciplineId === 'all' ? 'Todas las disciplinas' : selectedQr.disciplineId,
    )
    const safeQrId = escapeHtml(selectedQr.qrCodeId)
    const safePublicUrl = escapeHtml(publicUrl)
    const safeLogoUrl = escapeHtml(printableLogoUrl)
    const printWindow = window.open('', '_blank', 'width=900,height=900')
    if (!printWindow) {
      toast.error('Activa ventanas emergentes para imprimir el QR.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>QR ${safeName}</title>
        <style>
          body {
            font-family: "Roboto", sans-serif;
            margin: 0;
            padding: 24px;
            color: #2f2219;
            background: #fffdfb;
          }
          .card {
            max-width: 640px;
            margin: 0 auto;
            border: 1px solid #d8c0b2;
            border-radius: 18px;
            padding: 24px;
            text-align: center;
          }
          .logo {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto 12px;
            display: block;
            border: 1px solid #d8c0b2;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .meta {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 20px;
          }
          .qr {
            width: min(75vw, 380px);
            height: min(75vw, 380px);
          }
          .code {
            font-size: 12px;
            margin-top: 10px;
            opacity: 0.75;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <img class="logo" src="${safeLogoUrl}" alt="Logo" />
          <p class="title">${safeName}</p>
          <p class="meta">Sede: ${safeBranch} · Disciplina: ${safeDiscipline}</p>
          <img class="qr" src="${qrDataUrl}" alt="QR ${safeName}" />
          <p class="code">ID: ${safeQrId}</p>
          <p class="code">${safePublicUrl}</p>
        </section>
        <script>
          window.onload = () => {
            window.print()
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

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
    toast.success('Campaña QR creada correctamente.')
    setIsCreateModalOpen(false)
    setIsSubmitting(false)
  }

  const formatDateTime = (value) => {
    if (!value) {
      return 'No registrado'
    }
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.format('DD MMM YYYY · HH:mm') : value
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Códigos QR"
        title="Gestión de códigos QR"
        description="Crea campañas, imprime códigos y controla su vigencia para registrar asistencias."
        action={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
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
        <StatCard icon={MapPin} label="Sedes en operación" value={branchOptions.length} hint={branchHint} />
        <StatCard
          icon={Settings2}
          label="Campañas vigentes"
          value={activeQrs}
          hint={`${expiringSoon} por vencer (7 días) · ${pausedQrs} pausadas`}
        />
      </section>

      <section className="grid gap-6 items-start">

        <SectionCard
          title="Campañas QR activas"
          description="Controla estado, vigencia y uso de cada código QR."
        >
          <TableCard
            columns={qrColumns}
            rows={qrCampaigns}
            emptyMessage="No hay campañas registradas."
            onRowClick={(row) => openQrDetails(row)}
            renderCell={(column, row) => {
              if (column === 'name') {
                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => openQrDetails(row)}
                      className="text-left font-semibold text-ink underline-offset-2 transition hover:text-secondary hover:underline"
                    >
                      {row.name}
                    </button>
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
                      className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/50"
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

              if (column === 'disciplineId') {
                return row.disciplineId === 'all' ? 'Todas las disciplinas' : row.disciplineId
              }

              if (column === 'actions') {
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generatePrintableQr(row)}
                      className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-secondary/5 hover:border-secondary/40"
                    >
                      Generar e imprimir
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteQrCampaign(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 shadow-sm transition-all duration-200 hover:bg-rose-50"
                    >
                      <Trash2 size={12} />
                      Eliminar
                    </button>
                  </div>
                )
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
        subtitle="Define sede, disciplina y vigencia para registrar asistencias con QR."
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
              {!branchOptions.length ? (
                <option value="" disabled>
                  Configura sedes en la sección de Configuración
                </option>
              ) : null}
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            >
              <option value="all">Todas las disciplinas</option>
              {disciplineOptions.map((discipline) => (
                <option key={discipline} value={discipline}>
                  {discipline}
                </option>
              ))}
              {!disciplineOptions.length ? (
                <option value="" disabled>
                  Configura disciplinas en la sección de Configuración
                </option>
              ) : null}
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="maxScans"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              Máximo de escaneos por alumno por día *
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Ej. 2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <PlusCircle size={16} />}
            <span>{isSubmitting ? 'Creando...' : 'Crear QR'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isQrDetailModalOpen}
        onClose={() => setIsQrDetailModalOpen(false)}
        title="Detalle de campaña QR"
        subtitle="Información operativa completa de la campaña seleccionada."
        size="max-w-3xl"
      >
        {selectedQrDetail ? (
          <div className="space-y-4">
            <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-lg font-semibold text-ink">{selectedQrDetail.name}</p>
                <StatusBadge value={selectedQrDetail.status === 'active' ? 'Activo' : 'Pausado'} />
              </div>
              <p className="mt-1 text-xs text-ink/60">ID: {selectedQrDetail.qrCodeId}</p>
            </article>

            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Configuración</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Sede</dt>
                    <dd className="font-semibold text-ink">{selectedQrDetail.branchId || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Disciplina</dt>
                    <dd className="font-semibold text-ink">
                      {selectedQrDetail.disciplineId === 'all'
                        ? 'Todas las disciplinas'
                        : selectedQrDetail.disciplineId || 'No registrado'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Tipo de QR</dt>
                    <dd className="font-semibold text-ink">{getFriendlyQrMode(selectedQrDetail.mode)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Máximo por alumno/día</dt>
                    <dd className="font-semibold text-ink">{selectedQrDetail.maxScansPerUserPerDay ?? 2}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Tiempo mínimo entre registros</dt>
                    <dd className="font-semibold text-ink">{selectedQrDetail.cooldownMinutes ?? 90} min</dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Vigencia y auditoría</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Vigencia desde</dt>
                    <dd className="font-semibold text-ink">{formatDateTime(selectedQrDetail.validFromCustom)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Vigencia hasta</dt>
                    <dd className="font-semibold text-ink">{formatDateTime(selectedQrDetail.validUntilCustom)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Escaneos</dt>
                    <dd className="font-semibold text-ink">{selectedQrDetail.scans ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Creado</dt>
                    <dd className="font-semibold text-ink">{formatDateTime(selectedQrDetail.createdAtCustom)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Actualizado</dt>
                    <dd className="font-semibold text-ink">{formatDateTime(selectedQrDetail.updatedAtCustom)}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => generatePrintableQr(selectedQrDetail)}
                className="rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-secondary/50"
              >
                Generar e imprimir QR
              </button>
              <button
                type="button"
                onClick={() => requestDeleteQrCampaign(selectedQrDetail)}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                <Trash2 size={14} />
                Eliminar campaña
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="QR listo para impresión"
        subtitle="Imprime este QR y pégalo en recepción para el auto registro de asistencia."
        size="max-w-2xl"
      >
        <div className="space-y-4">
          {selectedQr ? (
            <div className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
              <p className="font-semibold text-ink">{selectedQr.name}</p>
              <p className="text-xs text-ink/65">
                {selectedQr.branchId} · {selectedQr.disciplineId === 'all' ? 'Todas las disciplinas' : selectedQr.disciplineId} · {selectedQr.qrCodeId}
              </p>
            </div>
          ) : null}

          <div className="flex justify-center rounded-2xl border border-secondary/20 bg-white p-5">
            {isGeneratingPrintQr ? (
              <div className="flex h-64 w-64 items-center justify-center text-secondary">
                <Spinner className="h-14 w-14" />
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR ${selectedQr?.name || ''}`}
                className="h-64 w-64 rounded-xl border border-secondary/15 bg-white p-2"
              />
            ) : (
              <p className="text-sm text-ink/65">No se pudo generar la imagen del QR.</p>
            )}
          </div>

          {selectedQr ? (
            <a
              href={getPublicScanUrl(selectedQr.qrCodeId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-secondary underline-offset-2 hover:underline"
            >
              <ExternalLink size={14} />
              Abrir enlace público de escaneo
            </a>
          ) : null}

          <button
            type="button"
            onClick={handlePrintQr}
            disabled={!qrDataUrl || isGeneratingPrintQr}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Printer size={16} />
            Imprimir QR
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteQr)}
        onClose={() => setPendingDeleteQr(null)}
        onConfirm={confirmDeleteQrCampaign}
        isLoading={isDeletingQr}
        title="Eliminar campaña QR"
        description={
          pendingDeleteQr
            ? `Se eliminará ${pendingDeleteQr.name} (${pendingDeleteQr.qrCodeId}). Esta acción no se puede deshacer.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmText="Eliminar campaña"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}

export default QrManagementPage
