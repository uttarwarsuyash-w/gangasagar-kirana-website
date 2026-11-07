import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { getCatalogue } from '@/lib/catalogue'
import { Gallery, type GalleryItem } from '@/components/content/Gallery'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return { title: t.gallery.title, alternates: { canonical: `${SITE_URL}/${lang}/gallery/`, languages: { en: `${SITE_URL}/en/gallery/`, hi: `${SITE_URL}/hi/gallery/` } } }
}

export default async function GalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  const { products } = await getCatalogue()
  const s = (id: string, album: string, image_url: string, caption_en: string, caption_hi: string): GalleryItem => ({ id, album, image_url, caption_en, caption_hi, source: 'store' })
  const items: GalleryItem[] = [
    s('interior', 'store', '/img/shop/interior', 'Inside the store', 'दुकान के अंदर'),
    s('today', 'store', '/img/journey/3-today', 'The shop today', 'आज की दुकान'),
    s('beginning', 'history', '/img/journey/1-beginning', 'The beginning', 'शुरुआत'),
    s('renovated', 'history', '/img/journey/2-renovated', 'Renovated', 'नया रूप'),
    ...products.filter((p) => p.image_source === 'store' && p.image_url).map((p) => s(`p-${p.id}`, 'products', p.image_url!, p.name_en, p.name_hi)),
  ]
  return (
    <div className="wrap pt-12 sm:pt-20">
      <h1 className="display-xl">{t.gallery.title}</h1>
      <p className="lede mb-12 mt-6">{t.gallery.lede}</p>
      <Gallery initial={items} />
    </div>
  )
}
