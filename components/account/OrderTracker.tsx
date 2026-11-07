'use client'
// Order tracking drawn as a route from the shop's pin to the customer's door. Finished stops fill
// in, the current one pulses, and the line draws itself up to the current stop.
import { useEffect, useState } from 'react'
import { useI18n } from '@/components/providers/I18n'
import { dateTime } from '@/lib/format'
import { Mark } from '@/components/brand/Mark'

export const FLOW = ['Order Placed', 'Order Confirmed', 'Processing', 'Dispatched', 'Out for Delivery', 'Delivered'] as const

export function OrderTracker({ status, events, method }: { status: string; events: { status: string; at: string; note: string | null }[]; method: string }) {
  const { t, lang } = useI18n()
  const cancelled = status === 'Cancelled'
  const steps = method === 'pickup' ? FLOW.filter((s) => s !== 'Dispatched' && s !== 'Out for Delivery') : [...FLOW]
  const idx = cancelled ? -1 : Math.max(0, steps.indexOf(status as (typeof FLOW)[number]))
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(idx / (steps.length - 1)))
    return () => cancelAnimationFrame(id)
  }, [idx, steps.length])
  const when = (s: string) => events.find((e) => e.status === s)?.at

  const H = 76 * (steps.length - 1)
  // A gently winding road from top (shop) to bottom (door)
  const path = `M 28 0 ${steps
    .slice(1)
    .map((_, i) => {
      const y0 = i * 76
      const y1 = (i + 1) * 76
      const dx = i % 2 ? -14 : 14
      return `C ${28 + dx} ${y0 + 25}, ${28 - dx} ${y1 - 25}, 28 ${y1}`
    })
    .join(' ')}`

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-2 text-[0.85rem] font-semibold text-muted">
        <Mark className="h-6 w-6" /> {t.order.shop}
      </div>
      <div className="relative flex gap-5">
        <svg width="56" height={H + 20} viewBox={`0 -10 56 ${H + 20}`} className="shrink-0 overflow-visible" aria-hidden>
          <path d={path} fill="none" stroke="var(--color-line)" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 12" />
          {!cancelled && (
            <path
              d={path}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="6"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - drawn}
              style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)' }}
            />
          )}
          {steps.map((s, i) => {
            const done = !cancelled && i <= idx
            const current = !cancelled && i === idx
            return (
              <g key={s} transform={`translate(28 ${i * 76})`}>
                {current && <circle r="16" fill="var(--color-brand)" opacity=".18" style={{ animation: 'track-pulse 1.8s ease-out infinite', transformOrigin: 'center', transformBox: 'fill-box' }} />}
                <circle r={current ? 10 : 8} fill={done ? 'var(--color-brand)' : 'var(--color-paper)'} stroke={done ? 'var(--color-brand)' : 'var(--color-ink)'} strokeOpacity={done ? 1 : 0.25} strokeWidth="3" />
                {done && !current && <path d="M-4 0 l3 3 l5 -6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              </g>
            )
          })}
        </svg>
        <ol className="flex-1">
          {steps.map((s, i) => {
            const done = !cancelled && i <= idx
            const at = when(s)
            return (
              <li key={s} className="flex h-[76px] flex-col justify-start first:-mt-1" style={{ marginTop: i === 0 ? -6 : undefined }} aria-current={i === idx ? 'step' : undefined}>
                <span className={`font-semibold ${done ? '' : 'text-muted'} ${i === idx ? 'text-brand' : ''}`}>{t.order.statuses[s]}</span>
                {at && <span className="text-[0.8rem] text-muted">{dateTime(at, lang)}</span>}
              </li>
            )
          })}
        </ol>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[0.85rem] font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 11 12 4l9 7v9H3z" />
          <path d="M10 20v-5h4v5" />
        </svg>
        {method === 'pickup' ? t.order.methods.pickup : t.order.door}
      </div>
      {cancelled && <p className="mt-4 rounded-xl bg-ink px-4 py-3 font-semibold text-paper">{t.order.statuses.Cancelled}</p>}
      <style>{`@keyframes track-pulse{0%{transform:scale(.6);opacity:.5}100%{transform:scale(1.6);opacity:0}}`}</style>
    </div>
  )
}
