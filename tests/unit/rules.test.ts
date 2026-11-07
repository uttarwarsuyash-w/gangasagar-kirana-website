import { describe, it, expect } from 'vitest'
import { deliveryOptions, meter, checkQuantity, lineTotal } from '@/lib/commerce/rules'
import { DELIVERY_CASES, QTY_CASES } from '../cases'

describe('delivery table (TypeScript mirror)', () => {
  for (const [name, subtotal, weight, zone, expected] of DELIVERY_CASES) {
    it(name, () => {
      const opts = deliveryOptions(subtotal, weight, zone)
      for (const [method, fee] of Object.entries(expected)) {
        const o = opts.find((x) => x.method === method)!
        if (fee === 'quote') {
          expect(o.available).toBe(false)
          expect(o.reason).toBe('needs_quotation')
        } else {
          expect(o.available).toBe(true)
          expect(o.fee).toBe(fee)
        }
      }
    })
  }
  it('unserved pincode disables home delivery but keeps pickup', () => {
    const o = deliveryOptions(100, 500, 'nanded', undefined, false)
    expect(o[0]).toMatchObject({ method: 'delivery', available: false, reason: 'pincode_not_served' })
    expect(o[1]).toMatchObject({ method: 'pickup', available: true, fee: 0 })
  })
})

describe('cart meter', () => {
  it('light and cheap: next milestone is weight to reach ₹49', () => {
    expect(meter(200, 1400).next).toEqual({ kind: 'weight', grams: 600, fee: 49 })
  })
  it('heavy but under ₹499: next milestone is value for free delivery', () => {
    expect(meter(379, 2500).next).toEqual({ kind: 'value', rupees: 120 })
  })
  it('₹499 or more: free', () => {
    expect(meter(499, 100).next).toEqual({ kind: 'free' })
    expect(meter(499, 100).fee).toBe(0)
  })
  it('flags bulk at exactly 20 kg', () => {
    expect(meter(1000, 19999).bulk).toBe(false)
    expect(meter(1000, 20000).bulk).toBe(true)
  })
})

describe('quantity rules (TypeScript mirror)', () => {
  for (const [name, q, rule, err] of QTY_CASES) {
    it(name, () => expect(checkQuantity(q, rule)).toBe(err))
  }
})

describe('line totals', () => {
  it('loose items are priced per kg', () => {
    expect(lineTotal(140, 750, true)).toBe(105)
    expect(lineTotal(133, 250, true)).toBe(33.25)
    expect(lineTotal(46.5, 250, true)).toBe(11.63) // 11.625 rounds half up like Postgres
  })
  it('packs are price times count', () => {
    expect(lineTotal(110, 3, false)).toBe(330)
  })
})
