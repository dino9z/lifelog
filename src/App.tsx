import { useEffect, useState } from 'react'
import { useStore } from './store'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { Habits } from './components/habits/Habits'
import { Analytics } from './components/analytics/Analytics'
import { Settings } from './components/settings/Settings'
import { HabitForm } from './components/habits/HabitForm'
import { reminderTimeToNext, fireReminder } from './lib/reminder'
import type { Habit, View } from './types'

export function App() {
  const [view, setView] = useState<View>('dashboard')
  const theme = useStore((s) => s.settings.theme)
  const reminder = useStore((s) => s.settings.reminder)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!reminder.enabled) return
    let timeout: number
    const arm = () => {
      const ms = reminderTimeToNext(reminder.time)
      timeout = window.setTimeout(() => {
        fireReminder()
        arm()
      }, ms)
    }
    arm()
    return () => window.clearTimeout(timeout)
  }, [reminder.enabled, reminder.time])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (h: Habit) => {
    setEditing(h)
    setFormOpen(true)
  }

  return (
    <>
      <AppShell view={view} onNavigate={setView}>
        {view === 'dashboard' && <Dashboard onAddHabit={openNew} />}
        {view === 'habits' && <Habits onAddHabit={openNew} onEditHabit={openEdit} />}
        {view === 'analytics' && <Analytics />}
        {view === 'settings' && <Settings />}
      </AppShell>
      <HabitForm open={formOpen} onClose={() => setFormOpen(false)} habit={editing} />
    </>
  )
}
