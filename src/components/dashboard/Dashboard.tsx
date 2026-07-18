import { Flame, CheckCircle2, Activity, CalendarDays } from 'lucide-react'
import { useStore } from '../../store'
import { todayProgress, monthProgress, overallConsistency, currentStreak } from '../../lib/stats'
import { StatCard } from '../ui/StatCard'
import { TodayList } from './TodayList'
import { QuickReflection } from './QuickReflection'

export function Dashboard({ onAddHabit }: { onAddHabit: () => void }) {
  const habits = useStore((s) => s.habits)
  const entries = useStore((s) => s.entries)

  const tp = todayProgress(habits, entries)
  const mp = monthProgress(habits, entries)
  const consistency = overallConsistency(habits, entries)
  const bestStreak = habits
    .filter((h) => !h.archived)
    .reduce((m, h) => Math.max(m, currentStreak(h, entries)), 0)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Completion"
          value={`${tp.total ? Math.round((tp.done / tp.total) * 100) : 0}%`}
          sub={`${tp.done} of ${tp.total} habits`}
          icon={<CheckCircle2 size={18} />}
          accent
        />
        <StatCard
          label="Consistency"
          value={`${consistency}%`}
          sub="overall, all time"
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Current Streak"
          value={`${bestStreak} ${bestStreak === 1 ? 'Day' : 'Days'}`}
          sub="best active streak"
          icon={<Flame size={18} />}
        />
        <StatCard
          label="This Month"
          value={`${mp.done} / ${mp.total}`}
          sub="habits completed"
          icon={<CalendarDays size={18} />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TodayList onAdd={onAddHabit} />
        <QuickReflection />
      </section>
    </div>
  )
}
