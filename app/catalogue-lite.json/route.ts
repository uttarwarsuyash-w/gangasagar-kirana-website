import { getCatalogue } from '@/lib/catalogue'

export const dynamic = 'force-static'

// Compact catalogue for rebuilding bag items (sign-in merge, reorder, wholesale list).
export async function GET() {
  const { products } = await getCatalogue()
  const p: Record<string, unknown[]> = {}
  const v: Record<string, unknown[]> = {}
  for (const x of products) {
    p[x.id] = [x.name_en, x.name_hi, x.category_id, x.image_url, x.pour_kind, x.min_qty_g, x.step_g, x.max_qty_g]
    for (const y of x.variants) v[y.id] = [x.id, y.label_en, y.label_hi, y.is_loose, y.unit_weight_g, y.price, y.sale_price, y.price_is_sample]
  }
  return Response.json({ p, v })
}
