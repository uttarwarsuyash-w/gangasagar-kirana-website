// Build-time catalogue. Uses the Supabase database when its keys are set at build time
// (so the admin's Publish button rebuilds pages from live data), otherwise the seed file.
import seed from '@/seed/catalogue.json'
import type { Catalogue, Category, Product } from './types'

let cache: Promise<Catalogue> | null = null

async function fromSupabase(url: string, key: string): Promise<Catalogue | null> {
  const h = { apikey: key, Authorization: `Bearer ${key}` }
  const get = async (path: string) => {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: h, cache: 'no-store' })
    if (!r.ok) throw new Error(`${path}: ${r.status}`)
    return r.json()
  }
  try {
    const [cats, prods, vars] = await Promise.all([
      get('categories?select=id,name_en,name_hi,description_en,description_hi,pour_kind,colour,image_url,sort&order=sort'),
      get(
        'products?select=id,category_id,name_en,name_hi,synonyms,description_en,description_hi,sell_type,min_qty_g,step_g,max_qty_g,pack_sizes_g,is_special,pour_kind,image_url,image_source,image_is_placeholder,sort,frequently_bought,recommended,seo_title_en,seo_title_hi,seo_description_en,seo_description_hi&order=sort',
      ),
      get('variants?select=id,product_id,label_en,label_hi,is_loose,unit_weight_g,price,sale_price,price_is_sample,sort&order=sort'),
    ])
    const byProduct = new Map<string, Product['variants']>()
    for (const v of vars) {
      const list = byProduct.get(v.product_id) ?? []
      list.push({ ...v, price: Number(v.price), sale_price: v.sale_price == null ? null : Number(v.sale_price) })
      byProduct.set(v.product_id, list)
    }
    const products = (prods as Product[]).map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] })).filter((p) => p.variants.length)
    return { categories: cats as Category[], products }
  } catch (e) {
    console.warn('[catalogue] Supabase unavailable at build, using seed data:', (e as Error).message)
    return null
  }
}

export function getCatalogue(): Promise<Catalogue> {
  cache ??= (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      const live = await fromSupabase(url, key)
      if (live) return live
    }
    return seed as unknown as Catalogue
  })()
  return cache
}

export async function getProduct(id: string) {
  return (await getCatalogue()).products.find((p) => p.id === id)
}

export async function getCategory(id: string) {
  return (await getCatalogue()).categories.find((c) => c.id === id)
}

export function startingPrice(p: Product) {
  const v = p.variants[0]
  if (!v) return null
  const unit = v.sale_price ?? v.price
  // Loose: show per-kg price; packs: cheapest pack.
  if (v.is_loose) return { price: unit, perKg: true, sample: v.price_is_sample }
  const min = p.variants.reduce((a, b) => ((b.sale_price ?? b.price) < (a.sale_price ?? a.price) ? b : a))
  return { price: min.sale_price ?? min.price, perKg: false, sample: min.price_is_sample }
}
