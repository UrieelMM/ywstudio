import { useState } from 'react'
import { MapPin, PlusCircle, QrCode, ScanLine, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
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

function QrManagementPage() {
  const qrCampaigns = useOperationsStore((state) => state.qrCampaigns)
  const createQrCampaign = useOperationsStore((state) => state.createQrCampaign)
  const updateQrStatus = useOperationsStore((state) => state.updateQrStatus)
  const [draft, setDraft] = useState({
    name: '',
    branchId: 'Centro',
    disciplineId: 'Ballet',
    mode: 'session',
    validFromCustom: '2026-04-01T00:00:00.000-06:00',
    validUntilCustom: '2026-06-30T23:59:59.000-06:00',
    cooldownMinutes: 90,
    maxScansPerUserPerDay: 2,
  })

  const activeQrs = qrCampaigns.filter((item) => item.status === 'active').length
  const totalScans = qrCampaigns.reduce((acc, item) => acc + Number(item.scans || 0), 0)

  const handleCreateQr = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      toast.error('El nombre del QR es obligatorio.')
      return
    }
    createQrCampaign(draft, 'admin-ui')
    setDraft((previous) => ({
      ...previous,
      name: '',
    }))
    toast.success('Campaña QR creada para operación.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 2 · Step 4"
        title="Operación de códigos QR"
        description="Crear campañas, pausar/activar QR y controlar condiciones operativas por disciplina."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={QrCode} label="QRs activos" value={activeQrs} hint="Disponibles para escaneo" />
        <StatCard icon={ScanLine} label="Escaneos acumulados" value={totalScans} hint="En campañas vigentes" />
        <StatCard icon={MapPin} label="Sedes en operación" value="2" hint="Centro / Norte" />
        <StatCard icon={Settings2} label="Modo principal" value="session" hint="Control por clase" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] items-start">
        <SectionCard
          title="Crear campaña QR"
          description="Configura vigencia y límites operativos para validación de asistencia."
        >
          <form onSubmit={handleCreateQr} className="space-y-3">
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Nombre de campaña"
            />
            <select
              value={draft.branchId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, branchId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
            >
              <option>Centro</option>
              <option>Norte</option>
            </select>
            <select
              value={draft.disciplineId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, disciplineId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
            >
              <option>Ballet</option>
              <option>Jazz</option>
              <option>Contemporáneo</option>
              <option>Hip Hop</option>
            </select>
            <input
              value={draft.validFromCustom}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, validFromCustom: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="YYYY-MM-DDTHH:mm:ss.SSS-06:00"
            />
            <input
              value={draft.validUntilCustom}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, validUntilCustom: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="YYYY-MM-DDTHH:mm:ss.SSS-06:00"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <PlusCircle size={16} /> Crear QR
              </span>
            </button>
          </form>
        </SectionCard>

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
                      onClick={() =>
                        updateQrStatus(
                          row.qrCodeId,
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
    </div>
  )
}

export default QrManagementPage

