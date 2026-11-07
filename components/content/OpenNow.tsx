'use client'
import { useEffect, useState } from 'react'
import { isOpenNow } from '@/lib/site'
import { useI18n } from '@/components/providers/I18n'

export function OpenNow({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<boolean | null>(null)
  useEffect(() => {
    setOpen(isOpenNow())
    const id = setInterval(() => setOpen(isOpenNow()), 60000)
    return () => clearInterval(id)
  }, [])
  if (open == null) return <p className={`h-6 ${className}`} />
  return (
    <p className={`inline-flex items-center gap-2 text-[0.95rem] font-semibold ${open ? 'text-leaf' : 'text-muted'} ${className}`}>
      <span className={`status-dot ${open ? 'bg-leaf' : 'bg-ink/30'}`} style={open ? { animation: 'pulse-ring 1.8s infinite' } : undefined} />
      {open ? t.common.openNow : t.common.closedNow}
    </p>
  )
}
