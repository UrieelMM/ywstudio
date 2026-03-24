import { useState } from 'react'
import dayjs from 'dayjs'
import {
  CircleUserRound,
  ShieldCheck,
  UserPlus,
  Users,
  UserCheck,
  TrendingUp,
} from 'lucide-react'
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

const userColumns = [
  { key: 'fullName', label: 'Alumno' },
  { key: 'discipline', label: 'Disciplina principal' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'visits', label: 'Visitas' },
  { key: 'status', label: 'Estado' },
  { key: 'updatedAtCustom', label: 'Última actualización' },
]

function UsersPage() {
  const users = useOperationsStore((state) => state.users)
  const roles = useOperationsStore((state) => state.roles)
  const currentRole = useOperationsStore((state) => state.currentRole)
  const setRole = useOperationsStore((state) => state.setRole)
  const registerUser = useOperationsStore((state) => state.registerUser)
  const updateUserStatus = useOperationsStore((state) => state.updateUserStatus)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [draft, setDraft] = useState({
    firstName: '',
    lastName: '',
    phoneE164: '+52',
    discipline: 'Ballet',
    email: '',
    birthDate: '',
  })

  const activeUsers = users.filter((user) => user.status === 'active').length
  const totalVisits = users.reduce((acc, user) => acc + Number(user.totalVisits || 0), 0)
  const averageVisits = users.length ? (totalVisits / users.length).toFixed(1) : '0'

  const handleCreateUser = async (event) => {
    event.preventDefault()
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.phoneE164.trim()) {
      toast.error('Nombre, apellidos y teléfono son obligatorios.')
      return
    }

    if (!/^\+[1-9]\d{7,14}$/.test(draft.phoneE164.trim())) {
      toast.error('Captura teléfono en formato E.164. Ejemplo: +525512345678')
      return
    }

    setIsSubmitting(true)
    const result = await registerUser(
      {
        ...draft,
        email: draft.email.trim() || undefined,
        birthDate: draft.birthDate || undefined,
      },
      'admin-ui',
    )

    if (!result.ok) {
      toast.error(result.message || 'No fue posible registrar el usuario.')
      setIsSubmitting(false)
      return
    }
    setDraft({
      firstName: '',
      lastName: '',
      phoneE164: '+52',
      discipline: draft.discipline,
      email: '',
      birthDate: '',
    })
    setIsCreateModalOpen(false)
    toast.success('Usuario registrado en Firebase.')
    setIsSubmitting(false)
  }

  const formatDate = (value) => (value ? formatDayMonthYear(value) : 'No registrado')

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
        eyebrow="Módulo 1 · Step 4"
        title="Registro operativo de usuarios"
        description="Alta rápida, cambio de estado y control de rol operativo para equipo administrativo."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-secondary/20 bg-white px-3 py-2">
              <label htmlFor="operationRole" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">
                Rol
              </label>
              <select
                id="operationRole"
                value={currentRole}
                onChange={(event) => setRole(event.target.value)}
                className="bg-transparent text-sm font-medium text-ink"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <UserPlus size={16} /> Nuevo usuario
              </span>
            </button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Usuarios totales" value={users.length} hint="Base operativa actual" />
        <StatCard icon={UserCheck} label="Usuarios activos" value={activeUsers} hint="Elegibles para check-in" />
        <StatCard icon={TrendingUp} label="Visitas acumuladas" value={totalVisits} hint="Ciclo actual" />
        <StatCard icon={ShieldCheck} label="Promedio visitas" value={averageVisits} hint="Por alumno" />
      </section>

      <section className="grid gap-6 items-start">
        <SectionCard
          title="Panel de usuarios"
          description="Acciones de estado para operación diaria de lealtad."
        >
          <TableCard
            columns={userColumns}
            rows={users}
            emptyMessage="No hay usuarios registrados."
            renderCell={(column, row) => {
              if (column === 'fullName') {
                return (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(row)}
                      className="text-left font-semibold text-ink underline-offset-2 transition hover:text-secondary hover:underline"
                    >
                      {row.fullName}
                    </button>
                    <p className="text-xs text-ink/60">{row.userId}</p>
                  </div>
                )
              }

              if (column === 'discipline') {
                return row.disciplineIds?.[0] || 'General'
              }

              if (column === 'phone') {
                return row.phoneE164
              }

              if (column === 'visits') {
                return `${row.visitBalanceCached} disponibles / ${row.totalVisits} totales`
              }

              if (column === 'status') {
                return (
                  <div className="flex items-center gap-2">
                    <StatusBadge value={row.status === 'active' ? 'Activo' : 'Inactivo'} />
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await updateUserStatus(
                          row.userId,
                          row.status === 'active' ? 'inactive' : 'active',
                          'admin-ui',
                        )
                        if (!result.ok) {
                          toast.error(result.message || 'No se pudo actualizar el estado.')
                          return
                        }
                        toast.success('Estado de usuario actualizado.')
                      }}
                      className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink"
                    >
                      {row.status === 'active' ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                )
              }

              if (column === 'updatedAtCustom') {
                return formatDayMonthYear(row.updatedAtCustom)
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Registrar nuevo alumno"
        subtitle="Registra un nuevo alumno para el programa de lealtad."
        size="max-w-xl"
      >
        <form onSubmit={handleCreateUser} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Nombre(s) *
            </label>
            <input
              id="firstName"
              value={draft.firstName}
              onChange={(event) => setDraft((previous) => ({ ...previous, firstName: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. Camila"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Apellidos *
            </label>
            <input
              id="lastName"
              value={draft.lastName}
              onChange={(event) => setDraft((previous) => ({ ...previous, lastName: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. Herrera Luna"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="phoneE164" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Teléfono (E.164) *
            </label>
            <input
              id="phoneE164"
              value={draft.phoneE164}
              onChange={(event) => setDraft((previous) => ({ ...previous, phoneE164: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. +525512345678"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="discipline" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Disciplina principal *
            </label>
            <select
              id="discipline"
              value={draft.discipline}
              onChange={(event) => setDraft((previous) => ({ ...previous, discipline: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              required
            >
              <option>Ballet</option>
              <option>Jazz</option>
              <option>Hip Hop</option>
              <option>Contemporáneo</option>
              <option>Baile Fitness</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={draft.email}
              onChange={(event) => setDraft((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Ej. alumna@ywstudio.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="birthDate" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/65">
              Fecha de nacimiento
            </label>
            <input
              id="birthDate"
              type="date"
              value={draft.birthDate}
              onChange={(event) => setDraft((previous) => ({ ...previous, birthDate: event.target.value }))}
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="AAAA-MM-DD"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? <Spinner className="h-4 w-4 text-white" /> : <UserPlus size={16} />}
            <span>{isSubmitting ? 'Registrando...' : 'Registrar usuario'}</span>
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="Detalle completo de usuario"
        subtitle="Ficha operativa y de auditoría para seguimiento del programa de lealtad."
        size="max-w-3xl"
      >
        {selectedUser ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-secondary/20 bg-surface/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2">
                  <CircleUserRound size={18} className="text-secondary" />
                  <p className="font-display text-lg font-semibold text-ink">{selectedUser.fullName}</p>
                </div>
                <StatusBadge value={selectedUser.status === 'active' ? 'Activo' : 'Inactivo'} />
              </div>
              <p className="mt-1 text-xs text-ink/60">ID: {selectedUser.userId}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Perfil</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Nombre</dt>
                    <dd className="font-semibold text-ink">{selectedUser.firstName || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Apellidos</dt>
                    <dd className="font-semibold text-ink">{selectedUser.lastName || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Teléfono</dt>
                    <dd className="font-semibold text-ink">{selectedUser.phoneE164 || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Email</dt>
                    <dd className="font-semibold text-ink">{selectedUser.email || 'No registrado'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Nacimiento</dt>
                    <dd className="font-semibold text-ink">{formatDate(selectedUser.birthDate)}</dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-xl border border-secondary/20 bg-white p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Lealtad</p>
                <dl className="space-y-2 text-sm text-ink/80">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Disciplinas</dt>
                    <dd className="font-semibold text-ink">
                      {selectedUser.disciplineIds?.join(', ') || 'No registrado'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Visitas disponibles</dt>
                    <dd className="font-semibold text-ink">{selectedUser.visitBalanceCached ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Visitas totales</dt>
                    <dd className="font-semibold text-ink">{selectedUser.totalVisits ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink/60">Último check-in</dt>
                    <dd className="font-semibold text-ink">{formatDateTime(selectedUser.lastCheckInAtCustom)}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <article className="rounded-xl border border-secondary/20 bg-white p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink/60">Auditoría</p>
              <dl className="grid gap-2 text-sm text-ink/80 md:grid-cols-2">
                <div className="flex items-center justify-between gap-2 md:pr-5">
                  <dt className="text-ink/60">Tenant</dt>
                  <dd className="font-semibold text-ink">{selectedUser.tenantId || 'tenant-ywstudio'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 md:pl-5">
                  <dt className="text-ink/60">Creado por</dt>
                  <dd className="font-semibold text-ink">{selectedUser.createdBy || 'system'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 md:pr-5">
                  <dt className="text-ink/60">Creado</dt>
                  <dd className="font-semibold text-ink">{formatDateTime(selectedUser.createdAtCustom)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 md:pl-5">
                  <dt className="text-ink/60">Actualizado por</dt>
                  <dd className="font-semibold text-ink">{selectedUser.updatedBy || 'system'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 md:pr-5">
                  <dt className="text-ink/60">Actualizado</dt>
                  <dd className="font-semibold text-ink">{formatDateTime(selectedUser.updatedAtCustom)}</dd>
                </div>
              </dl>
            </article>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default UsersPage
