import { useMemo } from 'react'
import dayjs from 'dayjs'
import {
  AlertTriangle,
  ChartNoAxesColumnIncreasing,
  Gift,
  Info,
  QrCode,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react'
import ReactApexChart from 'react-apexcharts'
import PageHeader from '../../components/ui/PageHeader'
import SectionCard from '../../components/ui/SectionCard'
import StatCard from '../../components/ui/StatCard'
import TableCard from '../../components/ui/TableCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { useOperationsStore } from '../../store/useOperationsStore'

const GLOBAL_DISCIPLINE_LABEL = 'Todas las disciplinas'
const LOOKBACK_DAYS = 14

const chartPalette = {
  primary: '#e0cec2',
  secondary: '#b8947f',
  ink: '#2f2219',
  muted: '#7f6758',
  warm: '#dbc4b4',
  accent: '#9f7f6e',
  success: '#6d8a61',
  danger: '#b26152',
  warning: '#d49f62',
  border: 'rgba(184, 148, 127, 0.24)',
  grid: 'rgba(47, 34, 25, 0.10)',
  label: 'rgba(47, 34, 25, 0.68)',
}

const trendColumns = [
  { key: 'label', label: 'Indicador' },
  { key: 'value', label: 'Resultado' },
  { key: 'context', label: 'Contexto' },
]

const inventoryColumns = [
  { key: 'reward', label: 'Premio' },
  { key: 'discipline', label: 'Disciplina' },
  { key: 'stock', label: 'Inventario' },
  { key: 'redeems', label: 'Canjes' },
  { key: 'status', label: 'Estado' },
]

const parseNumber = (value) => Number(value || 0)

const createDayBuckets = (days) => {
  return Array.from({ length: days }, (_, index) => {
    const date = dayjs().startOf('day').subtract(days - 1 - index, 'day')
    return {
      key: date.format('YYYY-MM-DD'),
      label: date.format('DD MMM'),
      date,
    }
  })
}

const buildBaseChartOptions = () => ({
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    foreColor: chartPalette.label,
    fontFamily: 'Roboto, sans-serif',
  },
  legend: {
    labels: {
      colors: chartPalette.label,
      useSeriesColors: false,
    },
    itemMargin: {
      horizontal: 12,
      vertical: 6,
    },
  },
  grid: {
    borderColor: chartPalette.grid,
    strokeDashArray: 4,
    padding: {
      left: 6,
      right: 6,
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    width: 3,
    curve: 'smooth',
  },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: {
        colors: chartPalette.label,
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: chartPalette.label,
      },
      formatter: (value) => {
        const numericValue = Number(value)
        if (Number.isFinite(numericValue)) {
          return `${Math.round(numericValue)}`
        }
        return String(value || '')
      },
    },
  },
  tooltip: {
    theme: 'light',
    style: {
      fontSize: '12px',
      fontFamily: 'Roboto, sans-serif',
    },
  },
})

function DashboardOverviewPage() {
  const users = useOperationsStore((state) => state.users)
  const qrCampaigns = useOperationsStore((state) => state.qrCampaigns)
  const rewards = useOperationsStore((state) => state.rewards)
  const checkIns = useOperationsStore((state) => state.checkIns)
  const redemptions = useOperationsStore((state) => state.redemptions)
  const appConfig = useOperationsStore((state) => state.appConfig)

  const disciplineSummary = useMemo(() => {
    const configured = Array.isArray(appConfig.disciplines) ? appConfig.disciplines : []
    const baseMap = new Map(
      [...configured, GLOBAL_DISCIPLINE_LABEL].map((discipline) => [
        discipline,
        { discipline, attendance: 0, redemptions: 0, users: 0 },
      ]),
    )

    users.forEach((user) => {
      const userDisciplines = Array.isArray(user.disciplineIds) && user.disciplineIds.length
        ? user.disciplineIds
        : [GLOBAL_DISCIPLINE_LABEL]

      userDisciplines.forEach((discipline) => {
        const key = discipline || GLOBAL_DISCIPLINE_LABEL
        if (!baseMap.has(key)) {
          baseMap.set(key, { discipline: key, attendance: 0, redemptions: 0, users: 0 })
        }
        baseMap.get(key).users += 1
      })
    })

    checkIns
      .filter((entry) => Boolean(entry.isValid))
      .forEach((entry) => {
        const discipline = entry.discipline || GLOBAL_DISCIPLINE_LABEL
        if (!baseMap.has(discipline)) {
          baseMap.set(discipline, { discipline, attendance: 0, redemptions: 0, users: 0 })
        }
        baseMap.get(discipline).attendance += 1
      })

    const rewardById = Object.fromEntries(rewards.map((reward) => [reward.rewardId, reward]))
    redemptions
      .filter((entry) => ['approved', 'delivered'].includes(String(entry.status || '').toLowerCase()))
      .forEach((entry) => {
        const rewardDiscipline = rewardById[entry.rewardId]?.disciplineId || 'all'
        const discipline = rewardDiscipline === 'all' ? GLOBAL_DISCIPLINE_LABEL : rewardDiscipline
        if (!baseMap.has(discipline)) {
          baseMap.set(discipline, { discipline, attendance: 0, redemptions: 0, users: 0 })
        }
        baseMap.get(discipline).redemptions += 1
      })

    return [...baseMap.values()]
      .map((entry) => ({
        ...entry,
        conversion: entry.attendance > 0 ? ((entry.redemptions / entry.attendance) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => {
        if (b.attendance !== a.attendance) {
          return b.attendance - a.attendance
        }
        return b.redemptions - a.redemptions
      })
  }, [appConfig.disciplines, checkIns, redemptions, rewards, users])

  const usersActive = users.filter((user) => user.status === 'active').length
  const activeQrCampaigns = qrCampaigns.filter((campaign) => campaign.status === 'active').length
  const validCheckIns = checkIns.filter((entry) => Boolean(entry.isValid))
  const effectiveRedemptions = redemptions.filter((entry) =>
    ['approved', 'delivered'].includes(String(entry.status || '').toLowerCase()),
  )
  const deliveredRedemptions = redemptions.filter((entry) => String(entry.status || '').toLowerCase() === 'delivered')
  const rejectedRedemptions = redemptions.filter((entry) => String(entry.status || '').toLowerCase() === 'rejected')

  const activeRewards = rewards.filter((reward) => reward.status === 'active').length
  const finiteRewards = rewards.filter((reward) => reward.stockType === 'finite')
  const lowStockRewards = finiteRewards.filter((reward) => parseNumber(reward.stockAvailable) > 0 && parseNumber(reward.stockAvailable) <= 5)
  const outOfStockRewards = finiteRewards.filter((reward) => parseNumber(reward.stockAvailable) <= 0)
  const totalStock = finiteRewards.reduce((acc, reward) => acc + parseNumber(reward.stockAvailable), 0)

  const qrTop = useMemo(
    () => [...qrCampaigns].sort((a, b) => parseNumber(b.scans) - parseNumber(a.scans)).slice(0, 6),
    [qrCampaigns],
  )

  const rewardRedeemsByRewardId = useMemo(() => {
    return redemptions.reduce((acc, entry) => {
      const status = String(entry.status || '').toLowerCase()
      if (status !== 'approved' && status !== 'delivered') {
        return acc
      }
      acc[entry.rewardId] = (acc[entry.rewardId] || 0) + 1
      return acc
    }, {})
  }, [redemptions])

  const rewardInventoryRows = useMemo(() => {
    return [...rewards]
      .map((reward) => {
        const stockType = reward.stockType === 'infinite' ? 'infinite' : 'finite'
        const stockAvailable = parseNumber(reward.stockAvailable)
        const redeems = parseNumber(rewardRedeemsByRewardId[reward.rewardId])

        let status = 'Activo'
        if (reward.status !== 'active') {
          status = 'Pausado'
        } else if (stockType === 'finite' && stockAvailable <= 0) {
          status = 'Sin stock'
        } else if (stockType === 'finite' && stockAvailable <= 5) {
          status = 'Stock bajo'
        }

        return {
          rewardId: reward.rewardId,
          reward: reward.name,
          discipline: reward.disciplineId === 'all' ? 'Todas las disciplinas' : reward.disciplineId,
          stock: stockType === 'infinite' ? 'Ilimitado' : `${stockAvailable}`,
          redeems,
          status,
        }
      })
      .sort((a, b) => {
        const numericStockA = Number.isFinite(Number(a.stock)) ? Number(a.stock) : Number.POSITIVE_INFINITY
        const numericStockB = Number.isFinite(Number(b.stock)) ? Number(b.stock) : Number.POSITIVE_INFINITY
        return numericStockA - numericStockB
      })
      .slice(0, 8)
  }, [rewards, rewardRedeemsByRewardId])

  const highlights = useMemo(() => {
    const topDisciplineByAttendance = disciplineSummary[0]
    const topDisciplineByRedemption = [...disciplineSummary].sort((a, b) => b.redemptions - a.redemptions)[0]
    const topQr = qrTop[0]
    const topReward = [...rewards]
      .map((reward) => ({
        reward,
        redeems: parseNumber(rewardRedeemsByRewardId[reward.rewardId]),
      }))
      .sort((a, b) => b.redeems - a.redeems)[0]

    return [
      {
        id: 'top-discipline-attendance',
        label: 'Disciplina con mayor asistencia',
        value: topDisciplineByAttendance?.discipline || 'Sin datos',
        context: `${parseNumber(topDisciplineByAttendance?.attendance)} asistencias válidas`,
      },
      {
        id: 'top-discipline-redemption',
        label: 'Disciplina con más canjes',
        value: topDisciplineByRedemption?.discipline || 'Sin datos',
        context: `${parseNumber(topDisciplineByRedemption?.redemptions)} canjes efectivos`,
      },
      {
        id: 'top-qr',
        label: 'Campaña QR con mejor rendimiento',
        value: topQr?.name || 'Sin datos',
        context: `${parseNumber(topQr?.scans)} escaneos válidos`,
      },
      {
        id: 'top-reward',
        label: 'Premio más canjeado',
        value: topReward?.reward?.name || 'Sin datos',
        context: `${parseNumber(topReward?.redeems)} canjes`,
      },
    ]
  }, [disciplineSummary, qrTop, rewardRedeemsByRewardId, rewards])

  const trendChart = useMemo(() => {
    const buckets = createDayBuckets(LOOKBACK_DAYS)

    const checkInMap = validCheckIns.reduce((acc, entry) => {
      const key = dayjs(entry.scannedAtCustom).format('YYYY-MM-DD')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const redemptionMap = effectiveRedemptions.reduce((acc, entry) => {
      const key = dayjs(entry.requestedAtCustom).format('YYYY-MM-DD')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return {
      categories: buckets.map((bucket) => bucket.label),
      checkIns: buckets.map((bucket) => parseNumber(checkInMap[bucket.key])),
      redemptions: buckets.map((bucket) => parseNumber(redemptionMap[bucket.key])),
    }
  }, [effectiveRedemptions, validCheckIns])

  const trendChartOptions = useMemo(() => {
    const base = buildBaseChartOptions()
    return {
      ...base,
      chart: {
        ...base.chart,
        type: 'area',
      },
      colors: [chartPalette.secondary, chartPalette.accent],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.06,
          stops: [0, 95, 100],
        },
      },
      xaxis: {
        ...base.xaxis,
        categories: trendChart.categories,
      },
      yaxis: {
        ...base.yaxis,
        min: 0,
      },
      markers: {
        size: 4,
        strokeWidth: 0,
        hover: {
          sizeOffset: 2,
        },
      },
    }
  }, [trendChart.categories])

  const trendSeries = useMemo(
    () => [
      { name: 'Asistencias válidas', data: trendChart.checkIns },
      { name: 'Canjes efectivos', data: trendChart.redemptions },
    ],
    [trendChart.checkIns, trendChart.redemptions],
  )

  const redemptionStatusChart = useMemo(() => {
    const pending = redemptions.filter((entry) => String(entry.status || '').toLowerCase() === 'approved').length
    const delivered = deliveredRedemptions.length
    const rejected = rejectedRedemptions.length

    return {
      labels: ['Pendiente de entrega', 'Entregado', 'Rechazado'],
      series: [pending, delivered, rejected],
    }
  }, [deliveredRedemptions.length, redemptions, rejectedRedemptions.length])

  const redemptionStatusOptions = useMemo(() => {
    const base = buildBaseChartOptions()
    return {
      ...base,
      chart: {
        ...base.chart,
        type: 'donut',
      },
      labels: redemptionStatusChart.labels,
      colors: [chartPalette.warning, chartPalette.success, chartPalette.danger],
      stroke: {
        width: 0,
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => `${Math.round(value)}%`,
      },
      legend: {
        ...base.legend,
        position: 'bottom',
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                color: chartPalette.label,
              },
              value: {
                show: true,
                color: chartPalette.ink,
                fontSize: '20px',
                fontWeight: 700,
              },
              total: {
                show: true,
                label: 'Canjes',
                color: chartPalette.label,
                formatter: () => `${redemptions.length}`,
              },
            },
          },
        },
      },
      tooltip: {
        ...base.tooltip,
        y: {
          formatter: (value) => `${value} registros`,
        },
      },
    }
  }, [redemptionStatusChart.labels, redemptions.length])

  const disciplineChartData = useMemo(() => {
    const topDisciplines = disciplineSummary.slice(0, 7)
    return {
      categories: topDisciplines.map((entry) => entry.discipline),
      attendance: topDisciplines.map((entry) => parseNumber(entry.attendance)),
      redemptions: topDisciplines.map((entry) => parseNumber(entry.redemptions)),
    }
  }, [disciplineSummary])

  const disciplineChartOptions = useMemo(() => {
    const base = buildBaseChartOptions()
    return {
      ...base,
      chart: {
        ...base.chart,
        type: 'bar',
        stacked: false,
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '55%',
        },
      },
      colors: [chartPalette.secondary, chartPalette.primary],
      xaxis: {
        ...base.xaxis,
        categories: disciplineChartData.categories,
      },
      yaxis: {
        ...base.yaxis,
      },
      legend: {
        ...base.legend,
        position: 'top',
      },
      tooltip: {
        ...base.tooltip,
        y: {
          formatter: (value) => `${value} registros`,
        },
      },
    }
  }, [disciplineChartData.categories])

  const disciplineChartSeries = useMemo(
    () => [
      {
        name: 'Asistencias',
        data: disciplineChartData.attendance,
      },
      {
        name: 'Canjes',
        data: disciplineChartData.redemptions,
      },
    ],
    [disciplineChartData.attendance, disciplineChartData.redemptions],
  )

  const qrChartData = useMemo(() => {
    return {
      categories: qrTop.map((entry) => entry.name || entry.qrCodeId),
      values: qrTop.map((entry) => parseNumber(entry.scans)),
    }
  }, [qrTop])

  const qrChartOptions = useMemo(() => {
    const base = buildBaseChartOptions()
    return {
      ...base,
      chart: {
        ...base.chart,
        type: 'bar',
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '48%',
          distributed: true,
        },
      },
      colors: [
        chartPalette.secondary,
        chartPalette.warm,
        chartPalette.accent,
        chartPalette.primary,
        '#c9a68f',
        '#a7826f',
      ],
      xaxis: {
        ...base.xaxis,
        categories: qrChartData.categories,
      },
      yaxis: {
        ...base.yaxis,
        min: 0,
      },
      legend: { show: false },
      tooltip: {
        ...base.tooltip,
        y: {
          formatter: (value) => `${value} escaneos`,
        },
      },
    }
  }, [qrChartData.categories])

  const qrChartSeries = useMemo(
    () => [
      {
        name: 'Escaneos válidos',
        data: qrChartData.values,
      },
    ],
    [qrChartData.values],
  )

  const totalVisitBalance = users.reduce((acc, user) => acc + parseNumber(user.visitBalanceCached), 0)
  const avgVisitBalance = users.length ? (totalVisitBalance / users.length).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumen"
        title="Dashboard general"
        description="Visión general del programa de lealtad: alumnos, campañas QR, canjes e inventario de premios."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Alumnos registrados" value={users.length} hint={`${usersActive} activos`} />
        <StatCard icon={QrCode} label="Campañas QR activas" value={activeQrCampaigns} hint={`${qrCampaigns.length} campañas totales`} />
        <StatCard icon={ScanLine} label="Asistencias validadas" value={validCheckIns.length} hint="Acumulado del programa" />
        <StatCard icon={ShieldCheck} label="Canjes efectivos" value={effectiveRedemptions.length} hint={`${deliveredRedemptions.length} entregados`} />
        <StatCard icon={Gift} label="Premios activos" value={activeRewards} hint={`${rewards.length} premios configurados`} />
        <StatCard icon={ShoppingBag} label="Inventario disponible" value={totalStock} hint="Suma de stock finito" />
        <StatCard icon={AlertTriangle} label="Premios con stock bajo" value={lowStockRewards.length} hint={`${outOfStockRewards.length} sin existencias`} />
        <StatCard icon={ChartNoAxesColumnIncreasing} label="Visitas promedio por alumno" value={avgVisitBalance} hint="Saldo actual promedio" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              Rendimiento de asistencias y canjes (14 días)
              <span className="group relative inline-flex">
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-secondary/30 bg-surface text-ink/70 transition-colors duration-200 hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  aria-label="Ver regla de métricas"
                >
                  <Info size={14} />
                </button>
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 w-72 -translate-x-1/2 rounded-xl border border-secondary/25 bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-ink/80 opacity-0 shadow-soft transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  Regla de métricas: cuando un QR o premio aplica a todas las disciplinas,
                  se reporta en la categoría &quot;Todas las disciplinas&quot; para evitar duplicar estadísticas.
                </span>
              </span>
            </span>
          }
          description="Comparativo diario para seguimiento operativo y comercial del programa."
        >
          <ReactApexChart options={trendChartOptions} series={trendSeries} type="area" height={340} />
        </SectionCard>

        <SectionCard
          title="Estado de canjes"
          description="Distribución actual entre pendientes, entregados y rechazados."
        >
          <ReactApexChart
            options={redemptionStatusOptions}
            series={redemptionStatusChart.series}
            type="donut"
            height={340}
          />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Desempeño por disciplina"
          description="Top disciplinas por asistencias y canjes efectivos."
        >
          <ReactApexChart
            options={disciplineChartOptions}
            series={disciplineChartSeries}
            type="bar"
            height={330}
          />
        </SectionCard>

        <SectionCard
          title="Campañas QR con mayor actividad"
          description="Escaneos válidos por campaña para priorizar comunicación y operación."
        >
          {qrChartData.values.length ? (
            <ReactApexChart options={qrChartOptions} series={qrChartSeries} type="bar" height={330} />
          ) : (
            <div className="rounded-xl border border-dashed border-secondary/30 bg-surface/60 p-10 text-center text-sm text-ink/70">
              No hay escaneos suficientes para construir este ranking todavía.
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <SectionCard
          title="Indicadores destacados"
          description="Lectura rápida de qué está funcionando mejor hoy en el programa."
        >
          <TableCard
            columns={trendColumns}
            rows={highlights}
            emptyMessage="Todavía no hay información suficiente para mostrar indicadores destacados."
            renderCell={(column, row) => {
              if (column === 'label') {
                return <p className="font-semibold text-ink">{row.label}</p>
              }
              if (column === 'value') {
                return <p className="font-semibold text-secondary">{row.value}</p>
              }
              return <p className="text-sm text-ink/75">{row.context}</p>
            }}
          />
        </SectionCard>

        <SectionCard
          title="Inventario y canjes por premio"
          description="Control rápido para detectar premios con mayor salida o riesgo de quiebre."
        >
          <TableCard
            columns={inventoryColumns}
            rows={rewardInventoryRows}
            emptyMessage="Aún no hay premios configurados para mostrar inventario."
            renderCell={(column, row) => {
              if (column === 'reward') {
                return (
                  <div>
                    <p className="font-semibold text-ink">{row.reward}</p>
                    <p className="text-xs text-ink/60">{row.rewardId}</p>
                  </div>
                )
              }

              if (column === 'status') {
                if (row.status === 'Sin stock') {
                  return <StatusBadge value="Sin stock" />
                }
                if (row.status === 'Stock bajo') {
                  return <StatusBadge value="Stock bajo" />
                }
                if (row.status === 'Pausado') {
                  return <StatusBadge value="Pausado" />
                }
                return <StatusBadge value="Activo" />
              }

              return row[column]
            }}
          />
        </SectionCard>
      </section>

      <section className="rounded-2xl border border-secondary/15 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/75">
            <Sparkles size={14} className="text-secondary" />
            Resumen estratégico
          </span>
          <p className="text-sm text-ink/75">
            El programa acumula <strong>{validCheckIns.length}</strong> asistencias válidas y un promedio de <strong>{avgVisitBalance}</strong> visitas
            disponibles por alumno. Mantén foco en campañas QR de alta tracción y premios con stock bajo para sostener la experiencia.
          </p>
        </div>
      </section>
    </div>
  )
}

export default DashboardOverviewPage
