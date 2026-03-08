import { useEffect, useMemo, useRef, useState } from "react"
import type { MainViewContext, SystemStatus, TabName } from "../types"
import { useTheme } from "../theme"
import { OfficeState } from "../pixel-office/engine/officeState"
import { renderFrame } from "../pixel-office/engine/renderer"
import { loadCharacterPNGs, loadWallPNG } from "../pixel-office/sprites/pngLoader"
import { syncAgentsToOffice, type AgentActivity } from "../pixel-office/agentBridge"
import { filterVisibleBots, getAgentDisplayName } from "../utils/agentDisplay"
import { PRODUCT_NAME, formatCompactNumber, getOperationalStatus, getToneClasses, getWorkflowStage, getWorkflowToneClasses } from "../utils/officeSemantics"
import MainViewHeader from "../components/MainViewHeader"

const AUTH_TOKEN = localStorage.getItem("gov_ai_auth_token") || ""

function toAgentActivities(data: SystemStatus | null): AgentActivity[] {
  if (!data) return []
  return [...filterVisibleBots(data.botAccounts)]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((bot) => ({
      agentId: bot.name,
      name: bot.displayName || bot.name,
      emoji: "🧑‍💼",
      state: bot.status === "online"
        ? bot.sessions > 0 ? "working" : "idle"
        : "offline",
      currentTool: bot.model || "待命",
      lastActive: Date.now(),
      subagents: [],
    }))
}

interface Props {
  viewContext?: MainViewContext
  onNavigate?: (tab: TabName, filter?: string) => void
}

export default function Office({ viewContext, onNavigate }: Props) {
  useTheme()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const officeRef = useRef<OfficeState | null>(null)
  const zoomRef = useRef(2.4)
  const panRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)
  const agentIdMapRef = useRef<Map<string, number>>(new Map())
  const nextIdRef = useRef({ current: 1 })
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'idle' | 'offline'>('all')
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function boot() {
      try {
        const office = new OfficeState()
        officeRef.current = office
        await Promise.all([loadCharacterPNGs(), loadWallPNG()])
        if (alive) setReady(true)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "像素办公室初始化失败")
      }
    }
    void boot()
    return () => {
      alive = false
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  useEffect(() => {
    let alive = true
    async function fetchStatus() {
      try {
        const res = await fetch("/api/status", {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!alive) return
        setStatus(json)
        setError(null)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : "获取状态失败")
      } finally {
        if (alive) setLoading(false)
      }
    }
    void fetchStatus()
    const id = window.setInterval(fetchStatus, 15000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const activities = useMemo(() => toAgentActivities(status), [status])

  useEffect(() => {
    const office = officeRef.current
    if (!office || !ready) return
    syncAgentsToOffice(activities, office, agentIdMapRef.current, nextIdRef.current)
  }, [activities, ready])

  useEffect(() => {
    if (!ready || !canvasRef.current || !shellRef.current || !officeRef.current) return

    const canvas = canvasRef.current
    const container = shellRef.current
    const office = officeRef.current
    let lastTime = 0

    const render = (time: number) => {
      const dt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time
      office.update(dt)

      const width = container.clientWidth
      const height = container.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)
        ctx.imageSmoothingEnabled = false

        const cols = office.layout.cols
        const rows = office.layout.rows
        const zoomX = width / (cols * 16)
        const zoomY = height / (rows * 16)
        zoomRef.current = Math.max(1.5, Math.min(3.4, Math.min(zoomX, zoomY) * 0.94))
        panRef.current = { x: 0, y: 0 }

        renderFrame(
          ctx,
          width,
          height,
          office.tileMap,
          office.furniture,
          office.getCharacters(),
          zoomRef.current,
          panRef.current.x,
          panRef.current.y,
          {
            selectedAgentId: null,
            hoveredAgentId: null,
            hoveredTile: null,
            seats: office.seats,
            characters: office.characters,
          },
          undefined,
          office.layout.tileColors,
          office.layout.cols,
          office.layout.rows,
          office.getBugs(),
          undefined,
          undefined,
          true,
        )
      }

      frameRef.current = requestAnimationFrame(render)
    }

    frameRef.current = requestAnimationFrame(render)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [ready])

  const focusFilter = viewContext?.focusFilter?.trim()
  const sortedBots = useMemo(() => {
    const bots = filterVisibleBots(status?.botAccounts || [])
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .filter((bot) => {
        if (focusFilter && getAgentDisplayName(bot.name, bot.displayName) !== focusFilter) return false
        if (statusFilter === 'all') return true
        const operational = getOperationalStatus(bot.status, bot.sessions)
        return operational.tone === statusFilter
      })
    return bots
  }, [status, focusFilter, statusFilter])
  useEffect(() => {
    if (!sortedBots.length) {
      setSelectedDeskId(null)
      return
    }
    if (selectedDeskId && sortedBots.some((bot) => bot.name === selectedDeskId)) return
    setSelectedDeskId(sortedBots[0].name)
  }, [sortedBots, selectedDeskId])

  const onlineCount = sortedBots.filter((b) => getOperationalStatus(b.status, b.sessions).label === "执行中").length
  const totalTokens = sortedBots.reduce((sum, b) => sum + b.totalTokens, 0)
  const totalSessions = sortedBots.reduce((sum, b) => sum + b.sessions, 0)
  const selectedDesk = sortedBots.find((bot) => bot.name === selectedDeskId) || sortedBots[0]
  const selectedDeskName = selectedDesk ? getAgentDisplayName(selectedDesk.name, selectedDesk.displayName) : undefined
  const selectedDeskOperational = selectedDesk ? getOperationalStatus(selectedDesk.status, selectedDesk.sessions) : null
  const selectedDeskTone = selectedDeskOperational ? getToneClasses(selectedDeskOperational.tone) : null
  const selectedDeskWorkflow = selectedDesk ? getWorkflowStage(Date.now() - (selectedDesk.sessions > 0 ? 10 * 60 * 1000 : 8 * 60 * 60 * 1000), selectedDesk.sessions) : null
  const selectedDeskWorkflowTone = selectedDeskWorkflow ? getWorkflowToneClasses(selectedDeskWorkflow.tone) : null
  const panelClass = "surface-card"

  return (
    <div className="space-y-5">
      <MainViewHeader
        eyebrow="Office / Operations Floor"
        title={`${PRODUCT_NAME} 办公大厅`}
        description="Office 是把机构席位映射成像素办公大厅的主视图，和 Dashboard、Departments、Sessions 共用同一套状态与任务语义。"
        focusLabel={viewContext?.focusLabel}
        links={[
          { label: '查看机构席位', tab: 'departments', filter: focusFilter },
          { label: '查看会话任务', tab: 'sessions', filter: focusFilter },
          ...(focusFilter ? [{ label: '返回全部席位', tab: 'office' as TabName }] : []),
        ]}
        onNavigate={onNavigate}
      />

      {focusFilter && sortedBots.length > 0 && (
        <div className="surface-card p-4 text-sm text-[var(--text-secondary)]">
          当前办公大厅焦点机构：<span className="text-[var(--accent)] font-medium">{focusFilter}</span>
        </div>
      )}

      <section className="surface-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-title">Office 控制面板</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">按机构、状态和当前焦点席位切换办公大厅视角；先把控制层补起来，再继续往更强联动推进。</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[38rem]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'idle' | 'offline')}
              className="px-3 py-2 text-xs rounded-xl border bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              <option value="all">全部席位状态</option>
              <option value="online">执行中</option>
              <option value="idle">待命</option>
              <option value="offline">离线 / 归档</option>
            </select>
            <select
              value={selectedDeskId || ''}
              onChange={(e) => setSelectedDeskId(e.target.value || null)}
              className="px-3 py-2 text-xs rounded-xl border bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              {sortedBots.length === 0 && <option value="">暂无可选席位</option>}
              {sortedBots.map((bot) => (
                <option key={bot.name} value={bot.name}>{getAgentDisplayName(bot.name, bot.displayName)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectedDeskName && onNavigate?.('sessions', selectedDeskName)}
                disabled={!selectedDeskName}
                className="flex-1 text-[10px] px-3 py-2 rounded-xl border border-[var(--border-accent)] text-[var(--accent)] bg-[var(--accent-soft)] disabled:opacity-40 cursor-pointer"
              >
                焦点任务
              </button>
              <button
                type="button"
                onClick={() => selectedDeskName && onNavigate?.('departments', selectedDeskName)}
                disabled={!selectedDeskName}
                className="flex-1 text-[10px] px-3 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] bg-[var(--bg-soft)] disabled:opacity-40 cursor-pointer"
              >
                焦点机构
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-hero text-white">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs tracking-[0.3em] text-white/60">Office / Operations Floor</div>
              <h2 className="mt-1 text-2xl font-semibold">{PRODUCT_NAME} 办公大厅</h2>
              <p className="mt-1 text-sm text-white/70">
                办公大厅把像素办公室、机构席位与实时后台数据合并为同一套运营视图，用同一机构名称、状态词和任务计量来驱动展示。
                {onNavigate && " 点击右侧排行或下方机构卡片可直接进入对应会话任务/机构席位。"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
                <div className="text-white/60">执行中席位</div>
                <div className="mt-1 font-mono text-lg">{onlineCount}/{sortedBots.length}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
                <div className="text-white/60">会话任务</div>
                <div className="mt-1 font-mono text-lg">{totalSessions}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
                <div className="text-white/60">累计 Token</div>
                <div className="mt-1 font-mono text-lg">{formatCompactNumber(totalTokens)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-[1.35fr_0.75fr]">
          <div className="rounded-2xl border border-white/10 bg-[#08101b] p-3">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/55">
              <span>联邦办公大厅画布</span>
              <span>{ready ? "已联动运行" : "初始化中"}</span>
            </div>
            <div
              ref={shellRef}
              className="relative h-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#050b14]"
              style={{ imageRendering: "pixelated" }}
            >
              <canvas ref={canvasRef} className="block h-full w-full" />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm text-white/70">
                  正在加载像素办公室资源...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {selectedDesk && selectedDeskOperational && selectedDeskTone && selectedDeskWorkflow && selectedDeskWorkflowTone && (
              <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/55">当前焦点席位</div>
                <div className="mt-3 rounded-xl border border-white/8 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-medium text-white">{selectedDeskName}</div>
                      <div className="mt-1 text-[11px] text-white/55">{selectedDesk.model || '未分配模型'}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] ${selectedDeskTone.pill}`}>{selectedDeskOperational.label}</span>
                      <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] ${selectedDeskWorkflowTone.pill}`}>{selectedDeskWorkflow.label}</span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/70">
                    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                      <div className="text-white/45">承办位置</div>
                      <div className="mt-1">{selectedDeskWorkflow.deskHint}</div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                      <div className="text-white/45">下一步</div>
                      <div className="mt-1">{selectedDeskWorkflow.nextStep}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('sessions', selectedDeskName)}
                      className="text-[10px] px-2.5 py-1 rounded border border-white/15 text-white/75 hover:bg-white/8 cursor-pointer"
                    >
                      查看该席位任务
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('departments', selectedDeskName)}
                      className="text-[10px] px-2.5 py-1 rounded border border-white/15 text-white/75 hover:bg-white/8 cursor-pointer"
                    >
                      查看机构详情
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/55">机构席位活跃排行</div>
              <div className="mt-3 space-y-2">
                {sortedBots.slice(0, 6).map((bot, idx) => {
                  const op = getOperationalStatus(bot.status, bot.sessions)
                  const tone = getToneClasses(op.tone)
                  const displayName = getAgentDisplayName(bot.name, bot.displayName)
                  return (
                    <button
                      type="button"
                      key={bot.name}
                      className="w-full flex items-center justify-between rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-sm text-left hover:bg-white/8 cursor-pointer"
                      onClick={() => setSelectedDeskId(bot.name)}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-white">#{idx + 1} {displayName}</div>
                        <div className="truncate text-[11px] text-white/55">{bot.model || "未分配模型"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-white/85">{formatCompactNumber(bot.totalTokens)}</div>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] ${tone.pill}`}>{op.label}</span>
                          <span className="text-[10px] text-white/45">{bot.sessions} 任务</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
                {sortedBots.length === 0 && (
                  <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-3 text-sm text-white/55">
                    暂无可展示的代理席位数据。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${panelClass} rounded-2xl p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">机构席位面板</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              这里展示与 Dashboard、Departments、Sessions 共用的席位数据；办公大厅中的角色活动由同一批机构状态同步驱动。
            </p>
          </div>
          {loading && <div className="text-xs text-[var(--text-secondary)]">刷新中...</div>}
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedBots.length === 0 && (
            <div className="rounded-xl border border-[var(--border-accent)] bg-black/5 p-4 text-sm text-[var(--text-secondary)] md:col-span-2 xl:col-span-3">
              当前筛选条件下暂无机构席位数据。
            </div>
          )}
          {sortedBots.map((bot) => {
            const op = getOperationalStatus(bot.status, bot.sessions)
            const tone = getToneClasses(op.tone)
            const displayName = getAgentDisplayName(bot.name, bot.displayName)
            const workflow = getWorkflowStage(Date.now() - (bot.sessions > 0 ? 10 * 60 * 1000 : 8 * 60 * 60 * 1000), bot.sessions)
            const workflowTone = getWorkflowToneClasses(workflow.tone)
            return (
              <div key={bot.name} className={`rounded-xl border p-3 ${selectedDeskId === bot.name ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40' : 'border-[var(--border-accent)] bg-black/5'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{displayName}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{bot.model || "未分配模型"}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone.pill}`}>
                    {op.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>{bot.sessions} 项任务</span>
                  <span className="font-mono text-[var(--text-primary)]">{formatCompactNumber(bot.totalTokens)}</span>
                </div>
                <div className="mt-1 text-[10px] text-[var(--text-secondary)]">{op.description}</div>
                <div className={`mt-1 text-[10px] ${workflowTone.text}`}>⛓ {workflow.deskHint}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDeskId(bot.name)}
                    className="text-[10px] px-2 py-1 rounded border border-[#d4a574]/20 text-[#d4a574]/80 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    设为焦点席位
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('sessions', displayName)}
                    className="text-[10px] px-2 py-1 rounded border border-[#d4a574]/20 text-[#d4a574]/80 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    查看该机构任务
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('departments', displayName)}
                    className="text-[10px] px-2 py-1 rounded border border-[#d4a574]/20 text-[#d4a574]/80 hover:bg-[#d4a574]/5 cursor-pointer"
                  >
                    查看机构席位
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
