import { useState } from 'react'
import { ShieldCheck, UserPlus, Users, UserCheck, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
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
  const [draft, setDraft] = useState({
    firstName: '',
    lastName: '',
    phoneE164: '+52',
    discipline: 'Ballet',
  })

  const activeUsers = users.filter((user) => user.status === 'active').length
  const totalVisits = users.reduce((acc, user) => acc + Number(user.totalVisits || 0), 0)
  const averageVisits = users.length ? (totalVisits / users.length).toFixed(1) : '0'

  const handleCreateUser = (event) => {
    event.preventDefault()
    if (!draft.firstName.trim() || !draft.lastName.trim() || draft.phoneE164.trim().length < 10) {
      toast.error('Completa nombre, apellido y teléfono.')
      return
    }

    registerUser(draft, 'admin-ui')
    setDraft({
      firstName: '',
      lastName: '',
      phoneE164: '+52',
      discipline: draft.discipline,
    })
    toast.success('Usuario registrado en flujo operativo.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 1 · Step 4"
        title="Registro operativo de usuarios"
        description="Alta rápida, cambio de estado y control de rol operativo para equipo administrativo."
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={currentRole}
              onChange={(event) => setRole(event.target.value)}
              className="rounded-xl border border-secondary/35 bg-white px-3 py-2 text-sm font-medium text-ink"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  Rol: {role.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Usuarios totales" value={users.length} hint="Base operativa actual" />
        <StatCard icon={UserCheck} label="Usuarios activos" value={activeUsers} hint="Elegibles para check-in" />
        <StatCard icon={TrendingUp} label="Visitas acumuladas" value={totalVisits} hint="Ciclo actual" />
        <StatCard icon={ShieldCheck} label="Promedio visitas" value={averageVisits} hint="Por alumno" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] items-start">
        <SectionCard
          title="Alta rápida de alumno"
          description="Formulario operacional mínimo para registro inmediato en recepción."
        >
          <form onSubmit={handleCreateUser} className="space-y-3">
            <input
              value={draft.firstName}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, firstName: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Nombre"
            />
            <input
              value={draft.lastName}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, lastName: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Apellidos"
            />
            <input
              value={draft.phoneE164}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, phoneE164: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
              placeholder="+5255..."
            />
            <select
              value={draft.discipline}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, discipline: event.target.value }))
              }
              className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm text-ink"
            >
              <option>Ballet</option>
              <option>Jazz</option>
              <option>Hip Hop</option>
              <option>Contemporáneo</option>
              <option>Baile Fitness</option>
            </select>
            <button
              type="submit"
              className="w-full rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <span className="inline-flex items-center gap-2">
                <UserPlus size={16} /> Registrar usuario
              </span>
            </button>
          </form>
        </SectionCard>

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
                  <div>
                    <p className="font-semibold text-ink">{row.fullName}</p>
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
                      onClick={() =>
                        updateUserStatus(
                          row.userId,
                          row.status === 'active' ? 'inactive' : 'active',
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

              if (column === 'updatedAtCustom') {
                return formatDayMonthYear(row.updatedAtCustom)
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>
    </div>
  )
}

export default UsersPage

