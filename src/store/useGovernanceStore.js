import { collection, doc, getDocs, limit, query, setDoc } from 'firebase/firestore'
import dayjs from 'dayjs'
import { buildGovernanceMetrics, ROLLOUT_PHASES } from '../domain/loyalty/governanceMetrics'
import { db } from '../lib/firebase'
import { create } from './initialStore'

const nowCustom = () => dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ')
const GOVERNANCE_TENANT_ID = 'tenant-ywstudio'

const createId = (prefix) =>
  `${prefix}_${dayjs().format('YYYYMMDDHHmmss')}_${Math.random().toString(36).slice(2, 6)}`

const initialChecklist = [
  {
    id: 'rules_deployed',
    title: 'Reglas Firestore desplegadas',
    owner: 'Backend',
    done: true,
    dueAtCustom: '2026-03-28T10:00:00.000-06:00',
  },
  {
    id: 'indexes_deployed',
    title: 'Índices Firestore sincronizados',
    owner: 'Backend',
    done: true,
    dueAtCustom: '2026-03-28T10:30:00.000-06:00',
  },
  {
    id: 'functions_deployed',
    title: 'Cloud Functions en producción',
    owner: 'Backend',
    done: false,
    dueAtCustom: '2026-03-29T09:00:00.000-06:00',
  },
  {
    id: 'smoke_test_checkin',
    title: 'Smoke test de check-in aprobado/bloqueado',
    owner: 'QA',
    done: false,
    dueAtCustom: '2026-03-29T09:30:00.000-06:00',
  },
  {
    id: 'smoke_test_redeem',
    title: 'Smoke test de canje con saldo/stock',
    owner: 'QA',
    done: false,
    dueAtCustom: '2026-03-29T10:00:00.000-06:00',
  },
  {
    id: 'incident_protocol',
    title: 'Protocolo de incidentes validado',
    owner: 'Ops',
    done: false,
    dueAtCustom: '2026-03-29T11:00:00.000-06:00',
  },
]

const initialRiskRegister = [
  {
    id: 'risk_stock_drift',
    title: 'Desalineación de stock entre sedes',
    severity: 'high',
    status: 'open',
    mitigation: 'Conciliación diaria y bloqueo automático de stock negativo.',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
  {
    id: 'risk_qr_misuse',
    title: 'Uso no autorizado de QR compartidos',
    severity: 'medium',
    status: 'open',
    mitigation: 'Cooldown + límite diario + análisis de picos atípicos.',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
]

const initialFeatureFlags = {
  checkInEnabled: true,
  redemptionEnabled: true,
  manualAdjustmentsEnabled: false,
  emergencyPause: false,
  exportReportsEnabled: true,
}

const sanitizeText = (value, maxLength = 180) =>
  String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)

const incidentsCollectionRef = () =>
  collection(db, 'tenants', GOVERNANCE_TENANT_ID, 'opsIncidents')

const createIncident = ({ title, severity, summary, actor = 'ops-ui' }) => ({
  id: createId('incident'),
  tenantId: GOVERNANCE_TENANT_ID,
  title,
  severity,
  summary,
  status: 'open',
  createdBy: actor,
  createdAtCustom: nowCustom(),
  updatedAtCustom: nowCustom(),
  updatedBy: actor,
  resolvedAtCustom: null,
})

const createLog = (type, message, actor = 'system', payload = null) => ({
  id: createId('govlog'),
  type,
  message,
  actor,
  payload,
  createdAtCustom: nowCustom(),
})

export const useGovernanceStore = create()((set, get) => ({
  tenantId: GOVERNANCE_TENANT_ID,
  currentPhase: 'pilot',
  phases: ROLLOUT_PHASES,
  featureFlags: initialFeatureFlags,
  goLiveChecklist: initialChecklist,
  riskRegister: initialRiskRegister,
  incidentLog: [],
  isBootstrappingGovernance: false,
  hasLoadedGovernanceData: false,
  governanceLog: [createLog('INIT', 'Gobernanza Step 5 inicializada.')],
  lastReview: null,
  reviewHistory: [],

  bootstrapGovernanceData: async ({ force = false } = {}) => {
    const state = get()
    if (state.isBootstrappingGovernance) {
      return { ok: true }
    }

    if (state.hasLoadedGovernanceData && !force) {
      return { ok: true }
    }

    set({ isBootstrappingGovernance: true })

    try {
      const snapshot = await getDocs(query(incidentsCollectionRef(), limit(120)))
      const incidents = snapshot.docs
        .map((recordDoc) => ({ id: recordDoc.id, ...recordDoc.data() }))
        .sort((a, b) => dayjs(b.createdAtCustom).valueOf() - dayjs(a.createdAtCustom).valueOf())

      set((current) => ({
        incidentLog: incidents,
        hasLoadedGovernanceData: true,
        isBootstrappingGovernance: false,
        governanceLog: [
          createLog('INCIDENTS_SYNC', 'Incidentes sincronizados desde Firestore.', 'system'),
          ...current.governanceLog,
        ],
      }))

      return { ok: true }
    } catch (error) {
      set((current) => ({
        isBootstrappingGovernance: false,
        governanceLog: [
          createLog('INCIDENTS_SYNC_ERROR', 'No se pudieron cargar incidentes.', 'system', {
            message: error?.message,
          }),
          ...current.governanceLog,
        ],
      }))

      return {
        ok: false,
        message: 'No fue posible cargar incidentes desde Firebase.',
      }
    }
  },

  setRolloutPhase: (phaseId, actor = 'ops-ui') => {
    set((state) => ({
      currentPhase: phaseId,
      governanceLog: [
        createLog('PHASE_CHANGE', `Fase de rollout actualizada a ${phaseId}.`, actor),
        ...state.governanceLog,
      ],
    }))
  },

  toggleFeatureFlag: (flagKey, actor = 'ops-ui') => {
    set((state) => {
      const nextValue = !state.featureFlags[flagKey]
      return {
        featureFlags: {
          ...state.featureFlags,
          [flagKey]: nextValue,
        },
        governanceLog: [
          createLog('FEATURE_FLAG', `Feature flag ${flagKey} -> ${nextValue}.`, actor),
          ...state.governanceLog,
        ],
      }
    })
  },

  setFeatureFlag: (flagKey, value, actor = 'ops-ui') => {
    set((state) => ({
      featureFlags: {
        ...state.featureFlags,
        [flagKey]: Boolean(value),
      },
      governanceLog: [
        createLog('FEATURE_FLAG', `Feature flag ${flagKey} -> ${Boolean(value)}.`, actor),
        ...state.governanceLog,
      ],
    }))
  },

  toggleChecklistItem: (itemId, actor = 'ops-ui') => {
    set((state) => ({
      goLiveChecklist: state.goLiveChecklist.map((item) =>
        item.id === itemId
          ? { ...item, done: !item.done, updatedAtCustom: nowCustom(), updatedBy: actor }
          : item,
      ),
      governanceLog: [
        createLog('CHECKLIST', `Checklist ${itemId} actualizado.`, actor),
        ...state.governanceLog,
      ],
    }))
  },

  setChecklistItem: (itemId, done, actor = 'ops-ui') => {
    set((state) => ({
      goLiveChecklist: state.goLiveChecklist.map((item) =>
        item.id === itemId
          ? { ...item, done: Boolean(done), updatedAtCustom: nowCustom(), updatedBy: actor }
          : item,
      ),
      governanceLog: [
        createLog('CHECKLIST', `Checklist ${itemId} -> ${Boolean(done)}.`, actor),
        ...state.governanceLog,
      ],
    }))
  },

  addIncident: async (payload, actor = 'ops-ui') => {
    const incident = createIncident({
      title: sanitizeText(payload.title, 140),
      severity: sanitizeText(payload.severity, 20) || 'medium',
      summary: sanitizeText(payload.summary, 320),
      actor,
    })

    if (!incident.title || !incident.summary) {
      return { ok: false, message: 'Título y resumen del incidente son obligatorios.' }
    }

    try {
      await setDoc(doc(incidentsCollectionRef(), incident.id), incident, { merge: false })
      set((state) => ({
        incidentLog: [incident, ...state.incidentLog],
        governanceLog: [
          createLog('INCIDENT_OPEN', `Incidente abierto: ${incident.title}.`, actor),
          ...state.governanceLog,
        ],
      }))
      return { ok: true, incident }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No fue posible registrar el incidente.',
      }
    }
  },

  resolveIncident: async (incidentId, actor = 'ops-ui') => {
    const current = get().incidentLog.find((incident) => incident.id === incidentId)
    if (!current) {
      return { ok: false, message: 'Incidente no encontrado.' }
    }

    const nextIncident = {
      ...current,
      status: 'resolved',
      resolvedAtCustom: nowCustom(),
      updatedAtCustom: nowCustom(),
      updatedBy: actor,
    }

    try {
      await setDoc(doc(incidentsCollectionRef(), incidentId), nextIncident, { merge: false })
      set((state) => ({
        incidentLog: state.incidentLog.map((incident) =>
          incident.id === incidentId ? nextIncident : incident,
        ),
        governanceLog: [
          createLog('INCIDENT_RESOLVED', `Incidente ${incidentId} resuelto.`, actor),
          ...state.governanceLog,
        ],
      }))
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No fue posible resolver el incidente.',
      }
    }
  },

  updateRiskStatus: (riskId, status, actor = 'ops-ui') => {
    set((state) => ({
      riskRegister: state.riskRegister.map((risk) =>
        risk.id === riskId
          ? { ...risk, status, updatedAtCustom: nowCustom(), updatedBy: actor }
          : risk,
      ),
      governanceLog: [
        createLog('RISK_STATUS', `Riesgo ${riskId} -> ${status}.`, actor),
        ...state.governanceLog,
      ],
    }))
  },

  runGovernanceReview: (operationsSnapshot, actor = 'ops-ui') => {
    const metrics = buildGovernanceMetrics(operationsSnapshot)

    set((state) => {
      const checklistProgress = Math.round(
        (state.goLiveChecklist.filter((item) => item.done).length /
          Math.max(1, state.goLiveChecklist.length)) *
          100,
      )

      const review = {
        id: createId('review'),
        actor,
        checklistProgress,
        ...metrics,
        phase: state.currentPhase,
        createdAtCustom: nowCustom(),
      }

      return {
        lastReview: review,
        reviewHistory: [review, ...state.reviewHistory].slice(0, 20),
        governanceLog: [
          createLog(
            'REVIEW',
            `Revisión de gobernanza ejecutada. Score=${review.score} Checklist=${checklistProgress}%.`,
            actor,
          ),
          ...state.governanceLog,
        ],
      }
    })

    return metrics
  },
}))
