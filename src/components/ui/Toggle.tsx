import { cn } from '../../lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  id?: string
}

export function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors duration-300',
        checked ? 'bg-accent' : 'bg-surface-2 border border-border/10',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
