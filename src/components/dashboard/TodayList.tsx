import { Check, Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../store'
import { todayKey } from '../../lib/date'
import { ICONS } from '../../lib/constants'
import { cn } from '../../lib/cn'
import { GlassCard } from '../ui/GlassCard'

interface TodayListProps {
  onAdd: () => void
}

export function TodayList({ onAdd }: TodayListProps) {
  const today = todayKey()
  const habits = useStore(
    useShallow((s) => s.habits.filter((h) => !h.archived && h.createdAt <= today)),
  )
  const entries = useStore((s) => s.entries)
  const toggleEntry = useStore((s) => s.toggleEntry)

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted">Today&apos;s Habits</h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {habits.map((h) => {
          const Icon = ICONS[h.icon]
          const done = entries.some((e) => e.habitId === h.id && e.date === today && e.completed)
          return (
            <li key={h.id}>
              <button
                onClick={() => toggleEntry(h.id, today)}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2/60"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${h.color}22`, color: h.color }}
                >
                  <Icon size={18} />
                </span>
                <span className={cn('flex-1 text-sm font-medium', done && 'text-muted line-through')}>
                  {h.name}
                </span>
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200',
                    done
                      ? 'border-transparent text-base'
                      : 'border-border/20 text-transparent group-hover:border-border/40',
                  )}
                  style={done ? { backgroundColor: h.color } : undefined}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              </button>
            </li>
          )
        })}
        {habits.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-muted">No habits yet. Add one to begin.</li>
        )}
      </ul>
    </GlassCard>
  )
}
