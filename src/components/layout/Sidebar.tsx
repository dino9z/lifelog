import { LayoutDashboard, ListChecks, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import type { View } from '../../types'
import { cn } from '../../lib/cn'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

interface SidebarProps {
  view: View
  onNavigate: (v: View) => void
}

export function Sidebar({ view, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border/10 p-4 md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <span className="text-lg font-semibold tracking-tight">Lifelog</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-accent/15 text-fg shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.25)]'
                  : 'text-muted hover:bg-surface-2/70 hover:text-fg',
              )}
            >
              <Icon size={18} className={cn(active && 'text-accent')} />
              {item.label}
              {item.id === 'analytics' && (
                <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  SOON
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto px-3 text-xs leading-relaxed text-muted/70">
        Track consistency.
        <br />
        Build momentum.
      </div>
    </aside>
  )
}

export function BottomNav({ view, onNavigate }: SidebarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/10 bg-surface/80 backdrop-blur-xl md:hidden">
      {NAV.map((item) => {
        const Icon = item.icon
        const active = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
              active ? 'text-accent' : 'text-muted',
            )}
          >
            <Icon size={20} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
