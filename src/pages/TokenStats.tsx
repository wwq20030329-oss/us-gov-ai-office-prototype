import { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import type { SystemStatus } from "../types"
import { useTheme } from "../theme"
import { filterVisibleBots, filterVisibleNames, getAgentDisplayName } from "../utils/agentDisplay"
import MainViewHeader from "../components/MainViewHeader"

interface Props { data: SystemStatus }

const AUTH_TOKEN = localStorage.getItem('gov_ai_auth_token') || ''
const COLORS = ["#d4a574", "#c9a96e", "#22c55e", "#3b82f6", "#ef4444", "#8b5cf6", "#f59e0b", "#ec4899"]

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

interface DeptTokens { department: string; tokens: number; cost: string }
interface TrendPoint { date: string; tokens: number }

export default function TokenStats({ data }: Props) {
  const { theme } = useTheme()
  const [deptTokens, setDeptTokens] = useState<DeptTokens[]>([])
  const [_trend, setTrend] = useState<TrendPoint[]>([])
  const [tokenPrice, setTokenPrice] = useState(0.3)
  const [totalApiTokens, setTotalApiTokens] = useState(0)
  const [loading, setLoading] = useState(true)
  const bg = 'surface-card'
  const sub = 'text-[var(--text-secondary)]'

  useEffect(() => {
    fetch('/api/tokens', { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
      .then(r => r.json())
      .then(d => {
        setDeptTokens(d.byDepartment || [])
        setTrend(d.trend || [])
        setTokenPrice(d.tokenPrice || 0.3)
        setTotalApiTokens(d.totalTokens || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const visibleBots = filterVisibleBots(data.botAccounts)
  const visibleDeptTokens = filterVisibleNames(deptTokens, d => d.department).map(d => ({
    ...d,
    department: getAgentDisplayName(d.department, d.department),
  }))

  // Combine props data with API data
  const barData = visibleBots
    .map(b => ({
      name: b.displayName || b.name,
      input: b.inputTokens,
      output: b.outputTokens,
      total: b.totalTokens,
    }))
    .sort((a, b) => b.total - a.total)
    .filter(d => d.total > 0)

  const totalInput = visibleBots.reduce((s, b) => s + b.inputTokens, 0)
  const totalOutput = visibleBots.reduce((s, b) => s + b.outputTokens, 0)
  const totalTokens = totalInput + totalOutput

  // Use per-department data from API for pie chart
  const pieData = visibleDeptTokens.length > 0
    ? visibleDeptTokens.filter(d => d.tokens > 0).map(d => ({ name: d.department, value: d.tokens }))
    : [{ name: "Input", value: totalInput }, { name: "Output", value: totalOutput }]

  const totalCost = visibleDeptTokens.reduce((s, d) => s + parseFloat(d.cost || '0'), 0)

  const tooltipStyle = {
    backgroundColor: theme === 'light' ? '#fff' : '#1a1a2e',
    border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#d4a574'}`,
    color: theme === 'light' ? '#374151' : '#e5e5e5',
    fontSize: 12,
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <MainViewHeader
        eyebrow="Token Stats / Usage Economics"
        title="令牌消耗统计"
        description="这页之前的问题是图表能看，但页面不像产品报表。现在把标题、导出、指标卡、图表面板和明细表统一成同一套运营报表语气。"
      />

      {/* 导出 */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            const csv = [
              '机构,输入令牌,输出令牌,总令牌,预估成本',
              ...visibleBots
                .sort((a, b) => b.totalTokens - a.totalTokens)
                .map(b => {
                  const cost = (b.totalTokens / 1000000 * tokenPrice).toFixed(4)
                  return `"${b.displayName || b.name}",${b.inputTokens},${b.outputTokens},${b.totalTokens},$${cost}`
                })
            ].join('\n')
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `token_stats_${new Date().toISOString().split('T')[0]}.csv`; a.click()
            URL.revokeObjectURL(url)
          }}
          className="px-4 py-2 text-xs border rounded-xl cursor-pointer"
          style={{ borderColor: 'var(--border-accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-soft)' }}
        >
          导出 CSV
        </button>
      </div>

      {/* 总量卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总令牌', value: fmt(totalTokens || totalApiTokens), note: '含前后端聚合统计' },
          { label: '输入令牌', value: fmt(totalInput), note: '用户侧输入累计' },
          { label: '输出令牌', value: fmt(totalOutput), note: '模型输出累计' },
          { label: '预估成本', value: `$${totalCost.toFixed(3)}`, note: '按当前单价估算' },
        ].map(c => (
          <div key={c.label} className={`${bg} p-4`}>
            <div className="metric-label">{c.label}</div>
            <div className="metric-value text-[var(--accent)]">{c.value}</div>
            <div className="metric-meta">{c.note}</div>
          </div>
        ))}
      </div>

      {/* 部门Token排行 - 柱状图 */}
      <div className={`${bg} p-4 sm:p-5`}>
        <h3 className="section-title mb-4">各机构令牌消耗</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 60, left: 10 }}>
              <XAxis dataKey="name" tick={{ fill: theme === 'light' ? '#6b7280' : '#a3a3a3', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: theme === 'light' ? '#6b7280' : '#a3a3a3', fontSize: 10 }} tickFormatter={v => fmt(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [Number(v).toLocaleString(), '令牌']} />
              <Bar dataKey="input" name="输入" fill="#d4a574" stackId="a" />
              <Bar dataKey="output" name="输出" fill="#c9a96e" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 部门占比 - 饼图 */}
      <div className={`${bg} p-4 sm:p-5`}>
        <h3 className="section-title mb-4">
          {visibleDeptTokens.length > 0 ? '各机构占比' : '输入 / 输出占比'}
        </h3>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: theme === 'light' ? '#9ca3af' : '#a3a3a3' }}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [fmt(Number(v)), '令牌']} />
              <Legend wrapperStyle={{ color: theme === 'light' ? '#6b7280' : '#a3a3a3', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 按部门明细表格 */}
      {visibleDeptTokens.length > 0 && (
        <div className={`${bg} overflow-hidden`}>
          <h3 className="section-title px-4 pt-4 sm:px-5 sm:pt-5">机构明细</h3>
          <div className={`grid grid-cols-3 text-xs p-3 border-y ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#16213e] border-[#d4a574]/20'}`}>
            <div>机构</div><div className="text-right">令牌消耗</div><div className="text-right">预估成本</div>
          </div>
          {visibleDeptTokens.sort((a, b) => b.tokens - a.tokens).map(d => (
            <div key={d.department} className={`grid grid-cols-3 text-xs sm:text-sm p-3 border-b ${theme === 'light' ? 'border-gray-100' : 'border-[#d4a574]/10'}`}>
              <div className="font-medium">{d.department}</div>
              <div className="text-right font-mono text-[#d4a574]">{fmt(d.tokens)}</div>
              <div className="text-right font-mono text-[#d4a574]">${d.cost}</div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className={`text-center py-4 ${sub} text-sm animate-pulse`}>加载令牌数据...</div>}
    </div>
  )
}
