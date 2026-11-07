'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getBackend } from '@/lib/backend'
import { inr } from '@/lib/format'
import { POUR } from '@/lib/snacks'
import { useAction, PageHead, Badge, Loading, Empty, Table, Th, Td, Panel, Field, ConfirmButton, ImageUpload } from '../ui'
import { ExcelTools } from './Excel'
import { imageKey, fallbackSrc } from '@/lib/images'

export interface PRow {
  id: string
  category_id: string
  name_en: string
  name_hi: string
  synonyms: string[]
  description_en: string | null
  description_hi: string | null
  sell_type: 'loose' | 'packed' | 'litre' | 'piece'
  min_qty_g: number | null
  step_g: number | null
  max_qty_g: number | null
  pack_sizes_g: number[]
  limited_stock_level: number
  is_special: boolean
  pour_kind: string | null
  image_url: string | null
  image_source: string
  image_is_placeholder: boolean
  frequently_bought: string[]
  recommended: string[]
  seo_title_en: string | null
  seo_title_hi: string | null
  seo_description_en: string | null
  seo_description_hi: string | null
  is_hidden: boolean
  sort: number
}
export interface VRow {
  id: string
  product_id: string
  label_en: string
  label_hi: string
  is_loose: boolean
  unit_weight_g: number
  price: number
  sale_price: number | null
  price_is_sample: boolean
  is_hidden: boolean
  sort: number
}
export interface CRow {
  id: string
  name_en: string
  name_hi: string
  colour: string | null
  pour_kind: string | null
  image_url: string | null
  is_hidden: boolean
  sort: number
  description_en: string | null
  description_hi: string | null
}

const PCOLS = 'id,category_id,name_en,name_hi,synonyms,description_en,description_hi,sell_type,min_qty_g,step_g,max_qty_g,pack_sizes_g,limited_stock_level,is_special,pour_kind,image_url,image_source,image_is_placeholder,frequently_bought,recommended,seo_title_en,seo_title_hi,seo_description_en,seo_description_hi,is_hidden,sort'
const VCOLS = 'id,product_id,label_en,label_hi,is_loose,unit_weight_g,price,sale_price,price_is_sample,is_hidden,sort'

export async function loadCatalogue() {
  const b = await getBackend()
  const [products, variants, categories] = await Promise.all([
    b.select<PRow>('products', PCOLS, { order: ['sort', 'asc'] }),
    b.select<VRow>('variants', VCOLS, { order: ['sort', 'asc'] }),
    b.select<CRow>('categories', 'id,name_en,name_hi,colour,pour_kind,image_url,is_hidden,sort,description_en,description_hi', { order: ['sort', 'asc'] }),
  ])
  return { products, variants: variants.map((v) => ({ ...v, price: Number(v.price), sale_price: v.sale_price == null ? null : Number(v.sale_price) })), categories }
}

function thumb(url: string | null) {
  if (!url) return null
  const k = imageKey(url)
  return k ? fallbackSrc(k) : url
}

export function ProductsList() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCatalogue>> | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const reload = () => loadCatalogue().then(setData)
  useEffect(() => {
    const u = new URLSearchParams(location.search)
    if (u.get('filter')) setFilter(u.get('filter')!)
    reload()
  }, [])
  const byProduct = useMemo(() => {
    const m = new Map<string, VRow[]>()
    for (const v of data?.variants ?? []) m.set(v.product_id, [...(m.get(v.product_id) ?? []), v])
    return m
  }, [data])
  if (!data) return <Loading />
  const n = q.trim().toLowerCase()
  const list = data.products.filter((p) => {
    const vs = byProduct.get(p.id) ?? []
    if (cat && p.category_id !== cat) return false
    if (n && !`${p.id} ${p.name_en} ${p.name_hi} ${p.synonyms.join(' ')}`.toLowerCase().includes(n)) return false
    if (filter === 'sample' && !vs.some((v) => v.price_is_sample && !v.is_hidden)) return false
    if (filter === 'placeholder' && !p.image_is_placeholder) return false
    if (filter === 'hidden' && !p.is_hidden) return false
    return true
  })
  const catName = new Map(data.categories.map((c) => [c.id, c.name_en]))
  return (
    <div>
      <PageHead
        title="Products"
        sub="Edit names, prices, photos and pack sizes. Prices change on the website at once; new products and text go live when you press Publish."
        actions={
          <>
            <ExcelTools onDone={reload} />
            <Link href="/admin/products/edit/?new=1" className="btn btn-ink btn-sm">
              <Plus className="h-4 w-4" /> New product
            </Link>
          </>
        }
      />
      <div className="mb-5 flex gap-2">
        <button className="chip" aria-pressed={tab === 'products'} onClick={() => setTab('products')}>
          Products ({data.products.length})
        </button>
        <button className="chip" aria-pressed={tab === 'categories'} onClick={() => setTab('categories')}>
          Categories ({data.categories.length})
        </button>
      </div>
      {tab === 'categories' ? (
        <Categories categories={data.categories} onChange={reload} />
      ) : (
        <>
          <div className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-3">
            <Field label="Search">
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Hindi name or id" />
            </Field>
            <Field label="Category">
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All categories</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Show">
              <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All products</option>
                <option value="sample">Still on sample prices</option>
                <option value="placeholder">Needs a real photo</option>
                <option value="hidden">Hidden</option>
              </select>
            </Field>
          </div>
          {list.length === 0 ? (
            <Empty>No products match.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th>Prices</Th>
                  <Th>Flags</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const vs = byProduct.get(p.id) ?? []
                  const t = thumb(p.image_url)
                  return (
                    <tr key={p.id} className="hover:bg-paper-2">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-2 text-[0.7rem] text-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {t ? <img src={t} alt="" className="h-full w-full object-cover" /> : 'pouch'}
                          </span>
                          <span>
                            <Link href={`/admin/products/edit/?id=${p.id}`} className="font-semibold hover:text-brand">
                              {p.name_en}
                            </Link>
                            <span className="block text-[0.85rem] text-muted">{p.name_hi}</span>
                          </span>
                        </div>
                      </Td>
                      <Td className="text-muted">{catName.get(p.category_id)}</Td>
                      <Td className="tnum">
                        {vs.map((v) => (
                          <span key={v.id} className="block whitespace-nowrap text-[0.85rem]">
                            {v.label_en}: <strong>{inr(v.sale_price ?? v.price)}</strong>
                            {v.price_is_sample && <span className="ml-1 text-turmeric-dark">sample</span>}
                          </span>
                        ))}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {p.is_hidden && <Badge tone="ink">hidden</Badge>}
                          {p.image_is_placeholder && <Badge tone="turmeric">Replace with real photo</Badge>}
                          {p.is_special && <Badge tone="brand">special</Badge>}
                        </div>
                      </Td>
                      <Td>
                        <Link href={`/admin/products/edit/?id=${p.id}`} className="btn btn-ghost btn-sm">
                          Edit
                        </Link>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </>
      )}
    </div>
  )
}

function Categories({ categories, onChange }: { categories: CRow[]; onChange: () => void }) {
  const { busy, run } = useAction()
  const [edit, setEdit] = useState<CRow | null>(null)
  const [isNew, setIsNew] = useState(false)
  async function save() {
    if (!edit) return
    await run(async () => {
      const b = await getBackend()
      const { id, ...rest } = edit
      if (isNew) await b.insert('categories', [edit as unknown as Record<string, unknown>])
      else await b.update('categories', rest, { eq: { id } })
      setEdit(null)
      onChange()
    }, 'Category saved')
  }
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Category</Th>
              <Th>3D pieces</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <Td className="tnum text-muted">{c.sort}</Td>
                <Td>
                  <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: c.colour ?? '#ccc' }} />
                  <strong>{c.name_en}</strong> <span className="text-muted">{c.name_hi}</span> {c.is_hidden && <Badge tone="ink">hidden</Badge>}
                </Td>
                <Td className="text-muted">{c.pour_kind ?? 'none'}</Td>
                <Td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setIsNew(false)
                      setEdit(c)
                    }}
                  >
                    Edit
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <button
          className="btn btn-ink btn-sm mt-4"
          onClick={() => {
            setIsNew(true)
            setEdit({ id: '', name_en: '', name_hi: '', colour: '#B3263A', pour_kind: null, image_url: null, is_hidden: false, sort: categories.length + 1, description_en: null, description_hi: null })
          }}
        >
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>
      {edit && (
        <Panel title={isNew ? 'New category' : `Edit ${edit.name_en}`}>
          <div className="grid gap-3">
            {isNew && (
              <Field label="Id (lowercase, dashes)" hint="Used in the web address, for example dry-fruits">
                <input className="input" value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
              </Field>
            )}
            <Field label="Name (English)">
              <input className="input" value={edit.name_en} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} />
            </Field>
            <Field label="Name (Hindi)">
              <input className="input" value={edit.name_hi} onChange={(e) => setEdit({ ...edit, name_hi: e.target.value })} lang="hi" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Colour">
                <input type="color" className="input !p-1" value={edit.colour ?? '#B3263A'} onChange={(e) => setEdit({ ...edit, colour: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Order">
                <input type="number" className="input" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="3D pieces on the category page">
              <select className="input" value={edit.pour_kind ?? ''} onChange={(e) => setEdit({ ...edit, pour_kind: e.target.value || null })}>
                <option value="">None (show a photo or pouch)</option>
                {Object.keys(POUR).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={edit.is_hidden} onChange={(e) => setEdit({ ...edit, is_hidden: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" /> Hidden from customers
            </label>
            <div className="flex gap-2">
              <button className="btn btn-ink btn-sm" onClick={save} disabled={busy}>
                Save
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>
                Cancel
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}

const csv = (a: (string | number)[] | null | undefined) => (a ?? []).join(', ')
const ids = (s: string) =>
  s
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
const nums = (s: string) =>
  s
    .split(/[,\s]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => Number.isFinite(n) && n > 0)

export function ProductEdit() {
  const [state, setState] = useState<{ p: PRow; vs: (VRow & { _new?: boolean; _del?: boolean })[]; isNew: boolean } | null>(null)
  const [cats, setCats] = useState<CRow[]>([])
  const [text, setText] = useState({ synonyms: '', packs: '', fbt: '', rec: '' })
  const { busy, run } = useAction()

  useEffect(() => {
    const u = new URLSearchParams(location.search)
    const id = u.get('id')
    loadCatalogue().then(({ products, variants, categories }) => {
      setCats(categories)
      const p = products.find((x) => x.id === id)
      if (p) {
        setState({ p, vs: variants.filter((v) => v.product_id === p.id), isNew: false })
        setText({ synonyms: p.synonyms.join(' '), packs: csv(p.pack_sizes_g), fbt: csv(p.frequently_bought), rec: csv(p.recommended) })
      } else {
        const blank: PRow = {
          id: '',
          category_id: categories[0]?.id ?? '',
          name_en: '',
          name_hi: '',
          synonyms: [],
          description_en: '',
          description_hi: '',
          sell_type: 'packed',
          min_qty_g: null,
          step_g: null,
          max_qty_g: null,
          pack_sizes_g: [],
          limited_stock_level: 5,
          is_special: false,
          pour_kind: null,
          image_url: null,
          image_source: 'illustration',
          image_is_placeholder: true,
          frequently_bought: [],
          recommended: [],
          seo_title_en: null,
          seo_title_hi: null,
          seo_description_en: null,
          seo_description_hi: null,
          is_hidden: false,
          sort: products.length + 1,
        }
        setState({ p: blank, vs: [], isNew: true })
      }
    })
  }, [])

  if (!state) return <Loading />
  const { p, vs, isNew } = state
  const set = (patch: Partial<PRow>) => setState({ ...state, p: { ...p, ...patch } })
  const setV = (i: number, patch: Partial<VRow>) => setState({ ...state, vs: vs.map((v, j) => (j === i ? { ...v, ...patch } : v)) })
  const loose = p.sell_type === 'loose'

  function addVariant() {
    const base = p.id || 'new-product'
    setState({
      p,
      isNew,
      vs: [
        ...vs,
        { id: loose ? `${base}--loose` : `${base}--${vs.length + 1}`, product_id: p.id, label_en: loose ? 'Loose, per kg' : '', label_hi: loose ? 'खुला, प्रति किलो' : '', is_loose: loose, unit_weight_g: 1000, price: 0, sale_price: null, price_is_sample: false, is_hidden: false, sort: vs.length + 1, _new: true },
      ],
    })
  }

  async function save() {
    if (!p.id || !/^[a-z0-9-]{2,80}$/.test(p.id)) return run(async () => Promise.reject(new Error('Enter an id with lowercase letters, numbers and dashes')))
    const row: PRow = {
      ...p,
      synonyms: text.synonyms.split(/\s+/).filter(Boolean),
      pack_sizes_g: nums(text.packs),
      frequently_bought: ids(text.fbt),
      recommended: ids(text.rec),
      min_qty_g: loose ? (p.min_qty_g ?? 250) : null,
      step_g: loose ? (p.step_g ?? 250) : null,
    }
    const ok = await run(async () => {
      const b = await getBackend()
      if (isNew) await b.insert('products', [row as unknown as Record<string, unknown>])
      else {
        const { id, ...rest } = row
        await b.update('products', rest as unknown as Record<string, unknown>, { eq: { id } })
      }
      for (const v of vs) {
        if (v._del) {
          if (!v._new) await b.remove('variants', { eq: { id: v.id } })
          continue
        }
        const { _new, _del, ...clean } = v
        void _del
        const data = { ...clean, product_id: row.id, sale_price: clean.sale_price || null, is_loose: loose ? clean.is_loose : false }
        if (_new) await b.insert('variants', [data as unknown as Record<string, unknown>])
        else {
          const { id, product_id, ...rest } = data
          void product_id
          await b.update('variants', rest as unknown as Record<string, unknown>, { eq: { id } })
        }
      }
      return true
    }, 'Product saved')
    if (ok) location.href = `/admin/products/edit/?id=${row.id}`
  }

  async function del() {
    const ok = await run(async () => {
      const b = await getBackend()
      await b.remove('products', { eq: { id: p.id } })
      return true
    }, 'Product deleted')
    if (ok) location.href = '/admin/products/'
  }

  return (
    <div>
      <Link href="/admin/products/" className="text-[0.9rem] text-muted underline">
        ← All products
      </Link>
      <PageHead
        title={isNew ? 'New product' : p.name_en}
        sub={isNew ? undefined : p.name_hi}
        actions={
          <>
            {!isNew && (
              <a href={`/en/product/${p.id}/`} target="_blank" className="btn btn-ghost btn-sm">
                View on site
              </a>
            )}
            <button className="btn btn-brand btn-sm" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save product'}
            </button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Names and description">
            <div className="grid gap-4 sm:grid-cols-2">
              {isNew && (
                <Field label="Id (lowercase, dashes)" hint="Becomes the web address, for example toor-dal" className="sm:col-span-2">
                  <input className="input" value={p.id} onChange={(e) => set({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
                </Field>
              )}
              <Field label="Name (English)">
                <input className="input" value={p.name_en} onChange={(e) => set({ name_en: e.target.value })} />
              </Field>
              <Field label="Name (Hindi)">
                <input className="input" lang="hi" value={p.name_hi} onChange={(e) => set({ name_hi: e.target.value })} />
              </Field>
              <Field label="Description (English)" className="sm:col-span-2">
                <textarea className="input" value={p.description_en ?? ''} onChange={(e) => set({ description_en: e.target.value })} />
              </Field>
              <Field label="Description (Hindi)" className="sm:col-span-2">
                <textarea className="input" lang="hi" value={p.description_hi ?? ''} onChange={(e) => set({ description_hi: e.target.value })} />
              </Field>
              <Field label="Search words" hint="Other names people type: moongfali shengdana मूंगफली (separate with spaces)" className="sm:col-span-2">
                <input className="input" value={text.synonyms} onChange={(e) => setText({ ...text, synonyms: e.target.value })} />
              </Field>
            </div>
          </Panel>
          <Panel title="Prices and pack sizes" actions={<button className="btn btn-ghost btn-sm" onClick={addVariant}><Plus className="h-4 w-4" /> Add {loose ? 'variant' : 'pack size'}</button>}>
            <p className="mb-3 text-[0.9rem] text-muted">{loose ? 'Loose items: the price is per kg. Customers choose any weight from the minimum in steps.' : 'One row per pack. Weight is used for the 2 kg and 20 kg delivery rules.'}</p>
            {vs.filter((v) => !v._del).length === 0 && <Empty>No prices yet. Add one.</Empty>}
            <div className="space-y-3">
              {vs.map((v, i) =>
                v._del ? null : (
                  <div key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-12">
                    {v._new && (
                      <Field label="Variant id" className="sm:col-span-12">
                        <input className="input" value={v.id} onChange={(e) => setV(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
                      </Field>
                    )}
                    <Field label="Label (English)" className="sm:col-span-3">
                      <input className="input" value={v.label_en} onChange={(e) => setV(i, { label_en: e.target.value })} />
                    </Field>
                    <Field label="Label (Hindi)" className="sm:col-span-3">
                      <input className="input" lang="hi" value={v.label_hi} onChange={(e) => setV(i, { label_hi: e.target.value })} />
                    </Field>
                    <Field label={v.is_loose ? 'Price per kg (₹)' : 'Price (₹)'} className="sm:col-span-2">
                      <input type="number" min={0} step="0.5" className="input" value={v.price} onChange={(e) => setV(i, { price: Number(e.target.value), price_is_sample: false })} />
                    </Field>
                    <Field label="Sale price (₹)" className="sm:col-span-2">
                      <input type="number" min={0} step="0.5" className="input" value={v.sale_price ?? ''} onChange={(e) => setV(i, { sale_price: e.target.value ? Number(e.target.value) : null })} />
                    </Field>
                    <Field label="Weight (g)" className="sm:col-span-2">
                      <input type="number" min={1} className="input" value={v.unit_weight_g} onChange={(e) => setV(i, { unit_weight_g: Number(e.target.value) })} disabled={v.is_loose} />
                    </Field>
                    <div className="flex flex-wrap items-center gap-4 sm:col-span-12">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!v.price_is_sample} onChange={(e) => setV(i, { price_is_sample: !e.target.checked })} className="h-5 w-5 accent-[var(--color-leaf)]" />
                        Price checked (not a sample)
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={v.is_hidden} onChange={(e) => setV(i, { is_hidden: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
                        Hidden
                      </label>
                      <button className="ml-auto text-[0.9rem] text-brand underline" onClick={() => setV(i, { _del: true } as Partial<VRow>)}>
                        <Trash2 className="mr-1 inline h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
            <p className="mt-3 text-[0.85rem] text-muted">Stock is changed in Inventory, so every change is recorded.</p>
          </Panel>
          <Panel title="Search engines (optional)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Page title (English)">
                <input className="input" value={p.seo_title_en ?? ''} onChange={(e) => set({ seo_title_en: e.target.value || null })} />
              </Field>
              <Field label="Page title (Hindi)">
                <input className="input" value={p.seo_title_hi ?? ''} onChange={(e) => set({ seo_title_hi: e.target.value || null })} />
              </Field>
              <Field label="Description (English)">
                <textarea className="input !min-h-20" value={p.seo_description_en ?? ''} onChange={(e) => set({ seo_description_en: e.target.value || null })} />
              </Field>
              <Field label="Description (Hindi)">
                <textarea className="input !min-h-20" value={p.seo_description_hi ?? ''} onChange={(e) => set({ seo_description_hi: e.target.value || null })} />
              </Field>
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Photo">
            <ImageUpload value={p.image_url} bucket="products" onChange={(url) => set({ image_url: url, image_source: 'store', image_is_placeholder: false })} />
            <Field label="Photo source" className="mt-4">
              <select className="input" value={p.image_source} onChange={(e) => set({ image_source: e.target.value })}>
                <option value="store">Store photo</option>
                <option value="generated">Generated</option>
                <option value="stock">Stock photo</option>
                <option value="render">3D render</option>
                <option value="illustration">Illustration (kraft pouch)</option>
              </select>
            </Field>
            <label className="mt-3 flex items-center gap-2">
              <input type="checkbox" checked={p.image_is_placeholder} onChange={(e) => set({ image_is_placeholder: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
              Placeholder (needs a real photo)
            </label>
          </Panel>
          <Panel title="How it is sold">
            <div className="grid gap-3">
              <Field label="Category">
                <select className="input" value={p.category_id} onChange={(e) => set({ category_id: e.target.value })}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sold">
                <select className="input" value={p.sell_type} onChange={(e) => set({ sell_type: e.target.value as PRow['sell_type'] })}>
                  <option value="loose">Loose, by weight</option>
                  <option value="packed">Packed</option>
                  <option value="litre">By litre</option>
                  <option value="piece">By piece</option>
                </select>
              </Field>
              {loose && (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Min (g)">
                    <input type="number" className="input" value={p.min_qty_g ?? 250} onChange={(e) => set({ min_qty_g: Number(e.target.value) })} />
                  </Field>
                  <Field label="Step (g)">
                    <input type="number" className="input" value={p.step_g ?? 250} onChange={(e) => set({ step_g: Number(e.target.value) })} />
                  </Field>
                  <Field label="Max (g)">
                    <input type="number" className="input" value={p.max_qty_g ?? 100000} onChange={(e) => set({ max_qty_g: Number(e.target.value) })} />
                  </Field>
                </div>
              )}
              {loose && (
                <Field label="Ready weights (g)" hint="Shown as weight stones, e.g. 500, 1000, 5000, 25000">
                  <input className="input" value={text.packs} onChange={(e) => setText({ ...text, packs: e.target.value })} />
                </Field>
              )}
              <Field label={loose ? 'Limited stock below (g)' : 'Limited stock below (packs)'}>
                <input type="number" className="input" value={p.limited_stock_level} onChange={(e) => set({ limited_stock_level: Number(e.target.value) })} />
              </Field>
              <Field label="3D pieces">
                <select className="input" value={p.pour_kind ?? ''} onChange={(e) => set({ pour_kind: e.target.value || null })}>
                  <option value="">Same as category</option>
                  {Object.keys(POUR).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={p.is_special} onChange={(e) => set({ is_special: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" /> Gangasagar special
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={p.is_hidden} onChange={(e) => set({ is_hidden: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" /> Hidden from customers
              </label>
            </div>
          </Panel>
          <Panel title="Suggestions">
            <Field label="Often bought together" hint="Product ids, separated by commas">
              <input className="input" value={text.fbt} onChange={(e) => setText({ ...text, fbt: e.target.value })} placeholder="jaggery-block, til" />
            </Field>
            <Field label="Recommended" className="mt-3">
              <input className="input" value={text.rec} onChange={(e) => setText({ ...text, rec: e.target.value })} />
            </Field>
          </Panel>
          {!isNew && (
            <Panel title="Delete">
              <p className="mb-3 text-[0.9rem] text-muted">Hiding is safer: past orders keep their copy of the name and price either way.</p>
              <ConfirmButton label="Delete product" onConfirm={del} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
