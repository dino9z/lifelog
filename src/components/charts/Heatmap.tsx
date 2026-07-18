import { useMemo } from 'react'
import { buildWeeks, toKey } from '../../lib/date'
import type { WeekStart } from '../../types'
import { cn } from '../../lib/cn'

interface HeatmapProps {
  from: Date
  to: Date
  getValue: (key: string) => number
  weekStart: WeekStart
  color?: string
  size?: number
  showMonthLabels?: boolean
}

export function Heatmap({
  from,
  to,
  getValue,
  weekStart,
  color = '#818cf8',
  size = 12,
  showMonthLabels = true,
}: HeatmapProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weeks = useMemo(() => buildWeeks(from, to, weekStart), [from, to, weekStart])

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex flex-col gap-1">
        {showMonthLabels && (
          <div className="flex gap-1 pl-[2px] text-[10px] text-muted/70">
            {weeks.map((w, i) => {
              const d = w[0].date
              const prev = i > 0 ? weeks[i - 1][0].date : null
              const label = !prev || d.getMonth() !== prev.getMonth() ? d.toLocaleString('en', { month: 'short' }) : ''
              return (
                <div key={i} style={{ width: size }} className="shrink-0">
                  {label}
                </div>
              )
            })}
          </div>
        )}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map(({ date, inRange }) => {
                const key = toKey(date)
                if (!inRange) return <span key={key} style={{ width: size, height: size }} className="opacity-0" />
                const v = getValue(key)
                const isFuture = date.getTime() > today.getTime()
                return (
                  <span
                    key={key}
                    title={`${key}: ${v}%`}
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: v > 0 ? color : undefined,
                      opacity: isFuture ? 0.12 : v > 0 ? 0.18 + 0.82 * (v / 100) : undefined,
                    }}
                    className={cn('rounded-[3px]', v === 0 && !isFuture && 'bg-surface-2/60 border border-border/10')}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
