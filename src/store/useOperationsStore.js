import dayjs from 'dayjs'
import { db } from '../lib/firebase'
import {
  createEntityRecord,
  listEntityRecords,
  upsertEntityRecord,
} from '../services/loyaltyDataContractRepository'
import { runCheckInTransaction, runRedeemTransaction } from '../services/loyaltyTransactionsService'
import { create } from './initialStore'

const nowCustom = () => dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ')

const createId = (prefix) =>
  `${prefix}_${dayjs().format('YYYYMMDDHHmmss')}_${Math.random().toString(36).slice(2, 6)}`

const ROLES = [
  { id: 'admin', label: 'Admin', canAdjust: true },
  { id: 'staff', label: 'Staff', canAdjust: false },
  { id: 'readonly', label: 'Solo lectura', canAdjust: false },
]

const appendActivity = (state, activity) => [activity, ...state.activityFeed].slice(0, 50)

const createActivity = (type, message, meta = null) => ({
  id: createId('act'),
  type,
  message,
  meta,
  createdAtCustom: nowCustom(),
})

const sanitizeText = (value, maxLength = 120) =>
  String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)

const sanitizePhoneE164 = (value) => {
  const raw = String(value || '').trim()
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? `+${digits}` : ''
}

const sanitizeEmail = (value) => sanitizeText(value, 180).toLowerCase()

const sortByDateDesc = (rows, dateField) => {
  return [...rows].sort((a, b) => {
    const dateA = dayjs(a?.[dateField]).valueOf()
    const dateB = dayjs(b?.[dateField]).valueOf()
    return dateB - dateA
  })
}

const getUserById = (users, userId) => users.find((user) => user.userId === userId)
const getRewardById = (rewards, rewardId) => rewards.find((reward) => reward.rewardId === rewardId)
const getQrById = (qrs, qrCodeId) => qrs.find((qr) => qr.qrCodeId === qrCodeId)

const localCheckInFallback = ({ users, qrs, payload }) => {
  const user = getUserById(users, payload.userId)
  const qr = getQrById(qrs, payload.qrCodeId)

  if (!user || user.status !== 'active') {
    return { ok: false, reason: 'USER_NOT_ACTIVE', awardedVisits: 0 }
  }

  if (!qr || qr.status !== 'active') {
    return { ok: false, reason: 'QR_NOT_ACTIVE', awardedVisits: 0 }
  }

  return { ok: true, reason: null, awardedVisits: 1 }
}

const localRedeemFallback = ({ users, rewards, payload }) => {
  const user = getUserById(users, payload.userId)
  const reward = getRewardById(rewards, payload.rewardId)

  if (!user || user.status !== 'active') {
    return { ok: false, reason: 'USER_NOT_ACTIVE' }
  }

  if (!reward || reward.status !== 'active') {
    return { ok: false, reason: 'REWARD_NOT_ACTIVE' }
  }

  if (user.visitBalanceCached < reward.requiredVisits) {
    return { ok: false, reason: 'INSUFFICIENT_VISITS' }
  }

  if (reward.stockType === 'finite' && reward.stockAvailable <= 0) {
    return { ok: false, reason: 'OUT_OF_STOCK' }
  }

  return { ok: true, reason: null }
}

const withDerivedOperationFields = ({ users, qrs, rewards, checkIns, redemptions }) => {
  const userById = Object.fromEntries(users.map((user) => [user.userId, user]))
  const qrById = Object.fromEntries(qrs.map((qr) => [qr.qrCodeId, qr]))
  const rewardById = Object.fromEntries(rewards.map((reward) => [reward.rewardId, reward]))

  const checkInCountsByQr = checkIns.reduce((acc, entry) => {
    if (entry.isValid) {
      acc[entry.qrCodeId] = (acc[entry.qrCodeId] || 0) + 1
    }
    return acc
  }, {})

  const enrichedQrs = qrs.map((qr) => ({
    ...qr,
    scans: Number(checkInCountsByQr[qr.qrCodeId] || 0),
  }))

  const enrichedCheckIns = checkIns.map((entry) => ({
    ...entry,
    reason: entry.rejectReason || null,
    userName: userById[entry.userId]?.fullName || entry.userId,
    discipline: qrById[entry.qrCodeId]?.disciplineId || 'General',
  }))

  const enrichedRedemptions = redemptions.map((entry) => ({
    ...entry,
    reason: entry.rejectReason || null,
    visitsUsed: Number(entry.requiredVisitsSnapshot || 0),
    rewardName: rewardById[entry.rewardId]?.name || entry.rewardId,
    userName: userById[entry.userId]?.fullName || entry.userId,
  }))

  return {
    qrs: enrichedQrs,
    checkIns: enrichedCheckIns,
    redemptions: enrichedRedemptions,
  }
}

export const useOperationsStore = create()((set, get) => ({
  tenantId: 'tenant-ywstudio',
  currentRole: 'admin',
  roles: ROLES,
  users: [],
  qrCampaigns: [],
  rewards: [],
  checkIns: [],
  redemptions: [],
  isBootstrappingData: false,
  hasLoadedRemoteData: false,
  activityFeed: [createActivity('SYSTEM', 'Store operativo inicializado.')],
  lastTransactionResult: null,

  setRole: (roleId) => {
    set((state) => ({
      currentRole: roleId,
      activityFeed: appendActivity(
        state,
        createActivity('ROLE_CHANGE', `Rol operativo cambiado a ${roleId}.`),
      ),
    }))
  },

  bootstrapData: async ({ force = false } = {}) => {
    const state = get()
    if (state.isBootstrappingData) {
      return { ok: true }
    }

    if (state.hasLoadedRemoteData && !force) {
      return { ok: true }
    }

    set({ isBootstrappingData: true })

    try {
      const tenantId = state.tenantId
      const [users, qrs, rewards, checkIns, redemptions] = await Promise.all([
        listEntityRecords({ db, tenantId, entityKey: 'user', limit: 300 }),
        listEntityRecords({ db, tenantId, entityKey: 'qrCode', limit: 300 }),
        listEntityRecords({ db, tenantId, entityKey: 'reward', limit: 300 }),
        listEntityRecords({ db, tenantId, entityKey: 'checkIn', limit: 500 }),
        listEntityRecords({ db, tenantId, entityKey: 'redemption', limit: 500 }),
      ])

      const sortedUsers = sortByDateDesc(users, 'createdAtCustom')
      const sortedQrs = sortByDateDesc(qrs, 'createdAtCustom')
      const sortedRewards = sortByDateDesc(rewards, 'createdAtCustom')
      const sortedCheckIns = sortByDateDesc(checkIns, 'scannedAtCustom')
      const sortedRedemptions = sortByDateDesc(redemptions, 'requestedAtCustom')

      const derived = withDerivedOperationFields({
        users: sortedUsers,
        qrs: sortedQrs,
        rewards: sortedRewards,
        checkIns: sortedCheckIns,
        redemptions: sortedRedemptions,
      })

      set((current) => ({
        users: sortedUsers,
        qrCampaigns: derived.qrs,
        rewards: sortedRewards,
        checkIns: derived.checkIns,
        redemptions: derived.redemptions,
        hasLoadedRemoteData: true,
        isBootstrappingData: false,
        activityFeed: appendActivity(
          current,
          createActivity('DATA_SYNC', 'Datos sincronizados desde Firestore.'),
        ),
      }))

      return { ok: true }
    } catch (error) {
      set((current) => ({
        isBootstrappingData: false,
        activityFeed: appendActivity(
          current,
          createActivity('DATA_SYNC_ERROR', 'No se pudo cargar Firestore.', {
            message: error?.message,
          }),
        ),
      }))

      return {
        ok: false,
        message: 'No fue posible cargar la información de Firebase.',
      }
    }
  },

  registerUser: async (draft, actor = 'admin-ui') => {
    const tenantId = get().tenantId
    const firstName = sanitizeText(draft.firstName, 80)
    const lastName = sanitizeText(draft.lastName, 80)
    const phoneE164 = sanitizePhoneE164(draft.phoneE164)
    const discipline = sanitizeText(draft.discipline || 'General', 60)
    const email = sanitizeEmail(draft.email)

    if (!firstName || !lastName || !phoneE164 || !discipline) {
      return { ok: false, message: 'Completa nombre, apellidos, teléfono y disciplina.' }
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
      return { ok: false, message: 'El teléfono debe estar en formato E.164.' }
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, message: 'El correo electrónico no es válido.' }
    }

    if (draft.birthDate && !dayjs(draft.birthDate, 'YYYY-MM-DD', true).isValid()) {
      return { ok: false, message: 'La fecha de nacimiento no es válida.' }
    }

    try {
      const response = await createEntityRecord({
        db,
        tenantId,
        entityKey: 'user',
        actorId: actor,
        payload: {
          userId: draft.userId || createId('USR'),
          firstName,
          lastName,
          phoneE164,
          disciplineIds: [discipline],
          ...(email ? { email } : {}),
          ...(draft.birthDate ? { birthDate: draft.birthDate } : {}),
          status: 'active',
          visitBalanceCached: 0,
          totalVisits: 0,
        },
      })

      const record = response.record
      set((state) => ({
        users: [record, ...state.users],
        activityFeed: appendActivity(
          state,
          createActivity('USER_CREATED', `Usuario ${record.fullName} registrado.`, {
            userId: record.userId,
          }),
        ),
      }))

      return { ok: true, record }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No fue posible registrar el usuario.',
      }
    }
  },

  updateUserStatus: async (userId, status, actor = 'admin-ui') => {
    try {
      const result = await upsertEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'user',
        entityId: userId,
        actorId: actor,
        payload: {
          status,
          updatedAtCustom: nowCustom(),
        },
      })

      set((state) => ({
        users: state.users.map((user) =>
          user.userId === userId ? { ...user, ...result.record } : user,
        ),
        activityFeed: appendActivity(
          state,
          createActivity('USER_STATUS', `Estado de usuario ${userId} actualizado a ${status}.`),
        ),
      }))

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo actualizar el estado del usuario.',
      }
    }
  },

  createQrCampaign: async (draft, actor = 'admin-ui') => {
    const tenantId = get().tenantId
    const name = sanitizeText(draft.name, 120)
    const branchId = sanitizeText(draft.branchId, 60)
    const disciplineId = sanitizeText(draft.disciplineId, 60)

    if (!name || !branchId || !disciplineId) {
      return { ok: false, message: 'Nombre, sede y disciplina son obligatorios.' }
    }

    if (!dayjs(draft.validFromCustom).isValid() || !dayjs(draft.validUntilCustom).isValid()) {
      return { ok: false, message: 'La vigencia del QR no es válida.' }
    }

    if (!dayjs(draft.validUntilCustom).isAfter(dayjs(draft.validFromCustom))) {
      return { ok: false, message: 'La fecha final debe ser mayor a la inicial.' }
    }

    try {
      const response = await createEntityRecord({
        db,
        tenantId,
        entityKey: 'qrCode',
        actorId: actor,
        payload: {
          qrCodeId: draft.qrCodeId || createId('QR'),
          name,
          branchId,
          disciplineId,
          mode: sanitizeText(draft.mode || 'session', 40),
          validFromCustom: draft.validFromCustom,
          validUntilCustom: draft.validUntilCustom,
          cooldownMinutes: Number(draft.cooldownMinutes || 90),
          maxScansPerUserPerDay: Number(draft.maxScansPerUserPerDay || 2),
          status: 'active',
        },
      })

      const record = {
        ...response.record,
        scans: 0,
      }

      set((state) => ({
        qrCampaigns: [record, ...state.qrCampaigns],
        activityFeed: appendActivity(
          state,
          createActivity('QR_CREATED', `Campaña QR ${record.name} creada.`, {
            qrCodeId: record.qrCodeId,
          }),
        ),
      }))

      return { ok: true, record }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No fue posible crear el QR.',
      }
    }
  },

  updateQrStatus: async (qrCodeId, status, actor = 'admin-ui') => {
    try {
      const result = await upsertEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'qrCode',
        entityId: qrCodeId,
        actorId: actor,
        payload: {
          status,
          updatedAtCustom: nowCustom(),
        },
      })

      set((state) => ({
        qrCampaigns: state.qrCampaigns.map((qr) =>
          qr.qrCodeId === qrCodeId ? { ...qr, ...result.record } : qr,
        ),
        activityFeed: appendActivity(
          state,
          createActivity('QR_STATUS', `Estado QR ${qrCodeId} -> ${status}.`),
        ),
      }))

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo actualizar el estado del QR.',
      }
    }
  },

  upsertReward: async (draft, actor = 'admin-ui') => {
    const rewardId = draft.rewardId || createId('reward')
    const name = sanitizeText(draft.name, 120)

    if (!name) {
      return { ok: false, message: 'El nombre del premio es obligatorio.' }
    }

    if (!dayjs(draft.validFromCustom).isValid() || !dayjs(draft.validUntilCustom).isValid()) {
      return { ok: false, message: 'La vigencia del premio no es válida.' }
    }

    if (!dayjs(draft.validUntilCustom).isAfter(dayjs(draft.validFromCustom))) {
      return { ok: false, message: 'La fecha final del premio debe ser mayor a la inicial.' }
    }

    const payload = {
      rewardId,
      name,
      description: sanitizeText(draft.description || '', 240),
      requiredVisits: Number(draft.requiredVisits || 8),
      stockType: sanitizeText(draft.stockType || 'finite', 30),
      stockAvailable: Number(draft.stockAvailable || 0),
      maxPerUser: Number(draft.maxPerUser || 1),
      status: draft.status === 'retired' ? 'archived' : sanitizeText(draft.status || 'active', 30),
      validFromCustom: draft.validFromCustom,
      validUntilCustom: draft.validUntilCustom,
      updatedAtCustom: nowCustom(),
    }

    try {
      const exists = get().rewards.some((reward) => reward.rewardId === rewardId)
      const response = exists
        ? await upsertEntityRecord({
            db,
            tenantId: get().tenantId,
            entityKey: 'reward',
            entityId: rewardId,
            actorId: actor,
            payload,
          })
        : await createEntityRecord({
            db,
            tenantId: get().tenantId,
            entityKey: 'reward',
            actorId: actor,
            payload,
          })

      const record = response.record
      set((state) => ({
        rewards: exists
          ? state.rewards.map((reward) => (reward.rewardId === rewardId ? { ...reward, ...record } : reward))
          : [record, ...state.rewards],
        activityFeed: appendActivity(
          state,
          createActivity(
            exists ? 'REWARD_UPDATED' : 'REWARD_CREATED',
            exists ? `Premio ${rewardId} actualizado.` : `Premio ${record.name} configurado.`,
          ),
        ),
      }))

      return { ok: true, record }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No fue posible guardar el premio.',
      }
    }
  },

  updateRewardStatus: async (rewardId, status, actor = 'admin-ui') => {
    const normalizedStatus = status === 'retired' ? 'archived' : status

    try {
      const result = await upsertEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'reward',
        entityId: rewardId,
        actorId: actor,
        payload: {
          status: normalizedStatus,
          updatedAtCustom: nowCustom(),
        },
      })

      set((state) => ({
        rewards: state.rewards.map((reward) =>
          reward.rewardId === rewardId ? { ...reward, ...result.record } : reward,
        ),
        activityFeed: appendActivity(
          state,
          createActivity('REWARD_STATUS', `Estado de premio ${rewardId} -> ${normalizedStatus}.`),
        ),
      }))

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo actualizar el estado del premio.',
      }
    }
  },

  recordCheckInOperation: async (payload) => {
    const stateBefore = get()
    const idempotencyKey = payload.idempotencyKey || createId('idem')
    let result

    try {
      result = await runCheckInTransaction({
        tenantId: stateBefore.tenantId,
        userId: sanitizeText(payload.userId, 120),
        qrCodeId: sanitizeText(payload.qrCodeId, 120),
        classSessionId: sanitizeText(payload.classSessionId || '', 120) || null,
        deviceId: sanitizeText(payload.deviceId || 'web-dashboard', 120),
        idempotencyKey,
      })
    } catch {
      const fallback = localCheckInFallback({
        users: stateBefore.users,
        qrs: stateBefore.qrCampaigns,
        payload,
      })

      const now = nowCustom()
      const user = getUserById(stateBefore.users, payload.userId)

      try {
        const checkInResponse = await createEntityRecord({
          db,
          tenantId: stateBefore.tenantId,
          entityKey: 'checkIn',
          actorId: 'ops-ui',
          payload: {
            checkInId: createId('chk'),
            userId: sanitizeText(payload.userId, 120),
            qrCodeId: sanitizeText(payload.qrCodeId, 120),
            classSessionId: sanitizeText(payload.classSessionId || '', 120) || null,
            isValid: Boolean(fallback.ok),
            rejectReason: fallback.reason || null,
            awardedVisits: Number(fallback.awardedVisits || 0),
            scannedAtCustom: now,
            idempotencyKey,
            deviceId: sanitizeText(payload.deviceId || 'web-dashboard', 120),
          },
        })

        if (fallback.ok && user) {
          await upsertEntityRecord({
            db,
            tenantId: stateBefore.tenantId,
            entityKey: 'user',
            entityId: user.userId,
            actorId: 'ops-ui',
            payload: {
              visitBalanceCached: Number(user.visitBalanceCached || 0) + Number(fallback.awardedVisits || 0),
              totalVisits: Number(user.totalVisits || 0) + Number(fallback.awardedVisits || 0),
              lastCheckInAtCustom: now,
              updatedAtCustom: now,
            },
          })
        }

        result = {
          ...fallback,
          checkInId: checkInResponse.entityId,
        }
      } catch {
        result = {
          ok: false,
          reason: 'FIRESTORE_WRITE_FAILED',
          awardedVisits: 0,
        }
      }
    }

    await get().bootstrapData({ force: true })

    set((state) => ({
      lastTransactionResult: result,
      activityFeed: appendActivity(
        state,
        createActivity(
          result.ok ? 'CHECKIN_OK' : 'CHECKIN_REJECTED',
          result.ok
            ? `Check-in aprobado para ${payload.userId}.`
            : `Check-in bloqueado (${result.reason || 'UNKNOWN'}).`,
        ),
      ),
    }))

    return result
  },

  redeemRewardOperation: async (payload) => {
    const stateBefore = get()
    const idempotencyKey = payload.idempotencyKey || createId('idem')
    let result

    try {
      result = await runRedeemTransaction({
        tenantId: stateBefore.tenantId,
        userId: sanitizeText(payload.userId, 120),
        rewardId: sanitizeText(payload.rewardId, 120),
        notes: sanitizeText(payload.notes || '', 260),
        idempotencyKey,
      })
    } catch {
      const fallback = localRedeemFallback({
        users: stateBefore.users,
        rewards: stateBefore.rewards,
        payload,
      })

      const now = nowCustom()
      const user = getUserById(stateBefore.users, payload.userId)
      const reward = getRewardById(stateBefore.rewards, payload.rewardId)
      const requiredVisits = Number(reward?.requiredVisits || 0)

      try {
        const redemptionResponse = await createEntityRecord({
          db,
          tenantId: stateBefore.tenantId,
          entityKey: 'redemption',
          actorId: 'ops-ui',
          payload: {
            redemptionId: createId('rdm'),
            userId: sanitizeText(payload.userId, 120),
            rewardId: sanitizeText(payload.rewardId, 120),
            requiredVisitsSnapshot: Math.max(1, requiredVisits || 1),
            status: fallback.ok ? 'approved' : 'rejected',
            rejectReason: fallback.reason || null,
            requestedAtCustom: now,
            notes: sanitizeText(payload.notes || '', 260),
          },
        })

        if (fallback.ok && user && reward) {
          await Promise.all([
            upsertEntityRecord({
              db,
              tenantId: stateBefore.tenantId,
              entityKey: 'user',
              entityId: user.userId,
              actorId: 'ops-ui',
              payload: {
                visitBalanceCached: Math.max(0, Number(user.visitBalanceCached || 0) - requiredVisits),
                updatedAtCustom: now,
              },
            }),
            reward.stockType === 'finite'
              ? upsertEntityRecord({
                  db,
                  tenantId: stateBefore.tenantId,
                  entityKey: 'reward',
                  entityId: reward.rewardId,
                  actorId: 'ops-ui',
                  payload: {
                    stockAvailable: Math.max(0, Number(reward.stockAvailable || 0) - 1),
                    updatedAtCustom: now,
                  },
                })
              : Promise.resolve(),
          ])
        }

        result = {
          ...fallback,
          redemptionId: redemptionResponse.entityId,
        }
      } catch {
        result = {
          ok: false,
          reason: 'FIRESTORE_WRITE_FAILED',
        }
      }
    }

    await get().bootstrapData({ force: true })

    set((state) => ({
      lastTransactionResult: result,
      activityFeed: appendActivity(
        state,
        createActivity(
          result.ok ? 'REDEEM_OK' : 'REDEEM_REJECTED',
          result.ok
            ? `Canje aprobado para ${payload.userId}.`
            : `Canje rechazado (${result.reason || 'UNKNOWN'}).`,
        ),
      ),
    }))

    return result
  },

  resolveRedemptionStatus: async (redemptionId, status, actor = 'admin-ui') => {
    const normalizedStatus = sanitizeText(status, 30)

    try {
      const now = nowCustom()
      await upsertEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'redemption',
        entityId: redemptionId,
        actorId: actor,
        payload: {
          status: normalizedStatus,
          ...(normalizedStatus === 'delivered' ? { deliveredAtCustom: now } : {}),
          ...(normalizedStatus === 'approved' ? { approvedAtCustom: now } : {}),
          updatedAtCustom: now,
        },
      })

      await get().bootstrapData({ force: true })

      set((state) => ({
        activityFeed: appendActivity(
          state,
          createActivity('REDEMPTION_STATUS', `Canje ${redemptionId} marcado como ${normalizedStatus}.`),
        ),
      }))

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo actualizar el estado del canje.',
      }
    }
  },
}))
