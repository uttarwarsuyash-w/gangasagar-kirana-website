'use client'
import { useI18n } from '@/components/providers/I18n'
import { useCart } from '@/components/providers/Cart'
import { useLive } from '@/components/providers/Live'
import { grams, inr } from '@/lib/format'

export function DeliveryMeter({ compact = false }: { compact?: boolean }) {
  const { t, f, lang } = useI18n()
  const { meter, weight, subtotal } = useCart()
  const { fees } = useLive().settings
  const msg =
    meter.next.kind === 'free'
      ? t.cart.meterFree
      : meter.next.kind === 'weight'
        ? f(t.cart.meterWeight, { g: grams(meter.next.grams, lang), fee: meter.next.fee })
        : f(t.cart.meterValue, { n: inr(meter.next.rupees).replace('₹', '') })

  return (
    <div className={`rounded-2xl ${compact ? '' : 'bg-paper-2 p-4'}`} aria-live="polite">
      <p className="font-semibold leading-snug">
        {meter.next.kind === 'free' && <span className="mr-1.5 inline-block rounded-full bg-leaf px-2 py-0.5 text-[0.75rem] text-white">✓</span>}
        {msg}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Track label={`${grams(fees.heavy_weight_g, lang)} → ₹${fees.fee_heavy}`} value={meter.weightProgress} done={weight >= fees.heavy_weight_g || meter.next.kind === 'free'} />
        <Track label={`${inr(fees.free_delivery_min_value)} → ${lang === 'hi' ? 'मुफ़्त' : 'free'}`} value={meter.valueProgress} done={subtotal >= fees.free_delivery_min_value} />
      </div>
      {!compact && (
        <p className="mt-2.5 text-[0.8125rem] text-muted">
          {meter.next.kind !== 'free' && f(t.cart.meterNow, { fee: meter.fee })}
          {meter.next.kind !== 'free' && ' · '}
          {t.cart.meterPickup}
        </p>
      )}
    </div>
  )
}

function Track({ label, value, done }: { label: string; value: number; done: boolean }) {
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)] ${done ? 'bg-leaf' : 'bg-turmeric'}`}
          style={{ width: `${Math.max(4, value * 100)}%` }}
        />
      </div>
      <p className={`mt-1 text-[0.75rem] tnum ${done ? 'font-semibold text-leaf' : 'text-muted'}`}>{label}</p>
    </div>
  )
}
