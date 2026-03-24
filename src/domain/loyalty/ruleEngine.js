import dayjs from 'dayjs'
import {
  QR_STATUS,
  REJECTION_REASON,
  REWARD_STATUS,
  STOCK_TYPE,
  USER_STATUS,
  createCustomTimestamp,
} from './programConfig'

const parseDate = (value) => dayjs(value)

export const validateRuleset = (rules) => {
  const issues = []

  if (!rules.visitsPerCheckIn || rules.visitsPerCheckIn < 1) {
    issues.push('visitsPerCheckIn debe ser mayor a 0.')
  }

  if (!rules.checkInCooldownMinutes || rules.checkInCooldownMinutes < 1) {
    issues.push('checkInCooldownMinutes debe ser mayor a 0.')
  }

  if (!rules.maxScansPerUserPerDay || rules.maxScansPerUserPerDay < 1) {
    issues.push('maxScansPerUserPerDay debe ser mayor a 0.')
  }

  const milestones = Array.isArray(rules.milestones) ? rules.milestones : []
  const hasNonPositive = milestones.some((value) => value <= 0)
  const sorted = [...milestones].sort((a, b) => a - b)
  const hasDuplicates = new Set(milestones).size !== milestones.length
  const isNotSorted = milestones.some((value, index) => value !== sorted[index])

  if (!milestones.length || hasNonPositive || hasDuplicates || isNotSorted) {
    issues.push('milestones debe ser una lista ascendente, única y mayor a 0.')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export const validateCheckIn = ({ rules, user, qr, checkInAtCustom, scansTodayCount = 0 }) => {
  const ruleset = validateRuleset(rules)

  if (!ruleset.valid) {
    return {
      valid: false,
      reason: REJECTION_REASON.INVALID_RULESET,
      details: ruleset.issues,
    }
  }

  if (!user || user.status === USER_STATUS.BLOCKED) {
    return { valid: false, reason: REJECTION_REASON.USER_BLOCKED }
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    return { valid: false, reason: REJECTION_REASON.USER_NOT_ACTIVE }
  }

  if (!qr || qr.status !== QR_STATUS.ACTIVE) {
    return { valid: false, reason: REJECTION_REASON.QR_NOT_ACTIVE }
  }

  const now = parseDate(checkInAtCustom || createCustomTimestamp())
  const validFrom = parseDate(qr.validFromCustom)
  const validUntil = parseDate(qr.validUntilCustom)

  if (!now.isValid() || !validFrom.isValid() || !validUntil.isValid()) {
    return { valid: false, reason: REJECTION_REASON.QR_OUT_OF_WINDOW }
  }

  if (now.isBefore(validFrom) || now.isAfter(validUntil)) {
    return { valid: false, reason: REJECTION_REASON.QR_OUT_OF_WINDOW }
  }

  if (scansTodayCount >= rules.maxScansPerUserPerDay) {
    return { valid: false, reason: REJECTION_REASON.DAILY_LIMIT_REACHED }
  }

  if (user.lastCheckInAtCustom) {
    const lastCheckIn = parseDate(user.lastCheckInAtCustom)
    const diffMinutes = now.diff(lastCheckIn, 'minute')

    if (lastCheckIn.isValid() && diffMinutes < rules.checkInCooldownMinutes) {
      return {
        valid: false,
        reason: REJECTION_REASON.COOLDOWN_NOT_MET,
        cooldownRemainingMinutes: rules.checkInCooldownMinutes - diffMinutes,
      }
    }
  }

  return {
    valid: true,
    awardedVisits: rules.visitsPerCheckIn,
    recordedAtCustom: now.format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
  }
}

export const evaluateRewardRedemption = ({
  rules,
  reward,
  userVisitBalance = 0,
  userRedemptionCount = 0,
  redeemAtCustom,
}) => {
  const ruleset = validateRuleset(rules)
  if (!ruleset.valid) {
    return {
      valid: false,
      reason: REJECTION_REASON.INVALID_RULESET,
      details: ruleset.issues,
    }
  }

  if (!reward || reward.status !== REWARD_STATUS.ACTIVE) {
    return { valid: false, reason: REJECTION_REASON.REWARD_NOT_ACTIVE }
  }

  const now = parseDate(redeemAtCustom || createCustomTimestamp())
  const validFrom = parseDate(reward.validFromCustom)
  const validUntil = parseDate(reward.validUntilCustom)

  if (!now.isValid() || !validFrom.isValid() || !validUntil.isValid()) {
    return { valid: false, reason: REJECTION_REASON.REWARD_OUT_OF_WINDOW }
  }

  if (now.isBefore(validFrom) || now.isAfter(validUntil)) {
    return { valid: false, reason: REJECTION_REASON.REWARD_OUT_OF_WINDOW }
  }

  if (userVisitBalance < reward.requiredVisits) {
    return { valid: false, reason: REJECTION_REASON.INSUFFICIENT_VISITS }
  }

  if (
    reward.stockType === STOCK_TYPE.FINITE &&
    typeof reward.stockAvailable === 'number' &&
    reward.stockAvailable <= 0
  ) {
    return { valid: false, reason: REJECTION_REASON.OUT_OF_STOCK }
  }

  if (reward.maxPerUser && userRedemptionCount >= reward.maxPerUser) {
    return {
      valid: false,
      reason: REJECTION_REASON.MAX_REDEMPTIONS_PER_USER_REACHED,
    }
  }

  const canRedeemToday = rules.allowSameDayRedeem
  return {
    valid: true,
    visitsToDebit: reward.requiredVisits,
    canRedeemToday,
    recordedAtCustom: now.format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
  }
}

export const getRulebookHealth = ({ rules, rewards }) => {
  const ruleset = validateRuleset(rules)
  const activeRewards = rewards.filter((reward) => reward.status === REWARD_STATUS.ACTIVE)
  const hasRewardWithoutMilestone = activeRewards.some(
    (reward) => !rules.milestones.includes(reward.requiredVisits),
  )

  const issues = [...ruleset.issues]
  if (!activeRewards.length) {
    issues.push('No hay premios activos.')
  }

  if (hasRewardWithoutMilestone) {
    issues.push('Hay premios activos sin milestone equivalente en reglas.')
  }

  return {
    ready: issues.length === 0,
    score: Math.max(0, 100 - issues.length * 20),
    issues,
  }
}

