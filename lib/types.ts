export type SellType = 'loose' | 'packed' | 'litre' | 'piece'
export type Availability = 'available' | 'limited' | 'out'
export type ImageSource = 'store' | 'generated' | 'stock' | 'render' | 'illustration'

export interface Variant {
  id: string
  label_en: string
  label_hi: string
  is_loose: boolean
  unit_weight_g: number
  price: number
  sale_price: number | null
  price_is_sample: boolean
  stock?: number
}

export interface Product {
  id: string
  category_id: string
  name_en: string
  name_hi: string
  synonyms: string[]
  description_en: string | null
  description_hi: string | null
  sell_type: SellType
  min_qty_g: number | null
  step_g: number | null
  max_qty_g: number | null
  pack_sizes_g: number[]
  limited_stock_level?: number
  is_special: boolean
  pour_kind: string | null
  image_url: string | null
  image_source: ImageSource
  image_is_placeholder: boolean
  sort: number
  frequently_bought?: string[]
  recommended?: string[]
  seo_title_en?: string | null
  seo_title_hi?: string | null
  seo_description_en?: string | null
  seo_description_hi?: string | null
  variants: Variant[]
}

export interface Category {
  id: string
  name_en: string
  name_hi: string
  description_en?: string | null
  description_hi?: string | null
  pour_kind: string | null
  colour: string
  image_url?: string | null
  sort: number
}

export interface Catalogue {
  categories: Category[]
  products: Product[]
}

/** live_catalogue() payload: variant id -> [price, sale_price, availability] */
export type LivePrices = Record<string, [number, number | null, Availability]>
