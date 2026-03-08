import type { TabName } from "../types"

interface HeaderLink {
  label: string
  tab: TabName
  filter?: string
}

interface HeaderMetric {
  label: string
  value: string
  note?: string
}

interface Props {
  eyebrow: string
  title: string
  description: string
  focusLabel?: string
  links?: HeaderLink[]
  metrics?: HeaderMetric[]
  statusLabel?: string
  onNavigate?: (tab: TabName, filter?: string) => void
}

export default function MainViewHeader({
  eyebrow,
  title,
  description,
  focusLabel,
  links = [],
  metrics = [],
  statusLabel,
  onNavigate,
}: Props) {
  const hasAside = Boolean(focusLabel || links.length || metrics.length || statusLabel)

  return (
    <section className="surface-card mission-header p-4 sm:p-5 lg:p-6">
      <div className={`flex flex-col gap-5 ${hasAside ? 'xl:flex-row xl:items-end xl:justify-between' : ''}`}>
        <div className="min-w-0 flex-1">
          <div className="page-kicker">{eyebrow}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="page-title mt-0">{title}</h2>
            {statusLabel && <span className="mission-badge mission-badge-accent">{statusLabel}</span>}
            {focusLabel && <span className="mission-badge">当前焦点：{focusLabel}</span>}
          </div>
          <p className="page-desc">{description}</p>
        </div>

        {hasAside && (
          <div className="mission-header-aside xl:max-w-[34rem]">
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={`${metric.label}-${metric.value}`} className="mission-mini-stat">
                    <div className="mission-mini-label">{metric.label}</div>
                    <div className="mission-mini-value">{metric.value}</div>
                    {metric.note && <div className="mission-mini-note">{metric.note}</div>}
                  </div>
                ))}
              </div>
            )}

            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 xl:justify-end">
                {links.map((link) => (
                  <button
                    key={`${link.tab}-${link.label}-${link.filter || "all"}`}
                    onClick={() => onNavigate?.(link.tab, link.filter)}
                    className="mission-link-button"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
