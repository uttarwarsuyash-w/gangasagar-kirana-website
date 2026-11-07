'use client'
import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { Category, Product } from '@/lib/types'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { ProductCard } from './ProductCard'
import { buildIndex, search } from '@/lib/search'
import { Dialog } from '@/components/ui/Dialog'

type Sort = 'store' | 'low' | 'high' | 'name'
type PriceBucket = '' | 'u100' | '100-300' | '300-800' | 'o800'
const BUCKETS: Record<Exclude<PriceBucket, ''>, [number, number]> = { u100: [0, 100], '100-300': [100, 300], '300-800': [300, 800], o800: [800, Infinity] }

interface Props {
  products: Product[]
  categories: Category[]
  fixedCategory?: string
  initialQuery?: string
}

export function ShopBrowser({ products, categories, fixedCategory, initialQuery = '' }: Props) {
  const { t, f, lang } = useI18n()
  const live = useLive()
  const [cat, setCat] = useState(fixedCategory ?? '')
  const [price, setPrice] = useState<PriceBucket>('')
  const [type, setType] = useState<'' | 'loose' | 'packed'>('')
  const [inStock, setInStock] = useState(false)
  const [sort, setSort] = useState<Sort>('store')
  const [q, setQ] = useState(initialQuery)
  const [sheet, setSheet] = useState(false)
  const colour = useMemo(() => new Map(categories.map((c) => [c.id, c.colour])), [categories])

  // Keep filters in the URL so a filtered shelf can be shared and survives back/forward.
  useEffect(() => {
    const u = new URLSearchParams(location.search)
    if (!fixedCategory && u.get('c')) setCat(u.get('c')!)
    if (u.get('p')) setPrice(u.get('p') as PriceBucket)
    if (u.get('t')) setType(u.get('t') as 'loose' | 'packed')
    if (u.get('s')) setSort(u.get('s') as Sort)
    if (u.get('stock')) setInStock(true)
    if (u.get('q')) setQ(u.get('q')!)
  }, [fixedCategory])
  useEffect(() => {
    const u = new URLSearchParams()
    if (cat && !fixedCategory) u.set('c', cat)
    if (price) u.set('p', price)
    if (type) u.set('t', type)
    if (sort !== 'store') u.set('s', sort)
    if (inStock) u.set('stock', '1')
    if (q) u.set('q', q)
    const s = u.toString()
    history.replaceState(history.state, '', s ? `?${s}` : location.pathname)
  }, [cat, price, type, sort, inStock, q, fixedCategory])

  const index = useMemo(
    () => buildIndex(products.map((p) => ({ id: p.id, c: p.category_id, en: p.name_en, hi: p.name_hi, s: p.synonyms.join(' '), img: null, p: null, k: false }))),
    [products],
  )

  const unitOf = (p: Product) => {
    const v = p.variants[0]
    if (!v) return Infinity
    if (v.is_loose) return live.priceOf(v.id, v).unit
    return Math.min(...p.variants.map((x) => live.priceOf(x.id, x).unit))
  }
  const availOf = (p: Product) => (p.variants.some((v) => (live.availabilityOf(v.id) ?? 'available') !== 'out') ? 'in' : 'out')

  const list = useMemo(() => {
    let l = products
    if (q.trim()) {
      const ids = search(index, q, 500).map((d) => d.id)
      const order = new Map(ids.map((id, i) => [id, i]))
      l = l.filter((p) => order.has(p.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    }
    if (cat) l = l.filter((p) => p.category_id === cat)
    if (type) l = l.filter((p) => (type === 'loose' ? p.sell_type === 'loose' : p.sell_type !== 'loose'))
    if (price) {
      const [a, b] = BUCKETS[price]
      l = l.filter((p) => unitOf(p) >= a && unitOf(p) < b)
    }
    if (inStock) l = l.filter((p) => availOf(p) === 'in')
    const name = (p: Product) => (lang === 'hi' ? p.name_hi : p.name_en)
    if (sort === 'low') l = [...l].sort((a, b) => unitOf(a) - unitOf(b))
    if (sort === 'high') l = [...l].sort((a, b) => unitOf(b) - unitOf(a))
    if (sort === 'name') l = [...l].sort((a, b) => name(a).localeCompare(name(b), lang))
    return l
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, cat, type, price, inStock, sort, lang, live.prices, index])

  const active = (cat && !fixedCategory ? 1 : 0) + (price ? 1 : 0) + (type ? 1 : 0) + (inStock ? 1 : 0)
  const clear = () => {
    if (!fixedCategory) setCat('')
    setPrice('')
    setType('')
    setInStock(false)
    setQ('')
  }

  const filters = (
    <div className="space-y-7">
      {!fixedCategory && (
        <fieldset>
          <legend className="meta mb-3">{t.shop.category}</legend>
          <div className="flex flex-wrap gap-2">
            <button className="chip" aria-pressed={!cat} onClick={() => setCat('')}>
              {t.shop.allProducts}
            </button>
            {categories.map((c) => (
              <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? '' : c.id)}>
                {lang === 'hi' ? c.name_hi : c.name_en}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="meta mb-3">{t.shop.price}</legend>
        <div className="flex flex-wrap gap-2">
          {(['', 'u100', '100-300', '300-800', 'o800'] as PriceBucket[]).map((b) => (
            <button key={b} className="chip" aria-pressed={price === b} onClick={() => setPrice(b)}>
              {b === ''
                ? t.shop.anyPrice
                : b === 'u100'
                  ? f(t.shop.priceUnder, { n: 100 })
                  : b === 'o800'
                    ? f(t.shop.priceOver, { n: 800 })
                    : f(t.shop.priceBetween, { a: BUCKETS[b][0], b: BUCKETS[b][1] })}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="meta mb-3">{t.shop.type}</legend>
        <div className="flex flex-wrap gap-2">
          <button className="chip" aria-pressed={type === ''} onClick={() => setType('')}>
            {t.shop.allProducts}
          </button>
          <button className="chip" aria-pressed={type === 'loose'} onClick={() => setType('loose')}>
            {t.sell.loose}
          </button>
          <button className="chip" aria-pressed={type === 'packed'} onClick={() => setType('packed')}>
            {t.sell.packed}
          </button>
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" />
        <span className="font-medium">{t.shop.inStockOnly}</span>
      </label>
    </div>
  )

  return (
    <div>
      <div className="sticky top-[4.25rem] z-30 -mx-[clamp(1.125rem,4vw,3.5rem)] mb-8 flex items-center gap-2 border-b border-line bg-paper/90 px-[clamp(1.125rem,4vw,3.5rem)] py-3 backdrop-blur-md sm:top-[4.75rem]">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t.search.label}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search.placeholder} className="input !min-h-11 !rounded-full !pl-5" type="search" />
        </label>
        <button className="btn btn-ghost btn-sm !min-h-11 shrink-0" onClick={() => setSheet(true)} aria-haspopup="dialog">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t.shop.filters}</span>
          {active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.75rem] text-white">{active}</span>}
        </button>
        <label className="shrink-0">
          <span className="sr-only">{t.shop.sort}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input !min-h-11 !w-auto !rounded-full !py-2 !pr-8 text-[0.95rem]">
            <option value="store">{t.shop.sortPopular}</option>
            <option value="low">{t.shop.sortPriceLow}</option>
            <option value="high">{t.shop.sortPriceHigh}</option>
            <option value="name">{t.shop.sortName}</option>
          </select>
        </label>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <p className="meta mr-2" aria-live="polite">
          {f(t.shop.productsCount, { n: list.length })}
        </p>
        {active > 0 && (
          <button className="chip !min-h-8 !py-0.5 text-[0.85rem]" onClick={clear}>
            <X className="h-3.5 w-3.5" /> {t.shop.clear}
          </button>
        )}
      </div>

      {list.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} colour={colour.get(p.category_id) ?? '#B3263A'} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-start rounded-[1.75rem] border-2 border-dashed border-line p-10">
          <EmptyShelf />
          <p className="display-s mt-6">{t.shop.noResults}</p>
          <p className="mt-2 max-w-[48ch] text-muted">{t.shop.noResultsBody}</p>
          <button className="btn btn-ink mt-6" onClick={clear}>
            {t.shop.clear}
          </button>
        </div>
      )}

      <Dialog open={sheet} onClose={() => setSheet(false)} title={t.shop.filters} variant="right" closeLabel={t.nav.close}>
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{filters}</div>
          <div className="flex gap-2 border-t border-line px-5 py-4 sm:px-6">
            <button className="btn btn-ghost flex-1" onClick={clear}>
              {t.shop.clear}
            </button>
            <button className="btn btn-ink flex-1" onClick={() => setSheet(false)}>
              {f(t.shop.showing, { n: list.length })}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export function EmptyShelf() {
  return (
    <svg viewBox="0 0 220 120" className="h-24 w-auto text-ink" aria-hidden>
      <path d="M10 40h200M10 100h200" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 40v70M200 40v70" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M150 100 q8 -26 26 -22 q-2 18 -26 22z" fill="var(--color-kraft)" />
      <circle cx="60" cy="92" r="6" fill="#b8644a" />
      <text x="70" y="30" className="hand" fontSize="16" fill="var(--color-brand)">
        …
      </text>
    </svg>
  )
}
