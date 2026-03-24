import dayjs from 'dayjs'
import {
  Clock3,
  Gift,
  PlusCircle,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import {
  QR_STATUS,
  REWARD_STATUS,
  USER_STATUS,
} from '../../domain/loyalty/programConfig'
import { dataContractSchemas } from '../../domain/loyalty/dataContract'
import { useLoyaltyProgramStore } from '../../store/useLoyaltyProgramStore'
import { useLoyaltyDataContractStore } from '../../store/useLoyaltyDataContractStore'

const rewardColumns = [
  { key: 'nombre', label: 'Premio' },
  { key: 'condicion', label: 'Regla de visitas' },
  { key: 'stock', label: 'Stock' },
  { key: 'estado', label: 'Estado' },
]

const fieldColumns = [
  { key: 'label', label: 'Campo' },
  { key: 'type', label: 'Tipo' },
  { key: 'required', label: 'Requerido' },
  { key: 'notes', label: 'Regla' },
]

function RewardsRulesPage() {
  const rulebook = useLoyaltyProgramStore((state) => state.rulebook)
  const rewardTemplates = useLoyaltyProgramStore((state) => state.rewardTemplates)
  const catalogs = useLoyaltyProgramStore((state) => state.catalogs)
  const businessLocks = useLoyaltyProgramStore((state) => state.businessLocks)
  const health = useLoyaltyProgramStore((state) => state.health)
  const lastCheckInSimulation = useLoyaltyProgramStore((state) => state.lastCheckInSimulation)
  const lastRedemptionSimulation = useLoyaltyProgramStore((state) => state.lastRedemptionSimulation)
  const patchRulebook = useLoyaltyProgramStore((state) => state.patchRulebook)
  const setMilestones = useLoyaltyProgramStore((state) => state.setMilestones)
  const runCheckInSimulation = useLoyaltyProgramStore((state) => state.runCheckInSimulation)
  const runRedemptionSimulation = useLoyaltyProgramStore((state) => state.runRedemptionSimulation)
  const contractVersion = useLoyaltyDataContractStore((state) => state.contractVersion)
  const createSampleRecord = useLoyaltyDataContractStore((state) => state.createSampleRecord)
  const lastValidationReport = useLoyaltyDataContractStore((state) => state.lastValidationReport)

  const activeRewards = rewardTemplates.filter(
    (item) => item.status === REWARD_STATUS.ACTIVE,
  ).length
  const totalStock = rewardTemplates.reduce(
    (acc, item) => acc + (item.stockAvailable || 0),
    0,
  )

  const rewardRows = rewardTemplates.map((item) => ({
    id: item.rewardId,
    nombre: item.name,
    condicion: `${item.requiredVisits} visitas`,
    stock: item.stockType === 'infinite' ? 'Ilimitado' : item.stockAvailable,
    estado:
      item.status === REWARD_STATUS.ACTIVE
        ? 'Activo'
        : item.status === REWARD_STATUS.PAUSED
          ? 'Pausado'
          : 'Archivado',
  }))

  const simulateValidCheckIn = () => {
    const result = runCheckInSimulation({
      checkInAtCustom: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      scansTodayCount: 0,
      user: {
        status: USER_STATUS.ACTIVE,
        lastCheckInAtCustom: dayjs()
          .subtract(rulebook.checkInCooldownMinutes + 20, 'minute')
          .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      },
      qr: {
        status: QR_STATUS.ACTIVE,
        validFromCustom: dayjs().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        validUntilCustom: dayjs().add(1, 'day').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      },
    })

    if (result.valid) {
      toast.success(`Check-in permitido: +${result.awardedVisits} visita`)
      return
    }

    toast.error(`Check-in bloqueado: ${result.reason}`)
  }

  const simulateRedemptionBlocked = () => {
    const result = runRedemptionSimulation({
      userVisitBalance: 6,
      userRedemptionCount: 0,
      redeemAtCustom: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      reward: rewardTemplates[0],
    })

    if (!result.valid) {
      toast.error(`Canje bloqueado: ${result.reason}`)
      return
    }

    toast.success(`Canje permitido: -${result.visitsToDebit} visitas`)
  }

  const runContractValidation = (entityKey) => {
    const { report } = createSampleRecord(entityKey)
    if (report.valid) {
      toast.success(`Contrato ${entityKey} válido`)
      return
    }
    toast.error(`Contrato ${entityKey} inválido`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 4"
        title="Step 1 - Diseño del programa de lealtad"
        description="Reglas base, bloqueos, catálogo de campos y simuladores para validar la lógica antes de Firebase."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                patchRulebook(
                  {
                    checkInCooldownMinutes: rulebook.checkInCooldownMinutes + 15,
                  },
                  'admin-ui',
                )
              }
              className="rounded-xl border border-secondary/30 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-secondary/60"
            >
              <span className="inline-flex items-center gap-2">
                <Clock3 size={16} /> +15 min cooldown
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMilestones([10, 20, 30], 'admin-ui')}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} /> Milestones 10/20/30
              </span>
            </button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Gift} label="Premios activos" value={activeRewards} hint="Disponibles para canje" />
        <StatCard
          icon={Settings2}
          label="Milestones"
          value={rulebook.milestones.join(' / ')}
          hint="Escalones de recompensa"
        />
        <StatCard
          icon={ShieldCheck}
          label="Salud de reglas"
          value={`${health.score}%`}
          hint={health.ready ? 'Rulebook consistente' : 'Requiere ajustes'}
        />
        <StatCard icon={Trophy} label="Stock total" value={totalStock} hint="Inventario disponible" />
      </section>

      <SectionCard
        title="Step 2 - Contrato de datos Firebase"
        description="Esquema canónico multi-tenant con validación previa a escritura en Firestore."
        action={
          <button
            type="button"
            onClick={() => runContractValidation('user')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Validar schema user
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Versión contrato</p>
            <p className="mt-2 font-display text-xl font-semibold text-ink">{contractVersion}</p>
          </article>
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Entidades</p>
            <p className="mt-2 font-display text-xl font-semibold text-ink">
              {Object.keys(dataContractSchemas).length}
            </p>
          </article>
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Colecciones</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {Object.values(dataContractSchemas)
                .map((item) => item.collection)
                .join(', ')}
            </p>
          </article>
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Último reporte</p>
            {lastValidationReport ? (
              <p className="mt-2 text-sm font-semibold text-ink">
                {lastValidationReport.entityKey} ·{' '}
                {lastValidationReport.valid ? 'válido' : 'inválido'}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink/70">Sin validaciones aún.</p>
            )}
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Rulebook principal"
        description="Parámetros operativos del programa en formato consistente para Firebase."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Visitas por check-in</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">
              {rulebook.visitsPerCheckIn}
            </p>
          </article>
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Cooldown</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">
              {rulebook.checkInCooldownMinutes} min
            </p>
          </article>
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Límite diario</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">
              {rulebook.maxScansPerUserPerDay}
            </p>
          </article>
          <article className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink/60">Actualizado</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {dayjs(rulebook.updatedAtCustom).format('DD MMM YYYY HH:mm')}
            </p>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Simuladores de bloqueos"
        description="Pruebas rápidas del motor de negocio para validar reglas antes del backend."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={simulateValidCheckIn}
              className="rounded-xl border border-secondary/30 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-secondary/60"
            >
              <span className="inline-flex items-center gap-2">
                <ScanLine size={16} /> Simular check-in válido
              </span>
            </button>
            <button
              type="button"
              onClick={simulateRedemptionBlocked}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <PlusCircle size={16} /> Simular canje bloqueado
              </span>
            </button>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-secondary/20 bg-surface/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
              Último check-in simulado
            </p>
            {lastCheckInSimulation ? (
              <div className="space-y-1 text-sm text-ink/85">
                <p>
                  Estado:{' '}
                  <span className="font-semibold">
                    {lastCheckInSimulation.valid ? 'Permitido' : 'Bloqueado'}
                  </span>
                </p>
                <p>Resultado: {lastCheckInSimulation.reason || 'OK'}</p>
                <p>Timestamp: {lastCheckInSimulation.createdAtCustom}</p>
              </div>
            ) : (
              <p className="text-sm text-ink/70">Aún sin simulaciones.</p>
            )}
          </div>

          <div className="rounded-xl border border-secondary/20 bg-surface/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
              Último canje simulado
            </p>
            {lastRedemptionSimulation ? (
              <div className="space-y-1 text-sm text-ink/85">
                <p>
                  Estado:{' '}
                  <span className="font-semibold">
                    {lastRedemptionSimulation.valid ? 'Permitido' : 'Bloqueado'}
                  </span>
                </p>
                <p>Resultado: {lastRedemptionSimulation.reason || 'OK'}</p>
                <p>Timestamp: {lastRedemptionSimulation.createdAtCustom}</p>
              </div>
            ) : (
              <p className="text-sm text-ink/70">Aún sin simulaciones.</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Bloqueos de negocio"
        description="Candados que deben respetarse también en Cloud Functions y Firestore Rules."
      >
        <div className="grid gap-2">
          {businessLocks.map((lock) => (
            <article
              key={lock}
              className="rounded-xl border border-secondary/20 bg-surface/60 px-4 py-3 text-sm text-ink/80"
            >
              {lock}
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Catálogo de premios y reglas"
        description="Plantillas base de recompensas, umbrales y estado operativo."
      >
        <TableCard
          columns={rewardColumns}
          rows={rewardRows}
          emptyMessage="No hay premios configurados todavía."
          renderCell={(column, row) => {
            if (column === 'nombre') {
              return (
                <div>
                  <p className="font-semibold text-ink">{row.nombre}</p>
                  <p className="text-xs text-ink/60">{row.id}</p>
                </div>
              )
            }

            if (column === 'estado') {
              return <StatusBadge value={row.estado} />
            }

            return row[column]
          }}
        />
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Campos obligatorios de usuarios"
          description="Contrato mínimo para evitar inconsistencias al guardar en Firebase."
        >
          <TableCard
            columns={fieldColumns}
            rows={catalogs.userFieldCatalog}
            emptyMessage="No hay definición de campos para usuarios."
            renderCell={(column, row) => {
              if (column === 'required') {
                return row.required ? 'Sí' : 'No'
              }
              return row[column]
            }}
          />
        </SectionCard>

        <SectionCard
          title="Campos obligatorios de premios"
          description="Contrato de datos base para canjes y control de inventario."
        >
          <TableCard
            columns={fieldColumns}
            rows={catalogs.rewardFieldCatalog}
            emptyMessage="No hay definición de campos para premios."
            renderCell={(column, row) => {
              if (column === 'required') {
                return row.required ? 'Sí' : 'No'
              }
              return row[column]
            }}
          />
        </SectionCard>
      </section>
    </div>
  )
}

export default RewardsRulesPage
