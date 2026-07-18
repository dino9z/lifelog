import { useMemo } from 'react'
import { useStore } from '../../store'
import { buildWeeks, periodRange, toKey, todayKey } from '../../lib/date'
import type { Habit, Period, WeekStart } from '../../types'
import { cn } from '../../lib/cn'

interface DayGridProps {
  habit: Habit
  period: Period
  weekStart: WeekStart
  size?: number
}

export function DayGrid({ habit, period, weekStart, size = 14 }: DayGridProps) {
  const entries = useStore((s) => s.entries)
  const toggleEntry = useStore((s) => s.toggleEntry)

  const doneKeys = useMemo(
    () => new Set(entries.filter((e) => e.habitId === habit.id && e.completed).map((e) => e.date)),
    [entries, habit.id],
  )

  const { start, end } = useMemo(() => periodRange(period, weekStart), [period, weekStart])
  const weeks = useMemo(() => buildWeeks(start, end, weekStart), [start, end, weekStart])

  const today = todayKey()
  const todayMid = new Date()
  todayMid.setHours(0, 0, 0, 0)

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map(({ date, inRange }) => {
            const key = toKey(date)
            if (!inRange) {
              return <span key={key} style={{ width: size, height: size }} className="opacity-0" />
            }
            const done = doneKeys.has(key)
            const isToday = key === today
            const isFuture = date.getTime() > todayMid.getTime()
            return (
              <button
                key={key}
                title={key}
                onClick={() => toggleEntry(habit.id, key)}
                style={done ? { width: size, height: size, backgroundColor: habit.color } : { width: size, height: size }}
                className={cn(
                  'shrink-0 rounded-[3px] transition-all duration-150',
                  done
                    ? 'hover:brightness-110'
                    : isFuture
                      ? 'border border-border/5 bg-surface-2/30'
                      : 'border border-border/15 bg-surface-2/60 hover:bg-surface-2',
                  isToday && 'ring-2 ring-accent/60 ring-offset-1 ring-offset-surface',
                )}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
