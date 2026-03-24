import { ClipboardList, ScanLine, Trophy, Clock3 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import TableCard from '../../components/ui/TableCard'
import { visitsFeed } from '../../data/mvpData'

const visitsColumns = [
  { key: 'alumno', label: 'Alumno' },
  { key: 'disciplina', label: 'Disciplina' },
  { key: 'hora', label: 'Hora de escaneo' },
  { key: 'canal', label: 'Canal QR' },
  { key: 'progreso', label: 'Progreso premio' },
]

function VisitsControlPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 3"
        title="Control de visitas por alumno"
        description="Seguimiento diario de escaneos, validación de asistencia y avance hacia recompensas."
        action={
          <button
            type="button"
            onClick={() => toast.success('Escaneo manual listo para conectar con cámara/QR.')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <ScanLine size={16} /> Registrar escaneo
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Escaneos hoy" value="43" hint="Hasta las 19:00" />
        <StatCard icon={Trophy} label="Cerca de premio" value="17" hint="A 2 visitas o menos" />
        <StatCard icon={Clock3} label="Hora pico" value="18:00" hint="Clase grupal" />
        <StatCard icon={ScanLine} label="Errores QR" value="2" hint="Pendiente de validación" />
      </section>

      <SectionCard
        title="Feed de asistencia"
        description="Eventos de visita para monitoreo de operación en vivo."
      >
        <TableCard
          columns={visitsColumns}
          rows={visitsFeed}
          emptyMessage="Aún no hay visitas registradas en este periodo."
          renderCell={(column, row) => {
            if (column === 'alumno') {
              return (
                <div>
                  <p className="font-semibold text-ink">{row.alumno}</p>
                  <p className="text-xs text-ink/60">{row.id}</p>
                </div>
              )
            }

            if (column === 'progreso') {
              return <span className="font-semibold text-secondary">{row.progreso}</span>
            }

            return row[column]
          }}
        />
      </SectionCard>
    </div>
  )
}

export default VisitsControlPage
