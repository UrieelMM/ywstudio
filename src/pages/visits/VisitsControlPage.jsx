import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ClipboardList, Clock3, ScanLine, ShieldCheck, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { getFriendlyReason, getLastTransactionHint } from '../../lib/loyaltyMessages'
import { useOperationsStore } from '../../store/useOperationsStore'

const visitsColumns = [
  { key: 'userName', label: 'Alumno' },
  { key: 'discipline', label: 'Disciplina' },
  { key: 'scannedAtCustom', label: 'Hora' },
  { key: 'qrCodeId', label: 'QR' },
  { key: 'result', label: 'Resultado' },
]

function VisitsControlPage() {
  const users = useOperationsStore((state) => state.users)
  const qrCampaigns = useOperationsStore((state) => state.qrCampaigns)
  const checkIns = useOperationsStore((state) => state.checkIns)
  const lastTransactionResult = useOperationsStore((state) => state.lastTransactionResult)
  const recordCheckInOperation = useOperationsStore((state) => state.recordCheckInOperation)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [draft, setDraft] = useState({
    userId: users[0]?.userId || '',
    qrCodeId: qrCampaigns[0]?.qrCodeId || '',
    classSessionId: '',
    deviceId: 'frontdesk-web',
  })

  const validToday = checkIns.filter((item) => item.isValid).length
  const blockedToday = checkIns.filter((item) => !item.isValid).length
  const usersNearReward = users.filter((user) => user.visitBalanceCached >= 7).length
  const latestCheckIn = checkIns[0] || null
  const latestOperationValue = latestCheckIn
    ? dayjs(latestCheckIn.scannedAtCustom).format('HH:mm')
    : 'Sin actividad'
  const latestOperationHint = latestCheckIn
    ? `${latestCheckIn.isValid ? 'Aprobada' : 'Bloqueada'} · ${latestCheckIn.userName || latestCheckIn.userId}`
    : 'Aún no hay asistencias registradas en este turno.'
  const qrNameById = useMemo(
    () =>
      Object.fromEntries(
        qrCampaigns.map((campaign) => [campaign.qrCodeId, campaign.name || campaign.qrCodeId]),
      ),
    [qrCampaigns],
  )

  const formattedFeed = useMemo(
    () =>
      checkIns.map((entry) => ({
        ...entry,
        result: entry.isValid ? 'Asistencia validada' : getFriendlyReason(entry.reason),
      })),
    [checkIns],
  )

  const handleCheckIn = async (event) => {
    event.preventDefault()
    if (!draft.userId || !draft.qrCodeId) {
      toast.error('Selecciona usuario y QR para registrar escaneo.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await recordCheckInOperation(draft)
      if (result.ok) {
        toast.success(`Asistencia registrada (+${result.awardedVisits || 1} visita).`)
        setIsCreateModalOpen(false)
        setDraft((previous) => ({ ...previous, classSessionId: '' }))
      } else {
        toast.error(getFriendlyReason(result.reason))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asistencias"
        title="Registro de asistencias"
        description="Controla asistencias del día y registra clases manualmente cuando sea necesario."
        action={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0"
          >
            <span className="inline-flex items-center gap-2">
              <ScanLine size={16} /> Registrar escaneo
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Asistencias válidas" value={validToday} hint="Periodo actual" />
        <StatCard icon={ShieldCheck} label="Asistencias bloqueadas" value={blockedToday} hint="Requieren revisión" />
        <StatCard icon={Trophy} label="Cerca de premio" value={usersNearReward} hint=">= 7 visitas" />
        <StatCard
          icon={Clock3}
          label="Última operación"
          value={latestOperationValue}
          hint={lastTransactionResult ? `${latestOperationHint} · ${getLastTransactionHint(lastTransactionResult)}` : latestOperationHint}
        />
      </section>

      <section className="grid gap-6 items-start">

        <SectionCard
          title="Historial de asistencias"
          description="Últimos registros validados y bloqueados."
        >
          <TableCard
            columns={visitsColumns}
            rows={formattedFeed}
            emptyMessage="Aún no hay asistencias registradas."
            renderCell={(column, row) => {
              if (column === 'userName') {
                return (
                  <div>
                    <p className="font-semibold text-ink">{row.userName}</p>
                    <p className="text-xs text-ink/60">{row.checkInId}</p>
                  </div>
                )
              }

              if (column === 'scannedAtCustom') {
                const parsed = dayjs(row.scannedAtCustom)
                return parsed.isValid() ? parsed.format('HH:mm') : '--:--'
              }

              if (column === 'result') {
                return (
                  <div className="space-y-1">
                    <StatusBadge value={row.isValid ? 'Aprobado' : 'Bloqueado'} />
                    <p className="text-xs text-ink/65">{row.result}</p>
                  </div>
                )
              }

              if (column === 'qrCodeId') {
                return qrNameById[row.qrCodeId] || row.qrCodeId
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Registrar escaneo"
        subtitle="Usa este formulario cuando el registro se haga manualmente en recepción."
        size="max-w-xl"
      >
        <form onSubmit={handleCheckIn} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="checkinUser" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Alumno *
            </label>
            <select
              id="checkinUser"
              value={draft.userId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, userId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            >
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.fullName} ({user.userId})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="checkinQr" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Código QR *
            </label>
            <select
              id="checkinQr"
              value={draft.qrCodeId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, qrCodeId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              required
            >
              {qrCampaigns.map((qr) => (
                <option key={qr.qrCodeId} value={qr.qrCodeId}>
                  {qr.name} ({qr.qrCodeId})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="classSessionId"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65"
            >
              ID de sesión de clase
            </label>
            <input
              id="classSessionId"
              value={draft.classSessionId}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, classSessionId: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink shadow-sm transition-all duration-200 hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Opcional, ej. ballet-2026-04-10-07am"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <ScanLine size={16} />}
            <span>{isSubmitting ? 'Registrando...' : 'Registrar asistencia'}</span>
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default VisitsControlPage
