import { describe, it, expect } from 'vitest'
import { freshDb } from './harness'

describe('migrations', () => {
  it('apply cleanly and seed the catalogue', async () => {
    const db = await freshDb()
    const r = await db.query<{ c: number; p: number; v: number }>(
      `select (select count(*) from categories)::int c, (select count(*) from products)::int p, (select count(*) from variants)::int v`,
    )
    expect(r.rows[0]).toEqual({ c: 20, p: 170, v: 438 })
  })
})
