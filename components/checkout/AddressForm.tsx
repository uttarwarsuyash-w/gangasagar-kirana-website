'use client'
import { useI18n } from '@/components/providers/I18n'

export interface AddressValue {
  name: string
  phone: string
  line1: string
  line2: string
  landmark: string
  city: string
  state: string
  pincode: string
}

export const EMPTY_ADDRESS: AddressValue = { name: '', phone: '', line1: '', line2: '', landmark: '', city: 'Nanded', state: 'Maharashtra', pincode: '' }

export function addressErrors(a: AddressValue) {
  const e: Partial<Record<keyof AddressValue, boolean>> = {}
  if (a.name.trim().length < 2) e.name = true
  if (!/^[6-9][0-9]{9}$/.test(a.phone)) e.phone = true
  if (a.line1.trim().length < 3) e.line1 = true
  if (a.city.trim().length < 2) e.city = true
  if (!/^[1-9][0-9]{5}$/.test(a.pincode)) e.pincode = true
  return e
}

export function AddressForm({ value, onChange, showErrors, idPrefix = 'a' }: { value: AddressValue; onChange: (v: AddressValue) => void; showErrors?: boolean; idPrefix?: string }) {
  const { t } = useI18n()
  const err = showErrors ? addressErrors(value) : {}
  const set = (k: keyof AddressValue) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: k === 'phone' || k === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value })
  const field = (k: keyof AddressValue, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = '') => (
    <label className={`field ${span}`} htmlFor={`${idPrefix}-${k}`}>
      <span>
        {label}
        {props.required === false && <span className="font-normal text-muted"> ({t.common.optional})</span>}
      </span>
      <input id={`${idPrefix}-${k}`} className="input" value={value[k]} onChange={set(k)} aria-invalid={err[k] ? true : undefined} {...props} required={props.required !== false} />
    </label>
  )
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field('name', t.checkout.name, { autoComplete: 'name', maxLength: 80 })}
      {field('phone', t.checkout.phone, { autoComplete: 'tel-national', inputMode: 'numeric', maxLength: 10, placeholder: '98XXXXXXXX' })}
      {field('line1', t.checkout.line1, { autoComplete: 'address-line1', maxLength: 200 }, 'sm:col-span-2')}
      {field('line2', t.checkout.line2, { autoComplete: 'address-line2', maxLength: 200, required: false })}
      {field('landmark', t.checkout.landmark, { maxLength: 120, required: false })}
      {field('city', t.checkout.city, { autoComplete: 'address-level2', maxLength: 60 })}
      {field('pincode', t.checkout.pincode, { autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 6 })}
    </div>
  )
}
