import {
  ClipboardList,
  Gift,
  History,
  LayoutDashboard,
  QrCode,
  Settings,
  Users,
} from 'lucide-react'

export const navigationItems = [
  {
    label: 'Dashboard general',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Registro de usuarios',
    path: '/usuarios',
    icon: Users,
  },
  {
    label: 'Gestión de códigos QR',
    path: '/qrs',
    icon: QrCode,
  },
  {
    label: 'Control de visitas',
    path: '/visitas',
    icon: ClipboardList,
  },
  {
    label: 'Premios y canjes',
    path: '/premios',
    icon: Gift,
  },
  {
    label: 'Historial',
    path: '/canjes',
    icon: History,
  },
  {
    label: 'Configuración',
    path: '/configuracion',
    icon: Settings,
    placement: 'bottom',
  },
]

export const pageMetaByPath = {
  '/dashboard': {
    title: 'Dashboard general',
    description: 'Resumen global de asistencias, canjes y desempeño por disciplina.',
  },
  '/usuarios': {
    title: 'Registro de usuarios',
    description: 'Alta, segmentación y estado de alumnos del programa.',
  },
  '/qrs': {
    title: 'Generación y gestión de códigos QR',
    description: 'Control de QR por clase, sede y vigencia.',
  },
  '/visitas': {
    title: 'Control de visitas por alumno',
    description: 'Escaneos del día y avance hacia recompensas.',
  },
  '/premios': {
    title: 'Configuración de premios y reglas',
    description: 'Reglas de acumulación y catálogo de recompensas.',
  },
  '/canjes': {
    title: 'Historial y reportes de canjes',
    description: 'Seguimiento de entregas y rendimiento del plan.',
  },
  '/configuracion': {
    title: 'Configuración',
    description: 'Administra branding, sedes y disciplinas del sistema.',
  },
}
