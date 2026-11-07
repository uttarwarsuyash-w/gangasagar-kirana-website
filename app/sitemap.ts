import type { MetadataRoute } from 'next'
import { getCatalogue } from '@/lib/catalogue'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

const PAGES = ['', 'shop/', 'wholesale/', 'offers/', 'journey/', 'leadership/', 'gallery/', 'blog/', 'contact/', 'faq/', 'terms/', 'privacy/', 'shipping/']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await getCatalogue()
  const paths = [...PAGES, ...categories.map((c) => `category/${c.id}/`), ...products.map((p) => `product/${p.id}/`)]
  return paths.map((p) => ({
    url: `${SITE_URL}/en/${p}`,
    alternates: { languages: { en: `${SITE_URL}/en/${p}`, hi: `${SITE_URL}/hi/${p}`, 'x-default': `${SITE_URL}/en/${p}` } },
    changeFrequency: p.startsWith('product') ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : p.startsWith('category') || p === 'shop/' ? 0.8 : 0.6,
  }))
}
