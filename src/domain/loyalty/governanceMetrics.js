export const ROLLOUT_PHASES = [
  { id: 'pilot', label: 'Pilot', description: 'Grupo reducido, monitoreo intensivo.' },
  { id: 'controlled', label: 'Controlled', description: 'Escalamiento parcial por sede.' },
  { id: 'full', label: 'Full', description: 'Operación completa en todo el studio.' },
]

export const KPI_TARGETS = {
  activeUsersRate: { healthy: 70, warning: 50 },
  checkInApprovalRate: { healthy: 92, warning: 80 },
  redemptionSuccessRate: { healthy: 85, warning: 70 },
  stockHealthRate: { healthy: 75, warning: 60 },
  timestampCoverageRate: { healthy: 98, warning: 90 },
}

const toPercent = (value) => Number((value * 100).toFixed(1))

const evaluateKpiStatus = (value, target) => {
  if (value >= target.healthy) {
    return 'Estable'
  }
  if (value >= target.warning) {
    return 'Riesgo'
  }
  return 'Pausado'
}

const hasTimestampAudit = (record) =>
  Boolean(record?.createdAtCustom) && Boolean(record?.updatedAtCustom)

export const buildGovernanceMetrics = ({
  users = [],
  rewards = [],
  checkIns = [],
  redemptions = [],
}) => {
  const totalUsers = users.length
  const activeUsers = users.filter((user) => user.status === 'active').length
  const activeUsersRate = totalUsers ? toPercent(activeUsers / totalUsers) : 0

  const totalCheckIns = checkIns.length
  const validCheckIns = checkIns.filter((checkIn) => checkIn.isValid).length
  const checkInApprovalRate = totalCheckIns ? toPercent(validCheckIns / totalCheckIns) : 100

  const totalRedemptions = redemptions.length
  const successfulRedemptions = redemptions.filter((entry) =>
    ['approved', 'delivered'].includes(entry.status),
  ).length
  const redemptionSuccessRate = totalRedemptions
    ? toPercent(successfulRedemptions / totalRedemptions)
    : 100

  const activeRewards = rewards.filter((reward) => reward.status === 'active')
  const healthyStockRewards = activeRewards.filter((reward) => {
    if (reward.stockType !== 'finite') {
      return true
    }
    return Number(reward.stockAvailable || 0) > 5
  }).length
  const stockHealthRate = activeRewards.length
    ? toPercent(healthyStockRewards / activeRewards.length)
    : 100

  const timestampPopulation = [...users, ...rewards]
  const timestampOk = timestampPopulation.filter(hasTimestampAudit).length
  const timestampCoverageRate = timestampPopulation.length
    ? toPercent(timestampOk / timestampPopulation.length)
    : 100

  const kpis = [
    {
      id: 'activeUsersRate',
      label: 'Usuarios Activos',
      value: activeUsersRate,
      unit: '%',
      target: KPI_TARGETS.activeUsersRate.healthy,
      status: evaluateKpiStatus(activeUsersRate, KPI_TARGETS.activeUsersRate),
      detail: `${activeUsers} de ${totalUsers} usuarios activos`,
    },
    {
      id: 'checkInApprovalRate',
      label: 'Aprobación Check-in',
      value: checkInApprovalRate,
      unit: '%',
      target: KPI_TARGETS.checkInApprovalRate.healthy,
      status: evaluateKpiStatus(checkInApprovalRate, KPI_TARGETS.checkInApprovalRate),
      detail: `${validCheckIns} de ${totalCheckIns} check-ins aprobados`,
    },
    {
      id: 'redemptionSuccessRate',
      label: 'Canjes Exitosos',
      value: redemptionSuccessRate,
      unit: '%',
      target: KPI_TARGETS.redemptionSuccessRate.healthy,
      status: evaluateKpiStatus(redemptionSuccessRate, KPI_TARGETS.redemptionSuccessRate),
      detail: `${successfulRedemptions} de ${totalRedemptions} canjes aprobados`,
    },
    {
      id: 'stockHealthRate',
      label: 'Salud de Stock',
      value: stockHealthRate,
      unit: '%',
      target: KPI_TARGETS.stockHealthRate.healthy,
      status: evaluateKpiStatus(stockHealthRate, KPI_TARGETS.stockHealthRate),
      detail: `${healthyStockRewards} de ${activeRewards.length} premios en rango`,
    },
    {
      id: 'timestampCoverageRate',
      label: 'Cobertura de Auditoría',
      value: timestampCoverageRate,
      unit: '%',
      target: KPI_TARGETS.timestampCoverageRate.healthy,
      status: evaluateKpiStatus(timestampCoverageRate, KPI_TARGETS.timestampCoverageRate),
      detail: `${timestampOk} de ${timestampPopulation.length} registros auditables`,
    },
  ]

  const score = Math.round(
    kpis.reduce((acc, kpi) => acc + kpi.value, 0) / Math.max(1, kpis.length),
  )

  return {
    score,
    kpis,
    summary: {
      activeUsers,
      totalUsers,
      totalCheckIns,
      totalRedemptions,
    },
  }
}

