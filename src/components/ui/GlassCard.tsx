import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
}

export function GlassCard({ children, interactive, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl',
        interactive && 'transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
