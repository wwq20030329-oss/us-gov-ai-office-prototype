import { useState } from "react"
import { GovOfficeLogo } from "../components/Logo"

interface LoginProps {
  onLogin: (token: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('请输入访问令牌')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        localStorage.setItem('gov_ai_auth_token', token)
        onLogin(token)
      } else {
        setError('令牌验证失败，请检查后重试')
      }
    } catch {
      setError('网络错误，请稍后重试')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden p-4 relative text-white" style={{ background: 'radial-gradient(circle at top, rgba(59,130,246,0.22), transparent 28%), radial-gradient(circle at bottom, rgba(215,176,122,0.16), transparent 26%), #07111f' }}>
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.30),transparent_35%),radial-gradient(circle_at_bottom,rgba(239,68,68,0.18),transparent_32%)]" />

      <div className="relative w-full max-w-sm animate-fadeIn">
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl border border-white/15 bg-white/8 p-3 shadow-2xl backdrop-blur-md">
              <GovOfficeLogo size={56} />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-[0.12em]">白宫 AI 办公局</h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-blue-300/50" />
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">白宫 AI 办公局控制台</p>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-red-300/50" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/12 bg-white/7 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="mb-2.5 block text-xs uppercase tracking-[0.28em] text-white/65">
                访问令牌
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="请输入或粘贴网关令牌"
                className="w-full rounded-lg border border-white/15 bg-black/25 px-4 py-3 text-white placeholder-white/30 transition-all duration-200 focus:border-blue-300/60 focus:outline-none focus:shadow-[0_0_0_3px_rgba(147,197,253,0.12)]"
                autoFocus
              />
              {error && (
                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-red-300">
                  <span>⚠</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-400 to-red-400 py-3 font-semibold text-[#081120] shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '验证中...' : '进入控制台'}
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] tracking-wide text-white/45">
            仅限已授权操作员
          </p>
        </div>

        <p className="mt-8 text-center text-[10px] tracking-[0.28em] text-white/25">
          US GOV AI OFFICE © 2026
        </p>
      </div>
    </div>
  )
}
