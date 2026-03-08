export const PRODUCT_NAME = "白宫 AI 办公局"

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export type OperationalTone = "online" | "idle" | "offline"

export function getOperationalStatus(botStatus?: string, sessions = 0): {
  label: string
  tone: OperationalTone
  description: string
} {
  if (botStatus !== "online") {
    return { label: "离线", tone: "offline", description: "当前未在办公大厅执勤" }
  }
  if (sessions > 0) {
    return { label: "执行中", tone: "online", description: "正在处理会话与指令" }
  }
  return { label: "待命", tone: "idle", description: "已在线，等待新的任务" }
}

export function getSessionLifecycleStatus(updatedAt: number): {
  label: string
  tone: OperationalTone
} {
  const diff = Date.now() - updatedAt
  if (diff < 3600000) return { label: "执行中", tone: "online" }
  if (diff < 86400000) return { label: "待命", tone: "idle" }
  return { label: "归档", tone: "offline" }
}

export function getToneClasses(tone: OperationalTone) {
  switch (tone) {
    case "online":
      return {
        dot: "bg-green-500",
        pill: "bg-green-500/20 text-green-400 border-green-500/30",
        text: "text-green-400",
      }
    case "idle":
      return {
        dot: "bg-yellow-500",
        pill: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        text: "text-yellow-400",
      }
    default:
      return {
        dot: "bg-gray-500",
        pill: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        text: "text-gray-400",
      }
  }
}

export type WorkflowStageTone = "info" | "online" | "idle" | "offline"

export function getWorkflowStage(updatedAt: number, messageCount = 0): {
  label: string
  description: string
  tone: WorkflowStageTone
  deskHint: string
  nextStep: string
} {
  const diff = Date.now() - updatedAt

  if (messageCount <= 1) {
    return {
      label: "指令进入",
      description: "事项刚进入系统，等待分派或补充上下文。",
      tone: "info",
      deskHint: "前台收件 / 路由分派",
      nextStep: "确认主责机构并进入承办",
    }
  }

  if (diff < 30 * 60 * 1000) {
    return {
      label: "承办处理中",
      description: "当前有机构席位正在处理、协调或回复。",
      tone: "online",
      deskHint: "主责承办 / 协同处理",
      nextStep: "形成阶段结果并进入复核",
    }
  }

  if (diff < 6 * 60 * 60 * 1000) {
    return {
      label: "待复核 / 待续办",
      description: "本轮已有处理结果，可能等待复核、回退或下一岗位接力。",
      tone: "idle",
      deskHint: "复核签发 / 续办接力",
      nextStep: "决定结案、回退或转交下一机构",
    }
  }

  return {
    label: "归档留痕",
    description: "事项已进入历史区，作为后续追踪与审计记录保留。",
    tone: "offline",
    deskHint: "归档审计 / 历史留痕",
    nextStep: "按需复盘或再次唤起事项",
  }
}

export function getWorkflowToneClasses(tone: WorkflowStageTone) {
  switch (tone) {
    case "info":
      return {
        dot: "bg-blue-500",
        pill: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        text: "text-blue-400",
      }
    case "online":
      return {
        dot: "bg-green-500",
        pill: "bg-green-500/20 text-green-400 border-green-500/30",
        text: "text-green-400",
      }
    case "idle":
      return {
        dot: "bg-yellow-500",
        pill: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        text: "text-yellow-400",
      }
    default:
      return {
        dot: "bg-gray-500",
        pill: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        text: "text-gray-400",
      }
  }
}

export function formatChannelLabel(channel?: string | null) {
  const value = String(channel || "")
  if (!value) return "未标注渠道"
  const map: Record<string, string> = {
    telegram: "Telegram",
    discord: "Discord",
    signal: "Signal",
    whatsapp: "WhatsApp",
    slack: "Slack",
    webchat: "Web Chat",
    imessage: "iMessage",
    googlechat: "Google Chat",
    irc: "IRC",
  }
  return map[value.toLowerCase()] || value
}
