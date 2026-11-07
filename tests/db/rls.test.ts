import { describe, it, expect, beforeAll } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { freshDb, addUsers, client, ADMIN, ADMIN2, ALICE, BOB, ANON } from './harness'

let db: PGlite
let aliceOrder: string
const ADDR = { name: 'Alice Tester', phone: '9876543210', line1: '12 Gokul Nagar', city: 'Nanded', pincode: '431602' }

beforeAll(async () => {
  db = await freshDb()
  await addUsers(db, ADMIN, ADMIN2, ALICE, BOB)
  const r = await client(db, ALICE).rpc('place_order', {
    zone: 'nanded', method: 'delivery', payment_method: 'cash', address: ADDR, accept_terms: true,
    items: [{ variant_id: 'raw-peanuts--loose', quantity: 1000 }],
  })
  aliceOrder = r.id
})

describe('anonymous visitors', () => {
  it('can read the catalogue but never stock counts', async () => {
    const anon = client(db, ANON)
    const rows = await anon.select('variants', 'id,price,price_is_sample', { eq: { product_id: 'raw-peanuts' } })
    expect(rows.length).toBe(1)
    await expect(anon.select('variants', 'id,stock', { eq: { product_id: 'raw-peanuts' } })).rejects.toThrow(/permission denied/)
    const live = await anon.rpc('live_catalogue')
    expect(live.prices['raw-peanuts--loose'][2]).toBe('available')
    expect(JSON.stringify(live)).not.toContain('"stock"')
  })
  it('cannot see hidden products', async () => {
    await db.exec(`update products set is_hidden = true where id = 'kokum'`)
    expect(await client(db, ANON).select('products', 'id', { eq: { id: 'kokum' } })).toEqual([])
    expect((await client(db, ADMIN).select('products', 'id', { eq: { id: 'kokum' } })).length).toBe(1)
    await db.exec(`update products set is_hidden = false where id = 'kokum'`)
  })
  it('cannot read orders, enquiries, private settings or the audit log', async () => {
    const anon = client(db, ANON)
    await expect(anon.select('orders', 'id')).rejects.toThrow(/permission denied/)
    await expect(anon.select('enquiries', 'id')).rejects.toThrow(/permission denied/)
    await expect(anon.select('activity_log', 'id')).rejects.toThrow(/permission denied/)
    const s = await anon.select<{ key: string }>('settings', 'key')
    expect(s.map((x) => x.key)).not.toContain('turnstile_required')
    expect(s.map((x) => x.key)).toContain('store_mode')
  })
  it('cannot change prices or call admin functions', async () => {
    const anon = client(db, ANON)
    await expect(anon.update('variants', { price: 1 }, { eq: { id: 'raw-peanuts--loose' } })).rejects.toThrow(/permission denied/)
    await expect(anon.rpc('admin_dashboard')).rejects.toThrow(/permission denied/)
    await expect(anon.rpc('place_order', {})).rejects.toThrow(/permission denied/)
  })
  it('can send an enquiry, with a rate limit', async () => {
    const anon = client(db, ANON)
    const body = { kind: 'contact', name: 'Visitor', phone: '9000000001', message: 'Do you sell jaggery in 30 kg?', client_ip: '1.2.3.4' }
    for (let i = 0; i < 6; i++) await anon.rpc('submit_enquiry', body)
    await expect(anon.rpc('submit_enquiry', body)).rejects.toThrow('rate_limited')
    await expect(anon.rpc('submit_enquiry', { kind: 'contact', name: 'X', phone: '123', client_ip: '5.5.5.5' })).rejects.toThrow('bad_name')
    await expect(
      anon.rpc('submit_enquiry', { kind: 'custom_quantity', name: 'Ravi', phone: '9000000002', product_id: 'raw-peanuts', quantity_g: 400, client_ip: '6.6.6.6' }),
    ).rejects.toThrow('custom_below_minimum')
  })
  it('requires Turnstile verification when switched on', async () => {
    await db.exec(`update settings set value = 'true' where key = 'turnstile_required'`)
    await expect(client(db, ANON).rpc('submit_enquiry', { kind: 'contact', name: 'Visitor', phone: '9000000003', client_ip: '7.7.7.7' })).rejects.toThrow(
      'verification_required',
    )
    await client(db, { role: 'service_role' }).rpc('submit_enquiry', { kind: 'contact', name: 'Visitor', phone: '9000000003', client_ip: '7.7.7.7' })
    await db.exec(`update settings set value = 'false' where key = 'turnstile_required'`)
  })
})

describe('customers', () => {
  it('see only their own orders', async () => {
    expect((await client(db, ALICE).select('orders', 'id')).length).toBe(1)
    expect(await client(db, BOB).select('orders', 'id')).toEqual([])
    expect(await client(db, BOB).select('order_items', 'id')).toEqual([])
    await expect(client(db, BOB).rpc('my_order', { id: aliceOrder })).rejects.toThrow('order_not_found')
  })
  it('cannot write orders or stock directly', async () => {
    const alice = client(db, ALICE)
    await expect(
      alice.insert('orders', [{ number: 'X', user_id: ALICE.sub, zone: 'nanded', method: 'pickup', payment_method: 'cash', subtotal: 0, delivery_fee: 0, total: 0, total_weight_g: 0, customer_name: 'A', phone: '9876543210' }]),
    ).rejects.toThrow(/permission denied/)
    await expect(alice.update('orders', { status: 'Delivered' }, { eq: { id: aliceOrder } })).rejects.toThrow(/permission denied/)
    await expect(alice.update('variants', { price: 1 }, { eq: { id: 'raw-peanuts--loose' } })).resolves.toBe(0)
    await expect(alice.rpc('admin_set_order_status', { order_id: aliceOrder, status: 'Delivered' })).rejects.toThrow('not_admin')
    await expect(alice.rpc('admin_inventory')).rejects.toThrow('not_admin')
  })
  it('manage only their own addresses and wishlist', async () => {
    const alice = client(db, ALICE)
    const bob = client(db, BOB)
    await alice.insert('addresses', [{ name: 'Alice', phone: '9876543210', line1: 'House 1', city: 'Nanded', pincode: '431602', is_default: true }])
    expect((await alice.select('addresses', 'id')).length).toBe(1)
    expect(await bob.select('addresses', 'id')).toEqual([])
    await expect(bob.insert('addresses', [{ user_id: ALICE.sub, name: 'Evil', phone: '9876543210', line1: 'House 2', city: 'Nanded', pincode: '431602' }])).rejects.toThrow(
      /row-level security/,
    )
    await alice.insert('wishlist', [{ product_id: 'cashew' }])
    expect(await bob.select('wishlist', 'product_id')).toEqual([])
  })
  it('reviews stay hidden until approved, and only admins approve', async () => {
    const alice = client(db, ALICE)
    await alice.rpc('submit_review', { product_id: 'raw-peanuts', rating: 5, body: 'Fresh and clean.' })
    expect((await client(db, ANON).rpc('product_reviews', { product_id: 'raw-peanuts' })).count).toBe(0)
    expect(await alice.update('reviews', { status: 'approved' }, { eq: { product_id: 'raw-peanuts' } })).toBe(0)
    expect(await client(db, ADMIN2).update('reviews', { status: 'approved' }, { eq: { product_id: 'raw-peanuts' } })).toBe(1)
    const r = await client(db, ANON).rpc('product_reviews', { product_id: 'raw-peanuts' })
    expect(r.count).toBe(1)
    expect(r.items[0].verified).toBe(false)
    await expect(alice.rpc('submit_review', { product_id: 'raw-peanuts', rating: 6 })).rejects.toThrow('bad_rating')
  })
})

describe('admins', () => {
  it('both allowlisted Google accounts have full access', async () => {
    for (const a of [ADMIN, ADMIN2]) {
      const c = client(db, a)
      expect((await c.rpc('my_profile')).is_admin).toBe(true)
      const d = await c.rpc('admin_dashboard')
      expect(d.pending_orders).toBeGreaterThanOrEqual(1)
      expect((await c.select('orders', 'id')).length).toBeGreaterThanOrEqual(1)
    }
  })
  it('can edit prices; the audit log records who did it', async () => {
    const admin = client(db, ADMIN)
    expect(await admin.update('variants', { price: 150, price_is_sample: false }, { eq: { id: 'raw-peanuts--loose' } })).toBe(1)
    const log = await admin.select<{ actor: string; entity: string }>('activity_log', 'actor,entity', { eq: { entity: 'variants' }, order: ['id', 'desc'], limit: 1 })
    expect(log[0].actor).toBe('uttarwarsuyash@gmail.com')
  })
  it('cannot edit stock except through stock functions', async () => {
    await expect(client(db, ADMIN).update('variants', { stock: 1 }, { eq: { id: 'raw-peanuts--loose' } })).rejects.toThrow(/permission denied/)
  })
  it('an email that is not on the allowlist is a normal customer', async () => {
    const stranger = client(db, { role: 'authenticated', sub: '00000000-0000-4000-8000-0000000000ff', email: 'someone@gmail.com' })
    await expect(stranger.rpc('admin_dashboard')).rejects.toThrow('not_admin')
    expect(await stranger.update('settings', { value: '"live"' }, { eq: { key: 'store_mode' } })).toBe(0)
  })
})
