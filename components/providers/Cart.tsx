'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createStore } from '@/lib/store'
import { lineTotal, lineWeight, meter as computeMeter } from '@/lib/commerce/rules'
import { useLive } from './Live'
import { useSession } from './Session'
import { getBackend } from '@/lib/backend'

export interface CartSnap {
  name_en: string
  name_hi: string
  label_en: string
  label_hi: string
  is_loose: boolean
  unit_weight_g: number
  price: number
  sale_price: number | null
  sample: boolean
  image: string | null
  category: string
  pour: string | null
  min_qty_g: number | null
  step_g: number | null
  max_qty_g: number | null
}

export interface CartItem {
  variant_id: string
  product_id: string
  quantity: number
  snap: CartSnap
}

interface CartState {
  items: CartItem[]
}

const store = createStore<CartState>('gs-cart-v1', { items: [] })

export interface CartLine extends CartItem {
  unit: number
  total: number
  weight: number
}

interface Ctx {
  items: CartLine[]
  count: number
  subtotal: number
  weight: number
  meter: ReturnType<typeof computeMeter>
  open: boolean
  setOpen: (v: boolean) => void
  add: (item: CartItem) => void
  setQty: (variantId: string, quantity: number) => void
  remove: (variantId: string) => void
  clear: () => void
  replace: (items: { variant_id: string; quantity: number }[], snaps?: Record<string, { product_id: string; snap: CartSnap }>) => void
  lastAdded: { id: number; item: CartItem } | null
}

const CartCtx = createContext<Ctx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.get, store.getServer)
  const { priceOf, settings } = useLive()
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState<Ctx['lastAdded']>(null)
  const merged = useRef<string | null>(null)

  const items: CartLine[] = useMemo(
    () =>
      state.items.map((it) => {
        const pr = priceOf(it.variant_id, { price: it.snap.price, sale_price: it.snap.sale_price })
        return {
          ...it,
          unit: pr.unit,
          total: lineTotal(pr.unit, it.quantity, it.snap.is_loose),
          weight: lineWeight(it.quantity, it.snap.is_loose, it.snap.unit_weight_g),
        }
      }),
    [state.items, priceOf],
  )
  const subtotal = Math.round(items.reduce((a, b) => a + b.total, 0) * 100) / 100
  const weight = items.reduce((a, b) => a + b.weight, 0)
  const meter = computeMeter(subtotal, weight, settings.fees)

  // Guest bag merges into the account on sign-in, then stays in sync.
  useEffect(() => {
    if (!user || merged.current === user.id) return
    merged.current = user.id
    getBackend()
      .then((b) => b.rpc<{ variant_id: string; quantity: number }[]>('merge_cart', { items: store.get().items.map(({ variant_id, quantity }) => ({ variant_id, quantity })) }))
      .then(async (server) => {
        const local = store.get().items
        const missing = server.filter((s) => !local.some((l) => l.variant_id === s.variant_id))
        if (!missing.length) return
        const snaps = await fetchSnaps(missing.map((m) => m.variant_id))
        store.set((s) => ({
          items: [
            ...s.items,
            ...missing.filter((m) => snaps[m.variant_id]).map((m) => ({ variant_id: m.variant_id, quantity: m.quantity, ...snaps[m.variant_id] })),
          ],
        }))
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user || merged.current !== user.id) return
    const t = setTimeout(() => {
      getBackend()
        .then((b) => b.rpc('save_cart', { items: state.items.map(({ variant_id, quantity }) => ({ variant_id, quantity })) }))
        .catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [state.items, user])

  const add = useCallback((item: CartItem) => {
    store.set((s) => {
      const ex = s.items.find((i) => i.variant_id === item.variant_id)
      if (ex) return { items: s.items.map((i) => (i.variant_id === item.variant_id ? { ...i, quantity: i.quantity + item.quantity, snap: item.snap } : i)) }
      return { items: [...s.items, item] }
    })
    setLastAdded({ id: Date.now(), item })
  }, [])

  const value: Ctx = {
    items,
    count: items.length,
    subtotal,
    weight,
    meter,
    open,
    setOpen,
    add,
    setQty: (id, q) => store.set((s) => ({ items: s.items.map((i) => (i.variant_id === id ? { ...i, quantity: q } : i)) })),
    remove: (id) => store.set((s) => ({ items: s.items.filter((i) => i.variant_id !== id) })),
    clear: () => store.set({ items: [] }),
    replace: (list, snaps) =>
      store.set((s) => ({
        items: list
          .map((l) => {
            const existing = s.items.find((i) => i.variant_id === l.variant_id)
            const sn = snaps?.[l.variant_id] ?? (existing ? { product_id: existing.product_id, snap: existing.snap } : null)
            return sn ? { variant_id: l.variant_id, quantity: l.quantity, product_id: sn.product_id, snap: sn.snap } : null
          })
          .filter(Boolean) as CartItem[],
      })),
    lastAdded,
  }
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const c = useContext(CartCtx)
  if (!c) throw new Error('useCart outside provider')
  return c
}

/** Build cart snapshots for variant ids from the public search index (used for merges and reorders). */
export async function fetchSnaps(ids: string[]): Promise<Record<string, { product_id: string; snap: CartSnap }>> {
  const r = await fetch('/catalogue-lite.json')
  const data: { v: Record<string, [string, string, string, boolean, number, number, number | null, boolean]>; p: Record<string, [string, string, string, string | null, string | null, number | null, number | null, number | null]> } =
    await r.json()
  const out: Record<string, { product_id: string; snap: CartSnap }> = {}
  for (const id of ids) {
    const v = data.v[id]
    if (!v) continue
    const [pid, le, lh, loose, w, price, sale, sample] = v
    const p = data.p[pid]
    if (!p) continue
    out[id] = {
      product_id: pid,
      snap: {
        name_en: p[0],
        name_hi: p[1],
        category: p[2],
        image: p[3],
        pour: p[4],
        min_qty_g: p[5],
        step_g: p[6],
        max_qty_g: p[7],
        label_en: le,
        label_hi: lh,
        is_loose: loose,
        unit_weight_g: w,
        price,
        sale_price: sale,
        sample,
      },
    }
  }
  return out
}
