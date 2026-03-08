import { useState, useEffect, useRef } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts"
import type { SystemStatus } from "../types"
import { useTheme } from "../theme"
import MainViewHeader from "../components/MainViewHeader"

interface Props { data: SystemStatus }

const AUTH_TOKEN = localStorage.getItem('gov_ai_auth_token') || ''

interface MetricPoint {
  timestamp: string
  cpu1m: number; cpu5m: number; cpu15m: number
  memUsedPct: number; memUsedGB: number
}

interface HealthInfo {
  status: string; version: string; uptimeFormatted: string; systemUptime: string
  memory: { used: number; total: number; rss: number }
  cpu: string[]
  gateway: string; endpoints: number
  cache: { hits: number; misses: number; keys: number }
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " GB"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " MB"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " KB"
  return n + " B"
}

function loadColor(pct: number): string {
  if (pct >= 80) return 'text-red-400'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-green-400'
}

// Ring/donut chart for disk/memory
function RingChart({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const { theme } = useTheme()
  const pct = max > 0 ? (value / max * 100) : 0
  const data = [
    { name: 'used', value: value },
    { name: 'free', value: Math.max(0, max - value) },
  ]
  const colors = [color, theme === 'light' ? '#e5e7eb' : '#0d0d1a']

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
            {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className={`font-mono text-sm ${loadColor(pct)}`}>{pct.toFixed(0)}%</div>
          <div className="text-[9px] text-[#a3a3a3]">{label}</div>
        </div>
      </div>
    </div>
  )
}

export default function SystemHealth({ data }: Props) {
  const { theme } = useTheme()
  const [metrics, setMetrics] = useState<MetricPoint[]>([])
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bg = 'surface-card'
  const sub = 'text-[var(--text-secondary)]'

  const fetchMetrics = async () => {
    try {
      const h = { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
      const [mRes, hRes] = await Promise.all([
        fetch('/api/system/metrics', h),
        fetch('/api/health', h),
      ])
      if (mRes.ok) {
        const d = await mRes.json()
        setMetrics(d.metrics || [])
      }
      if (hRes.ok) {
        const d = await hRes.json()
        setHealth(d)
      }
    } catch {}
  }

  useEffect(() => {
    fetchMetrics()
    timerRef.current = setInterval(fetchMetrics, 30000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Format metrics for chart
  const chartData = metrics.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    load1m: +Number(m.cpu1m).toFixed(2),
    load5m: +Number(m.cpu5m).toFixed(2),
    memPct: +Number(m.memUsedPct).toFixed(1),
  }))

  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null
  const load1m = Number(latestMetric ? latestMetric.cpu1m : (data.cpuLoad?.[0] ?? 0))
  const memPct = Number(latestMetric?.memUsedPct ?? 0)
  const memGB = Number(latestMetric?.memUsedGB ?? 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <MainViewHeader
        eyebrow="System Health / Infrastructure"
        title="系统态势"
        description="这页之前更像技术组件堆叠，不像产品里的系统态势页。这轮统一了页头、指标卡、环图和详情面板的呈现方式，让它更像正式控制台。"
      />

      {/* 进程信息卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '系统运行', value: health?.systemUptime || data.uptime, note: '宿主机运行时长' },
          { label: '版本', value: health?.version || '-', note: '当前服务版本' },
          { label: '端点数', value: String(health?.endpoints || '-'), note: '已接入接口数量' },
          { label: 'Gateway', value: `${health?.gateway || data.gateway?.status} · ${data.gateway?.ping}ms`, note: '网关连通状态' },
        ].map((item, idx) => (
          <div key={item.label} className={`${bg} p-4`}>
            <div className="metric-label">{item.label}</div>
            <div className={`metric-value text-base sm:text-lg ${idx === 3 && !(health?.gateway === 'connected' || data.gateway?.status === 'ready') ? 'text-red-400' : 'text-[var(--accent)]'}`}>{item.value}</div>
            <div className="metric-meta">{item.note}</div>
          </div>
        ))}
      </div>

      {/* 平台信息 */}
      <div className={`${bg} p-4 sm:p-5`}>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className={sub}>🖥 {data.platform}</span>
          <span className={sub}>💾 RSS: {fmt(data.memoryUsage?.rss || 0)}</span>
          <span className={sub}>📊 Heap: {fmt(data.memoryUsage?.heapUsed || 0)} / {fmt(data.memoryUsage?.heapTotal || 0)}</span>
          <span className={sub}>🔗 Sessions: {data.totalSessions}</span>
        </div>
      </div>

      {/* 实时指标环形图 */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${bg} rounded-lg p-3`}>
          <h3 className={`text-[10px] uppercase tracking-wider mb-1 text-center ${sub}`}>📊 系统负载</h3>
          <RingChart value={Math.min(load1m, 8)} max={8} label={`1 分钟 ${load1m.toFixed(2)}`} color={load1m >= 6 ? '#ef4444' : load1m >= 3 ? '#eab308' : '#22c55e'} />
          <div className={`mt-1 text-center text-[10px] ${sub}`}>负载均值，不是 CPU 百分比</div>
        </div>
        <div className={`${bg} rounded-lg p-3`}>
          <h3 className={`text-[10px] uppercase tracking-wider mb-1 text-center ${sub}`}>💾 内存</h3>
          <RingChart value={memPct} max={100} label={`${memGB.toFixed(1)}GB`} color={memPct >= 80 ? '#ef4444' : memPct >= 50 ? '#eab308' : '#d4a574'} />
        </div>
        <div className={`${bg} rounded-lg p-3`}>
          <h3 className={`text-[10px] uppercase tracking-wider mb-1 text-center ${sub}`}>📂 缓存</h3>
          <div className="flex flex-col items-center justify-center h-[140px] gap-2">
            <div className="text-2xl font-mono text-[#d4a574]">{health?.cache?.keys ?? '-'}</div>
            <div className={`text-[10px] ${sub}`}>缓存键</div>
            <div className="flex gap-3 text-[10px]">
              <span className="text-green-400">命中 {health?.cache?.hits ?? 0}</span>
              <span className="text-red-400">未中 {health?.cache?.misses ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 负载 / 内存折线图 */}
      {chartData.length > 1 && (
        <div className={`${bg} rounded-lg p-3 sm:p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-[10px] sm:text-xs uppercase tracking-wider ${sub}`}>📈 负载与内存趋势</h3>
            <span className={`text-[10px] ${sub}`}>每30秒采样 · {chartData.length}点</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e5e7eb' : '#333'} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#a3a3a3' }} />
              <YAxis tick={{ fontSize: 9, fill: '#a3a3a3' }} width={35} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'light' ? '#fff' : '#1a1a2e',
                  border: '1px solid #d4a574',
                  borderRadius: 8, fontSize: 11,
                }}
                formatter={(v: unknown, name: unknown) => {
                  if (name === '内存占用') return [`${Number(v).toFixed(1)}%`]
                  return [Number(v).toFixed(2)]
                }}
              />
              <Line type="monotone" dataKey="load1m" stroke="#22c55e" strokeWidth={2} dot={false} name="1 分钟负载" />
              <Line type="monotone" dataKey="load5m" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="5 分钟负载" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="memPct" stroke="#d4a574" strokeWidth={2} dot={false} name="内存占用" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> 1 分钟负载</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> 5 分钟负载</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#d4a574] inline-block" /> 内存占用</span>
          </div>
        </div>
      )}

      {/* Gateway + Server详细信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`${bg} rounded-lg p-3 sm:p-4`}>
          <h3 className={`text-[10px] sm:text-xs uppercase tracking-wider mb-3 ${sub}`}>🌐 Gateway 状态</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className={sub}>状态</span>
              <span className={`font-mono ${data.gateway?.status === 'ready' ? 'text-green-400' : 'text-red-400'}`}>
                {data.gateway?.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={sub}>Ping</span>
              <span className="font-mono text-[#d4a574]">{data.gateway?.ping}ms</span>
            </div>
            <div className="flex justify-between">
              <span className={sub}>Guilds</span>
              <span className="font-mono text-[#d4a574]">{data.gateway?.guilds}</span>
            </div>
          </div>
        </div>
        <div className={`${bg} rounded-lg p-3 sm:p-4`}>
          <h3 className={`text-[10px] sm:text-xs uppercase tracking-wider mb-3 ${sub}`}>📦 Node.js 进程</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className={sub}>Heap 使用</span>
              <span className="font-mono text-[#d4a574]">
                {fmt(data.memoryUsage?.heapUsed || 0)} / {fmt(data.memoryUsage?.heapTotal || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={sub}>RSS</span>
              <span className="font-mono text-[#d4a574]">{fmt(data.memoryUsage?.rss || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className={sub}>External</span>
              <span className="font-mono text-[#d4a574]">{fmt(data.memoryUsage?.external || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className={sub}>服务运行</span>
              <span className="font-mono text-[#d4a574]">{health?.uptimeFormatted || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
