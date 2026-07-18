import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-base font-medium hover:brightness-110 shadow-glow',
  ghost: 'text-fg/80 hover:bg-surface-2/70 hover:text-fg',
  subtle: 'bg-surface-2/70 text-fg border border-border/10 hover:bg-surface-2',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-400/20 hover:bg-rose-500/25',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
}

export function Button({
  variant = 'subtle',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
