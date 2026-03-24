import {
  DATA_CONTRACT_VERSION,
  dataContractSchemas,
  entityKeys,
} from '../domain/loyalty/dataContract'
import { validateEntityRecord } from '../domain/loyalty/dataContractValidators'
import {
  createAuditLogRecord,
  createCheckInRecord,
  createDailyUsageRecord,
  createQrCodeRecord,
  createRedemptionRecord,
  createRewardRecord,
  createUserRecord,
  createUserRewardCounterRecord,
  createWalletTransactionRecord,
} from '../domain/loyalty/dataFactories'
import { create } from './initialStore'

const sampleFactoryMap = {
  user: createUserRecord,
  qrCode: createQrCodeRecord,
  reward: createRewardRecord,
  checkIn: createCheckInRecord,
  walletTransaction: createWalletTransactionRecord,
  redemption: createRedemptionRecord,
  auditLog: createAuditLogRecord,
  dailyUsage: createDailyUsageRecord,
  userRewardCounter: createUserRewardCounterRecord,
}

const defaultInputs = {
  user: {
    firstName: 'Camila',
    lastName: 'Herrera',
    phoneE164: '+525512341234',
    disciplineIds: ['ballet'],
  },
  qrCode: {
    name: 'QR Ballet Matutino',
    disciplineId: 'ballet',
    branchId: 'centro',
    mode: 'session',
  },
  reward: {
    name: 'Clase extra gratis',
    requiredVisits: 8,
    stockAvailable: 30,
  },
  checkIn: {
    userId: 'user_seed',
    qrCodeId: 'qr_seed',
    awardedVisits: 1,
    isValid: true,
  },
  walletTransaction: {
    userId: 'user_seed',
    type: 'earn',
    amount: 1,
    balanceAfter: 12,
    referenceType: 'checkIn',
    referenceId: 'chk_seed',
    reasonCode: 'visit_registered',
  },
  redemption: {
    userId: 'user_seed',
    rewardId: 'reward_seed',
    requiredVisitsSnapshot: 8,
  },
  auditLog: {
    action: 'RULEBOOK_UPDATED',
    entityType: 'rulebook',
    entityId: 'default',
  },
  dailyUsage: {
    userId: 'user_seed',
    validScans: 1,
    blockedScans: 0,
  },
  userRewardCounter: {
    userId: 'user_seed',
    rewardId: 'reward_seed',
    redeemCount: 1,
  },
}

export const useLoyaltyDataContractStore = create()((set, get) => ({
  tenantId: 'tenant-ywstudio',
  contractVersion: DATA_CONTRACT_VERSION,
  schemas: dataContractSchemas,
  entityKeys,
  lastValidationReport: null,

  setTenantId: (tenantId) => {
    set({ tenantId })
  },

  createSampleRecord: (entityKey, overrides = {}, actorId = 'system') => {
    const factory = sampleFactoryMap[entityKey]
    if (!factory) {
      throw new Error(`No existe factory para ${entityKey}`)
    }

    const { tenantId } = get()
    const baseInput = defaultInputs[entityKey] || {}
    const sample = factory({
      tenantId,
      actorId,
      ...baseInput,
      ...overrides,
    })

    const report = validateEntityRecord(entityKey, sample, {
      partial: false,
      allowUnknownFields: false,
    })

    set({
      lastValidationReport: {
        entityKey,
        ...report,
      },
    })

    return {
      sample,
      report,
    }
  },

  validateDraft: (entityKey, draft, options = { partial: false, allowUnknownFields: false }) => {
    const report = validateEntityRecord(entityKey, draft, options)
    set({
      lastValidationReport: {
        entityKey,
        ...report,
      },
    })
    return report
  },
}))
