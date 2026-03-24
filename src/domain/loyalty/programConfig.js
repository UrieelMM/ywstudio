import dayjs from 'dayjs'

export const PROGRAM_VERSION = 'rulebook.v1'

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
}

export const QR_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
}

export const REWARD_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
}

export const STOCK_TYPE = {
  FINITE: 'finite',
  INFINITE: 'infinite',
}

export const REJECTION_REASON = {
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
  INVALID_RULESET: 'INVALID_RULESET',
}

export const createCustomTimestamp = () => dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZ')

export const defaultProgramRules = {
  rulebookVersion: PROGRAM_VERSION,
  timezone: 'America/Mexico_City',
  visitsPerCheckIn: 1,
  checkInCooldownMinutes: 90,
  maxScansPerUserPerDay: 2,
  maxManualAdjustmentsPerDay: 3,
  milestones: [8, 16, 24],
  allowManualCheckIn: true,
  allowSameDayRedeem: false,
}

export const defaultRewardTemplates = [
  {
    rewardId: 'reward-8-visits',
    name: 'Clase extra gratis',
    description: 'Acceso a una clase adicional de la disciplina elegida.',
    requiredVisits: 8,
    stockType: STOCK_TYPE.FINITE,
    stockAvailable: 40,
    maxPerUser: 2,
    status: REWARD_STATUS.ACTIVE,
    validFromCustom: '2026-01-01T00:00:00.000-06:00',
    validUntilCustom: '2026-12-31T23:59:59.000-06:00',
    createdAtCustom: createCustomTimestamp(),
    updatedAtCustom: createCustomTimestamp(),
  },
  {
    rewardId: 'reward-16-visits',
    name: 'Playera edición studio',
    description: 'Playera oficial de programa de lealtad.',
    requiredVisits: 16,
    stockType: STOCK_TYPE.FINITE,
    stockAvailable: 20,
    maxPerUser: 1,
    status: REWARD_STATUS.ACTIVE,
    validFromCustom: '2026-01-01T00:00:00.000-06:00',
    validUntilCustom: '2026-12-31T23:59:59.000-06:00',
    createdAtCustom: createCustomTimestamp(),
    updatedAtCustom: createCustomTimestamp(),
  },
  {
    rewardId: 'reward-24-visits',
    name: 'Masterclass premium',
    description: 'Clase especial con instructor invitado.',
    requiredVisits: 24,
    stockType: STOCK_TYPE.FINITE,
    stockAvailable: 10,
    maxPerUser: 1,
    status: REWARD_STATUS.PAUSED,
    validFromCustom: '2026-01-01T00:00:00.000-06:00',
    validUntilCustom: '2026-12-31T23:59:59.000-06:00',
    createdAtCustom: createCustomTimestamp(),
    updatedAtCustom: createCustomTimestamp(),
  },
]
