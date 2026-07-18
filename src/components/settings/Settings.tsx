import { useRef, useState } from 'react'
import { Download, Upload, RotateCcw, Plus, Check, CloudOff } from 'lucide-react'
import { useStore } from '../../store'
import { exportData, parseImport } from '../../lib/exportImport'
import { ensurePermission } from '../../lib/reminder'
import type { LifelogData } from '../../types'
import { ThemePicker } from './ThemePicker'
import { GlassCard } from '../ui/GlassCard'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Toggle'
import { cn } from '../../lib/cn'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mb-4 mt-0.5 text-xs text-muted">{description}</p>}
      <div className={description ? '' : 'mt-3'}>{children}</div>
    </GlassCard>
  )
}

export function Settings() {
  const settings = useStore((s) => s.settings)
  const setWeekStart = useStore((s) => s.setWeekStart)
  const setReminder = useStore((s) => s.setReminder)
  const addCategory = useStore((s) => s.addCategory)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)

  const fileRef = useRef<HTMLInputElement>(null)
  const [catInput, setCatInput] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const notify = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash(null), 2000)
  }

  const snapshot = (): LifelogData => {
    const s = useStore.getState()
    return {
      version: s.version,
      user: s.user,
      habits: s.habits,
      entries: s.entries,
      reflections: s.reflections,
      settings: s.settings,
    }
  }

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text()
      importData(parseImport(text))
      notify('Backup imported.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  return (
    <div className="space-y-5">
      <Section title="Appearance" description="Choose how Lifelog looks. More themes are on the way.">
        <ThemePicker />
      </Section>

      <Section title="Week start">
        <div className="inline-flex rounded-xl border border-border/10 bg-surface-2/50 p-1">
          {([1, 0] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWeekStart(w)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                settings.weekStart === w ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg',
              )}
            >
              {w === 1 ? 'Monday' : 'Sunday'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Daily reminder" description="A nudge to log your habits. Fires while Lifelog is open.">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{settings.reminder.enabled ? 'On' : 'Off'}</div>
            <div className="text-xs text-muted">Reminder time · {settings.reminder.time}</div>
          </div>
          <Toggle
            checked={settings.reminder.enabled}
            onChange={async (v) => {
              if (v) await ensurePermission()
              setReminder({ enabled: v, time: settings.reminder.time })
            }}
          />
        </div>
        {settings.reminder.enabled && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted">Time</span>
            <input
              type="time"
              value={settings.reminder.time}
              onChange={(e) => setReminder({ enabled: true, time: e.target.value })}
              className="rounded-xl border border-border/10 bg-surface-2/50 px-3 py-1.5 text-sm text-fg focus:border-accent/40"
            />
          </div>
        )}
        {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
          <p className="mt-2 text-xs text-amber-400/80">Notifications are blocked in your browser settings.</p>
        )}
      </Section>

      <Section title="Categories">
        <div className="flex flex-wrap items-center gap-2">
          {settings.categories.map((c) => (
            <span key={c} className="pill bg-surface-2/70 text-fg/90">
              {c}
            </span>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = catInput.trim()
            if (v) {
              addCategory(v)
              setCatInput('')
            }
          }}
        >
          <input
            value={catInput}
            onChange={(e) => setCatInput(e.target.value)}
            placeholder="Add category"
            className="flex-1 rounded-xl border border-border/10 bg-surface-2/50 px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-accent/40"
          />
          <Button type="submit" variant="subtle" size="sm">
            <Plus size={15} /> Add
          </Button>
        </form>
      </Section>

      <Section title="Your data" description="Everything stays on this device. You own your data.">
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" onClick={() => exportData(snapshot())}>
            <Download size={15} /> Export
          </Button>
          <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('Reset all data? This cannot be undone.')) {
                resetAll()
                notify('Data reset.')
              }
            }}
          >
            <RotateCcw size={15} /> Reset
          </Button>
        </div>
        {flash && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <Check size={15} /> {flash}
          </div>
        )}
      </Section>

      <Section title="Sync & account" description="Your data stays on this device for now.">
        <div className="flex items-start gap-3 rounded-xl border border-border/10 bg-surface-2/40 p-3">
          <CloudOff size={18} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-sm text-muted">
            Cloud sync and accounts need a backend service. Until then, use Export / Import below to move your
            data between devices — your information never leaves your machine.
          </p>
        </div>
      </Section>

      <Section title="About">
        <p className="text-sm leading-relaxed text-muted">
          Lifelog isn&apos;t designed to motivate you. It&apos;s designed to show you the truth about your
          consistency.
        </p>
      </Section>
    </div>
  )
}
