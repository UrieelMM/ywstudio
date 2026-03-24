export const users = [
  {
    id: 'USR-001',
    nombre: 'Camila Herrera',
    disciplina: 'Ballet',
    visitas: 18,
    objetivo: 24,
    estado: 'Activo',
    ultimaVisita: '2026-03-22',
  },
  {
    id: 'USR-002',
    nombre: 'Sofía Luna',
    disciplina: 'Jazz',
    visitas: 9,
    objetivo: 16,
    estado: 'En riesgo',
    ultimaVisita: '2026-03-17',
  },
  {
    id: 'USR-003',
    nombre: 'Valeria Ortiz',
    disciplina: 'Contemporáneo',
    visitas: 23,
    objetivo: 24,
    estado: 'Activo',
    ultimaVisita: '2026-03-23',
  },
  {
    id: 'USR-004',
    nombre: 'Alexa Mena',
    disciplina: 'Hip Hop',
    visitas: 3,
    objetivo: 12,
    estado: 'Inactivo',
    ultimaVisita: '2026-02-27',
  },
]

export const qrCampaigns = [
  {
    id: 'QR-101',
    nombre: 'Ballet Matutino',
    sede: 'Sucursal Centro',
    vigencia: '01 Mar - 30 Abr',
    escaneos: 214,
    estado: 'Vigente',
  },
  {
    id: 'QR-102',
    nombre: 'Jazz Intermedio',
    sede: 'Sucursal Norte',
    vigencia: '15 Mar - 31 May',
    escaneos: 98,
    estado: 'Vigente',
  },
  {
    id: 'QR-103',
    nombre: 'Intensivo Kids',
    sede: 'Sucursal Centro',
    vigencia: '01 Feb - 31 Mar',
    escaneos: 173,
    estado: 'Pausado',
  },
]

export const visitsFeed = [
  {
    id: 'VIS-501',
    alumno: 'Camila Herrera',
    disciplina: 'Ballet',
    hora: '08:10',
    canal: 'QR Ballet Matutino',
    progreso: '18/24',
  },
  {
    id: 'VIS-502',
    alumno: 'Valeria Ortiz',
    disciplina: 'Contemporáneo',
    hora: '10:27',
    canal: 'QR Contempo Pro',
    progreso: '23/24',
  },
  {
    id: 'VIS-503',
    alumno: 'Sofía Luna',
    disciplina: 'Jazz',
    hora: '18:42',
    canal: 'QR Jazz PM',
    progreso: '9/16',
  },
]

export const rewardsRules = [
  {
    id: 'RW-1',
    nombre: 'Clase extra gratis',
    condicion: '8 visitas',
    stock: 40,
    estado: 'Activo',
  },
  {
    id: 'RW-2',
    nombre: 'Playera edición studio',
    condicion: '16 visitas',
    stock: 12,
    estado: 'Activo',
  },
  {
    id: 'RW-3',
    nombre: 'Masterclass premium',
    condicion: '24 visitas',
    stock: 6,
    estado: 'Pausado',
  },
]

export const redemptions = [
  {
    id: 'CNJ-889',
    alumno: 'Mariana Solís',
    premio: 'Clase extra gratis',
    fecha: '2026-03-21',
    visitasUsadas: 8,
    estado: 'Entregado',
  },
  {
    id: 'CNJ-890',
    alumno: 'Elena Prado',
    premio: 'Playera edición studio',
    fecha: '2026-03-22',
    visitasUsadas: 16,
    estado: 'Pendiente',
  },
  {
    id: 'CNJ-891',
    alumno: 'Valeria Ortiz',
    premio: 'Masterclass premium',
    fecha: '2026-03-23',
    visitasUsadas: 24,
    estado: 'Entregado',
  },
]
