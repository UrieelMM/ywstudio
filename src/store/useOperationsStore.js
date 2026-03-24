import dayjs from 'dayjs'
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

const initialUsers = [
  {
    userId: 'USR-001',
    firstName: 'Camila',
    lastName: 'Herrera',
    fullName: 'Camila Herrera',
    phoneE164: '+525512340001',
    disciplineIds: ['Ballet'],
    status: 'active',
    visitBalanceCached: 18,
    totalVisits: 18,
    lastCheckInAtCustom: '2026-03-22T08:10:00.000-06:00',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
  {
    userId: 'USR-002',
    firstName: 'Sofía',
    lastName: 'Luna',
    fullName: 'Sofía Luna',
    phoneE164: '+525512340002',
    disciplineIds: ['Jazz'],
    status: 'active',
    visitBalanceCached: 9,
    totalVisits: 9,
    lastCheckInAtCustom: '2026-03-17T18:42:00.000-06:00',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
  {
    userId: 'USR-003',
    firstName: 'Valeria',
    lastName: 'Ortiz',
    fullName: 'Valeria Ortiz',
    phoneE164: '+525512340003',
    disciplineIds: ['Contemporáneo'],
    status: 'active',
    visitBalanceCached: 23,
    totalVisits: 23,
    lastCheckInAtCustom: '2026-03-23T10:27:00.000-06:00',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
  {
    userId: 'USR-004',
    firstName: 'Alexa',
    lastName: 'Mena',
    fullName: 'Alexa Mena',
    phoneE164: '+525512340004',
    disciplineIds: ['Hip Hop'],
    status: 'inactive',
    visitBalanceCached: 3,
    totalVisits: 3,
    lastCheckInAtCustom: '2026-02-27T17:00:00.000-06:00',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
]

const initialQrs = [
  {
    qrCodeId: 'QR-101',
    name: 'Ballet Matutino',
    branchId: 'Centro',
    disciplineId: 'Ballet',
    mode: 'session',
    status: 'active',
    validFromCustom: '2026-03-01T00:00:00.000-06:00',
    validUntilCustom: '2026-04-30T23:59:59.000-06:00',
    cooldownMinutes: 90,
    maxScansPerUserPerDay: 2,
    scans: 214,
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
  {
    qrCodeId: 'QR-102',
    name: 'Jazz Intermedio',
    branchId: 'Norte',
    disciplineId: 'Jazz',
    mode: 'session',
    status: 'active',
    validFromCustom: '2026-03-15T00:00:00.000-06:00',
    validUntilCustom: '2026-05-31T23:59:59.000-06:00',
    cooldownMinutes: 90,
    maxScansPerUserPerDay: 2,
    scans: 98,
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
]

const initialRewards = [
  {
    rewardId: 'reward-8-visits',
    name: 'Clase extra gratis',
    requiredVisits: 8,
    stockType: 'finite',
    stockAvailable: 40,
    maxPerUser: 2,
    status: 'active',
    validFromCustom: '2026-01-01T00:00:00.000-06:00',
    validUntilCustom: '2026-12-31T23:59:59.000-06:00',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
  {
    rewardId: 'reward-16-visits',
    name: 'Playera edición studio',
    requiredVisits: 16,
    stockType: 'finite',
    stockAvailable: 20,
    maxPerUser: 1,
    status: 'active',
    validFromCustom: '2026-01-01T00:00:00.000-06:00',
    validUntilCustom: '2026-12-31T23:59:59.000-06:00',
    createdAtCustom: nowCustom(),
    updatedAtCustom: nowCustom(),
  },
]

const appendActivity = (state, activity) => [activity, ...state.activityFeed].slice(0, 40)

const createActivity = (type, message, meta = null) => ({
  id: createId('act'),
  type,
  message,
  meta,
  createdAtCustom: nowCustom(),
})

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

export const useOperationsStore = create()((set, get) => ({
  tenantId: 'tenant-ywstudio',
  currentRole: 'admin',
  roles: ROLES,
  users: initialUsers,
  qrCampaigns: initialQrs,
  rewards: initialRewards,
  checkIns: [],
  redemptions: [],
  activityFeed: [
    createActivity('SYSTEM', 'Flujos operativos inicializados para Step 4.'),
  ],
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

  registerUser: (draft, actor = 'admin-ui') => {
    const userId = draft.userId || createId('USR')
    const createdAtCustom = nowCustom()
    const record = {
      userId,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      fullName: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
      phoneE164: draft.phoneE164.trim(),
      disciplineIds: [draft.discipline || 'General'],
      status: 'active',
      visitBalanceCached: 0,
      totalVisits: 0,
      lastCheckInAtCustom: null,
      createdAtCustom,
      updatedAtCustom: createdAtCustom,
      createdBy: actor,
      updatedBy: actor,
    }

    set((state) => ({
      users: [record, ...state.users],
      activityFeed: appendActivity(
        state,
        createActivity('USER_CREATED', `Usuario ${record.fullName} registrado.`, {
          userId,
        }),
      ),
    }))

    return record
  },

  updateUserStatus: (userId, status, actor = 'admin-ui') => {
    set((state) => ({
      users: state.users.map((user) =>
        user.userId === userId
          ? { ...user, status, updatedAtCustom: nowCustom(), updatedBy: actor }
          : user,
      ),
      activityFeed: appendActivity(
        state,
        createActivity('USER_STATUS', `Estado de usuario ${userId} actualizado a ${status}.`),
      ),
    }))
  },

  createQrCampaign: (draft, actor = 'admin-ui') => {
    const qrCodeId = draft.qrCodeId || createId('QR')
    const createdAtCustom = nowCustom()
    const record = {
      qrCodeId,
      name: draft.name.trim(),
      branchId: draft.branchId.trim(),
      disciplineId: draft.disciplineId.trim(),
      mode: draft.mode || 'session',
      status: 'active',
      validFromCustom: draft.validFromCustom,
      validUntilCustom: draft.validUntilCustom,
      cooldownMinutes: Number(draft.cooldownMinutes || 90),
      maxScansPerUserPerDay: Number(draft.maxScansPerUserPerDay || 2),
      scans: 0,
      createdAtCustom,
      updatedAtCustom: createdAtCustom,
      createdBy: actor,
      updatedBy: actor,
    }

    set((state) => ({
      qrCampaigns: [record, ...state.qrCampaigns],
      activityFeed: appendActivity(
        state,
        createActivity('QR_CREATED', `Campaña QR ${record.name} creada.`, {
          qrCodeId,
        }),
      ),
    }))

    return record
  },

  updateQrStatus: (qrCodeId, status, actor = 'admin-ui') => {
    set((state) => ({
      qrCampaigns: state.qrCampaigns.map((qr) =>
        qr.qrCodeId === qrCodeId
          ? { ...qr, status, updatedAtCustom: nowCustom(), updatedBy: actor }
          : qr,
      ),
      activityFeed: appendActivity(
        state,
        createActivity('QR_STATUS', `Estado QR ${qrCodeId} -> ${status}.`),
      ),
    }))
  },

  upsertReward: (draft, actor = 'admin-ui') => {
    const rewardId = draft.rewardId || createId('reward')
    const exists = get().rewards.some((reward) => reward.rewardId === rewardId)
    const timestamp = nowCustom()
    const baseReward = {
      rewardId,
      name: draft.name.trim(),
      requiredVisits: Number(draft.requiredVisits || 8),
      stockType: draft.stockType || 'finite',
      stockAvailable: Number(draft.stockAvailable || 0),
      maxPerUser: Number(draft.maxPerUser || 1),
      status: draft.status || 'active',
      validFromCustom: draft.validFromCustom,
      validUntilCustom: draft.validUntilCustom,
      updatedAtCustom: timestamp,
      updatedBy: actor,
    }

    set((state) => ({
      rewards: exists
        ? state.rewards.map((reward) =>
            reward.rewardId === rewardId ? { ...reward, ...baseReward } : reward,
          )
        : [
            {
              ...baseReward,
              createdAtCustom: timestamp,
              createdBy: actor,
            },
            ...state.rewards,
          ],
      activityFeed: appendActivity(
        state,
        createActivity(
          exists ? 'REWARD_UPDATED' : 'REWARD_CREATED',
          exists
            ? `Premio ${rewardId} actualizado.`
            : `Premio ${baseReward.name} configurado.`,
        ),
      ),
    }))
  },

  updateRewardStatus: (rewardId, status, actor = 'admin-ui') => {
    set((state) => ({
      rewards: state.rewards.map((reward) =>
        reward.rewardId === rewardId
          ? { ...reward, status, updatedAtCustom: nowCustom(), updatedBy: actor }
          : reward,
      ),
      activityFeed: appendActivity(
        state,
        createActivity('REWARD_STATUS', `Estado de premio ${rewardId} -> ${status}.`),
      ),
    }))
  },

  recordCheckInOperation: async (payload) => {
    const stateBefore = get()
    const idempotencyKey = payload.idempotencyKey || createId('idem')
    let result

    try {
      result = await runCheckInTransaction({
        tenantId: stateBefore.tenantId,
        userId: payload.userId,
        qrCodeId: payload.qrCodeId,
        classSessionId: payload.classSessionId || null,
        deviceId: payload.deviceId || 'web-dashboard',
        idempotencyKey,
      })
    } catch {
      result = localCheckInFallback({
        users: stateBefore.users,
        qrs: stateBefore.qrCampaigns,
        payload,
      })
    }

    const now = nowCustom()
    set((state) => {
      const user = getUserById(state.users, payload.userId)
      const qr = getQrById(state.qrCampaigns, payload.qrCodeId)
      const awardedVisits = Number(result.awardedVisits || 0)

      const updatedUsers =
        result.ok && user
          ? state.users.map((entry) =>
              entry.userId === user.userId
                ? {
                    ...entry,
                    visitBalanceCached: entry.visitBalanceCached + awardedVisits,
                    totalVisits: entry.totalVisits + awardedVisits,
                    lastCheckInAtCustom: now,
                    updatedAtCustom: now,
                  }
                : entry,
            )
          : state.users

      const updatedQrs =
        result.ok && qr
          ? state.qrCampaigns.map((entry) =>
              entry.qrCodeId === qr.qrCodeId
                ? { ...entry, scans: Number(entry.scans || 0) + 1, updatedAtCustom: now }
                : entry,
            )
          : state.qrCampaigns

      const checkInRecord = {
        checkInId: result.checkInId || createId('chk'),
        userId: payload.userId,
        qrCodeId: payload.qrCodeId,
        userName: user?.fullName || payload.userId,
        discipline: qr?.disciplineId || 'General',
        scannedAtCustom: now,
        isValid: Boolean(result.ok),
        reason: result.reason || null,
        awardedVisits,
      }

      return {
        users: updatedUsers,
        qrCampaigns: updatedQrs,
        checkIns: [checkInRecord, ...state.checkIns].slice(0, 80),
        lastTransactionResult: result,
        activityFeed: appendActivity(
          state,
          createActivity(
            result.ok ? 'CHECKIN_OK' : 'CHECKIN_REJECTED',
            result.ok
              ? `Check-in aprobado para ${checkInRecord.userName}.`
              : `Check-in bloqueado (${result.reason || 'UNKNOWN'}).`,
          ),
        ),
      }
    })

    return result
  },

  redeemRewardOperation: async (payload) => {
    const stateBefore = get()
    const idempotencyKey = payload.idempotencyKey || createId('idem')
    let result

    try {
      result = await runRedeemTransaction({
        tenantId: stateBefore.tenantId,
        userId: payload.userId,
        rewardId: payload.rewardId,
        notes: payload.notes || '',
        idempotencyKey,
      })
    } catch {
      result = localRedeemFallback({
        users: stateBefore.users,
        rewards: stateBefore.rewards,
        payload,
      })
    }

    const now = nowCustom()
    set((state) => {
      const user = getUserById(state.users, payload.userId)
      const reward = getRewardById(state.rewards, payload.rewardId)
      const requiredVisits = Number(reward?.requiredVisits || 0)

      const nextUsers =
        result.ok && user
          ? state.users.map((entry) =>
              entry.userId === user.userId
                ? {
                    ...entry,
                    visitBalanceCached: entry.visitBalanceCached - requiredVisits,
                    updatedAtCustom: now,
                  }
                : entry,
            )
          : state.users

      const nextRewards =
        result.ok && reward && reward.stockType === 'finite'
          ? state.rewards.map((entry) =>
              entry.rewardId === reward.rewardId
                ? {
                    ...entry,
                    stockAvailable: Math.max(0, entry.stockAvailable - 1),
                    updatedAtCustom: now,
                  }
                : entry,
            )
          : state.rewards

      const redemptionRecord = {
        redemptionId: result.redemptionId || createId('rdm'),
        userId: payload.userId,
        userName: user?.fullName || payload.userId,
        rewardId: payload.rewardId,
        rewardName: reward?.name || payload.rewardId,
        visitsUsed: requiredVisits,
        status: result.ok ? 'approved' : 'rejected',
        reason: result.reason || null,
        requestedAtCustom: now,
      }

      return {
        users: nextUsers,
        rewards: nextRewards,
        redemptions: [redemptionRecord, ...state.redemptions].slice(0, 80),
        lastTransactionResult: result,
        activityFeed: appendActivity(
          state,
          createActivity(
            result.ok ? 'REDEEM_OK' : 'REDEEM_REJECTED',
            result.ok
              ? `Canje aprobado para ${redemptionRecord.userName}.`
              : `Canje rechazado (${result.reason || 'UNKNOWN'}).`,
          ),
        ),
      }
    })

    return result
  },

  resolveRedemptionStatus: (redemptionId, status, actor = 'admin-ui') => {
    set((state) => ({
      redemptions: state.redemptions.map((entry) =>
        entry.redemptionId === redemptionId
          ? { ...entry, status, resolvedAtCustom: nowCustom(), resolvedBy: actor }
          : entry,
      ),
      activityFeed: appendActivity(
        state,
        createActivity('REDEMPTION_STATUS', `Canje ${redemptionId} marcado como ${status}.`),
      ),
    }))
  },
}))
