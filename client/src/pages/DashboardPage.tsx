import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useTitle } from '../hooks/useTitle'
import { formatCurrency } from '../lib/utils'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, LabelList } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, DollarSign, ArrowRight } from 'lucide-react'

interface Summary {
  totalDeductions: number
  totalAmount: number
  inDisputeCount: number
  inDisputeAmount: number
  resolvedCount: number
  totalRecovered: number
  recoveryRate: number
  resolvedPool: number
  acceptedCount: number
  acceptedAmount: number
  openCount: number
  parkedCount: number
  trends: {
    totalAmount: 'up' | 'down' | 'flat'
    inDispute: 'up' | 'down' | 'flat'
    recovered: 'up' | 'down' | 'flat'
  }
}

interface RetailerByCompanyResponse {
  data: Record<string, unknown>[]
  companies: string[]
}

interface AgingBucket {
  label: string
  count: number
  totalAmount: number
}

interface TrendPoint {
  month: string
  deductions: number
  totalAmount: number
  disputedAmount: number
  recoveredAmount: number
  recoveryRate: number
}

// Fixed colors for the original 4 companies, then generated distinct colors for new ones
const BASE_COMPANY_COLORS: Record<string, string> = {
  'Pinnacle Provisions Inc.': '#c964cf',   // purple-pink
  'Ridgeline Beverages': '#e8913a',       // warm orange
  'Ember & Oak Foods': '#d94545',         // red
  'Coastal Naturals': '#5ba88a',          // teal
}

// Generate a distinct hue-spaced color that avoids the 4 base hues (orange~30, green~140, red~0, blue~215)
function generateColor(index: number): string {
  const reservedHues = [30, 140, 0, 215]
  const candidates = [280, 55, 175, 330, 100, 250, 15, 200]
  const hue = candidates[index % candidates.length] ?? ((index * 137 + 60) % 360)
  // Ensure distance from reserved hues
  const tooClose = reservedHues.some(h => Math.min(Math.abs(hue - h), 360 - Math.abs(hue - h)) < 20)
  const finalHue = tooClose ? (hue + 30) % 360 : hue
  return `hsl(${finalHue}, 55%, 50%)`
}

function getCompanyColor(name: string, extraIndex: number): string {
  return BASE_COMPANY_COLORS[name] ?? generateColor(extraIndex)
}

const tooltipStyle = {
  backgroundColor: 'var(--c-panel)',
  borderColor: 'var(--c-edge)',
  borderRadius: '8px',
  color: 'var(--c-heading)',
}

export function DashboardPage() {
  useTitle('Dashboard')
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [retailerData, setRetailerData] = useState<Record<string, unknown>[]>([])
  const [companyNames, setCompanyNames] = useState<string[]>([])
  const [aging, setAging] = useState<AgingBucket[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [activeRetailerIdx, setActiveRetailerIdx] = useState<number | null>(null)
  const [activeAgingIdx, setActiveAgingIdx] = useState<number | null>(null)
  const [activeDisputeIdx, setActiveDisputeIdx] = useState<number | null>(null)

  useEffect(() => {
    const companyId = (window as any).__companyId
    const qs = companyId ? `?companyId=${companyId}` : ''
    api<Summary>(`/dashboard/summary${qs}`).then(setSummary)
    api<RetailerByCompanyResponse>(`/dashboard/by-retailer${qs}`).then(r => {
      setRetailerData(r.data)
      setCompanyNames(r.companies)
    })
    api<AgingBucket[]>(`/dashboard/aging${qs}`).then(setAging)
    api<TrendPoint[]>(`/dashboard/trends${qs}`).then(setTrends)
  }, [])

  if (!summary) {
    return (
      <div>
        <div className="h-7 w-48 skeleton mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-panel rounded-lg border border-edge p-4">
              <div className="h-3 w-20 skeleton mb-3" />
              <div className="h-8 w-32 skeleton mb-2" />
              <div className="h-3 w-24 skeleton" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-panel rounded-lg border border-edge p-4 h-[340px] skeleton" />
          <div className="bg-panel rounded-lg border border-edge p-4 h-[340px] skeleton" />
        </div>
      </div>
    )
  }

  if (summary.totalDeductions === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">Recovery Dashboard</h2>
        <div className="bg-panel rounded-lg border border-edge p-8 text-center">
          <DollarSign size={32} className="mx-auto text-faint mb-3" />
          <h3 className="text-base font-medium text-prose mb-1">No deductions yet</h3>
          <p className="text-sm text-subtle mb-4">
            Run the seed script to import existing data, or add deductions manually from the Deductions page.
          </p>
          <code className="text-xs bg-panel-hover border border-edge rounded px-3 py-2 text-prose block max-w-md mx-auto">
            cd server && npx tsx src/seed/seed.ts
          </code>
        </div>
      </div>
    )
  }

  const TrendIcon = ({ dir }: { dir: 'up' | 'down' | 'flat' }) => {
    if (dir === 'up') return <TrendingUp size={12} className="text-green-600 dark:text-green-400" />
    if (dir === 'down') return <TrendingDown size={12} className="text-red-500 dark:text-red-400" />
    return <Minus size={12} className="text-subtle" />
  }

  const trendLabel = (dir: 'up' | 'down' | 'flat') =>
    dir === 'up' ? 'Up vs prior 30d' : dir === 'down' ? 'Down vs prior 30d' : 'No change'

  const metrics = [
    { label: 'Total Deductions', value: formatCurrency(summary.totalAmount), sub: `${summary.totalDeductions} deductions`, icon: DollarSign, color: 'text-heading', link: '/deductions', trend: summary.trends.totalAmount },
    { label: 'In Dispute', value: formatCurrency(Math.abs(summary.inDisputeAmount)), sub: `${summary.inDisputeCount} active`, icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', link: '/deductions?status=in_dispute,dispute_filed', trend: summary.trends.inDispute },
    { label: 'Recovered', value: formatCurrency(summary.totalRecovered), sub: `${summary.resolvedCount} resolved`, icon: CheckCircle, color: 'text-green-600 dark:text-green-400', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial', trend: summary.trends.recovered },
  ]

  const pipeline = [
    { label: 'Open', count: summary.openCount, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25', link: '/deductions?status=open' },
    { label: 'On Hold', count: summary.parkedCount, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25', link: '/deductions?status=parked' },
    { label: 'In Dispute', count: summary.inDisputeCount, color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/25', link: '/deductions?status=in_dispute,dispute_filed' },
    { label: 'Resolved', count: summary.resolvedCount, color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial' },
    { label: 'Accepted', count: summary.acceptedCount, color: 'bg-panel-hover text-prose border-edge', link: '/deductions?status=accepted' },
  ]

  return (
    <div>
      {/* Metric Cards */}
      <div className="window-card mb-6">
        <div className="window-titlebar">
          <span>recovery dashboard</span>
          <div className="window-titlebar-dots"><span /><span /><span /></div>
        </div>
        <div className="window-body">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                onClick={() => navigate(m.link)}
                className={`cursor-pointer hover:bg-panel-hover transition-colors p-3 ${i < metrics.length - 1 ? 'dotted-sep lg:border-b-0 lg:border-r lg:border-dotted lg:border-edge' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="label-mono">{m.label}</span>
                  <m.icon size={16} className={m.color} />
                </div>
                <div className="text-lg sm:text-2xl font-bold text-heading">{m.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] sm:text-xs text-subtle">{m.sub}</span>
                  {m.trend && (
                    <span className="flex items-center gap-0.5" title={trendLabel(m.trend)}>
                      <TrendIcon dir={m.trend} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            {/* Recovery Rate — circular gauge */}
            <div
              onClick={() => navigate('/recovery')}
              className="cursor-pointer hover:bg-panel-hover transition-colors p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="label-mono">recovery rate</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--c-edge)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="var(--c-accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${summary.recoveryRate * 0.974} 97.4`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold text-heading">{summary.recoveryRate}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-subtle">{summary.resolvedCount} resolved</div>
                  <div className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">{formatCurrency(summary.totalRecovered)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recovery by Retailer */}
        <div className="window-card">
          <div className="window-titlebar">
            <span>deductions by retailer</span>
            <div className="window-titlebar-dots"><span /><span /><span /></div>
          </div>
          <div className="window-body">
          {(() => {
            const sliced = retailerData.slice(0, 14)
            // Build color map once
            let extraIdx = 0
            const colorMap = companyNames.map((name) => ({
              name,
              color: getCompanyColor(name, BASE_COMPANY_COLORS[name] ? 0 : extraIdx++),
            }))

            return (
              <ResponsiveContainer width="100%" height={Math.max(300, sliced.length * 36)}>
                <BarChart
                  data={sliced}
                  layout="vertical"
                  margin={{ left: 100, right: 10 }}
                  onMouseMove={(state) => {
                    if (state?.activeTooltipIndex != null) setActiveRetailerIdx(Number(state.activeTooltipIndex))
                  }}
                  onMouseLeave={() => setActiveRetailerIdx(null)}
                >
                  <XAxis
                    type="number"
                    scale="log"
                    domain={[1, 'auto']}
                    allowDataOverflow
                    tickFormatter={(v) => {
                      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
                      if (v >= 1_000) return `$${(v / 1000).toFixed(0)}k`
                      return `$${v}`
                    }}
                    tick={{ fill: 'var(--c-subtle)', fontSize: 11 }}
                  />
                  <YAxis dataKey="retailerName" type="category" width={90} tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--c-subtle)', fontWeight: 600 }}
                    formatter={(value, name) => {
                      const amt = Number(value)
                      if (amt === 0) return [null, null] as unknown as [string, string]
                      return [formatCurrency(amt), String(name)]
                    }}
                    itemSorter={(item) => -(Number(item.value) || 0)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--c-subtle)' }} />
                  {colorMap.map(({ name, color }) => (
                    <Bar key={name} dataKey={name} stackId="company" fill={color}>
                      {sliced.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={color}
                          opacity={activeRetailerIdx === null || activeRetailerIdx === idx ? 1 : 0.2}
                        />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
          </div>
        </div>

        {/* Aging */}
        <div className="window-card">
          <div className="window-titlebar">
            <span>aging of active disputes</span>
            <div className="window-titlebar-dots"><span /><span /><span /></div>
          </div>
          <div className="window-body">
          {(() => {
            const agingColors = ['#5ba88a', '#e8b630', '#e8913a', '#d94545']
            return (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={aging}
                    margin={{ top: 25 }}
                    onMouseMove={(state) => {
                      if (state?.activeTooltipIndex != null) setActiveAgingIdx(Number(state.activeTooltipIndex))
                    }}
                    onMouseLeave={() => setActiveAgingIdx(null)}
                  >
                    <XAxis
                      dataKey="label"
                      tickFormatter={(v) => `${v} days`}
                      tick={{ fill: 'var(--c-subtle)', fontSize: 12 }}
                    />
                    <YAxis
                      scale="log"
                      domain={[1, 'auto']}
                      allowDataOverflow
                      tickFormatter={(v) => {
                        if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
                        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
                        if (v >= 1_000) return `$${(v / 1000).toFixed(0)}k`
                        return `$${v}`
                      }}
                      tick={{ fill: 'var(--c-subtle)', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--c-subtle)', fontWeight: 600 }}
                      formatter={(value, _, props) => {
                        const bucket = props.payload
                        return [`${formatCurrency(Number(value))} (${bucket.count} deductions)`, 'Amount']
                      }}
                    />
                    <Bar dataKey="totalAmount" name="Amount" radius={[4, 4, 0, 0]}>
                      {aging.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={agingColors[idx] ?? agingColors[3]}
                          opacity={activeAgingIdx === null || activeAgingIdx === idx ? 1 : 0.2}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        formatter={(v) => `${v} cases`}
                        style={{ fill: 'var(--c-heading)', fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-[10px] text-faint mt-1">Days since deduction was created</p>
                <div className="flex justify-center gap-4 mt-1 text-[11px]">
                  {['Recent', 'Needs Review', 'Overdue', 'At Risk'].map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: agingColors[i] }} />
                      <span className="text-subtle">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      {trends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Graph 3: Monthly Dispute Volume */}
          <div className="window-card">
            <div className="window-titlebar">
              <span>monthly dispute volume</span>
              <div className="window-titlebar-dots"><span /><span /><span /></div>
            </div>
            <div className="window-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={trends}
                onMouseMove={(state) => {
                  if (state?.activeTooltipIndex != null) setActiveDisputeIdx(Number(state.activeTooltipIndex))
                }}
                onMouseLeave={() => setActiveDisputeIdx(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => {
                    const abs = Math.abs(v)
                    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
                    if (abs >= 1_000) return `$${(v / 1000).toFixed(0)}k`
                    return `$${v}`
                  }}
                  tick={{ fill: 'var(--c-subtle)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'var(--c-subtle)', fontWeight: 600 }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'disputedAmount' ? 'Disputed' : 'Recovered',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--c-subtle)' }} formatter={(v) => v === 'disputedAmount' ? 'Disputed' : 'Recovered'} />
                <Bar dataKey="disputedAmount" name="disputedAmount" fill="#e8913a" radius={[3, 3, 0, 0]}>
                  {trends.map((_, idx) => (
                    <Cell key={idx} fill="#e8913a" opacity={activeDisputeIdx === null || activeDisputeIdx === idx ? 1 : 0.2} />
                  ))}
                </Bar>
                <Bar dataKey="recoveredAmount" name="recoveredAmount" fill="#c964cf" radius={[3, 3, 0, 0]}>
                  {trends.map((_, idx) => (
                    <Cell key={idx} fill="#c964cf" opacity={activeDisputeIdx === null || activeDisputeIdx === idx ? 1 : 0.2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-faint text-center -mt-1">Month (when deduction was created)</p>
            </div>
          </div>

          {/* Graph 4: Recovery Rate Over Time */}
          <div className="window-card">
            <div className="window-titlebar">
              <span>recovery rate over time</span>
              <div className="window-titlebar-dots"><span /><span /><span /></div>
            </div>
            <div className="window-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--c-accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--c-accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <Tooltip
                  cursor={{ stroke: 'var(--c-subtle)', strokeWidth: 1 }}
                  contentStyle={{ ...tooltipStyle, padding: '8px 12px' }}
                  labelStyle={{ color: 'var(--c-subtle)', fontWeight: 600, marginBottom: 4 }}
                  formatter={(value, _, props) => {
                    const point = props.payload
                    return [`${value}%  ·  ${formatCurrency(point.recoveredAmount)} recovered`, '']
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="recoveryRate"
                  stroke="var(--c-accent)"
                  strokeWidth={2.5}
                  fill="url(#rateGradient)"
                  dot={{ fill: 'var(--c-panel)', stroke: 'var(--c-accent)', strokeWidth: 2, r: 4 }}
                  activeDot={{ fill: 'var(--c-accent)', stroke: 'var(--c-panel)', strokeWidth: 2, r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-faint text-center -mt-1">Month (when deduction was created)</p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Overview */}
      <div className="mt-4 window-card">
        <div className="window-titlebar">
          <span>pipeline overview</span>
          <div className="window-titlebar-dots"><span /><span /><span /></div>
        </div>
        <div className="window-body">
        <div className="flex flex-wrap gap-2">
          {pipeline.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 flex-1 min-w-[100px]">
              <div
                onClick={() => navigate(s.link)}
                className={`flex-1 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity border ${s.color}`}
              >
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </div>
              {i < pipeline.length - 1 && (
                <ArrowRight size={14} className="text-faint shrink-0 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}
