import { QrCode, PlusCircle, ScanLine, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import TableCard from '../../components/ui/TableCard'
import { qrCampaigns } from '../../data/mvpData'

const qrColumns = [
  { key: 'nombre', label: 'Campaña QR' },
  { key: 'sede', label: 'Sede' },
  { key: 'vigencia', label: 'Vigencia' },
  { key: 'escaneos', label: 'Escaneos' },
  { key: 'estado', label: 'Estado' },
]

function QrManagementPage() {
  const activeQrs = qrCampaigns.filter((item) => item.estado === 'Vigente').length
  const scans = qrCampaigns.reduce((acc, item) => acc + item.escaneos, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Módulo 2"
        title="Generación y gestión de códigos QR"
        description="Define códigos por disciplina, sede y vigencia para controlar escaneos de asistencia."
        action={
          <button
            type="button"
            onClick={() => toast.success('Generador de QR listo para conectar con Firebase.')}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <span className="inline-flex items-center gap-2">
              <PlusCircle size={16} /> Crear QR
            </span>
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={QrCode} label="Códigos activos" value={activeQrs} hint="Disponibles para escaneo" />
        <StatCard icon={ScanLine} label="Escaneos totales" value={scans} hint="Acumulado por campañas" />
        <StatCard icon={MapPin} label="Sedes activas" value="2" hint="Centro y Norte" />
        <StatCard icon={QrCode} label="Última campaña" value="Jazz PM" hint="Publicada hoy" />
      </section>

      <SectionCard
        title="Campañas QR"
        description="Control de QR por tipo de clase y periodo operativo."
      >
        <TableCard
          columns={qrColumns}
          rows={qrCampaigns}
          emptyMessage="No hay campañas QR activas."
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
    </div>
  )
}

export default QrManagementPage
