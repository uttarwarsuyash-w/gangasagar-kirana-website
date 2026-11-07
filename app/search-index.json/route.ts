import { getCatalogue, startingPrice } from '@/lib/catalogue'
import type { SearchDoc } from '@/lib/search'

export const dynamic = 'force-static'

export async function GET() {
  const { products } = await getCatalogue()
  const docs: SearchDoc[] = products.map((p) => {
    const sp = startingPrice(p)
    return { id: p.id, c: p.category_id, en: p.name_en, hi: p.name_hi, s: p.synonyms.join(' '), img: p.image_url, p: sp?.price ?? null, k: !!sp?.perKg }
  })
  return Response.json(docs)
}
