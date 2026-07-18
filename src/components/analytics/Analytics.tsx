import { subDays, startOfYear } from 'date-fns'
import type { ReactNode } from 'react'
import { useStore } from '../../store'
import { eachDay } from '../../lib/date'
import {
  dailyCompletionSeries,
  weeklyAverages,
  monthlyAverages,
  categoryBreakdown,
  insights,
} from '../../lib/stats'
import { GlassCard } from '../ui/GlassCard'
import { LineChart } from '../charts/LineChart'
import { BarChart } from '../charts/BarChart'
import { Heatmap } from '../charts/Heatmap'
import { Sparkles, TrendingUp, BarChart3, CalendarRange, Layers, Flame } from 'lucide-react'

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </GlassCard>
  )
}

export function Analytics() {
  const habits = useStore((s) => s.habits)
  const entries = useStore((s) => s.entries)
  const weekStart = useStore((s) => s.settings.weekStart)

  const today = new Date()
  const last30 = eachDay(subDays(today, 29), today)
  const trend = dailyCompletionSeries(habits, entries, last30)
  const weekly = weeklyAverages(habits, entries, 12, weekStart)
  const monthly = monthlyAverages(habits, entries, 12)
  const categories = categoryBreakdown(habits, entries)
  const ins = insights(habits, entries, weekStart)

  const yearStart = startOfYear(today)
  const dailyValue = (key: string) => {
    const active = habits.filter((h) => !h.archived && h.createdAt <= key)
    if (!active.length) return 0
    const done = active.filter((h) => entries.some((e) => e.habitId === h.id && e.date === key && e.completed)).length
    return Math.round((done / active.length) * 100)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Daily Completion Trend" description="Last 30 days, all habits" icon={<TrendingUp size={16} />}>
          <LineChart data={trend} />
        </Panel>

        <Panel title="Weekly Average" description="Last 12 weeks" icon={<BarChart3 size={16} />}>
          <BarChart data={weekly} />
        </Panel>

        <Panel title="Monthly Trend" description="Last 12 months" icon={<TrendingUp size={16} />}>
          <LineChart data={monthly.map((m) => m.value)} />
        </Panel>

        <Panel title="Year Overview" description="Completion per month" icon={<CalendarRange size={16} />}>
          <BarChart data={monthly} />
        </Panel>
      </div>

      <Panel title="Heatmap" description="Every day this year — darker means higher completion" icon={<Flame size={16} />}>
        <Heatmap from={yearStart} to={today} getValue={dailyValue} weekStart={weekStart} color="#818cf8" size={13} />
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          Less
          <span className="h-3 w-3 rounded-[3px] bg-surface-2/60 border border-border/10" />
          <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: '#818cf8', opacity: 0.35 }} />
          <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: '#818cf8', opacity: 0.7 }} />
          <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: '#818cf8' }} />
          More
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Category Breakdown" description="Lifetime completion by category" icon={<Layers size={16} />}>
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.category}</span>
                  <span className="text-muted">{c.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2/70">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${c.value}%`, opacity: 0.4 + 0.6 * (c.value / 100) }}
                  />
                </div>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-muted">No categories yet.</p>}
          </div>
        </Panel>

        <Panel title="Insights" description="Quiet observations, no motivation" icon={<Sparkles size={16} />}>
          <ul className="space-y-2.5">
            {ins.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-fg/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {line}
              </li>
            ))}
            {ins.length === 0 && <li className="text-sm text-muted">Log more habits to surface patterns.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
