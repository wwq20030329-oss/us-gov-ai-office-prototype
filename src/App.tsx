import { useState } from "react"
import type { MainViewContext, TabName } from "./types"
import { PRODUCT_NAME } from "./utils/officeSemantics"
import { useStatus } from "./hooks/useStatus"
import { useTheme } from "./theme"
import { GovOfficeLogo } from "./components/Logo"
import { NavIcon } from "./components/NavIcons"
import Dashboard from "./pages/Dashboard"
import Departments from "./pages/Departments"
import TokenStats from "./pages/TokenStats"
import MessageLogs from "./pages/MessageLogs"
import SystemHealth from "./pages/SystemHealth"
import Sessions from "./pages/Sessions"
import Settings from "./pages/Settings"
import SituationRoom from "./pages/SituationRoom"
import Office from "./pages/Office"
import Login from "./pages/Login"
import Channels from "./pages/Channels"
import MemorialHall from "./pages/MemorialHall"
import Nodes from "./pages/Nodes"
import NotionBoard from "./pages/NotionBoard"
import Search from "./pages/Search"
import CronJobs from "./pages/CronJobs"

const tabs: { key: TabName; label: string; icon: Parameters<typeof NavIcon>[0]["name"] }[] = [
  { key: "dashboard", label: "总览", icon: "dashboard" },
  { key: "court", label: "战情指挥", icon: "command" },
  { key: "office", label: "办公大厅", icon: "office" },
  { key: "departments", label: "机构席位", icon: "agencies" },
  { key: "tokens", label: "令牌统计", icon: "tokens" },
  { key: "sessions", label: "会话任务", icon: "sessions" },
  { key: "channels", label: "通信频道", icon: "channels" },
  { key: "nodes", label: "节点", icon: "nodes" },
  { key: "notion", label: "简报板", icon: "briefing" },
  { key: "memorial", label: "待办与报告", icon: "reports" },
  { key: "logs", label: "日志", icon: "logs" },
  { key: "search", label: "搜索", icon: "search" },
  { key: "cron", label: "定时", icon: "cron" },
  { key: "system", label: "系统态势", icon: "system" },
  { key: "settings", label: "设置", icon: "settings" },
]

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('gov_ai_auth_token')
  })
  const [activeTab, setActiveTab] = useState<TabName>("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionFilter, setSessionFilter] = useState<string | undefined>(undefined)
  const [viewContext, setViewContext] = useState<MainViewContext>({})
  const { theme, toggle: toggleTheme } = useTheme()
  const { data, loading, error, lastUpdated, refresh } = useStatus()

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  const handleNavigate = (tab: TabName, filter?: string, focusLabel?: string) => {
    setActiveTab(tab)
    if (tab === "sessions") {
      setSessionFilter(filter)
    }
    setViewContext({ focusLabel, focusFilter: filter })
    setSidebarOpen(false)
  }

  const renderPage = () => {
    if (loading && !data) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-[#d4a574] text-lg animate-pulse">加载中...</div>
        </div>
      )
    }
    if (error && !data) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-[#ef4444] text-lg mb-2">连接失败</div>
            <div className="text-[#a3a3a3] text-sm mb-4">{error}</div>
            <button onClick={refresh} className="px-4 py-2 bg-[#1a1a2e] text-[#d4a574] border border-[#d4a574] hover:bg-[#16213e] cursor-pointer">
              重试
            </button>
          </div>
        </div>
      )
    }
    if (!data) return null
    switch (activeTab) {
      case "dashboard": return <Dashboard data={data} onNavigate={(tab, filter) => handleNavigate(tab as TabName, filter, filter ? `机构：${filter}` : '全局总览')} />
      case "court": return <SituationRoom />
      case "office": return <Office viewContext={viewContext} onNavigate={(tab, filter) => handleNavigate(tab, filter, filter ? `机构：${filter}` : '办公大厅')} />
      case "departments": return <Departments data={data} viewContext={viewContext} onNavigate={(tab, filter) => handleNavigate(tab, filter, filter ? `机构：${filter}` : '机构席位')} />
      case "tokens": return <TokenStats data={data} />
      case "sessions": return <Sessions initialFilter={sessionFilter} viewContext={viewContext} onNavigate={(tab, filter) => handleNavigate(tab, filter, filter ? `机构：${filter}` : '会话任务')} />
      case "channels": return <Channels />
      case "nodes": return <Nodes />
      case "notion": return <NotionBoard />
      case "memorial": return <MemorialHall />
      case "logs": return <MessageLogs data={data} />
      case "search": return <Search />
      case "cron": return <CronJobs />
      case "system": return <SystemHealth data={data} />
      case "settings": return <Settings />
    }
  }

  return (
    <div className="app-shell min-h-screen md:flex" style={{ color: 'var(--text-primary)' }}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-[17.5rem] transform transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col border-r px-4 py-5 backdrop-blur-xl" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}>
          <div className="surface-card mb-4 p-4">
            <div className="flex items-center gap-3">
              <div className="logo-glow rounded-2xl border p-2" style={{ borderColor: 'var(--border-accent)', backgroundColor: 'var(--accent-soft)' }}>
                <GovOfficeLogo size={34} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-accent-gradient tracking-[0.03em]">{PRODUCT_NAME}</div>
                <div className="mt-1 text-[10px] tracking-[0.24em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  Federal AI Operations Console
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="surface-card-soft px-3 py-2">
                <div style={{ color: 'var(--text-tertiary)' }}>运行时长</div>
                <div className="mt-1 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{data?.uptime || '--'}</div>
              </div>
              <div className="surface-card-soft px-3 py-2">
                <div style={{ color: 'var(--text-tertiary)' }}>当前视图</div>
                <div className="mt-1 truncate text-sm" style={{ color: 'var(--accent)' }}>{tabs.find(tab => tab.key === activeTab)?.label}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => handleNavigate(tab.key, undefined, tab.label)}
                  className={`nav-item ${active ? 'nav-active' : ''} w-full px-4 py-3 text-sm transition-all cursor-pointer`}
                  style={{
                    backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: active ? 'var(--border-accent)' : 'var(--border-subtle)', backgroundColor: active ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                      <NavIcon name={tab.icon} size={18} className="shrink-0" />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate font-medium">{tab.label}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                        {tab.key}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>

          <div className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={refresh} className="surface-card-soft flex items-center justify-center gap-1.5 py-2 text-xs cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }} title="刷新"><NavIcon name="refresh" size={14} />刷新</button>
              <button onClick={toggleTheme} className="surface-card-soft flex items-center justify-center gap-1.5 py-2 text-xs cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <NavIcon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
                {theme === 'dark' ? '浅色' : '深色'}
              </button>
            </div>
            <button
              onClick={() => { localStorage.removeItem('gov_ai_auth_token'); setIsLoggedIn(false) }}
              className="surface-card-soft w-full py-2 text-xs cursor-pointer transition-colors hover:text-red-400"
              style={{ color: 'var(--text-secondary)' }}
            >
              退出登录
            </button>
            {lastUpdated && (
              <div className="px-1 text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                上次刷新 {lastUpdated.toLocaleTimeString('zh-CN')}
              </div>
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/55 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 min-h-screen">
        <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 76%, transparent)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border md:hidden cursor-pointer" style={{ color: 'var(--accent)', borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-soft)' }}><NavIcon name="menu" size={20} /></button>
              <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-soft)' }}>
                <GovOfficeLogo size={22} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tabs.find(tab => tab.key === activeTab)?.label}</div>
                <div className="truncate text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-tertiary)' }}>Unified operations workspace</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-soft)', color: 'var(--text-secondary)' }}>
                <span className="h-2 w-2 rounded-full pulse-online" style={{ backgroundColor: data ? 'var(--success)' : 'var(--warning)' }} />
                <span>{data ? '状态已接入' : '等待数据'}</span>
              </div>
              <button onClick={refresh} className="flex h-10 w-10 items-center justify-center rounded-xl border cursor-pointer" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-soft)' }}><NavIcon name="refresh" size={18} /></button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          {error && data && (
            <div className="mb-4 rounded-2xl border px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.28)', color: 'var(--danger)' }}>{error}</div>
          )}
          <div key={activeTab} className="animate-slideIn">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
