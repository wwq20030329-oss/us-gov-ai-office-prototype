import type { ReactNode } from "react"

type IconName =
  | "dashboard"
  | "command"
  | "office"
  | "agencies"
  | "tokens"
  | "sessions"
  | "channels"
  | "nodes"
  | "briefing"
  | "reports"
  | "logs"
  | "search"
  | "cron"
  | "system"
  | "settings"
  | "refresh"
  | "menu"
  | "sun"
  | "moon"

function IconBase({ size = 18, children, className = "" }: { size?: number; children: ReactNode; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function NavIcon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  switch (name) {
    case "dashboard":
      return <IconBase size={size} className={className}><path d="M4 13h6v7H4z" /><path d="M14 4h6v16h-6z" /><path d="M4 4h6v5H4z" /></IconBase>
    case "command":
      return <IconBase size={size} className={className}><path d="M12 3l7 4v5c0 4.6-3.1 7.9-7 9-3.9-1.1-7-4.4-7-9V7l7-4z" /><path d="M9 12l2 2 4-4" /></IconBase>
    case "office":
      return <IconBase size={size} className={className}><path d="M4 21V5l8-2v18" /><path d="M12 21h8V9l-8-2" /><path d="M7 9h2" /><path d="M7 13h2" /><path d="M15 13h2" /><path d="M15 17h2" /></IconBase>
    case "agencies":
      return <IconBase size={size} className={className}><path d="M3 21h18" /><path d="M5 21V9l7-4 7 4v12" /><path d="M9 13h6" /><path d="M9 17h6" /></IconBase>
    case "tokens":
      return <IconBase size={size} className={className}><path d="M12 3l2.4 4.9L20 9l-4 3.9.9 5.6L12 16l-4.9 2.5.9-5.6L4 9l5.6-1.1L12 3z" /></IconBase>
    case "sessions":
      return <IconBase size={size} className={className}><path d="M7 10h10" /><path d="M7 14h6" /><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></IconBase>
    case "channels":
      return <IconBase size={size} className={className}><path d="M4 12a8 8 0 0 1 8-8" /><path d="M20 12a8 8 0 0 0-8-8" /><path d="M7 12a5 5 0 0 1 5-5" /><path d="M17 12a5 5 0 0 0-5-5" /><circle cx="12" cy="12" r="1.5" /></IconBase>
    case "nodes":
      return <IconBase size={size} className={className}><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01" /><path d="M7 17h.01" /><path d="M17 7h2" /><path d="M17 17h2" /></IconBase>
    case "briefing":
      return <IconBase size={size} className={className}><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v3h3" /><path d="M9 11h6" /><path d="M9 15h6" /></IconBase>
    case "reports":
      return <IconBase size={size} className={className}><path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4" /><path d="M9 13h6" /><path d="M9 17h4" /></IconBase>
    case "logs":
      return <IconBase size={size} className={className}><path d="M8 6h10" /><path d="M8 12h10" /><path d="M8 18h10" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></IconBase>
    case "search":
      return <IconBase size={size} className={className}><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></IconBase>
    case "cron":
      return <IconBase size={size} className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></IconBase>
    case "system":
      return <IconBase size={size} className={className}><path d="M12 3v3" /><path d="M12 18v3" /><path d="M3 12h3" /><path d="M18 12h3" /><path d="m5.6 5.6 2.1 2.1" /><path d="m16.3 16.3 2.1 2.1" /><path d="m18.4 5.6-2.1 2.1" /><path d="m7.7 16.3-2.1 2.1" /><circle cx="12" cy="12" r="3.5" /></IconBase>
    case "settings":
      return <IconBase size={size} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.7 1.7 0 1 1-3.4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1A1 1 0 0 0 8 15.7a1 1 0 0 0-.9-.6H7a1.7 1.7 0 1 1 0-3.4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V7a1.7 1.7 0 1 1 3.4 0v.1a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6h.1a1.7 1.7 0 1 1 0 3.4h-.1a1 1 0 0 0-.9.6z" /></IconBase>
    case "refresh":
      return <IconBase size={size} className={className}><path d="M20 11a8 8 0 1 0 2 5.3" /><path d="M20 4v7h-7" /></IconBase>
    case "menu":
      return <IconBase size={size} className={className}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></IconBase>
    case "sun":
      return <IconBase size={size} className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5" /><path d="M12 19.5V22" /><path d="m4.9 4.9 1.8 1.8" /><path d="m17.3 17.3 1.8 1.8" /><path d="M2 12h2.5" /><path d="M19.5 12H22" /><path d="m4.9 19.1 1.8-1.8" /><path d="m17.3 6.7 1.8-1.8" /></IconBase>
    case "moon":
      return <IconBase size={size} className={className}><path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></IconBase>
  }
}
