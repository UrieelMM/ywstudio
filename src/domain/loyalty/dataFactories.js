import dayjs from 'dayjs'
import {
  LEDGER_TX_TYPES,
  REDEMPTION_STATUS,
  REFERENCE_TYPES,
} from './dataContract'
import { createCustomTimestamp } from './programConfig'
import { REWARD_STATUS, STOCK_TYPE, USER_STATUS } from './programConfig'

const createId = (prefix) =>
  `${prefix}_${dayjs().format('YYYYMMDDHHmmss')}_${Math.random().toString(36).slice(2, 8)}`

const nowCustom = () => createCustomTimestamp()

const withAuditFields = (payload, actorId = 'system', isCreate = true) => {
  const timestamp = nowCustom()
  return {
    ...payload,
    createdAtCustom: isCreate ? timestamp : payload.createdAtCustom || timestamp,
    updatedAtCustom: timestamp,
    createdBy: isCreate ? actorId : payload.createdBy || actorId,
    updatedBy: actorId,
  }
}

const normalizeFullName = (firstName, lastName) => `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim()

export const createUserRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    userId: input.userId || createId('user'),
    tenantId,
    firstName: input.firstName?.trim() || '',
    lastName: input.lastName?.trim() || '',
    fullName: input.fullName || normalizeFullName(input.firstName || '', input.lastName || ''),
    phoneE164: input.phoneE164 || '',
    email: input.email || '',
    profileImageUrl: input.profileImageUrl || '',
    birthDate: input.birthDate || null,
    disciplineIds: Array.isArray(input.disciplineIds) ? input.disciplineIds : [],
    status: input.status || USER_STATUS.ACTIVE,
    visitBalanceCached: input.visitBalanceCached ?? 0,
    totalVisits: input.totalVisits ?? 0,
    lastCheckInAtCustom: input.lastCheckInAtCustom || null,
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createQrCodeRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    qrCodeId: input.qrCodeId || createId('qr'),
    tenantId,
    name: input.name || '',
    disciplineId: input.disciplineId || '',
    branchId: input.branchId || '',
    classId: input.classId || null,
    mode: input.mode || 'session',
    validFromCustom: input.validFromCustom || nowCustom(),
    validUntilCustom: input.validUntilCustom || nowCustom(),
    cooldownMinutes: input.cooldownMinutes ?? 90,
    maxScansPerUserPerDay: input.maxScansPerUserPerDay ?? 2,
    status: input.status || 'active',
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createRewardRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    rewardId: input.rewardId || createId('reward'),
    tenantId,
    name: input.name || '',
    description: input.description || '',
    rewardImageUrl: input.rewardImageUrl || '',
    requiredVisits: input.requiredVisits ?? 8,
    stockType: input.stockType || STOCK_TYPE.FINITE,
    stockAvailable: input.stockAvailable ?? 0,
    maxPerUser: input.maxPerUser ?? 1,
    status: input.status || REWARD_STATUS.ACTIVE,
    validFromCustom: input.validFromCustom || nowCustom(),
    validUntilCustom: input.validUntilCustom || nowCustom(),
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createCheckInRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    checkInId: input.checkInId || createId('chk'),
    tenantId,
    userId: input.userId || '',
    qrCodeId: input.qrCodeId || '',
    classSessionId: input.classSessionId || null,
    scannedAtCustom: input.scannedAtCustom || nowCustom(),
    isValid: input.isValid ?? true,
    rejectReason: input.rejectReason || null,
    awardedVisits: input.awardedVisits ?? 0,
    idempotencyKey: input.idempotencyKey || createId('idem'),
    deviceId: input.deviceId || null,
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createWalletTransactionRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    txId: input.txId || createId('tx'),
    tenantId,
    userId: input.userId || '',
    type: input.type || LEDGER_TX_TYPES.EARN,
    amount: input.amount ?? 0,
    balanceAfter: input.balanceAfter ?? 0,
    referenceType: input.referenceType || REFERENCE_TYPES.MANUAL_ADJUSTMENT,
    referenceId: input.referenceId || createId('ref'),
    reasonCode: input.reasonCode || 'manual_adjustment',
    idempotencyKey: input.idempotencyKey || createId('idem'),
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createRedemptionRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    redemptionId: input.redemptionId || createId('rdm'),
    tenantId,
    userId: input.userId || '',
    rewardId: input.rewardId || '',
    requiredVisitsSnapshot: input.requiredVisitsSnapshot ?? 0,
    status: input.status || REDEMPTION_STATUS.PENDING,
    requestedAtCustom: input.requestedAtCustom || nowCustom(),
    approvedAtCustom: input.approvedAtCustom || null,
    deliveredAtCustom: input.deliveredAtCustom || null,
    walletTxId: input.walletTxId || null,
    notes: input.notes || '',
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createAuditLogRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    logId: input.logId || createId('log'),
    tenantId,
    actorId,
    action: input.action || 'UNKNOWN_ACTION',
    entityType: input.entityType || 'unknown',
    entityId: input.entityId || '',
    before: input.before || null,
    after: input.after || null,
    ip: input.ip || null,
    userAgent: input.userAgent || null,
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createDailyUsageRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    usageId: input.usageId || createId('usage'),
    tenantId,
    userId: input.userId || '',
    dayKey: input.dayKey || dayjs().format('YYYY-MM-DD'),
    validScans: input.validScans ?? 0,
    blockedScans: input.blockedScans ?? 0,
    lastReason: input.lastReason || null,
    lastScanAtCustom: input.lastScanAtCustom || null,
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createUserRewardCounterRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    counterId: input.counterId || createId('counter'),
    tenantId,
    userId: input.userId || '',
    rewardId: input.rewardId || '',
    redeemCount: input.redeemCount ?? 0,
    lastRedeemedAtCustom: input.lastRedeemedAtCustom || null,
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}

export const createNotificationRecord = ({ tenantId, actorId = 'system', ...input }) => {
  const base = {
    notificationId: input.notificationId || createId('ntf'),
    tenantId,
    type: input.type || 'system',
    title: input.title || '',
    message: input.message || '',
    userId: input.userId || null,
    rewardId: input.rewardId || null,
    checkInId: input.checkInId || null,
    isRead: input.isRead ?? false,
    readAtCustom: input.readAtCustom || null,
    metadata: input.metadata || null,
  }

  return withAuditFields(base, actorId, !input.createdAtCustom)
}
