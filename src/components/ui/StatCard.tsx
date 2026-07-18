import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
  accent?: boolean
}

export function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon && (
          <span className={cn('text-muted', accent && 'text-accent')}>{icon}</span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}
