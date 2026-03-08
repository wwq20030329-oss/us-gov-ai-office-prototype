import type { BotAccount } from "../types"

const STALE_AGENT_IDS = new Set([
  "people-officials",
  "emperor",
  "queen",
  "司礼监",
  "silijian",
  "sili-jian",
])

const AGENT_NAME_MAP: Record<string, string> = {
  main: "白宫办公厅",
  "claude-code": "Claude 研发助理",
  "dev-agent": "技术实施办公室",
  "xhs-agent": "小红书运营助理",
  gongbu: "基础设施协调署",
  hubu: "财政管理办公室",
  libu: "人事与组织办公室",
  xingbu: "司法与合规办公室",
  bingbu: "国防协调办公室",
  libu2: "公共事务办公室",
  neige: "总统执行办公室",
  duchayuan: "监察与审计办公室",
  neiwufu: "行政管理办公室",
  hanlinyuan: "政策研究室",
  taiyiyuan: "健康服务办公室",
  guozijian: "培训与知识中心",
  yushanfang: "后勤保障中心",
}

function normalizeKey(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

export function isStaleAgentName(value?: string | null) {
  const raw = String(value || "").trim()
  const key = normalizeKey(value)
  if (!raw) return true
  if (STALE_AGENT_IDS.has(raw) || STALE_AGENT_IDS.has(key)) return true
  if (raw.includes("司礼监")) return true
  if (key.includes("people-officials") || key.includes("emperor") || key.includes("silijian")) return true
  return false
}

export function getAgentDisplayName(name?: string | null, displayName?: string | null) {
  const normalizedName = normalizeKey(name)
  const normalizedDisplayName = normalizeKey(displayName)

  if (normalizedDisplayName && AGENT_NAME_MAP[normalizedDisplayName]) {
    return AGENT_NAME_MAP[normalizedDisplayName]
  }
  if (normalizedName && AGENT_NAME_MAP[normalizedName]) {
    return AGENT_NAME_MAP[normalizedName]
  }
  if (!isStaleAgentName(displayName)) return String(displayName)
  if (!isStaleAgentName(name)) return String(name)
  return "历史归档机构"
}

export function filterVisibleBots(bots: BotAccount[]) {
  return bots
    .filter((bot) => !isStaleAgentName(bot.name) && !isStaleAgentName(bot.displayName))
    .map((bot) => ({
      ...bot,
      displayName: getAgentDisplayName(bot.name, bot.displayName),
    }))
}

export function filterVisibleNames<T>(items: T[], pickName: (item: T) => string | null | undefined) {
  return items.filter((item) => !isStaleAgentName(pickName(item)))
}

export function mapAgentLabel(value?: string | null) {
  return getAgentDisplayName(value, value)
}
