import {
  REWARD_STATUS,
  STOCK_TYPE,
  USER_STATUS,
  QR_STATUS,
  REJECTION_REASON,
} from './programConfig'

export const DATA_CONTRACT_VERSION = 'firebase.contract.v1'
export const TENANT_ROOT_COLLECTION = 'tenants'

export const TENANT_SUBCOLLECTIONS = {
  USERS: 'users',
  QR_CODES: 'qrCodes',
  REWARDS: 'rewards',
  CHECK_INS: 'checkIns',
  WALLET_TRANSACTIONS: 'walletTransactions',
  REDEMPTIONS: 'redemptions',
  AUDIT_LOGS: 'auditLogs',
  DAILY_USAGE: 'dailyUsage',
  USER_REWARD_COUNTERS: 'userRewardCounters',
}

export const LEDGER_TX_TYPES = {
  EARN: 'earn',
  REDEEM: 'redeem',
  ADJUST: 'adjust',
  REVERSAL: 'reversal',
  EXPIRE: 'expire',
}

export const REDEMPTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DELIVERED: 'delivered',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

export const REFERENCE_TYPES = {
  CHECK_IN: 'checkIn',
  REDEMPTION: 'redemption',
  MANUAL_ADJUSTMENT: 'manualAdjustment',
  EXPIRATION: 'expiration',
}

const auditFields = {
  createdAtCustom: { type: 'string', required: true, format: 'customTimestamp' },
  updatedAtCustom: { type: 'string', required: true, format: 'customTimestamp' },
  createdBy: { type: 'string', required: true },
  updatedBy: { type: 'string', required: true },
}

export const dataContractSchemas = {
  user: {
    collection: TENANT_SUBCOLLECTIONS.USERS,
    idField: 'userId',
    fields: {
      userId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      firstName: { type: 'string', required: true, minLength: 2 },
      lastName: { type: 'string', required: true, minLength: 2 },
      fullName: { type: 'string', required: true, minLength: 4 },
      phoneE164: { type: 'string', required: true, pattern: '^\\+[1-9]\\d{7,14}$' },
      email: { type: 'string', required: false },
      birthDate: { type: 'string', required: false, format: 'isoDate' },
      disciplineIds: { type: 'array', required: true, minItems: 1, itemType: 'string' },
      status: { type: 'string', required: true, enum: Object.values(USER_STATUS) },
      visitBalanceCached: { type: 'number', required: true, min: 0 },
      totalVisits: { type: 'number', required: true, min: 0 },
      lastCheckInAtCustom: { type: 'string', required: false, format: 'customTimestamp' },
      ...auditFields,
    },
  },
  qrCode: {
    collection: TENANT_SUBCOLLECTIONS.QR_CODES,
    idField: 'qrCodeId',
    fields: {
      qrCodeId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      name: { type: 'string', required: true, minLength: 3 },
      disciplineId: { type: 'string', required: true },
      branchId: { type: 'string', required: true },
      classId: { type: 'string', required: false },
      mode: { type: 'string', required: true, enum: ['static', 'session', 'dynamic'] },
      validFromCustom: { type: 'string', required: true, format: 'customTimestamp' },
      validUntilCustom: { type: 'string', required: true, format: 'customTimestamp' },
      cooldownMinutes: { type: 'number', required: true, min: 1 },
      maxScansPerUserPerDay: { type: 'number', required: true, min: 1 },
      status: { type: 'string', required: true, enum: Object.values(QR_STATUS) },
      ...auditFields,
    },
  },
  reward: {
    collection: TENANT_SUBCOLLECTIONS.REWARDS,
    idField: 'rewardId',
    fields: {
      rewardId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      name: { type: 'string', required: true, minLength: 3 },
      description: { type: 'string', required: false },
      requiredVisits: { type: 'number', required: true, min: 1 },
      stockType: { type: 'string', required: true, enum: Object.values(STOCK_TYPE) },
      stockAvailable: { type: 'number', required: true, min: 0 },
      maxPerUser: { type: 'number', required: true, min: 1 },
      status: { type: 'string', required: true, enum: Object.values(REWARD_STATUS) },
      validFromCustom: { type: 'string', required: true, format: 'customTimestamp' },
      validUntilCustom: { type: 'string', required: true, format: 'customTimestamp' },
      ...auditFields,
    },
  },
  checkIn: {
    collection: TENANT_SUBCOLLECTIONS.CHECK_INS,
    idField: 'checkInId',
    fields: {
      checkInId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      qrCodeId: { type: 'string', required: true },
      classSessionId: { type: 'string', required: false },
      scannedAtCustom: { type: 'string', required: true, format: 'customTimestamp' },
      isValid: { type: 'boolean', required: true },
      rejectReason: {
        type: 'string',
        required: false,
        enum: Object.values(REJECTION_REASON),
      },
      awardedVisits: { type: 'number', required: true, min: 0 },
      idempotencyKey: { type: 'string', required: true, minLength: 8 },
      deviceId: { type: 'string', required: false },
      ...auditFields,
    },
  },
  walletTransaction: {
    collection: TENANT_SUBCOLLECTIONS.WALLET_TRANSACTIONS,
    idField: 'txId',
    fields: {
      txId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      type: { type: 'string', required: true, enum: Object.values(LEDGER_TX_TYPES) },
      amount: { type: 'number', required: true },
      balanceAfter: { type: 'number', required: true, min: 0 },
      referenceType: { type: 'string', required: true, enum: Object.values(REFERENCE_TYPES) },
      referenceId: { type: 'string', required: true },
      reasonCode: { type: 'string', required: true },
      idempotencyKey: { type: 'string', required: true, minLength: 8 },
      ...auditFields,
    },
  },
  redemption: {
    collection: TENANT_SUBCOLLECTIONS.REDEMPTIONS,
    idField: 'redemptionId',
    fields: {
      redemptionId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      rewardId: { type: 'string', required: true },
      requiredVisitsSnapshot: { type: 'number', required: true, min: 1 },
      status: { type: 'string', required: true, enum: Object.values(REDEMPTION_STATUS) },
      rejectReason: {
        type: 'string',
        required: false,
        enum: Object.values(REJECTION_REASON),
      },
      requestedAtCustom: { type: 'string', required: true, format: 'customTimestamp' },
      approvedAtCustom: { type: 'string', required: false, format: 'customTimestamp' },
      deliveredAtCustom: { type: 'string', required: false, format: 'customTimestamp' },
      walletTxId: { type: 'string', required: false },
      notes: { type: 'string', required: false },
      ...auditFields,
    },
  },
  dailyUsage: {
    collection: TENANT_SUBCOLLECTIONS.DAILY_USAGE,
    idField: 'usageId',
    fields: {
      usageId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      dayKey: { type: 'string', required: true },
      validScans: { type: 'number', required: true, min: 0 },
      blockedScans: { type: 'number', required: true, min: 0 },
      lastReason: { type: 'string', required: false, enum: Object.values(REJECTION_REASON) },
      lastScanAtCustom: { type: 'string', required: false, format: 'customTimestamp' },
      ...auditFields,
    },
  },
  userRewardCounter: {
    collection: TENANT_SUBCOLLECTIONS.USER_REWARD_COUNTERS,
    idField: 'counterId',
    fields: {
      counterId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      rewardId: { type: 'string', required: true },
      redeemCount: { type: 'number', required: true, min: 0 },
      lastRedeemedAtCustom: { type: 'string', required: false, format: 'customTimestamp' },
      ...auditFields,
    },
  },
  auditLog: {
    collection: TENANT_SUBCOLLECTIONS.AUDIT_LOGS,
    idField: 'logId',
    fields: {
      logId: { type: 'string', required: true },
      tenantId: { type: 'string', required: true },
      actorId: { type: 'string', required: true },
      action: { type: 'string', required: true },
      entityType: { type: 'string', required: true },
      entityId: { type: 'string', required: true },
      before: { type: 'object', required: false },
      after: { type: 'object', required: false },
      ip: { type: 'string', required: false },
      userAgent: { type: 'string', required: false },
      ...auditFields,
    },
  },
}

export const entityKeys = Object.keys(dataContractSchemas)

export const collectionToEntityMap = Object.fromEntries(
  entityKeys.map((key) => [dataContractSchemas[key].collection, key]),
)
