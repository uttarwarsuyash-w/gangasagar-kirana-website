'use client'
import { Minus, Plus } from 'lucide-react'
import { grams } from '@/lib/format'
import { useI18n } from '@/components/providers/I18n'

interface Props {
  value: number
  isLoose: boolean
  min: number
  step: number
  max: number
  onChange: (v: number) => void
  label: string
  size?: 'sm' | 'md'
}

export function QtyStepper({ value, isLoose, min, step, max, onChange, label, size = 'md' }: Props) {
  const { t, f, lang } = useI18n()
  const stepLabel = isLoose ? grams(step, lang) : '1'
  const h = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center rounded-full bg-paper shadow-[inset_0_0_0_1.5px_var(--color-line)]" role="group" aria-label={label}>
      <button type="button" className={`grid ${h} place-items-center rounded-full hover:bg-ink/6 disabled:opacity-30`} disabled={value - step < min} onClick={() => onChange(value - step)} aria-label={f(t.product.decrease, { step: stepLabel })}>
        <Minus className="h-4 w-4" />
      </button>
      <output className={`min-w-[4.5rem] text-center font-semibold tnum ${size === 'sm' ? 'text-[0.9rem]' : ''}`} aria-live="polite">
        {isLoose ? grams(value, lang) : value}
      </output>
      <button type="button" className={`grid ${h} place-items-center rounded-full hover:bg-ink/6 disabled:opacity-30`} disabled={value + step > max} onClick={() => onChange(value + step)} aria-label={f(t.product.increase, { step: stepLabel })}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
