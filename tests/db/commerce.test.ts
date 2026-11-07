import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { freshDb, addUsers, client, ADMIN, ALICE, BOB, ANON, setStock, setSetting } from './harness'
import { DELIVERY_CASES, QTY_CASES } from '../cases'

let db: PGlite
const ADDR = { name: 'Alice Tester', phone: '9876543210', line1: '12 Gokul Nagar', city: 'Nanded', pincode: '431602' }
const OUT_ADDR = { ...ADDR, line1: '4 MG Road', city: 'Pune', pincode: '411001' }

beforeAll(async () => {
  db = await freshDb()
  await addUsers(db, ADMIN, ALICE, BOB)
  await db.exec(`
    insert into categories (id, name_en, name_hi) values ('test', 'Test', 'टेस्ट');
    insert into products (id, category_id, name_en, name_hi, sell_type, min_qty_g, step_g) values
      ('t-loose', 'test', 'Test loose', 'टेस्ट', 'loose', null, null),
      ('t-custom', 'test', 'Test custom', 'टेस्ट', 'loose', 1000, 500),
      ('t-pack', 'test', 'Test pack', 'टेस्ट', 'packed', null, null);
    insert into variants (id, product_id, label_en, label_hi, is_loose, unit_weight_g, price, stock) values
      ('t-loose--loose', 't-loose', 'Loose', 'खुला', true, 1000, 140, 100000),
      ('t-custom--loose', 't-custom', 'Loose', 'खुला', true, 1000, 100, 100000),
      ('t-pack--1', 't-pack', '1 kg', '1 किलो', false, 1000, 110, 50);
  `)
})

async function caseVariant(id: string, price: number, weight: number) {
  await db.query(
    `insert into variants (id, product_id, label_en, label_hi, is_loose, unit_weight_g, price, stock) values ($1, 't-pack', 'x', 'x', false, $2, $3, 10)`,
    [id, weight, price],
  )
}

describe('delivery fees (database)', () => {
  DELIVERY_CASES.forEach(([name, subtotal, weight, zone, expected], i) => {
    it(name, async () => {
      const vid = `t-case-${i}`
      await caseVariant(vid, subtotal, weight)
      const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: vid, quantity: 1 }], zone })
      expect(Number(q.subtotal)).toBe(subtotal)
      expect(q.total_weight_g).toBe(weight)
      for (const [method, fee] of Object.entries(expected)) {
        const o = q.options.find((x: { method: string }) => x.method === method)
        if (fee === 'quote') {
          expect(o.available).toBe(false)
          expect(o.reason).toBe('needs_quotation')
          expect(q.needs_quotation).toBe(true)
        } else {
          expect(o.available).toBe(true)
          expect(Number(o.fee)).toBe(fee)
        }
      }
    })
  })

  it('bulk flag switches on at exactly 20 kg combined, mixing products', async () => {
    const anon = client(db, ANON)
    const a = await anon.rpc('quote_cart', { items: [{ variant_id: 't-loose--loose', quantity: 9750 }, { variant_id: 't-pack--1', quantity: 10 }], zone: 'nanded' })
    expect(a.total_weight_g).toBe(19750)
    expect(a.bulk).toBe(false)
    const b = await anon.rpc('quote_cart', { items: [{ variant_id: 't-loose--loose', quantity: 10000 }, { variant_id: 't-pack--1', quantity: 10 }], zone: 'nanded' })
    expect(b.total_weight_g).toBe(20000)
    expect(b.bulk).toBe(true)
    expect(b.needs_quotation).toBe(false) // in Nanded, retail checkout stays available
  })

  it('home delivery is unavailable for a pincode outside the list; pickup stays free', async () => {
    const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: 't-pack--1', quantity: 1 }], zone: 'nanded', pincode: '431605' })
    expect(q.options[0]).toMatchObject({ method: 'delivery', available: false, reason: 'pincode_not_served' })
    expect(q.options[1]).toMatchObject({ method: 'pickup', available: true })
  })

  it('meter tells how far to the next milestone', async () => {
    const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: 't-loose--loose', quantity: 1000 }], zone: 'nanded' })
    expect(Number(q.subtotal)).toBe(140)
    expect(q.meter.to_heavy_g).toBe(1000)
    expect(Number(q.meter.to_free)).toBe(359)
    expect(Number(q.delivery_fee)).toBe(89)
  })
})

describe('quantity rules (database)', () => {
  for (const [name, qty, rule, err] of QTY_CASES) {
    it(name, async () => {
      const vid = rule.is_loose ? (rule.min_qty_g === 1000 ? 't-custom--loose' : 't-loose--loose') : 't-pack--1'
      if (!rule.is_loose) await setStock(db, 't-pack--1', 5000)
      const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: vid, quantity: qty }], zone: 'nanded' })
      const lineErr = q.errors[0]?.code ?? null
      expect(lineErr).toBe(err)
      if (!rule.is_loose) await setStock(db, 't-pack--1', 50)
    })
  }
  it('rejects a quantity sent as text', async () => {
    const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: 't-pack--1', quantity: '2' }], zone: 'nanded' })
    expect(q.errors[0].code).toBe('bad_quantity')
  })
  it('ignores any price the browser sends', async () => {
    const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: 't-pack--1', quantity: 2, price: 1, unit_price: 1 }], zone: 'nanded' })
    expect(Number(q.subtotal)).toBe(220)
  })
  it('uses the sale price when one is set', async () => {
    await db.query(`update variants set sale_price = 99 where id = 't-pack--1'`)
    const q = await client(db, ANON).rpc('quote_cart', { items: [{ variant_id: 't-pack--1', quantity: 2 }], zone: 'nanded' })
    expect(Number(q.subtotal)).toBe(198)
    await db.query(`update variants set sale_price = null where id = 't-pack--1'`)
  })
})

describe('placing orders', () => {
  const base = { zone: 'nanded', method: 'delivery', payment_method: 'cash', address: ADDR, accept_terms: true }

  it('requires sign-in', async () => {
    await expect(client(db, ANON).rpc('place_order', { ...base, items: [{ variant_id: 't-pack--1', quantity: 1 }] })).rejects.toThrow()
  })
  it('requires the terms checkbox', async () => {
    await expect(client(db, ALICE).rpc('place_order', { ...base, accept_terms: false, items: [{ variant_id: 't-pack--1', quantity: 1 }] })).rejects.toThrow(
      'terms_not_accepted',
    )
  })
  it('places a Nanded delivery order with server-side totals and takes stock', async () => {
    await setStock(db, 't-loose--loose', 100000)
    const r = await client(db, ALICE).rpc('place_order', { ...base, items: [{ variant_id: 't-loose--loose', quantity: 750 }, { variant_id: 't-pack--1', quantity: 1 }] })
    expect(r.number).toMatch(/^GS\d{2}-\d+$/)
    expect(Number(r.subtotal)).toBe(105 + 110)
    expect(Number(r.delivery_fee)).toBe(89) // ₹215, 1.75 kg
    expect(Number(r.total)).toBe(304)
    expect(r.is_test).toBe(true) // store is in preview mode
    const s = await db.query<{ stock: number }>(`select stock from variants where id = 't-loose--loose'`)
    expect(s.rows[0].stock).toBe(100000 - 750)
    const m = await db.query(`select * from stock_movements where order_id = $1`, [r.id])
    expect(m.rows.length).toBe(2)
    const mine = await client(db, ALICE).rpc('my_order', { id: r.id })
    expect(mine.items.length).toBe(2)
    expect(mine.events[0].status).toBe('Order Placed')
  })
  it('refuses more than the stock holds, without revealing the count', async () => {
    await setStock(db, 't-pack--1', 2)
    await expect(client(db, ALICE).rpc('place_order', { ...base, items: [{ variant_id: 't-pack--1', quantity: 3 }] })).rejects.toThrow('not_enough_stock')
    await setStock(db, 't-pack--1', 50)
  })
  it('store pickup needs only a name and phone and is free', async () => {
    const r = await client(db, ALICE).rpc('place_order', {
      zone: 'nanded', method: 'pickup', payment_method: 'upi_on_delivery', contact: { name: 'Alice', phone: '9876543210' }, accept_terms: true,
      items: [{ variant_id: 't-pack--1', quantity: 1 }],
    })
    expect(Number(r.delivery_fee)).toBe(0)
  })
  it('outside Nanded: ₹179 and UPI before processing', async () => {
    const out = { zone: 'outside', method: 'courier', address: OUT_ADDR, accept_terms: true, items: [{ variant_id: 't-pack--1', quantity: 2 }] }
    await expect(client(db, ALICE).rpc('place_order', { ...out, payment_method: 'cash' })).rejects.toThrow('bad_payment_method')
    const r = await client(db, ALICE).rpc('place_order', { ...out, payment_method: 'upi_prepaid', upi_ref: '412345678901' })
    expect(Number(r.delivery_fee)).toBe(179)
    expect(r.payment_status).toBe('pending_verification')
    const admin = client(db, ADMIN)
    await admin.rpc('admin_set_order_status', { order_id: r.id, status: 'Order Confirmed' })
    await expect(admin.rpc('admin_set_order_status', { order_id: r.id, status: 'Processing' })).rejects.toThrow('payment_not_verified')
    await admin.rpc('admin_record_payment', { order_id: r.id })
    await admin.rpc('admin_set_order_status', { order_id: r.id, status: 'Processing' })
    await expect(admin.rpc('admin_set_order_status', { order_id: r.id, status: 'Order Confirmed' })).rejects.toThrow('status_must_move_forward')
  })
  it('outside Nanded at 20 kg must go through a quotation', async () => {
    await expect(
      client(db, ALICE).rpc('place_order', {
        zone: 'outside', method: 'transport', payment_method: 'upi_prepaid', address: OUT_ADDR, accept_terms: true,
        items: [{ variant_id: 't-pack--1', quantity: 20 }],
      }),
    ).rejects.toThrow('needs_quotation')
  })
  it('Nanded home delivery refuses an unserved pincode', async () => {
    await expect(
      client(db, ALICE).rpc('place_order', { ...base, address: { ...ADDR, pincode: '431605' }, items: [{ variant_id: 't-pack--1', quantity: 1 }] }),
    ).rejects.toThrow('pincode_not_served')
  })
})

describe('cancellations', () => {
  it('customer requests, admin approves, stock comes back', async () => {
    await setStock(db, 't-pack--1', 50)
    const alice = client(db, ALICE)
    const r = await alice.rpc('place_order', {
      zone: 'nanded', method: 'pickup', payment_method: 'cash', contact: { name: 'Alice', phone: '9876543210' }, accept_terms: true,
      items: [{ variant_id: 't-pack--1', quantity: 5 }],
    })
    expect((await db.query<{ stock: number }>(`select stock from variants where id='t-pack--1'`)).rows[0].stock).toBe(45)
    await expect(client(db, BOB).rpc('request_cancellation', { order_id: r.id })).rejects.toThrow('order_not_found')
    await alice.rpc('request_cancellation', { order_id: r.id, reason: 'Ordered twice' })
    await expect(alice.rpc('request_cancellation', { order_id: r.id })).rejects.toThrow('cancel_already_requested')
    await client(db, ADMIN).rpc('admin_decide_cancellation', { order_id: r.id, approve: true })
    const o = await alice.rpc('my_order', { id: r.id })
    expect(o.status).toBe('Cancelled')
    expect(o.cancel_decision).toBe('approved')
    expect((await db.query<{ stock: number }>(`select stock from variants where id='t-pack--1'`)).rows[0].stock).toBe(50)
  })
  it('cannot cancel once dispatched', async () => {
    const alice = client(db, ALICE)
    const admin = client(db, ADMIN)
    const r = await alice.rpc('place_order', {
      zone: 'nanded', method: 'delivery', payment_method: 'cash', address: ADDR, accept_terms: true, items: [{ variant_id: 't-pack--1', quantity: 1 }],
    })
    await admin.rpc('admin_set_order_status', { order_id: r.id, status: 'Dispatched' })
    await expect(alice.rpc('request_cancellation', { order_id: r.id })).rejects.toThrow('cannot_cancel_now')
  })
})

describe('wholesale quotations', () => {
  it('needs 20 kg, admin prices it, customer accepts it into an order', async () => {
    const alice = client(db, ALICE)
    const admin = client(db, ADMIN)
    const req = { zone: 'outside', method: 'transport', address: OUT_ADDR, notes: 'Shop restock' }
    await expect(alice.rpc('request_quotation', { ...req, items: [{ variant_id: 't-loose--loose', quantity: 19750 }] })).rejects.toThrow('below_bulk_weight')
    const q = await alice.rpc('request_quotation', { ...req, items: [{ variant_id: 't-loose--loose', quantity: 25000 }] })
    expect(q.number).toMatch(/^Q\d{2}-\d+$/)
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
    await admin.rpc('admin_quote', { id: q.id, items: [{ variant_id: 't-loose--loose', quantity: 25000, unit_price: 120 }], shipping: 650, valid_until: tomorrow })
    const mine = await alice.rpc('my_quotations')
    expect(mine[0].status).toBe('quoted')
    expect(Number(mine[0].total)).toBe(3000 + 650)
    expect(mine[0].admin_note).toBeUndefined()
    await expect(alice.rpc('accept_quotation', { id: q.id, payment_method: 'cash', accept_terms: true })).rejects.toThrow('bad_payment_method')
    const o = await alice.rpc('accept_quotation', { id: q.id, payment_method: 'upi_prepaid', accept_terms: true })
    expect(Number(o.total)).toBe(3650)
    const detail = await alice.rpc('my_order', { id: o.id })
    expect(Number(detail.items[0].unit_price)).toBe(120)
    expect(detail.quotation_id).toBe(q.id)
  })
})

describe('store mode', () => {
  it('cannot go live while sample prices remain, can after they are verified or hidden', async () => {
    const admin = client(db, ADMIN)
    const left = await admin.rpc('admin_go_live_check')
    expect(left.length).toBeGreaterThan(100)
    await expect(admin.rpc('admin_set_store_mode', { mode: 'live' })).rejects.toThrow('sample_prices_remain')
    await db.exec(`update variants set price_is_sample = false where product_id <> 'raw-peanuts'; update products set is_hidden = true where id = 'raw-peanuts';`)
    expect((await admin.rpc('admin_go_live_check')).length).toBe(0)
    await admin.rpc('admin_set_store_mode', { mode: 'live' })
    const r = await client(db, BOB).rpc('place_order', {
      zone: 'nanded', method: 'pickup', payment_method: 'cash', contact: { name: 'Bob', phone: '9123456780' }, accept_terms: true,
      items: [{ variant_id: 't-pack--1', quantity: 1 }],
    })
    expect(r.is_test).toBe(false)
    await admin.rpc('admin_set_store_mode', { mode: 'preview' })
  })
})

describe('inventory and import', () => {
  it('records incoming, damaged and counted stock with history', async () => {
    const admin = client(db, ADMIN)
    await setStock(db, 't-pack--1', 10)
    await admin.rpc('admin_stock_move', { variant_id: 't-pack--1', reason: 'incoming', quantity: 20 })
    await admin.rpc('admin_stock_move', { variant_id: 't-pack--1', reason: 'damaged', quantity: 3 })
    await expect(admin.rpc('admin_stock_move', { variant_id: 't-pack--1', reason: 'expired', quantity: 100 })).rejects.toThrow('stock_below_zero')
    await admin.rpc('admin_set_stock', { variant_id: 't-pack--1', stock: 25 })
    const h = await admin.rpc('admin_stock_history', { variant_id: 't-pack--1' })
    expect(h.slice(0, 3).map((x: { reason: string; delta: number }) => [x.reason, x.delta])).toEqual([
      ['adjust', -2],
      ['damaged', -3],
      ['incoming', 20],
    ])
  })
  it('imports price and stock changes from the Excel format', async () => {
    const admin = client(db, ADMIN)
    const res = await admin.rpc('admin_import_catalogue', {
      rows: [
        { product_id: 'toor-dal', category_id: 'dals', name_en: 'Toor dal', name_hi: 'तूर दाल', variant_id: 'toor-dal--loose', variant_en: 'Loose, per kg', sell_type: 'loose', price: 158, price_is_sample: 'no', stock: 80000, stock_is_sample: 'no' },
        { product_id: 'new-item', category_id: 'dals', name_en: 'New item', name_hi: 'नया', variant_id: 'new-item--1kg', variant_en: '1 kg', sell_type: 'packed', unit_weight_g: 1000, price: 99, stock: 12 },
        { product_id: 'bad id!', variant_id: 'x' },
      ],
    })
    expect(res.created_products).toBe(1)
    expect(res.updated_variants).toBe(1)
    expect(res.errors.length).toBe(1)
    const v = await db.query<{ price: string; price_is_sample: boolean; stock: number }>(`select price, price_is_sample, stock from variants where id='toor-dal--loose'`)
    expect(v.rows[0]).toEqual({ price: '158.00', price_is_sample: false, stock: 80000 })
  })
})
