import dayjs from 'dayjs'
import { db } from '../lib/firebase'
import {
  createEntityRecord,
  deleteEntityRecord,
  listEntityRecords,
  upsertEntityRecord,
} from '../services/loyaltyDataContractRepository'
import { subscribeCheckInFeed } from '../services/checkInRealtimeService'
import { subscribeNotificationsFeed } from '../services/notificationsRealtimeService'
import { subscribeUsersFeed } from '../services/usersRealtimeService'
import { runCheckInTransaction, runRedeemTransaction } from '../services/loyaltyTransactionsService'
import { getFriendlyReason } from '../lib/loyaltyMessages'
import { create } from './initialStore'

const nowCustom = () => dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ')

const createId = (prefix) =>
  `${prefix}_${dayjs().format('YYYYMMDDHHmmss')}_${Math.random().toString(36).slice(2, 6)}`

const USER_CODE_PREFIX = 'ywstudio-'
const USER_CODE_REGEX = /^ywstudio-(\d{4,})$/

const parseUserSequence = (userId) => {
  const match = USER_CODE_REGEX.exec(String(userId || '').toLowerCase())
  if (!match) {
    return null
  }
  const sequence = Number(match[1])
  return Number.isFinite(sequence) ? sequence : null
}

const formatUserSequence = (sequence) => `${USER_CODE_PREFIX}${String(Math.max(1, sequence)).padStart(4, '0')}`

const getNextUserSequence = (users) =>
  users.reduce((maxSequence, user) => {
    const sequence = parseUserSequence(user.userId)
    if (!sequence) {
      return maxSequence
    }
    return sequence > maxSequence ? sequence : maxSequence
  }, 0) + 1

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
const normalizeUserCode = (value) => sanitizeText(value, 40).toLowerCase()
const normalizeFullName = (firstName, lastName) => `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim()
const sanitizePublicUrl = (value) => {
  const candidate = String(value || '').trim()
  if (!candidate) {
    return ''
  }

  try {
    const parsed = new URL(candidate)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch {
    return ''
  }
}

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

const localRedeemFallback = ({ users, rewards, redemptions, payload }) => {
  const user = getUserById(users, payload.userId)
  const reward = getRewardById(rewards, payload.rewardId)

  if (!user || user.status !== 'active') {
    return { ok: false, reason: 'USER_NOT_ACTIVE' }
  }

  if (!reward || reward.status !== 'active') {
    return { ok: false, reason: 'REWARD_NOT_ACTIVE' }
  }

  const userRewardRedeemCount = redemptions.filter(
    (entry) =>
      entry.userId === payload.userId &&
      entry.rewardId === payload.rewardId &&
      ['approved', 'delivered'].includes(String(entry.status || '').toLowerCase()),
  ).length

  if (userRewardRedeemCount >= 1) {
    return { ok: false, reason: 'MAX_REDEMPTIONS_PER_USER_REACHED' }
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
    discipline:
      qrById[entry.qrCodeId]?.disciplineId === 'all'
        ? 'Todas las disciplinas'
        : qrById[entry.qrCodeId]?.disciplineId || 'General',
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
  checkInsRaw: [],
  checkIns: [],
  redemptions: [],
  notifications: [],
  usersRealtimeUnsubscribe: null,
  checkInsRealtimeUnsubscribe: null,
  notificationsRealtimeUnsubscribe: null,
  isBootstrappingData: false,
  hasLoadedRemoteData: false,
  activityFeed: [createActivity('SYSTEM', 'Panel operativo inicializado.')],
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
      const [users, qrs, rewards, checkIns, redemptions, notifications] = await Promise.all([
        listEntityRecords({ db, tenantId, entityKey: 'user', limit: 300 }),
        listEntityRecords({ db, tenantId, entityKey: 'qrCode', limit: 300 }),
        listEntityRecords({ db, tenantId, entityKey: 'reward', limit: 300 }),
        listEntityRecords({ db, tenantId, entityKey: 'checkIn', limit: 500 }),
        listEntityRecords({ db, tenantId, entityKey: 'redemption', limit: 500 }),
        listEntityRecords({ db, tenantId, entityKey: 'notification', limit: 400 }),
      ])

      const sortedUsers = sortByDateDesc(users, 'createdAtCustom')
      const sortedQrs = sortByDateDesc(qrs, 'createdAtCustom')
      const sortedRewards = sortByDateDesc(rewards, 'createdAtCustom')
      const sortedCheckIns = sortByDateDesc(checkIns, 'scannedAtCustom')
      const sortedRedemptions = sortByDateDesc(redemptions, 'requestedAtCustom')
      const sortedNotifications = sortByDateDesc(notifications, 'createdAtCustom')

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
        checkInsRaw: sortedCheckIns,
        checkIns: derived.checkIns,
        redemptions: derived.redemptions,
        notifications: sortedNotifications,
        hasLoadedRemoteData: true,
        isBootstrappingData: false,
        activityFeed: appendActivity(
          current,
          createActivity('DATA_SYNC', 'Datos del dashboard actualizados.'),
        ),
      }))

      return { ok: true }
    } catch (error) {
      set((current) => ({
        isBootstrappingData: false,
        activityFeed: appendActivity(
          current,
          createActivity('DATA_SYNC_ERROR', 'No fue posible cargar los datos del panel.', {
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

  startCheckInsRealtimeSync: () => {
    const state = get()
    if (state.checkInsRealtimeUnsubscribe) {
      return state.checkInsRealtimeUnsubscribe
    }

    const unsubscribe = subscribeCheckInFeed({
      tenantId: state.tenantId,
      limit: 700,
      onData: (realtimeEntries) => {
        set((current) => {
          const checkInsMap = new Map(
            (current.checkInsRaw || []).map((entry) => [entry.checkInId, entry]),
          )

          realtimeEntries.forEach((entry) => {
            checkInsMap.set(entry.checkInId, {
              ...(checkInsMap.get(entry.checkInId) || {}),
              ...entry,
            })
          })

          const mergedRaw = sortByDateDesc(Array.from(checkInsMap.values()), 'scannedAtCustom').slice(0, 900)
          const derived = withDerivedOperationFields({
            users: current.users,
            qrs: current.qrCampaigns,
            rewards: current.rewards,
            checkIns: mergedRaw,
            redemptions: current.redemptions,
          })

          return {
            checkInsRaw: mergedRaw,
            checkIns: derived.checkIns,
            qrCampaigns: derived.qrs,
          }
        })
      },
      onError: () => {
        set((current) => ({
          activityFeed: appendActivity(
            current,
            createActivity(
              'RTDB_SYNC_ERROR',
              'No fue posible sincronizar visitas en tiempo real en este momento.',
            ),
          ),
        }))
      },
    })

    set({ checkInsRealtimeUnsubscribe: unsubscribe })
    return unsubscribe
  },

  stopCheckInsRealtimeSync: () => {
    const unsubscribe = get().checkInsRealtimeUnsubscribe
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
    set({ checkInsRealtimeUnsubscribe: null })
  },

  startUsersRealtimeSync: () => {
    const state = get()
    if (state.usersRealtimeUnsubscribe) {
      return state.usersRealtimeUnsubscribe
    }

    const unsubscribe = subscribeUsersFeed({
      tenantId: state.tenantId,
      maxItems: 700,
      onData: (usersFeed) => {
        set((current) => {
          const sortedUsers = sortByDateDesc(usersFeed, 'createdAtCustom')
          const derived = withDerivedOperationFields({
            users: sortedUsers,
            qrs: current.qrCampaigns,
            rewards: current.rewards,
            checkIns: current.checkInsRaw,
            redemptions: current.redemptions,
          })

          return {
            users: sortedUsers,
            qrCampaigns: derived.qrs,
            checkIns: derived.checkIns,
            redemptions: derived.redemptions,
          }
        })
      },
      onError: () => {
        set((current) => ({
          activityFeed: appendActivity(
            current,
            createActivity('USERS_SYNC_ERROR', 'No fue posible sincronizar alumnos en tiempo real.'),
          ),
        }))
      },
    })

    set({ usersRealtimeUnsubscribe: unsubscribe })
    return unsubscribe
  },

  stopUsersRealtimeSync: () => {
    const unsubscribe = get().usersRealtimeUnsubscribe
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
    set({ usersRealtimeUnsubscribe: null })
  },

  startNotificationsRealtimeSync: () => {
    const state = get()
    if (state.notificationsRealtimeUnsubscribe) {
      return state.notificationsRealtimeUnsubscribe
    }

    const unsubscribe = subscribeNotificationsFeed({
      tenantId: state.tenantId,
      maxItems: 400,
      onData: (items) => {
        set({
          notifications: sortByDateDesc(items, 'createdAtCustom'),
        })
      },
      onError: () => {
        set((current) => ({
          activityFeed: appendActivity(
            current,
            createActivity(
              'NOTIFICATIONS_SYNC_ERROR',
              'No fue posible sincronizar notificaciones en tiempo real.',
            ),
          ),
        }))
      },
    })

    set({ notificationsRealtimeUnsubscribe: unsubscribe })
    return unsubscribe
  },

  stopNotificationsRealtimeSync: () => {
    const unsubscribe = get().notificationsRealtimeUnsubscribe
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
    set({ notificationsRealtimeUnsubscribe: null })
  },

  registerUser: async (draft, actor = 'admin-ui') => {
    const tenantId = get().tenantId
    const firstName = sanitizeText(draft.firstName, 80)
    const lastName = sanitizeText(draft.lastName, 80)
    const phoneE164 = sanitizePhoneE164(draft.phoneE164)
    const discipline = sanitizeText(draft.discipline || 'General', 60)
    const email = sanitizeEmail(draft.email)
    const profileImageUrl = sanitizePublicUrl(draft.profileImageUrl)
    const normalizedUserId = normalizeUserCode(draft.userId)
    const existingUserIds = new Set(get().users.map((user) => String(user.userId || '').toLowerCase()))
    let sequenceCursor = getNextUserSequence(get().users)
    let resolvedUserId = USER_CODE_REGEX.test(normalizedUserId)
      ? normalizedUserId
      : formatUserSequence(sequenceCursor)
    while (existingUserIds.has(resolvedUserId)) {
      sequenceCursor += 1
      resolvedUserId = formatUserSequence(sequenceCursor)
    }

    if (!firstName || !lastName || !phoneE164 || !discipline || !email) {
      return {
        ok: false,
        message: 'Completa nombre, apellidos, teléfono, disciplina y correo electrónico.',
      }
    }

    if (!USER_CODE_REGEX.test(resolvedUserId)) {
      return { ok: false, message: 'El número de usuario no cumple formato ywstudio-0001.' }
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
      return { ok: false, message: 'El teléfono debe estar en formato E.164.' }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
          userId: resolvedUserId,
          firstName,
          lastName,
          phoneE164,
          disciplineIds: [discipline],
          email,
          ...(profileImageUrl ? { profileImageUrl } : {}),
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

  updateUserProfile: async (userId, draft, actor = 'admin-ui') => {
    const firstName = sanitizeText(draft.firstName, 80)
    const lastName = sanitizeText(draft.lastName, 80)
    const phoneE164 = sanitizePhoneE164(draft.phoneE164)
    const discipline = sanitizeText(draft.discipline || 'General', 60)
    const email = sanitizeEmail(draft.email)
    const birthDate = draft.birthDate ? String(draft.birthDate).trim() : ''
    const hasProfileImageField = Object.prototype.hasOwnProperty.call(draft, 'profileImageUrl')
    const profileImageUrl = sanitizePublicUrl(draft.profileImageUrl)

    if (!firstName || !lastName || !phoneE164 || !discipline || !email) {
      return {
        ok: false,
        message: 'Completa nombre, apellidos, teléfono, disciplina y correo electrónico.',
      }
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
      return { ok: false, message: 'El teléfono debe estar en formato E.164.' }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, message: 'El correo electrónico no es válido.' }
    }

    if (birthDate && !dayjs(birthDate, 'YYYY-MM-DD', true).isValid()) {
      return { ok: false, message: 'La fecha de nacimiento no es válida.' }
    }

    try {
      const result = await upsertEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'user',
        entityId: userId,
        actorId: actor,
        payload: {
          firstName,
          lastName,
          fullName: normalizeFullName(firstName, lastName),
          phoneE164,
          disciplineIds: [discipline],
          email,
          birthDate: birthDate || null,
          ...(hasProfileImageField ? { profileImageUrl: profileImageUrl || '' } : {}),
          updatedAtCustom: nowCustom(),
        },
      })

      set((state) => ({
        users: state.users.map((user) =>
          user.userId === userId ? { ...user, ...result.record } : user,
        ),
        activityFeed: appendActivity(
          state,
          createActivity('USER_UPDATED', `Perfil de usuario ${userId} actualizado.`),
        ),
      }))

      return { ok: true, record: result.record }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo actualizar el usuario.',
      }
    }
  },

  deleteUser: async (userId, actor = 'admin-ui') => {
    try {
      await deleteEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'user',
        entityId: userId,
      })

      set((state) => ({
        users: state.users.filter((user) => user.userId !== userId),
        activityFeed: appendActivity(
          state,
          createActivity('USER_DELETED', `Usuario ${userId} eliminado por ${actor}.`),
        ),
      }))

      await get().bootstrapData({ force: true })
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo eliminar el usuario.',
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

  deleteQrCampaign: async (qrCodeId, actor = 'admin-ui') => {
    try {
      await deleteEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'qrCode',
        entityId: qrCodeId,
      })

      set((state) => ({
        qrCampaigns: state.qrCampaigns.filter((qr) => qr.qrCodeId !== qrCodeId),
        activityFeed: appendActivity(
          state,
          createActivity('QR_DELETED', `Campaña QR ${qrCodeId} eliminada por ${actor}.`),
        ),
      }))

      await get().bootstrapData({ force: true })
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo eliminar la campaña QR.',
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
      rewardImageUrl: sanitizePublicUrl(draft.rewardImageUrl || ''),
      requiredVisits: Number(draft.requiredVisits || 8),
      stockType: sanitizeText(draft.stockType || 'finite', 30),
      stockAvailable: Number(draft.stockAvailable || 0),
      maxPerUser: 1,
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
            : `Check-in bloqueado: ${getFriendlyReason(result.reason)}.`,
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
        redemptions: stateBefore.redemptions,
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
            : `Canje rechazado: ${getFriendlyReason(result.reason)}.`,
        ),
      ),
    }))

    return result
  },

  resolveRedemptionStatus: async (redemptionId, status, actor = 'admin-ui') => {
    const normalizedStatus = sanitizeText(status, 30)
    const currentRedemption = get().redemptions.find((entry) => entry.redemptionId === redemptionId)

    if (!currentRedemption) {
      return {
        ok: false,
        message: 'No se encontró el canje seleccionado.',
      }
    }

    if (normalizedStatus === 'delivered' && currentRedemption.status !== 'approved') {
      return {
        ok: false,
        message: 'Solo los canjes aprobados pueden marcarse como entregados.',
      }
    }

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

  markNotificationAsRead: async (notificationId, actor = 'admin-ui') => {
    const notification = get().notifications.find((entry) => entry.notificationId === notificationId)
    if (!notification || notification.isRead) {
      return { ok: true }
    }

    try {
      const now = nowCustom()
      const result = await upsertEntityRecord({
        db,
        tenantId: get().tenantId,
        entityKey: 'notification',
        entityId: notificationId,
        actorId: actor,
        payload: {
          isRead: true,
          readAtCustom: now,
          updatedAtCustom: now,
        },
      })

      set((state) => ({
        notifications: state.notifications.map((entry) =>
          entry.notificationId === notificationId ? { ...entry, ...result.record } : entry,
        ),
      }))

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudo actualizar la notificación.',
      }
    }
  },

  markAllNotificationsAsRead: async (actor = 'admin-ui') => {
    const unread = get().notifications.filter((entry) => !entry.isRead)
    if (!unread.length) {
      return { ok: true }
    }

    try {
      await Promise.all(
        unread.map((entry) =>
          get().markNotificationAsRead(entry.notificationId, actor),
        ),
      )
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error?.message || 'No se pudieron actualizar las notificaciones.',
      }
    }
  },
}))
