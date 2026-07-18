import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { todayKey } from '../../lib/date'
import { ICONS, ICON_OPTIONS, PALETTE } from '../../lib/constants'
import type { Habit, IconKey } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

interface HabitFormProps {
  open: boolean
  onClose: () => void
  habit?: Habit | null
}

export function HabitForm({ open, onClose, habit }: HabitFormProps) {
  const addHabit = useStore((s) => s.addHabit)
  const updateHabit = useStore((s) => s.updateHabit)
  const categories = useStore((s) => s.settings.categories)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState<IconKey>('sparkles')
  const [color, setColor] = useState(PALETTE[0].value)
  const [category, setCategory] = useState(categories[0] ?? 'Personal')
  const [createdAt, setCreatedAt] = useState(todayKey())

  useEffect(() => {
    if (!open) return
    if (habit) {
      setName(habit.name)
      setIcon(habit.icon)
      setColor(habit.color)
      setCategory(habit.category)
      setCreatedAt(habit.createdAt)
    } else {
      setName('')
      setIcon('sparkles')
      setColor(PALETTE[0].value)
      setCategory(categories[0] ?? 'Personal')
      setCreatedAt(todayKey())
    }
  }, [open, habit, categories])

  const submit = () => {
    if (!name.trim()) return
    if (habit) {
      updateHabit({ ...habit, name: name.trim(), icon, color, category, createdAt })
    } else {
      addHabit({ name: name.trim(), icon, color, category, createdAt })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning run"
            className="w-full rounded-xl border border-border/10 bg-surface-2/50 px-3 py-2.5 text-sm text-fg placeholder:text-muted/60 focus:border-accent/40"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Icon</label>
          <div className="grid grid-cols-8 gap-1.5">
            {ICON_OPTIONS.map((key) => {
              const Icon = ICONS[key]
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setIcon(key)}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-lg border transition-colors',
                    icon === key
                      ? 'border-accent/50 bg-accent/15 text-accent'
                      : 'border-border/10 text-muted hover:bg-surface-2',
                  )}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Color</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setColor(p.value)}
                title={p.name}
                className={cn(
                  'h-7 w-7 rounded-full transition-transform',
                  color === p.value ? 'ring-2 ring-fg/70 ring-offset-2 ring-offset-surface' : 'hover:scale-110',
                )}
                style={{ backgroundColor: p.value }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Category</label>
            <input
              list="habit-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border/10 bg-surface-2/50 px-3 py-2.5 text-sm text-fg focus:border-accent/40"
            />
            <datalist id="habit-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Start date</label>
            <input
              type="date"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              className="w-full rounded-xl border border-border/10 bg-surface-2/50 px-3 py-2.5 text-sm text-fg focus:border-accent/40"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            {habit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
