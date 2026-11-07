'use client'
// Live prices, availability and store settings. Static pages ship with the build-time catalogue;
// this layer refreshes prices so an admin's price edit shows at once without a rebuild.
import { createContext, useContext, useEffect, useState } from 'react'
import type { LivePrices, Availability } from '@/lib/types'
import { DEFAULT_FEES, type FeeSettings } from '@/lib/commerce/rules'
import { liveFetch } from '@/lib/backend/live'

export interface PublicSettings {
  store_mode: 'preview' | 'live'
  fees: FeeSettings
  pincodes: string[]
  upi: { id: string; payee: string; qr_url: string }
  google_reviews: { read_url: string; write_url: string }
  raw: Record<string, unknown>
}

const DEFAULT_SETTINGS: PublicSettings = {
  store_mode: 'preview',
  fees: DEFAULT_FEES,
  pincodes: ['431602'],
  upi: { id: '', payee: 'Gangasagar Kirana Stores', qr_url: '' },
  google_reviews: { read_url: 'https://maps.app.goo.gl/mzZXA5a35tAJ3oyj6', write_url: 'https://maps.app.goo.gl/mzZXA5a35tAJ3oyj6' },
  raw: {},
}

interface Ctx {
  prices: LivePrices | null
  settings: PublicSettings
  ready: boolean
  priceOf: (variantId: string, fallback: { price: number; sale_price: number | null }) => { price: number; sale_price: number | null; unit: number }
  availabilityOf: (variantId: string) => Availability | null
  refresh: () => void
}

const LiveCtx = createContext<Ctx | null>(null)

export function toSettings(raw: Record<string, any>): PublicSettings {
  const n = (k: keyof FeeSettings) => (raw[k] != null ? Number(raw[k]) : DEFAULT_FEES[k])
  return {
    store_mode: raw.store_mode === 'live' ? 'live' : 'preview',
    fees: {
      free_delivery_min_value: n('free_delivery_min_value'),
      heavy_weight_g: n('heavy_weight_g'),
      fee_heavy: n('fee_heavy'),
      fee_light: n('fee_light'),
      outside_flat_fee: n('outside_flat_fee'),
      bulk_threshold_g: n('bulk_threshold_g'),
      loose_min_g: n('loose_min_g'),
      loose_step_g: n('loose_step_g'),
      custom_min_g: n('custom_min_g'),
    },
    pincodes: Array.isArray(raw.delivery_pincodes) ? raw.delivery_pincodes : DEFAULT_SETTINGS.pincodes,
    upi: { ...DEFAULT_SETTINGS.upi, ...(raw.upi ?? {}) },
    google_reviews: { ...DEFAULT_SETTINGS.google_reviews, ...(raw.google_reviews ?? {}) },
    raw,
  }
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<LivePrices | null>(null)
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    liveFetch()
      .then((r) => {
        if (!alive || !r) return
        setPrices(r.prices)
        setSettings(toSettings(r.settings))
      })
      .catch(() => {})
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [tick])

  const value: Ctx = {
    prices,
    settings,
    ready,
    priceOf(id, fb) {
      const l = prices?.[id]
      const price = l ? Number(l[0]) : fb.price
      const sale = l ? (l[1] == null ? null : Number(l[1])) : fb.sale_price
      return { price, sale_price: sale, unit: sale ?? price }
    },
    availabilityOf: (id) => prices?.[id]?.[2] ?? null,
    refresh: () => setTick((t) => t + 1),
  }
  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>
}

export function useLive() {
  const c = useContext(LiveCtx)
  if (!c) throw new Error('useLive outside provider')
  return c
}
