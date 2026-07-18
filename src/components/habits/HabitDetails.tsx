import { Pencil, Trash2, Flame, Trophy, Percent } from 'lucide-react'
import { format, startOfYear } from 'date-fns'
import type { ReactNode } from 'react'
import { useStore } from '../../store'
import { fromKey } from '../../lib/date'
import { currentStreak, longestStreak, completionRate, weeklyAverages, monthlyAverages, isDone } from '../../lib/stats'
import { ICONS } from '../../lib/constants'
import type { Habit } from '../../types'
import { LineChart } from '../charts/LineChart'
import { BarChart } from '../charts/BarChart'
import { Heatmap } from '../charts/Heatmap'
import { Button } from '../ui/Button'

interface HabitDetailsProps {
  habit: Habit
  weekStart: 0 | 1
  onEdit: () => void
  onDelete: () => void
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function GraphBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted">{title}</h3>
      <div className="glass rounded-2xl p-4">{children}</div>
    </div>
  )
}

export function HabitDetails({ habit, weekStart, onEdit, onDelete }: HabitDetailsProps) {
  const entries = useStore((s) => s.entries)
  const reflections = useStore((s) => s.reflections)
  const Icon = ICONS[habit.icon]
  const today = new Date()
  const cs = currentStreak(habit, entries)
  const ls = longestStreak(habit, entries)
  const life = completionRate(habit, entries, fromKey(habit.createdAt), today)

  const weekly = weeklyAverages([habit], entries, 12, weekStart)
  const monthly = monthlyAverages([habit], entries, 12)
  const yearStart = startOfYear(today)
  const habitDaily = (key: string) => (isDone(entries, habit.id, key) ? 100 : 0)

  const journal = [...reflections]
    .filter((r) => r.reflection && r.reflection.trim().length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        >
          <Icon size={24} />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{habit.name}</h2>
          <p className="text-sm text-muted">
            {habit.category} · since {habit.createdAt}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric icon={<Flame size={15} />} label="Current" value={`${cs}d`} />
        <Metric icon={<Trophy size={15} />} label="Longest" value={`${ls}d`} />
        <Metric icon={<Percent size={15} />} label="Lifetime" value={`${life}%`} />
      </div>

      <GraphBlock title="Weekly average · last 12 weeks">
        <BarChart data={weekly} color={habit.color} />
      </GraphBlock>

      <GraphBlock title="Monthly trend · last 12 months">
        <LineChart data={monthly.map((m) => m.value)} color={habit.color} />
      </GraphBlock>

      <GraphBlock title="This year">
        <Heatmap from={yearStart} to={today} getValue={habitDaily} weekStart={weekStart} color={habit.color} size={11} />
      </GraphBlock>

      <GraphBlock title={`Recent notes`}>
        {journal.length ? (
          <ul className="space-y-3">
            {journal.map((r) => (
              <li key={r.date} className="border-l-2 border-border/15 pl-3">
                <div className="text-xs text-muted">{format(new Date(r.date), 'PPP')}</div>
                <div className="mt-0.5 text-sm text-fg/90">{r.reflection}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No reflections logged yet.</p>
        )}
      </GraphBlock>

      <div className="flex gap-2 border-t border-border/10 pt-5">
        <Button variant="subtle" size="sm" onClick={onEdit} className="flex-1">
          <Pencil size={15} /> Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 size={15} /> Delete
        </Button>
      </div>
    </div>
  )
}
