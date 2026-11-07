// Client-side mirror of the delivery and quantity rules in supabase/migrations/0002_functions.sql.
// The database is the source of truth (it re-checks everything when an order is placed);
// this copy only lets the cart drawer and product page update instantly while you tap.
// tests/unit/rules.test.ts and tests/db/commerce.test.ts check both against the same cases.

export interface FeeSettings {
  free_delivery_min_value: number
  heavy_weight_g: number
  fee_heavy: number
  fee_light: number
  outside_flat_fee: number
  bulk_threshold_g: number
  loose_min_g: number
  loose_step_g: number
  custom_min_g: number
}

export const DEFAULT_FEES: FeeSettings = {
  free_delivery_min_value: 499,
  heavy_weight_g: 2000,
  fee_heavy: 49,
  fee_light: 89,
  outside_flat_fee: 179,
  bulk_threshold_g: 20000,
  loose_min_g: 250,
  loose_step_g: 250,
  custom_min_g: 500,
}

export type Zone = 'nanded' | 'outside'
export type Method = 'delivery' | 'pickup' | 'courier' | 'transport'

export interface DeliveryOption {
  method: Method
  fee: number
  available: boolean
  reason: 'pincode_not_served' | 'needs_quotation' | null
}

export function deliveryOptions(subtotal: number, weightG: number, zone: Zone, s: FeeSettings = DEFAULT_FEES, pincodeServed = true): DeliveryOption[] {
  if (zone === 'nanded') {
    const fee = subtotal >= s.free_delivery_min_value ? 0 : weightG >= s.heavy_weight_g ? s.fee_heavy : s.fee_light
    return [
      { method: 'delivery', fee, available: pincodeServed, reason: pincodeServed ? null : 'pincode_not_served' },
      { method: 'pickup', fee: 0, available: true, reason: null },
    ]
  }
  const ok = weightG < s.bulk_threshold_g
  return (['courier', 'transport'] as const).map((method) => ({
    method,
    fee: s.outside_flat_fee,
    available: ok,
    reason: ok ? null : ('needs_quotation' as const),
  }))
}

/** Text-ready milestones for the cart meter (Nanded home delivery). */
export function meter(subtotal: number, weightG: number, s: FeeSettings = DEFAULT_FEES) {
  const toFree = Math.max(0, round2(s.free_delivery_min_value - subtotal))
  const toHeavy = Math.max(0, s.heavy_weight_g - weightG)
  const fee = deliveryOptions(subtotal, weightG, 'nanded', s)[0].fee
  let next: { kind: 'weight'; grams: number; fee: number } | { kind: 'value'; rupees: number } | { kind: 'free' }
  if (toFree === 0) next = { kind: 'free' }
  else if (toHeavy > 0) next = { kind: 'weight', grams: toHeavy, fee: s.fee_heavy }
  else next = { kind: 'value', rupees: toFree }
  return {
    fee,
    toFree,
    toHeavy,
    next,
    // progress 0..1 towards each milestone
    weightProgress: Math.min(1, weightG / s.heavy_weight_g),
    valueProgress: Math.min(1, subtotal / s.free_delivery_min_value),
    bulk: weightG >= s.bulk_threshold_g,
  }
}

export interface QtyRule {
  is_loose: boolean
  min_qty_g?: number | null
  step_g?: number | null
  max_qty_g?: number | null
}

export type QtyError = 'bad_quantity' | 'below_minimum' | 'above_maximum' | 'bad_step' | null

export function checkQuantity(q: number, r: QtyRule, s: FeeSettings = DEFAULT_FEES): QtyError {
  if (!Number.isInteger(q) || q <= 0 || q > 10_000_000) return 'bad_quantity'
  if (r.is_loose) {
    const mn = r.min_qty_g ?? s.loose_min_g
    const st = r.step_g ?? s.loose_step_g
    const mx = r.max_qty_g ?? 100_000
    if (q < mn) return 'below_minimum'
    if (q > mx) return 'above_maximum'
    if ((q - mn) % st !== 0) return 'bad_step'
    return null
  }
  return q > 999 ? 'above_maximum' : null
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Postgres round(numeric, 2) rounds half away from zero; mirror that for line totals. */
export function lineTotal(unitPrice: number, quantity: number, isLoose: boolean) {
  if (isLoose) {
    const paise = (unitPrice * 100 * quantity) / 1000
    return Math.round(paise + 1e-9) / 100
  }
  return round2(unitPrice * quantity)
}

export function lineWeight(quantity: number, isLoose: boolean, unitWeightG: number) {
  return isLoose ? quantity : unitWeightG * quantity
}
