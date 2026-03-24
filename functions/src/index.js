import dayjs from 'dayjs'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()
const db = getFirestore()

const CUSTOM_TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ'

const COLLECTIONS = {
  USERS: 'users',
  QR_CODES: 'qrCodes',
  REWARDS: 'rewards',
  CHECK_INS: 'checkIns',
  WALLET_TRANSACTIONS: 'walletTransactions',
  REDEMPTIONS: 'redemptions',
  AUDIT_LOGS: 'auditLogs',
  DAILY_USAGE: 'dailyUsage',
  USER_REWARD_COUNTERS: 'userRewardCounters',
  CONFIG: 'config',
}

const USER_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
}

const QR_STATUS = {
  ACTIVE: 'active',
}

const REWARD_STATUS = {
  ACTIVE: 'active',
}

const STOCK_TYPE = {
  FINITE: 'finite',
}

const REDEMPTION_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

const REJECTION_REASON = {
  USER_NOT_ACTIVE: 'USER_NOT_ACTIVE',
  USER_BLOCKED: 'USER_BLOCKED',
  QR_NOT_ACTIVE: 'QR_NOT_ACTIVE',
  QR_OUT_OF_WINDOW: 'QR_OUT_OF_WINDOW',
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  COOLDOWN_NOT_MET: 'COOLDOWN_NOT_MET',
  REWARD_NOT_ACTIVE: 'REWARD_NOT_ACTIVE',
  REWARD_OUT_OF_WINDOW: 'REWARD_OUT_OF_WINDOW',
  INSUFFICIENT_VISITS: 'INSUFFICIENT_VISITS',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  MAX_REDEMPTIONS_PER_USER_REACHED: 'MAX_REDEMPTIONS_PER_USER_REACHED',
  SAME_DAY_REDEEM_NOT_ALLOWED: 'SAME_DAY_REDEEM_NOT_ALLOWED',
}

const DEFAULT_RULEBOOK = {
  visitsPerCheckIn: 1,
  checkInCooldownMinutes: 90,
  maxScansPerUserPerDay: 2,
  allowSameDayRedeem: false,
}

const dayKeyFromDate = (dateObj) => dateObj.format('YYYY-MM-DD')
const isSameDay = (a, b) => dayjs(a).format('YYYY-MM-DD') === dayjs(b).format('YYYY-MM-DD')

const sanitizeIdempotencyKey = (value) =>
  String(value || '')
    .trim()
    .replace(/[^\w-]/g, '_')
    .slice(0, 120)

const tenantDocPath = (tenantId, collectionName, documentId) =>
  `tenants/${tenantId}/${collectionName}/${documentId}`

const assertRequiredFields = (payload, fields) => {
  const missing = fields.filter((field) => !payload[field])
  if (missing.length) {
    throw new HttpsError(
      'invalid-argument',
      `Faltan campos requeridos: ${missing.join(', ')}`,
    )
  }
}

const assertAuthenticated = (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Debes autenticarte para ejecutar esta operación.')
  }
  return request.auth.uid
}

const parseDateOrNull = (value) => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

const getRulebookRef = (tenantId) => db.doc(tenantDocPath(tenantId, COLLECTIONS.CONFIG, 'rulebook'))

const getMergedRulebook = (rulebookSnapshot) => ({
  ...DEFAULT_RULEBOOK,
  ...(rulebookSnapshot.exists ? rulebookSnapshot.data() : {}),
})

const createCheckInRecord = ({
  tenantId,
  checkInId,
  userId,
  qrCodeId,
  classSessionId,
  scannedAtCustom,
  isValid,
  rejectReason,
  awardedVisits,
  idempotencyKey,
  deviceId,
  actorId,
}) => ({
  checkInId,
  tenantId,
  userId,
  qrCodeId,
  classSessionId: classSessionId || null,
  scannedAtCustom,
  isValid,
  rejectReason: rejectReason || null,
  awardedVisits,
  idempotencyKey,
  deviceId: deviceId || null,
  createdAtCustom: scannedAtCustom,
  updatedAtCustom: scannedAtCustom,
  createdBy: actorId,
  updatedBy: actorId,
})

const createWalletTxRecord = ({
  tenantId,
  txId,
  userId,
  amount,
  balanceAfter,
  referenceType,
  referenceId,
  reasonCode,
  idempotencyKey,
  actorId,
  createdAtCustom,
}) => ({
  txId,
  tenantId,
  userId,
  type: amount >= 0 ? 'earn' : 'redeem',
  amount,
  balanceAfter,
  referenceType,
  referenceId,
  reasonCode,
  idempotencyKey,
  createdAtCustom,
  updatedAtCustom: createdAtCustom,
  createdBy: actorId,
  updatedBy: actorId,
})

const createRedemptionRecord = ({
  tenantId,
  redemptionId,
  userId,
  rewardId,
  requiredVisitsSnapshot,
  status,
  rejectReason,
  requestedAtCustom,
  walletTxId,
  notes,
  actorId,
}) => ({
  redemptionId,
  tenantId,
  userId,
  rewardId,
  requiredVisitsSnapshot,
  status,
  rejectReason: rejectReason || null,
  requestedAtCustom,
  approvedAtCustom: status === REDEMPTION_STATUS.APPROVED ? requestedAtCustom : null,
  deliveredAtCustom: null,
  walletTxId: walletTxId || null,
  notes: notes || '',
  createdAtCustom: requestedAtCustom,
  updatedAtCustom: requestedAtCustom,
  createdBy: actorId,
  updatedBy: actorId,
})

const createAuditLogRecord = ({
  tenantId,
  logId,
  actorId,
  action,
  entityType,
  entityId,
  before,
  after,
  createdAtCustom,
}) => ({
  logId,
  tenantId,
  actorId,
  action,
  entityType,
  entityId,
  before: before || null,
  after: after || null,
  ip: null,
  userAgent: null,
  createdAtCustom,
  updatedAtCustom: createdAtCustom,
  createdBy: actorId,
  updatedBy: actorId,
})

const createNextDailyUsage = ({
  existingRecord,
  tenantId,
  userId,
  dayKey,
  isValid,
  rejectReason,
  scannedAtCustom,
  actorId,
}) => {
  const base = existingRecord || {
    tenantId,
    userId,
    dayKey,
    validScans: 0,
    blockedScans: 0,
    createdAtCustom: scannedAtCustom,
    createdBy: actorId,
  }

  return {
    ...base,
    tenantId,
    userId,
    dayKey,
    validScans: Number(base.validScans || 0) + (isValid ? 1 : 0),
    blockedScans: Number(base.blockedScans || 0) + (isValid ? 0 : 1),
    lastReason: rejectReason || null,
    lastScanAtCustom: scannedAtCustom,
    updatedAtCustom: scannedAtCustom,
    updatedBy: actorId,
  }
}

const evaluateCheckInRejection = ({ user, qr, rules, now, dailyUsage }) => {
  if (!user || user.status === USER_STATUS.BLOCKED) {
    return REJECTION_REASON.USER_BLOCKED
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    return REJECTION_REASON.USER_NOT_ACTIVE
  }

  if (!qr || qr.status !== QR_STATUS.ACTIVE) {
    return REJECTION_REASON.QR_NOT_ACTIVE
  }

  const validFrom = parseDateOrNull(qr.validFromCustom)
  const validUntil = parseDateOrNull(qr.validUntilCustom)
  if (!validFrom || !validUntil || now.isBefore(validFrom) || now.isAfter(validUntil)) {
    return REJECTION_REASON.QR_OUT_OF_WINDOW
  }

  const validScans = Number(dailyUsage?.validScans || 0)
  if (validScans >= Number(rules.maxScansPerUserPerDay || DEFAULT_RULEBOOK.maxScansPerUserPerDay)) {
    return REJECTION_REASON.DAILY_LIMIT_REACHED
  }

  if (user.lastCheckInAtCustom) {
    const lastCheckIn = parseDateOrNull(user.lastCheckInAtCustom)
    const cooldownMinutes = Number(rules.checkInCooldownMinutes || DEFAULT_RULEBOOK.checkInCooldownMinutes)
    if (lastCheckIn && now.diff(lastCheckIn, 'minute') < cooldownMinutes) {
      return REJECTION_REASON.COOLDOWN_NOT_MET
    }
  }

  return null
}

const evaluateRedemptionRejection = ({
  user,
  reward,
  rules,
  now,
  userRewardCounter,
}) => {
  if (!user || user.status === USER_STATUS.BLOCKED) {
    return REJECTION_REASON.USER_BLOCKED
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    return REJECTION_REASON.USER_NOT_ACTIVE
  }

  if (!reward || reward.status !== REWARD_STATUS.ACTIVE) {
    return REJECTION_REASON.REWARD_NOT_ACTIVE
  }

  const validFrom = parseDateOrNull(reward.validFromCustom)
  const validUntil = parseDateOrNull(reward.validUntilCustom)
  if (!validFrom || !validUntil || now.isBefore(validFrom) || now.isAfter(validUntil)) {
    return REJECTION_REASON.REWARD_OUT_OF_WINDOW
  }

  if (!rules.allowSameDayRedeem && user.lastCheckInAtCustom && isSameDay(user.lastCheckInAtCustom, now)) {
    return REJECTION_REASON.SAME_DAY_REDEEM_NOT_ALLOWED
  }

  const balance = Number(user.visitBalanceCached || 0)
  if (balance < Number(reward.requiredVisits || 0)) {
    return REJECTION_REASON.INSUFFICIENT_VISITS
  }

  if (
    reward.stockType === STOCK_TYPE.FINITE &&
    Number(reward.stockAvailable || 0) <= 0
  ) {
    return REJECTION_REASON.OUT_OF_STOCK
  }

  const redeemedCount = Number(userRewardCounter?.redeemCount || 0)
  if (Number(reward.maxPerUser || 0) > 0 && redeemedCount >= Number(reward.maxPerUser)) {
    return REJECTION_REASON.MAX_REDEMPTIONS_PER_USER_REACHED
  }

  return null
}

export const registerCheckIn = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    const actorId = assertAuthenticated(request)
    const payload = request.data || {}

    assertRequiredFields(payload, ['tenantId', 'userId', 'qrCodeId', 'idempotencyKey'])

    const tenantId = String(payload.tenantId)
    const userId = String(payload.userId)
    const qrCodeId = String(payload.qrCodeId)
    const idempotencyKey = sanitizeIdempotencyKey(payload.idempotencyKey)
    const classSessionId = payload.classSessionId ? String(payload.classSessionId) : null
    const deviceId = payload.deviceId ? String(payload.deviceId) : null

    if (!idempotencyKey) {
      throw new HttpsError('invalid-argument', 'idempotencyKey inválido.')
    }

    const checkInId = `chk_${idempotencyKey}`

    const result = await db.runTransaction(async (transaction) => {
      const checkInRef = db.doc(tenantDocPath(tenantId, COLLECTIONS.CHECK_INS, checkInId))
      const userRef = db.doc(tenantDocPath(tenantId, COLLECTIONS.USERS, userId))
      const qrRef = db.doc(tenantDocPath(tenantId, COLLECTIONS.QR_CODES, qrCodeId))
      const rulebookRef = getRulebookRef(tenantId)

      const existingCheckInSnap = await transaction.get(checkInRef)
      if (existingCheckInSnap.exists) {
        const existing = existingCheckInSnap.data()
        return {
          ok: Boolean(existing.isValid),
          idempotent: true,
          checkInId,
          reason: existing.rejectReason || null,
          awardedVisits: Number(existing.awardedVisits || 0),
        }
      }

      const [userSnap, qrSnap, rulebookSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(qrRef),
        transaction.get(rulebookRef),
      ])

      if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
      }

      if (!qrSnap.exists) {
        throw new HttpsError('failed-precondition', 'QR no encontrado.')
      }

      const now = dayjs()
      const scannedAtCustom = now.format(CUSTOM_TIMESTAMP_FORMAT)
      const scanDayKey = dayKeyFromDate(now)
      const rules = getMergedRulebook(rulebookSnap)
      const user = userSnap.data()
      const qr = qrSnap.data()

      const dailyUsageRef = db.doc(
        tenantDocPath(tenantId, COLLECTIONS.DAILY_USAGE, `${userId}_${scanDayKey}`),
      )
      const dailyUsageSnap = await transaction.get(dailyUsageRef)
      const dailyUsage = dailyUsageSnap.exists ? dailyUsageSnap.data() : null

      const rejectionReason = evaluateCheckInRejection({
        user,
        qr,
        rules,
        now,
        dailyUsage,
      })

      if (rejectionReason) {
        const rejectedCheckIn = createCheckInRecord({
          tenantId,
          checkInId,
          userId,
          qrCodeId,
          classSessionId,
          scannedAtCustom,
          isValid: false,
          rejectReason: rejectionReason,
          awardedVisits: 0,
          idempotencyKey,
          deviceId,
          actorId,
        })

        const nextDailyUsage = createNextDailyUsage({
          existingRecord: dailyUsage,
          tenantId,
          userId,
          dayKey: scanDayKey,
          isValid: false,
          rejectReason: rejectionReason,
          scannedAtCustom,
          actorId,
        })

        const auditLog = createAuditLogRecord({
          tenantId,
          logId: `log_chk_${idempotencyKey}`,
          actorId,
          action: 'CHECKIN_REJECTED',
          entityType: 'checkIn',
          entityId: checkInId,
          before: null,
          after: rejectedCheckIn,
          createdAtCustom: scannedAtCustom,
        })

        transaction.set(checkInRef, rejectedCheckIn)
        transaction.set(dailyUsageRef, nextDailyUsage)
        transaction.set(
          db.doc(tenantDocPath(tenantId, COLLECTIONS.AUDIT_LOGS, auditLog.logId)),
          auditLog,
        )

        return {
          ok: false,
          idempotent: false,
          checkInId,
          reason: rejectionReason,
          awardedVisits: 0,
        }
      }

      const awardedVisits = Number(rules.visitsPerCheckIn || DEFAULT_RULEBOOK.visitsPerCheckIn)
      const nextBalance = Number(user.visitBalanceCached || 0) + awardedVisits
      const nextTotalVisits = Number(user.totalVisits || 0) + awardedVisits

      const approvedCheckIn = createCheckInRecord({
        tenantId,
        checkInId,
        userId,
        qrCodeId,
        classSessionId,
        scannedAtCustom,
        isValid: true,
        rejectReason: null,
        awardedVisits,
        idempotencyKey,
        deviceId,
        actorId,
      })

      const walletTxId = `tx_chk_${idempotencyKey}`
      const walletTx = createWalletTxRecord({
        tenantId,
        txId: walletTxId,
        userId,
        amount: awardedVisits,
        balanceAfter: nextBalance,
        referenceType: 'checkIn',
        referenceId: checkInId,
        reasonCode: 'visit_registered',
        idempotencyKey,
        actorId,
        createdAtCustom: scannedAtCustom,
      })

      const nextDailyUsage = createNextDailyUsage({
        existingRecord: dailyUsage,
        tenantId,
        userId,
        dayKey: scanDayKey,
        isValid: true,
        rejectReason: null,
        scannedAtCustom,
        actorId,
      })

      const auditLog = createAuditLogRecord({
        tenantId,
        logId: `log_chk_${idempotencyKey}`,
        actorId,
        action: 'CHECKIN_APPROVED',
        entityType: 'checkIn',
        entityId: checkInId,
        before: null,
        after: approvedCheckIn,
        createdAtCustom: scannedAtCustom,
      })

      transaction.set(checkInRef, approvedCheckIn)
      transaction.set(
        db.doc(tenantDocPath(tenantId, COLLECTIONS.WALLET_TRANSACTIONS, walletTxId)),
        walletTx,
      )
      transaction.set(dailyUsageRef, nextDailyUsage)
      transaction.set(
        db.doc(tenantDocPath(tenantId, COLLECTIONS.AUDIT_LOGS, auditLog.logId)),
        auditLog,
      )
      transaction.update(userRef, {
        visitBalanceCached: nextBalance,
        totalVisits: nextTotalVisits,
        lastCheckInAtCustom: scannedAtCustom,
        updatedAtCustom: scannedAtCustom,
        updatedBy: actorId,
      })

      return {
        ok: true,
        idempotent: false,
        checkInId,
        walletTxId,
        awardedVisits,
        userBalance: nextBalance,
      }
    })

    return result
  },
)

export const redeemReward = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    const actorId = assertAuthenticated(request)
    const payload = request.data || {}

    assertRequiredFields(payload, ['tenantId', 'userId', 'rewardId', 'idempotencyKey'])

    const tenantId = String(payload.tenantId)
    const userId = String(payload.userId)
    const rewardId = String(payload.rewardId)
    const idempotencyKey = sanitizeIdempotencyKey(payload.idempotencyKey)
    const notes = payload.notes ? String(payload.notes) : ''

    if (!idempotencyKey) {
      throw new HttpsError('invalid-argument', 'idempotencyKey inválido.')
    }

    const redemptionId = `rdm_${idempotencyKey}`

    const result = await db.runTransaction(async (transaction) => {
      const redemptionRef = db.doc(tenantDocPath(tenantId, COLLECTIONS.REDEMPTIONS, redemptionId))
      const userRef = db.doc(tenantDocPath(tenantId, COLLECTIONS.USERS, userId))
      const rewardRef = db.doc(tenantDocPath(tenantId, COLLECTIONS.REWARDS, rewardId))
      const rulebookRef = getRulebookRef(tenantId)
      const counterRef = db.doc(
        tenantDocPath(tenantId, COLLECTIONS.USER_REWARD_COUNTERS, `${userId}_${rewardId}`),
      )

      const existingRedemptionSnap = await transaction.get(redemptionRef)
      if (existingRedemptionSnap.exists) {
        const existing = existingRedemptionSnap.data()
        return {
          ok: existing.status === REDEMPTION_STATUS.APPROVED,
          idempotent: true,
          redemptionId,
          status: existing.status,
          reason: existing.rejectReason || null,
          walletTxId: existing.walletTxId || null,
        }
      }

      const [userSnap, rewardSnap, rulebookSnap, counterSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(rewardRef),
        transaction.get(rulebookRef),
        transaction.get(counterRef),
      ])

      if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
      }

      if (!rewardSnap.exists) {
        throw new HttpsError('failed-precondition', 'Premio no encontrado.')
      }

      const now = dayjs()
      const requestedAtCustom = now.format(CUSTOM_TIMESTAMP_FORMAT)
      const user = userSnap.data()
      const reward = rewardSnap.data()
      const rules = getMergedRulebook(rulebookSnap)
      const rewardCounter = counterSnap.exists ? counterSnap.data() : null

      const rejectionReason = evaluateRedemptionRejection({
        user,
        reward,
        rules,
        now,
        userRewardCounter: rewardCounter,
      })

      if (rejectionReason) {
        const rejectedRedemption = createRedemptionRecord({
          tenantId,
          redemptionId,
          userId,
          rewardId,
          requiredVisitsSnapshot: Number(reward.requiredVisits || 0),
          status: REDEMPTION_STATUS.REJECTED,
          rejectReason: rejectionReason,
          requestedAtCustom,
          walletTxId: null,
          notes,
          actorId,
        })

        const auditLog = createAuditLogRecord({
          tenantId,
          logId: `log_rdm_${idempotencyKey}`,
          actorId,
          action: 'REWARD_REDEMPTION_REJECTED',
          entityType: 'redemption',
          entityId: redemptionId,
          before: null,
          after: rejectedRedemption,
          createdAtCustom: requestedAtCustom,
        })

        transaction.set(redemptionRef, rejectedRedemption)
        transaction.set(
          db.doc(tenantDocPath(tenantId, COLLECTIONS.AUDIT_LOGS, auditLog.logId)),
          auditLog,
        )

        return {
          ok: false,
          idempotent: false,
          redemptionId,
          status: REDEMPTION_STATUS.REJECTED,
          reason: rejectionReason,
        }
      }

      const requiredVisits = Number(reward.requiredVisits || 0)
      const nextUserBalance = Number(user.visitBalanceCached || 0) - requiredVisits
      const walletTxId = `tx_rdm_${idempotencyKey}`

      const walletTx = createWalletTxRecord({
        tenantId,
        txId: walletTxId,
        userId,
        amount: -requiredVisits,
        balanceAfter: nextUserBalance,
        referenceType: 'redemption',
        referenceId: redemptionId,
        reasonCode: 'reward_redeemed',
        idempotencyKey,
        actorId,
        createdAtCustom: requestedAtCustom,
      })

      const approvedRedemption = createRedemptionRecord({
        tenantId,
        redemptionId,
        userId,
        rewardId,
        requiredVisitsSnapshot: requiredVisits,
        status: REDEMPTION_STATUS.APPROVED,
        rejectReason: null,
        requestedAtCustom,
        walletTxId,
        notes,
        actorId,
      })

      const nextRedeemCount = Number(rewardCounter?.redeemCount || 0) + 1
      const nextCounter = {
        tenantId,
        userId,
        rewardId,
        redeemCount: nextRedeemCount,
        lastRedeemedAtCustom: requestedAtCustom,
        createdAtCustom: rewardCounter?.createdAtCustom || requestedAtCustom,
        updatedAtCustom: requestedAtCustom,
        createdBy: rewardCounter?.createdBy || actorId,
        updatedBy: actorId,
      }

      const auditLog = createAuditLogRecord({
        tenantId,
        logId: `log_rdm_${idempotencyKey}`,
        actorId,
        action: 'REWARD_REDEMPTION_APPROVED',
        entityType: 'redemption',
        entityId: redemptionId,
        before: null,
        after: approvedRedemption,
        createdAtCustom: requestedAtCustom,
      })

      transaction.set(redemptionRef, approvedRedemption)
      transaction.set(
        db.doc(tenantDocPath(tenantId, COLLECTIONS.WALLET_TRANSACTIONS, walletTxId)),
        walletTx,
      )
      transaction.set(counterRef, nextCounter)
      transaction.set(
        db.doc(tenantDocPath(tenantId, COLLECTIONS.AUDIT_LOGS, auditLog.logId)),
        auditLog,
      )
      transaction.update(userRef, {
        visitBalanceCached: nextUserBalance,
        updatedAtCustom: requestedAtCustom,
        updatedBy: actorId,
      })

      if (reward.stockType === STOCK_TYPE.FINITE) {
        transaction.update(rewardRef, {
          stockAvailable: Number(reward.stockAvailable || 0) - 1,
          updatedAtCustom: requestedAtCustom,
          updatedBy: actorId,
        })
      }

      return {
        ok: true,
        idempotent: false,
        redemptionId,
        status: REDEMPTION_STATUS.APPROVED,
        walletTxId,
        userBalance: nextUserBalance,
      }
    })

    return result
  },
)
