import { useStore } from '../../store'
import { THEMES } from '../../theme'
import type { ThemeName } from '../../types'
import { cn } from '../../lib/cn'

export function ThemePicker() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {THEMES.map((t) => {
        const active = theme === t.id
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id as ThemeName)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border p-3 text-left transition-all',
              'hover:-translate-y-0.5',
              active ? 'border-accent/60 ring-2 ring-accent/40' : 'border-border/10',
            )}
          >
            <div
              className="mb-3 h-14 w-full rounded-xl"
              style={{ background: `linear-gradient(135deg, ${t.preview[0]}, ${t.preview[1]})` }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t.label}</span>
              {active && <span className="h-2 w-2 rounded-full bg-accent" />}
            </div>
          </button>
        )
      })}
    </div>
  )
}
