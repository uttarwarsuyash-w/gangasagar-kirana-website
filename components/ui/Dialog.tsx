'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** 'center' modal, 'right' drawer, 'bottom' sheet on phones */
  variant?: 'center' | 'right' | 'full'
  className?: string
  closeLabel?: string
  hideTitle?: boolean
}

/** Native <dialog>: focus trap, Escape to close and inert background for free. */
export function Dialog({ open, onClose, title, children, variant = 'center', className = '', closeLabel = 'Close', hideTitle }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      document.documentElement.style.overflow = 'hidden'
    } else if (!open && d.open) {
      d.close()
    }
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open])
  const base =
    variant === 'right'
      ? 'ml-auto mr-0 h-dvh max-h-dvh w-full max-w-[30rem] rounded-none sm:rounded-l-[1.75rem] dialog-right'
      : variant === 'full'
        ? 'm-0 h-dvh max-h-dvh w-full max-w-none rounded-none dialog-full'
        : 'w-[min(34rem,calc(100%-1.5rem))] rounded-[1.75rem] dialog-center'
  return (
    <dialog
      ref={ref}
      onClose={() => {
        document.documentElement.style.overflow = ''
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-label={title}
      className={`gs-dialog bg-paper p-0 text-ink backdrop:bg-ink/55 backdrop:backdrop-blur-[2px] ${base} ${className}`}
    >
      <div className="flex h-full flex-col">
        <div className={`flex items-center justify-between gap-4 px-5 pt-5 sm:px-6 ${hideTitle ? 'sr-only' : ''}`}>
          <h2 className="font-display text-2xl font-[650] tracking-[-0.02em]">{title}</h2>
          <button className="icon-btn -mr-2" onClick={onClose} aria-label={closeLabel}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </dialog>
  )
}
