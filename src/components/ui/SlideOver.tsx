import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  width?: string
}

export function SlideOver({ open, onClose, title, children, width = 'max-w-md' }: SlideOverProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'glass absolute right-0 top-0 flex h-full w-full flex-col rounded-l-3xl animate-slide-in',
          width,
        )}
      >
        <div className="flex items-center justify-between border-b border-border/10 px-6 py-5">
          <div className="min-w-0">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
