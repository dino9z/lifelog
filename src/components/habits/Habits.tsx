import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../store'
import { fromKey, periodRange } from '../../lib/date'
import { completionRate } from '../../lib/stats'
import { ICONS } from '../../lib/constants'
import type { Habit, Period } from '../../types'
import { DayGrid } from './DayGrid'
import { HabitDetails } from './HabitDetails'
import { Button } from '../ui/Button'
import { SlideOver } from '../ui/SlideOver'
import { cn } from '../../lib/cn'

const PERIODS: Period[] = ['week', 'month', 'quarter', 'year']
const GRID_SIZE: Record<Period, number> = { week: 16, month: 14, quarter: 12, year: 10 }

interface HabitsProps {
  onAddHabit: () => void
  onEditHabit: (h: Habit) => void
}

export function Habits({ onAddHabit, onEditHabit }: HabitsProps) {
  const habits = useStore(useShallow((s) => s.habits.filter((h) => !h.archived)))
  const entries = useStore((s) => s.entries)
  const weekStart = useStore((s) => s.settings.weekStart)
  const categories = useStore((s) => s.settings.categories)
  const deleteHabit = useStore((s) => s.deleteHabit)

  const [period, setPeriod] = useState<Period>('month')
  const [filter, setFilter] = useState<string>('All')
  const [selected, setSelected] = useState<Habit | null>(null)

  const visibleHabits = filter === 'All' ? habits : habits.filter((h) => h.category === filter)

  const stats = useMemo(() => {
    const today = new Date()
    const { start: ws, end: we } = periodRange('week', weekStart)
    const { start: ms, end: me } = periodRange('month', weekStart)
    const { start: ys, end: ye } = periodRange('year', weekStart)
    const map = new Map<string, { day: number; week: number; month: number; year: number; life: number }>()
    for (const h of habits) {
      map.set(h.id, {
        day: completionRate(h, entries, today, today),
        week: completionRate(h, entries, ws, we),
        month: completionRate(h, entries, ms, me),
        year: completionRate(h, entries, ys, ye),
        life: completionRate(h, entries, fromKey(h.createdAt), today),
      })
    }
    return map
  }, [habits, entries, weekStart])

  const openNew = () => onAddHabit()
  const openEdit = (h: Habit) => {
    setSelected(null)
    onEditHabit(h)
  }
  const handleDelete = (h: Habit) => {
    if (confirm(`Delete "${h.name}"? This removes all its history.`)) {
      deleteHabit(h.id)
      setSelected(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-border/10 bg-surface-2/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
                period === p ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={openNew}>
          <Plus size={16} /> New habit
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All', ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === c ? 'bg-accent/15 text-accent' : 'bg-surface-2/60 text-muted hover:text-fg',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleHabits.map((h) => {
          const Icon = ICONS[h.icon]
          const s = stats.get(h.id)!
          const pills: [string, number][] = [
            ['Day', s.day],
            ['Week', s.week],
            ['Month', s.month],
            ['Year', s.year],
            ['Life', s.life],
          ]
          return (
            <div
              key={h.id}
              className="glass group flex cursor-pointer flex-col rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5"
              onClick={() => setSelected(h)}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${h.color}22`, color: h.color }}
                >
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{h.name}</div>
                  <div className="text-xs text-muted">{h.category}</div>
                </div>
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(h)
                    }}
                    className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(h)
                    }}
                    className="rounded-lg p-1.5 text-muted hover:bg-rose-500/15 hover:text-rose-300"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                <DayGrid habit={h} period={period} weekStart={weekStart} size={GRID_SIZE[period]} />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {pills.map(([label, value]) => (
                  <span key={label} className="pill bg-surface-2/70 text-muted">
                    <span className="text-fg/90">{value}%</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {visibleHabits.length === 0 && (
          <div className="glass col-span-full rounded-2xl p-10 text-center text-muted">
            No habits yet. Create your first one to start logging.
          </div>
        )}
      </div>

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Habit</span>
              <span className="font-semibold">{selected.name}</span>
            </div>
          )
        }
      >
        {selected && (
          <HabitDetails
            habit={selected}
            weekStart={weekStart}
            onEdit={() => openEdit(selected)}
            onDelete={() => handleDelete(selected)}
          />
        )}
      </SlideOver>
    </div>
  )
}
