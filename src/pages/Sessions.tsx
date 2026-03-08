import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useTheme } from "../theme"
import type { MainViewContext, TabName } from "../types"
import { PRODUCT_NAME, formatCompactNumber, formatChannelLabel, getSessionLifecycleStatus, getToneClasses, getWorkflowStage, getWorkflowToneClasses } from "../utils/officeSemantics"
import MainViewHeader from "../components/MainViewHeader"

interface Session {
  id: string; agentId: string; agentName: string; channel: string
  updatedAt: number; createdAt?: number; messageCount: number
  inputTokens: number; outputTokens: number
}

interface SessionSummary {
  totalTokens: number; messageCount: number
  firstMessage?: { timestamp: string; preview: string }
  lastMessage?: { timestamp: string; preview: string }
  avgResponseTimeMs?: number; avgResponseTimeSec?: string
}

interface SessionDetail extends Session {
  messages?: Message[]
  summary?: SessionSummary | null
  summaryLoading?: boolean
}

interface Message { id: string; role: string; content: string; timestamp: string }

interface Props {
  initialFilter?: string
  viewContext?: MainViewContext
  onNavigate?: (tab: TabName, filter?: string) => void
}

const AUTH_TOKEN = localStorage.getItem('gov_ai_auth_token') || ''

function fmt(n: number) {
  return formatCompactNumber(n)
}

function relTime(ts: number) {
  if (!ts) return '未知'
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d}天前`
  if (h > 0) return `${h}小时前`
  if (m > 0) return `${m}分钟前`
  return '刚刚'
}

function MessageTimeline({ messages }: { messages: Message[] }) {
  const { theme } = useTheme()
  const sub = theme === 'light' ? 'text-gray-500' : 'text-[#a3a3a3]'

  if (!messages || messages.length === 0) return null

  const hourMap: Record<string, { user: number; assistant: number }> = {}
  messages.forEach(msg => {
    const d = new Date(msg.timestamp)
    const hour = `${d.getHours().toString().padStart(2, '0')}:00`
    if (!hourMap[hour]) hourMap[hour] = { user: 0, assistant: 0 }
    if (msg.role === 'user') hourMap[hour].user++
    else hourMap[hour].assistant++
  })

  const chartData = Object.entries(hourMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, counts]) => ({ hour, ...counts }))

  if (chartData.length === 0) return null

  return (
    <div className="mt-3">
      <h4 className={`text-[10px] sm:text-xs font-medium ${sub} mb-2`}>📊 消息时间分布</h4>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e5e7eb' : '#333'} />
          <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#a3a3a3' }} />
          <YAxis tick={{ fontSize: 9, fill: '#a3a3a3' }} width={25} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme === 'light' ? '#fff' : '#1a1a2e',
              border: '1px solid #d4a574',
              borderRadius: 8,
              fontSize: 11,
            }}
          />
          <Bar dataKey="user" fill="#6366f1" name="用户" radius={[2, 2, 0, 0]} />
          <Bar dataKey="assistant" fill="#d4a574" name="助手" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function exportSession(session: SessionDetail) {
  const exportData = {
    id: session.id,
    agent: session.agentName,
    channel: session.channel,
    messageCount: session.messageCount,
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
    updatedAt: new Date(session.updatedAt).toISOString(),
    summary: session.summary || null,
    messages: session.messages?.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })) || [],
    exportedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `session-${session.agentName}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Sessions({ initialFilter, viewContext, onNavigate }: Props) {
  const { theme } = useTheme()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [sortBy, setSortBy] = useState<'time' | 'tokens' | 'messages'>('time')
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null)
  const [msgsLoading, setMsgsLoading] = useState(false)
  // Expandable inline detail
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedSummary, setExpandedSummary] = useState<Record<string, SessionSummary | null>>({})
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({})

  const bg = 'surface-card'
  const sub = 'text-[var(--text-secondary)]'

  // Apply initial filter from Dashboard navigation
  useEffect(() => {
    if (initialFilter) {
      setFilterDept(initialFilter)
    }
  }, [initialFilter])

  const fetchSessions = async () => {
    try {
      const r = await fetch('/api/sessions?limit=100', { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
      if (r.ok) { const d = await r.json(); setSessions(d.sessions || []) }
    } catch { }
    setLoading(false)
  }

  const fetchMessages = async (sessionId: string) => {
    setMsgsLoading(true)
    try {
      const r = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/messages?limit=50`, { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
      if (r.ok) { const d = await r.json(); setSelectedSession(prev => prev ? { ...prev, messages: d.messages || [] } : null) }
      else setSelectedSession(prev => prev ? { ...prev, messages: [] } : null)
    } catch { setSelectedSession(prev => prev ? { ...prev, messages: [] } : null) }
    setMsgsLoading(false)
  }

  const fetchSummary = async (sessionId: string) => {
    if (expandedSummary[sessionId] !== undefined) return // already loaded
    setExpandedLoading(prev => ({ ...prev, [sessionId]: true }))
    try {
      const r = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/summary`, { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
      if (r.ok) {
        const d = await r.json()
        setExpandedSummary(prev => ({ ...prev, [sessionId]: d }))
      } else {
        setExpandedSummary(prev => ({ ...prev, [sessionId]: null }))
      }
    } catch {
      setExpandedSummary(prev => ({ ...prev, [sessionId]: null }))
    }
    setExpandedLoading(prev => ({ ...prev, [sessionId]: false }))
  }

  const toggleExpand = (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null)
    } else {
      setExpandedId(sessionId)
      fetchSummary(sessionId)
    }
  }

  useEffect(() => { fetchSessions() }, [])

  const departments = [...new Set(sessions.map(s => s.agentName))].sort()

  const filtered = sessions.filter(s => {
    if (filterDept !== 'all' && s.agentName !== filterDept) return false
    if (!filter) return true
    const f = filter.toLowerCase()
    return s.agentName.toLowerCase().includes(f) || s.channel.toLowerCase().includes(f)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'time') return b.updatedAt - a.updatedAt
    if (sortBy === 'tokens') return (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens)
    return b.messageCount - a.messageCount
  })

  const totalTokens = filtered.reduce((s, x) => s + x.inputTokens + x.outputTokens, 0)
  const totalMessages = filtered.reduce((s, x) => s + x.messageCount, 0)
  const activeSessions = filtered.filter(s => Date.now() - s.updatedAt < 3600000).length

  if (loading) return (
    <div className={`${sub} p-4 text-center`}>
      <div className="animate-pulse">⏳ 加载会话数据中...</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <MainViewHeader
        eyebrow="Sessions / Mission Threads"
        title={`${PRODUCT_NAME} 会话任务中心`}
        description="本页把各机构席位正在处理或已归档的会话任务统一成同一套生命周期语义，便于和 Dashboard、Office、Departments 对照查看。"
        focusLabel={viewContext?.focusLabel}
        links={[
          { label: '查看总览', tab: 'dashboard' },
          { label: '查看机构席位', tab: 'departments', filter: initialFilter },
          { label: '查看办公大厅', tab: 'office', filter: initialFilter },
        ]}
        onNavigate={onNavigate}
      />

      {/* 统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: '会话任务', v: sessions.length, note: '当前纳入任务中心' },
          { l: '执行中(1h)', v: activeSessions, note: '1 小时内有更新' },
          { l: '总消息', v: totalMessages, note: '用户与助手消息合计' },
          { l: '令牌', v: formatCompactNumber(totalTokens), note: '全会话累计消耗' },
        ].map(x => (
          <div key={x.l} className={`${bg} p-4`}>
            <div className="metric-label">{x.l}</div>
            <div className="metric-value text-[var(--accent)]">{x.v}</div>
            <div className="metric-meta">{x.note}</div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="surface-card flex flex-wrap gap-2 p-3 sm:p-4">
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-primary)]">
          <option value="all">全部机构席位</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="text" placeholder="搜索机构或渠道..." value={filter} onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 text-xs rounded-xl border bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 text-xs rounded-xl border bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-primary)]">
          <option value="time">按最近活动</option>
          <option value="tokens">按令牌消耗</option>
          <option value="messages">按消息数量</option>
        </select>
        <button onClick={fetchSessions}
          className="px-3 py-2 text-xs border rounded-xl cursor-pointer"
          style={{ borderColor: 'var(--border-accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-soft)' }}>
          刷新列表
        </button>
      </div>

      {filterDept !== 'all' && (
        <div className="surface-card p-4 text-sm text-[var(--text-secondary)]">
          当前仅展示机构任务：<span className="text-[var(--accent)] font-medium">{filterDept}</span>
        </div>
      )}

      {/* 会话列表 */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className={`text-center py-8 ${sub}`}>暂无会话数据</div>
        )}
        {sorted.map(s => {
          const tokens = s.inputTokens + s.outputTokens
          const lifecycle = getSessionLifecycleStatus(s.updatedAt)
          const tone = getToneClasses(lifecycle.tone)
          const workflowStage = getWorkflowStage(s.updatedAt, s.messageCount)
          const workflowTone = getWorkflowToneClasses(workflowStage.tone)
          const channelLabel = formatChannelLabel(s.channel)
          const isExpanded = expandedId === s.id
          const smry = expandedSummary[s.id]
          const smryLoading = expandedLoading[s.id]

          return (
            <div key={s.id} className={`${bg} card-glow overflow-hidden transition-all`}>
              {/* Main row */}
              <div className="p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tone.dot}`} />
                    <span className="text-sm font-medium">{s.agentName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === 'light' ? 'bg-gray-100 text-gray-500' : 'bg-[#0d0d1a] text-[#a3a3a3]'}`}>
                      {channelLabel}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${tone.pill}`}>
                      {lifecycle.label}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${workflowTone.pill}`}>
                      {workflowStage.label}
                    </span>
                  </div>
                  <span className={`text-[10px] sm:text-xs ${sub}`}>{relTime(s.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] sm:text-xs flex-wrap">
                  <span className={sub}>💬 {s.messageCount} 条消息</span>
                  <span className="text-[#d4a574] font-mono">🔥 {fmt(tokens)}</span>
                  <span className={sub}>↓{fmt(s.inputTokens)} ↑{fmt(s.outputTokens)}</span>
                  <span className={workflowTone.text}>⛓ {workflowStage.description}</span>
                  <span className={sub}>📍 {workflowStage.deskHint}</span>
                  <span className={sub}>➡ {workflowStage.nextStep}</span>
                </div>
                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                      isExpanded ? 'border-[#d4a574] text-[#d4a574] bg-[#d4a574]/10' : 'border-[#d4a574]/20 text-[#d4a574]/70 hover:bg-[#d4a574]/5'
                    }`}
                  >
                    {isExpanded ? '▼ 收起任务摘要' : '▶ 查看任务摘要'}
                  </button>
                  <button
                    onClick={() => { setSelectedSession({ ...s, messages: [] }); fetchMessages(s.id) }}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#d4a574]/20 text-[#d4a574]/70 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    💬 查看消息
                  </button>
                  <button
                    onClick={() => onNavigate?.('departments', s.agentName)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#d4a574]/20 text-[#d4a574]/70 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    🏛️ 查看机构席位
                  </button>
                  <button
                    onClick={() => onNavigate?.('office', s.agentName)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#d4a574]/20 text-[#d4a574]/70 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    🏢 查看办公大厅
                  </button>
                </div>
              </div>

              {/* Expandable summary panel */}
              {isExpanded && (
                <div className={`px-3 pb-3 border-t ${theme === 'light' ? 'border-gray-100' : 'border-[#d4a574]/10'}`}>
                  {smryLoading ? (
                    <div className={`text-center py-3 ${sub} text-xs animate-pulse`}>加载摘要...</div>
                  ) : smry ? (
                    <div className="pt-3 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className={`text-[9px] ${sub}`}>消息总数</div>
                          <div className="font-mono text-xs">{smry.messageCount}</div>
                        </div>
                        <div>
                          <div className={`text-[9px] ${sub}`}>令牌</div>
                          <div className="font-mono text-xs text-[#d4a574]">{fmt(smry.totalTokens)}</div>
                        </div>
                        <div>
                          <div className={`text-[9px] ${sub}`}>平均响应耗时</div>
                          <div className="font-mono text-xs">{smry.avgResponseTimeSec || '-'}s</div>
                        </div>
                      </div>
                      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] ${sub}`}>
                        <div className={`rounded p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0d0d1a]'}`}>
                          <div className="text-[9px] opacity-70">当前环节</div>
                          <div className="mt-1 text-[var(--text-primary)]">{workflowStage.label}</div>
                        </div>
                        <div className={`rounded p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0d0d1a]'}`}>
                          <div className="text-[9px] opacity-70">承办位置</div>
                          <div className="mt-1 text-[var(--text-primary)]">{workflowStage.deskHint}</div>
                        </div>
                        <div className={`rounded p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0d0d1a]'}`}>
                          <div className="text-[9px] opacity-70">下一步</div>
                          <div className="mt-1 text-[var(--text-primary)]">{workflowStage.nextStep}</div>
                        </div>
                      </div>
                      {smry.firstMessage && (
                        <div className={`p-2 rounded text-[10px] ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0d0d1a]'}`}>
                          <div className={`${sub} mb-0.5`}>📌 首条消息 · {new Date(smry.firstMessage.timestamp).toLocaleString('zh-CN')}</div>
                          <div className="leading-relaxed break-all">{smry.firstMessage.preview.substring(0, 150)}...</div>
                        </div>
                      )}
                      {smry.lastMessage && (
                        <div className={`p-2 rounded text-[10px] ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0d0d1a]'}`}>
                          <div className={`${sub} mb-0.5`}>🕐 最新消息 · {new Date(smry.lastMessage.timestamp).toLocaleString('zh-CN')}</div>
                          <div className="leading-relaxed break-all">{smry.lastMessage.preview.substring(0, 150)}...</div>
                        </div>
                      )}
                      <div className={`rounded p-2 text-[10px] border ${theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                        <div className="font-medium">任务判断</div>
                        <div className="mt-1 leading-relaxed">
                          {workflowStage.label === '待复核 / 待续办'
                            ? '当前更像待复核或待续办任务，建议由下一岗位确认是回退、接力还是结案。'
                            : workflowStage.label === '归档留痕'
                              ? '当前更像已结案归档事项，适合用于复盘、审计和再次唤起。'
                              : workflowStage.label === '承办处理中'
                                ? '当前处于主责承办阶段，优先关注处理进度与协同链路。'
                                : '当前事项还在进入阶段，优先完成分派与责任落位。'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-center py-3 ${sub} text-xs`}>暂无摘要数据</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 会话消息弹窗 */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
             onClick={() => setSelectedSession(null)}>
          <div className={`w-full sm:max-w-lg max-h-[85vh] overflow-auto rounded-t-xl sm:rounded-lg ${
            theme === 'light' ? 'bg-white' : 'bg-[#1a1a2e]'
          }`} onClick={e => e.stopPropagation()}>
            <div className={`sticky top-0 z-10 p-3 sm:p-4 border-b flex items-center justify-between ${
              theme === 'light' ? 'border-gray-200 bg-white' : 'border-[#d4a574]/20 bg-[#1a1a2e]'
            }`}>
              <div>
                <h3 className="text-sm sm:text-base font-medium text-[#d4a574]">{selectedSession.agentName}</h3>
                <div className={`text-[10px] ${sub} mt-0.5 truncate max-w-[200px]`}>{formatChannelLabel(selectedSession.channel)} · {selectedSession.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportSession(selectedSession)}
                  className="px-2 py-1 text-[10px] border border-[#d4a574]/30 text-[#d4a574] rounded hover:bg-[#d4a574]/10 cursor-pointer"
                  title="导出会话"
                >
                  📥 导出
                </button>
                <button onClick={() => setSelectedSession(null)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${sub} hover:text-[#e5e5e5] text-lg cursor-pointer`}>
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-b border-[#d4a574]/10">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className={`text-[10px] ${sub}`}>消息总数</div>
                  <div className="font-mono text-sm">{selectedSession.messageCount}</div>
                </div>
                <div>
                  <div className={`text-[10px] ${sub}`}>令牌</div>
                  <div className="font-mono text-sm text-[#d4a574]">{fmt(selectedSession.inputTokens + selectedSession.outputTokens)}</div>
                </div>
                <div>
                  <div className={`text-[10px] ${sub}`}>最近活动</div>
                  <div className="text-sm">{relTime(selectedSession.updatedAt)}</div>
                </div>
              </div>
              {selectedSession.messages && selectedSession.messages.length > 0 && (
                <MessageTimeline messages={selectedSession.messages} />
              )}
            </div>

            <div className="p-3 sm:p-4">
              <h4 className={`text-xs font-medium text-[#d4a574] mb-2`}>消息历史</h4>
              {msgsLoading ? (
                <div className={`text-center py-4 ${sub} text-sm animate-pulse`}>加载中...</div>
              ) : selectedSession.messages?.length ? (
                <div className="space-y-2">
                  {selectedSession.messages.map(msg => (
                    <div key={msg.id} className={`p-2.5 rounded text-xs ${theme === 'light' ? 'bg-gray-50' : 'bg-[#0d0d1a]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>{msg.role === 'user' ? '用户' : '助手'}</span>
                        <span className={`text-[10px] ${sub}`}>{new Date(msg.timestamp).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="text-xs leading-relaxed break-all whitespace-pre-wrap">{msg.content?.substring(0, 500)}{msg.content?.length > 500 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-4 ${sub} text-sm`}>暂无消息记录</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
