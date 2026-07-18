import { format } from 'date-fns'
import type { ReactNode } from 'react'
import type { View } from '../../types'
import { Sidebar, BottomNav } from './Sidebar'

interface AppShellProps {
  view: View
  onNavigate: (v: View) => void
  children: ReactNode
}

export function AppShell({ view, onNavigate, children }: AppShellProps) {
  const today = format(new Date(), 'EEEE, MMMM d')
  return (
    <div className="flex min-h-screen">
      <Sidebar view={view} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/10 bg-base/70 px-5 py-4 backdrop-blur-xl md:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight capitalize">{view}</h1>
            <p className="text-xs text-muted">{today}</p>
          </div>
        </header>
        <main className="flex-1 px-5 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>
      <BottomNav view={view} onNavigate={onNavigate} />
    </div>
  )
}
