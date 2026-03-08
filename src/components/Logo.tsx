/**
 * 白宫 AI 办公局 logo
 * 联邦盾徽 / 五角星标记。
 */
export function GovOfficeLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="shield" x1="10" y1="8" x2="54" y2="56">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="crest" x1="16" y1="16" x2="48" y2="48">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <path d="M32 6L52 14V31C52 43 43.5 53.2 32 58C20.5 53.2 12 43 12 31V14L32 6Z" fill="url(#shield)" stroke="#dbeafe" strokeWidth="2" />
      <path d="M32 15L40.2 28.8L55.5 32L45 42.4L46.6 57.2L32 50.4L17.4 57.2L19 42.4L8.5 32L23.8 28.8L32 15Z" fill="url(#crest)" opacity="0.95" transform="scale(0.46) translate(37 34)" />
      <rect x="18" y="18" width="28" height="6" rx="3" fill="#ef4444" opacity="0.95" />
      <rect x="18" y="28" width="28" height="6" rx="3" fill="#f8fafc" opacity="0.98" />
      <rect x="18" y="38" width="28" height="6" rx="3" fill="#ef4444" opacity="0.95" />
      <circle cx="25" cy="31" r="6.5" fill="#1d4ed8" />
      <path d="M25 25.5L26.4 29.4L30.5 29.5L27.2 31.9L28.4 35.8L25 33.4L21.6 35.8L22.8 31.9L19.5 29.5L23.6 29.4L25 25.5Z" fill="#ffffff" />
    </svg>
  )
}

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <GovOfficeLogo size={36} />
      <div>
        <div className="text-lg font-bold text-accent-gradient tracking-wide">白宫 AI 办公局</div>
        <div className="text-[10px] text-[var(--text-tertiary)] tracking-widest uppercase">WHITE HOUSE AI OFFICE</div>
      </div>
    </div>
  )
}
