import { it, expect } from 'vitest'
import { freshDb, addUsers, client, ADMIN } from './harness'
it('demo adapter stores jsonb objects, arrays and numbers, and text[] arrays correctly', async () => {
  const db = await freshDb()
  await addUsers(db, ADMIN)
  const a = client(db, ADMIN)
  await a.insert('settings', [{ key: 'x_obj', value: { a: 1 }, is_public: true }, { key: 'x_arr', value: ['431602', '431605'], is_public: true }, { key: 'x_num', value: 499, is_public: true }], 'key')
  const r = await db.query<{ key: string; t: string }>(`select key, jsonb_typeof(value) t from settings where key like 'x_%' order by key`)
  expect(r.rows).toEqual([{ key: 'x_arr', t: 'array' }, { key: 'x_num', t: 'number' }, { key: 'x_obj', t: 'object' }])
  await a.update('products', { synonyms: ['a', 'b'] }, { eq: { id: 'kokum' } })
  expect((await db.query(`select synonyms from products where id='kokum'`)).rows).toEqual([{ synonyms: ['a', 'b'] }])
})
