import type { Product, Variant } from '@/lib/types'
import type { CartSnap } from '@/components/providers/Cart'
import type { FeeSettings } from '@/lib/commerce/rules'

export function snapOf(p: Product, v: Variant, colour: string): CartSnap {
  void colour
  return {
    name_en: p.name_en,
    name_hi: p.name_hi,
    label_en: v.label_en,
    label_hi: v.label_hi,
    is_loose: v.is_loose,
    unit_weight_g: v.unit_weight_g,
    price: v.price,
    sale_price: v.sale_price,
    sample: v.price_is_sample,
    image: p.image_url,
    category: p.category_id,
    pour: p.pour_kind,
    min_qty_g: p.min_qty_g,
    step_g: p.step_g,
    max_qty_g: p.max_qty_g,
  }
}

/** Quick-add amount for loose items: 500 g when that is a valid step, otherwise the minimum. */
export function defaultLooseQty(p: Pick<Product, 'min_qty_g' | 'step_g'>, fees: FeeSettings) {
  const mn = p.min_qty_g ?? fees.loose_min_g
  const st = p.step_g ?? fees.loose_step_g
  return mn < 500 && (500 - mn) % st === 0 ? 500 : mn
}
