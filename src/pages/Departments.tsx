import { useState, useEffect } from "react"
import type { MainViewContext, SystemStatus, BotAccount, TabName } from "../types"
import { useTheme } from "../theme"
import { filterVisibleBots, getAgentDisplayName } from "../utils/agentDisplay"
import { PRODUCT_NAME, formatCompactNumber, getOperationalStatus, getToneClasses, getWorkflowStage, getWorkflowToneClasses } from "../utils/officeSemantics"
import MainViewHeader from "../components/MainViewHeader"

interface Props {
  data: SystemStatus
  viewContext?: MainViewContext
  onNavigate?: (tab: TabName, filter?: string) => void
}

const AUTH_TOKEN = localStorage.getItem('gov_ai_auth_token') || ''

function relTime(ts: number) {
  if (!ts) return '未知'
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d}天前`
  if (h > 0) return `${h}小时前`
  if (m > 0) return `${m}分钟前`
  return '刚刚'
}

interface DeptActivity {
  agentId: string; updatedAt: number; messageCount: number; channel: string
}

interface RecentMsg {
  id: string; role: string; content: string; timestamp: string
}

export default function Departments({ data, viewContext, onNavigate }: Props) {
  const { theme } = useTheme()
  const [expandedBot, setExpandedBot] = useState<string | null>(null)
  const [activities, setActivities] = useState<Record<string, DeptActivity>>({})
  const [recentMsgs, setRecentMsgs] = useState<Record<string, RecentMsg[]>>({})
  const [msgsLoading, setMsgsLoading] = useState<string | null>(null)
  const bg = 'surface-card'
  const sub = 'text-[var(--text-secondary)]'

  // Fetch activity data from sessions
  useEffect(() => {
    fetch('/api/sessions?limit=100', { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
      .then(r => r.json())
      .then(d => {
        const map: Record<string, DeptActivity> = {}
        for (const s of (d.sessions || [])) {
          const id = s.agentId
          if (!map[id] || s.updatedAt > map[id].updatedAt) {
            map[id] = { agentId: id, updatedAt: s.updatedAt, messageCount: s.messageCount, channel: s.channel }
          }
        }
        setActivities(map)
      })
      .catch(() => {})
  }, [])

  const toggleBot = async (botName: string) => {
    if (expandedBot === botName) {
      setExpandedBot(null)
      return
    }
    setExpandedBot(botName)
    
    if (!recentMsgs[botName]) {
      setMsgsLoading(botName)
      try {
        // Find the session ID for this bot
        const r = await fetch('/api/sessions?limit=100', { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
        const d = await r.json()
        const session = (d.sessions || []).find((s: DeptActivity & { id: string }) => s.agentId === botName)
        if (session) {
          const mr = await fetch(`/api/sessions/${encodeURIComponent(session.id)}/messages?limit=6`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
          })
          const md = await mr.json()
          setRecentMsgs(prev => ({ ...prev, [botName]: md.messages || [] }))
        } else {
          setRecentMsgs(prev => ({ ...prev, [botName]: [] }))
        }
      } catch { setRecentMsgs(prev => ({ ...prev, [botName]: [] })) }
      setMsgsLoading(null)
    }
  }

  const allVisibleBots = filterVisibleBots(data.botAccounts)
  const focusFilter = viewContext?.focusFilter?.trim()
  const visibleBots = focusFilter
    ? allVisibleBots.filter((bot) => getAgentDisplayName(bot.name, bot.displayName) === focusFilter)
    : allVisibleBots
  const onlineCount = visibleBots.filter(b => getOperationalStatus(b.status, b.sessions).label === '执行中').length
  const totalTokens = visibleBots.reduce((s, b) => s + b.totalTokens, 0)
  const totalSessions = visibleBots.reduce((s, b) => s + b.sessions, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <MainViewHeader
        eyebrow="Departments / Agency Desks"
        title={`${PRODUCT_NAME} 机构席位总览`}
        description="本页聚焦机构席位本身，使用与 Dashboard、Office、Sessions 相同的显示名、状态文案和任务统计口径；并可直接跳转到该机构的会话任务或办公大厅视图。"
        focusLabel={viewContext?.focusLabel}
        links={[
          { label: '查看办公大厅', tab: 'office', filter: focusFilter },
          { label: '查看会话任务', tab: 'sessions', filter: focusFilter },
          ...(focusFilter ? [{ label: '返回全部机构', tab: 'departments' as TabName }] : []),
        ]}
        onNavigate={onNavigate}
      />

      {/* 统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: '机构席位', v: visibleBots.length, note: '当前纳入统一显示口径' },
          { l: '执行中', v: onlineCount, note: '正在处理会话任务' },
          { l: '任务总量', v: totalSessions, note: '按机构聚合的任务数' },
          { l: '总令牌', v: formatCompactNumber(totalTokens), note: '含输入与输出累计' },
        ].map(c => (
          <div key={c.l} className={`${bg} p-4`}>
            <div className="metric-label">{c.l}</div>
            <div className="metric-value text-[var(--accent)]">{c.v}</div>
            <div className="metric-meta">{c.note}</div>
          </div>
        ))}
      </div>

      {focusFilter && visibleBots.length > 0 && (
        <div className="surface-card p-4 text-sm text-[var(--text-secondary)]">
          当前仅展示机构席位：<span className="text-[var(--accent)] font-medium">{focusFilter}</span>
        </div>
      )}

      {/* 机构席位卡片列表 */}
      <div className="space-y-2">
        {visibleBots.map((bot: BotAccount) => {
          const activity = activities[bot.name]
          const isExpanded = expandedBot === bot.name
          const msgs = recentMsgs[bot.name]
          const op = getOperationalStatus(bot.status, bot.sessions)
          const tone = getToneClasses(op.tone)
          const workflow = activity ? getWorkflowStage(activity.updatedAt, activity.messageCount) : null
          const workflowTone = workflow ? getWorkflowToneClasses(workflow.tone) : null

          return (
            <div key={bot.name} className={`${bg} card-glow overflow-hidden`}>
              {/* 主行 */}
              <button onClick={() => toggleBot(bot.name)}
                title="展开机构席位详情"
                className="w-full p-4 sm:p-5 text-left cursor-pointer transition-all hover:bg-[var(--bg-soft)]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tone.dot}`} />
                    <span className="text-sm sm:text-base font-medium">{getAgentDisplayName(bot.name, bot.displayName)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tone.pill}`}>
                      {op.label}
                    </span>
                    {workflow && workflowTone && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${workflowTone.pill}`}>
                        {workflow.label}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${sub} transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
                  <span className={sub}>💬 {bot.sessions} 项任务</span>
                  <span className="text-[#d4a574] font-mono">🔥 {formatCompactNumber(bot.totalTokens)}</span>
                  <span className={sub}>📥 {formatCompactNumber(bot.inputTokens)} / 📤 {formatCompactNumber(bot.outputTokens)}</span>
                  {activity && (
                    <span className={sub}>🕐 {relTime(activity.updatedAt)}</span>
                  )}
                  {workflow && workflowTone && (
                    <span className={workflowTone.text}>⛓ {workflow.deskHint}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onNavigate?.('sessions', getAgentDisplayName(bot.name, bot.displayName)) }}
                    className="text-[10px] px-2 py-1 rounded border border-[#d4a574]/20 text-[#d4a574]/80 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    查看该机构任务
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onNavigate?.('office', getAgentDisplayName(bot.name, bot.displayName)) }}
                    className="text-[10px] px-2 py-1 rounded border border-[#d4a574]/20 text-[#d4a574]/80 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    在办公大厅查看
                  </button>
                </div>
              </button>

              {/* 展开详情 */}
              {isExpanded && (
                <div className={`border-t p-3 sm:p-4 ${theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-[#d4a574]/10 bg-[#16213e]'}`}>
                  {/* 详细信息 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
                    <div><span className={sub}>内部 ID: </span><span className="font-mono">{bot.name}</span></div>
                    <div><span className={sub}>模型: </span><span className="font-mono">{bot.model?.replace(/^[^/]+\//, '') || '未分配模型'}</span></div>
                    <div><span className={sub}>席位状态: </span><span className={tone.text}>{op.label}</span></div>
                    <div><span className={sub}>输入令牌: </span><span className="font-mono text-[#d4a574]">{bot.inputTokens.toLocaleString()}</span></div>
                    <div><span className={sub}>输出令牌: </span><span className="font-mono text-[#d4a574]">{bot.outputTokens.toLocaleString()}</span></div>
                    <div><span className={sub}>总令牌: </span><span className="font-mono text-[#d4a574]">{bot.totalTokens.toLocaleString()}</span></div>
                    <div><span className={sub}>状态说明: </span><span>{op.description}</span></div>
                    {activity && <div><span className={sub}>最近活跃: </span><span>{relTime(activity.updatedAt)}</span></div>}
                    {workflow && <div><span className={sub}>当前环节: </span><span>{workflow.label}</span></div>}
                    {workflow && <div><span className={sub}>承办位置: </span><span>{workflow.deskHint}</span></div>}
                    {workflow && <div><span className={sub}>下一步: </span><span>{workflow.nextStep}</span></div>}
                  </div>

                  {/* 最近消息 */}
                  <div>
                    <h4 className={`text-xs font-medium mb-2 ${sub}`}>💬 最近消息</h4>
                    {msgsLoading === bot.name ? (
                      <div className={`text-xs ${sub} animate-pulse py-2`}>加载中...</div>
                    ) : msgs && msgs.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-auto">
                        {msgs.map((msg, i) => (
                          <div key={msg.id || i} className={`p-2 rounded text-xs ${
                            theme === 'light' ? 'bg-white' : 'bg-[#0d0d1a]'
                          }`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] px-1 py-0.5 rounded ${
                                msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                              }`}>{msg.role === 'user' ? '用户' : '助手'}</span>
                              {msg.timestamp && <span className={`text-[10px] ${sub}`}>{new Date(msg.timestamp).toLocaleString('zh-CN')}</span>}
                            </div>
                            <div className="break-words whitespace-pre-wrap leading-relaxed">
                              {msg.content?.substring(0, 200)}{msg.content && msg.content.length > 200 ? '...' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-xs ${sub} py-2`}>暂无消息记录</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
