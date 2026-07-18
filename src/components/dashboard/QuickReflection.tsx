import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { todayKey } from '../../lib/date'
import { GlassCard } from '../ui/GlassCard'

export function QuickReflection() {
  const today = todayKey()
  const stored = useStore((s) => s.reflections.find((r) => r.date === today)?.reflection ?? '')
  const setReflection = useStore((s) => s.setReflection)
  const [val, setVal] = useState(stored)

  useEffect(() => setVal(stored), [stored])

  return (
    <GlassCard className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted">Quick Reflection</h3>
        <span className="text-xs text-muted/70">auto-saved</span>
      </div>
      <textarea
        value={val}
        onChange={(e) => {
          const next = e.target.value
          setVal(next)
          setReflection(today, { reflection: next })
        }}
        rows={2}
        maxLength={180}
        placeholder="Today felt productive."
        className="w-full resize-none rounded-xl border border-border/10 bg-surface-2/50 px-3 py-2.5 text-sm text-fg placeholder:text-muted/60 focus:border-accent/40"
      />
    </GlassCard>
  )
}
