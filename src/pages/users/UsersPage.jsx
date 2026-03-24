import { UserPlus, Users, UserCheck, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { users } from '../../data/mvpData'
import { formatDayMonth, formatDayMonthYear } from '../../lib/dateFormat'

const userColumns = [
  { key: 'nombre', label: 'Alumno' },
  { key: 'disciplina', label: 'Disciplina' },
  { key: 'avance', label: 'Avance de visitas' },
  { key: 'estado', label: 'Estado' },
  { key: 'ultimaVisita', label: 'Última visita' },
]

function UsersPage() {
  const activeUsers = users.filter((user) => user.estado === 'Activo').length
  const totalProgress = users.reduce((acc, user) => acc + user.visitas, 0)
  const targetProgress = users.reduce((acc, user) => acc + user.objetivo, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 1"
        title="Registro de usuarios"
        description="Administra altas de alumnos, su disciplina principal y seguimiento de fidelidad en tiempo real."
        action={
          <button
            type="button"
            onClick={() => toast.success('Flujo de alta de usuario listo para conectar a Firebase.')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <UserPlus size={16} /> Nuevo usuario
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total de usuarios" value={users.length} hint="Base de miembros" />
        <StatCard icon={UserCheck} label="Usuarios activos" value={activeUsers} hint="Con asistencia reciente" />
        <StatCard icon={TrendingUp} label="Avance global" value={`${totalProgress}/${targetProgress}`} hint="Visitas acumuladas" />
        <StatCard
          icon={TrendingUp}
          label="Actualizado"
          value={formatDayMonth()}
          hint="Corte operativo"
        />
      </section>

      <SectionCard
        title="Listado de alumnos"
        description="Vista base para segmentar por disciplina, estado y ritmo de asistencia."
      >
        <TableCard
          columns={userColumns}
          rows={users}
          emptyMessage="No hay usuarios registrados aún."
          renderCell={(column, row) => {
            if (column === 'nombre') {
              return (
                <div>
                  <p className="font-semibold text-ink">{row.nombre}</p>
                  <p className="text-xs text-ink/60">{row.id}</p>
                </div>
              )
            }

            if (column === 'avance') {
              const percent = Math.min(100, Math.round((row.visitas / row.objetivo) * 100))
              return (
                <div className="w-full max-w-[220px]">
                  <div className="mb-1 flex justify-between text-xs text-ink/65">
                    <span>{row.visitas} visitas</span>
                    <span>{row.objetivo} meta</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface">
                    <div
                      className="h-2 rounded-full bg-secondary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            }

            if (column === 'estado') {
              return <StatusBadge value={row.estado} />
            }

            if (column === 'ultimaVisita') {
              return formatDayMonthYear(row.ultimaVisita)
            }

            return row[column]
          }}
        />
      </SectionCard>
    </div>
  )
}

export default UsersPage
