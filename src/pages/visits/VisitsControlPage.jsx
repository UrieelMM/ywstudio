import { useMemo, useState } from 'react'
import { ClipboardList, Clock3, ScanLine, ShieldCheck, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
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

  const formattedFeed = useMemo(
    () =>
      checkIns.map((entry) => ({
        ...entry,
        result: entry.isValid ? 'Aprobado' : entry.reason || 'Bloqueado',
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
        toast.success(`Check-in registrado (+${result.awardedVisits || 1} visita).`)
        setIsCreateModalOpen(false)
        setDraft(prev => ({...prev, classSessionId: ''}))
      } else {
        toast.error(`Check-in bloqueado: ${result.reason || 'UNKNOWN'}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 3 · Step 4"
        title="Operación de check-ins"
        description="Registro transaccional de asistencias con validaciones de negocio y trazabilidad."
        action={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <ScanLine size={16} /> Registrar escaneo
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Check-ins válidos" value={validToday} hint="Periodo actual" />
        <StatCard icon={ShieldCheck} label="Check-ins bloqueados" value={blockedToday} hint="Con antifraude" />
        <StatCard icon={Trophy} label="Cerca de premio" value={usersNearReward} hint=">= 7 visitas" />
        <StatCard icon={Clock3} label="Última transacción" value={lastTransactionResult ? 'Reciente' : 'N/A'} hint={lastTransactionResult?.reason || 'Sin actividad'} />
      </section>

      <section className="grid gap-6 items-start">

        <SectionCard
          title="Feed operativo de asistencia"
          description="Últimos eventos del motor transaccional de check-ins."
        >
          <TableCard
            columns={visitsColumns}
            rows={formattedFeed}
            emptyMessage="Aún no hay transacciones de check-in registradas."
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
                return row.scannedAtCustom?.split('T')[1]?.slice(0, 5) || '--:--'
              }

              if (column === 'result') {
                return (
                  <div className="space-y-1">
                    <StatusBadge value={row.isValid ? 'Vigente' : 'Pausado'} />
                    <p className="text-xs text-ink/65">{row.result}</p>
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
        title="Registrar escaneo"
        subtitle="Usa este flujo para frontdesk o staff operativo."
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
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
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Opcional, ej. ballet-2026-04-10-07am"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <ScanLine size={16} />}
            <span>{isSubmitting ? 'Registrando...' : 'Registrar check-in'}</span>
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default VisitsControlPage
