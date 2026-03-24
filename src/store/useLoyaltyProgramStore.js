import dayjs from 'dayjs'
import {
  createCustomTimestamp,
  defaultProgramRules,
  defaultRewardTemplates,
} from '../domain/loyalty/programConfig'
import {
  evaluateRewardRedemption,
  getRulebookHealth,
  validateCheckIn,
} from '../domain/loyalty/ruleEngine'
import {
  qrFieldCatalog,
  rewardFieldCatalog,
  userFieldCatalog,
} from '../domain/loyalty/fieldCatalog'
import { create } from './initialStore'

const nowCustom = () => createCustomTimestamp()

const normalizeMilestones = (milestones) => {
  if (!Array.isArray(milestones)) {
    return []
  }

  return [...new Set(milestones.map((value) => Number(value)).filter((value) => value > 0))].sort(
    (a, b) => a - b,
  )
}

const buildAuditEntry = (action, description, payload = null) => ({
  id: `${action}-${dayjs().valueOf()}`,
  action,
  description,
  payload,
  createdAtCustom: nowCustom(),
})

const initialDate = nowCustom()

const initialRulebook = {
  ...defaultProgramRules,
  milestones: normalizeMilestones(defaultProgramRules.milestones),
  createdAtCustom: initialDate,
  updatedAtCustom: initialDate,
}

export const useLoyaltyProgramStore = create()((set, get) => {
  const initialHealth = getRulebookHealth({
    rules: initialRulebook,
    rewards: defaultRewardTemplates,
  })

  return {
    tenant: {
      tenantId: 'tenant-ywstudio',
      studioName: 'YWStudio',
      timezone: defaultProgramRules.timezone,
      createdAtCustom: initialDate,
      updatedAtCustom: initialDate,
    },
    rulebook: initialRulebook,
    rewardTemplates: defaultRewardTemplates,
    catalogs: {
      userFieldCatalog,
      rewardFieldCatalog,
      qrFieldCatalog,
    },
    businessLocks: [
      'Bloquear escaneo si usuario no está activo.',
      'Bloquear escaneo cuando QR está pausado o fuera de vigencia.',
      'Bloquear escaneo duplicado dentro del cooldown.',
      'Bloquear canje sin saldo suficiente.',
      'Bloquear canje sin stock disponible.',
    ],
    health: initialHealth,
    lastCheckInSimulation: null,
    lastRedemptionSimulation: null,
    auditTrail: [buildAuditEntry('RULEBOOK_CREATED', 'Reglamento inicial generado.')],

    patchRulebook: (patch, actor = 'system') => {
      set((state) => {
        const nextMilestones =
          patch.milestones !== undefined
            ? normalizeMilestones(patch.milestones)
            : state.rulebook.milestones

        const nextRulebook = {
          ...state.rulebook,
          ...patch,
          milestones: nextMilestones,
          updatedAtCustom: nowCustom(),
          updatedBy: actor,
        }

        const nextHealth = getRulebookHealth({
          rules: nextRulebook,
          rewards: state.rewardTemplates,
        })

        return {
          rulebook: nextRulebook,
          health: nextHealth,
          auditTrail: [
            buildAuditEntry('RULEBOOK_UPDATED', 'Reglas del programa actualizadas.', {
              actor,
              patch,
            }),
            ...state.auditTrail,
          ],
        }
      })
    },

    setMilestones: (milestones, actor = 'system') => {
      get().patchRulebook({ milestones }, actor)
    },

    upsertRewardTemplate: (rewardInput, actor = 'system') => {
      set((state) => {
        const timestamp = nowCustom()
        const exists = state.rewardTemplates.some((reward) => reward.rewardId === rewardInput.rewardId)

        const rewardPayload = {
          ...rewardInput,
          updatedAtCustom: timestamp,
          createdAtCustom: exists ? rewardInput.createdAtCustom || timestamp : timestamp,
        }

        const nextRewards = exists
          ? state.rewardTemplates.map((reward) =>
              reward.rewardId === rewardInput.rewardId ? { ...reward, ...rewardPayload } : reward,
            )
          : [...state.rewardTemplates, rewardPayload]

        return {
          rewardTemplates: nextRewards,
          health: getRulebookHealth({ rules: state.rulebook, rewards: nextRewards }),
          auditTrail: [
            buildAuditEntry(
              exists ? 'REWARD_UPDATED' : 'REWARD_CREATED',
              exists ? 'Plantilla de premio actualizada.' : 'Plantilla de premio creada.',
              { actor, rewardId: rewardInput.rewardId },
            ),
            ...state.auditTrail,
          ],
        }
      })
    },

    updateRewardStatus: (rewardId, status, actor = 'system') => {
      set((state) => {
        const timestamp = nowCustom()
        const nextRewards = state.rewardTemplates.map((reward) =>
          reward.rewardId === rewardId ? { ...reward, status, updatedAtCustom: timestamp } : reward,
        )

        return {
          rewardTemplates: nextRewards,
          health: getRulebookHealth({ rules: state.rulebook, rewards: nextRewards }),
          auditTrail: [
            buildAuditEntry('REWARD_STATUS_UPDATED', 'Estado de premio actualizado.', {
              actor,
              rewardId,
              status,
            }),
            ...state.auditTrail,
          ],
        }
      })
    },

    runCheckInSimulation: (payload) => {
      const state = get()
      const result = validateCheckIn({
        rules: state.rulebook,
        ...payload,
      })

      set((previous) => ({
        lastCheckInSimulation: {
          ...result,
          createdAtCustom: nowCustom(),
          payload,
        },
        auditTrail: [
          buildAuditEntry('CHECKIN_SIMULATED', 'Simulación de check-in ejecutada.', result),
          ...previous.auditTrail,
        ],
      }))

      return result
    },

    runRedemptionSimulation: (payload) => {
      const state = get()
      const result = evaluateRewardRedemption({
        rules: state.rulebook,
        ...payload,
      })

      set((previous) => ({
        lastRedemptionSimulation: {
          ...result,
          createdAtCustom: nowCustom(),
          payload,
        },
        auditTrail: [
          buildAuditEntry('REDEMPTION_SIMULATED', 'Simulación de canje ejecutada.', result),
          ...previous.auditTrail,
        ],
      }))

      return result
    },

    recalculateHealth: () => {
      const state = get()
      set({
        health: getRulebookHealth({
          rules: state.rulebook,
          rewards: state.rewardTemplates,
        }),
      })
    },
  }
})

