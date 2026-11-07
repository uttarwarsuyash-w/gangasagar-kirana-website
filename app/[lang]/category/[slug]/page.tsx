import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCatalogue, getCategory } from '@/lib/catalogue'
import { getDict, LOCALES, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { ShopBrowser } from '@/components/product/ShopBrowser'
import { MiniPour } from '@/components/three/MiniPour'
import { Picture } from '@/components/ui/Picture'
import { imageKey } from '@/lib/images'
import { Pouch } from '@/components/product/Pouch'

export async function generateStaticParams() {
  const { categories } = await getCatalogue()
  return LOCALES.flatMap((lang) => categories.map((c) => ({ lang, slug: c.id })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params
  const c = await getCategory(slug)
  if (!c) return {}
  const name = lang === 'hi' ? c.name_hi : c.name_en
  return {
    title: name,
    description:
      (lang === 'hi' ? c.seo_description_hi : c.seo_description_en) ??
      (lang === 'hi' ? `${name}: गंगासागर किराणा स्टोअर्स, गोकुल नगर, नांदेड़। खुला या पैक, होम डिलीवरी या पिकअप।` : `${name} at Gangasagar Kirana Stores, Gokul Nagar, Nanded. Loose or packed, home delivery or store pickup.`),
    alternates: { canonical: `${SITE_URL}/${lang}/category/${slug}/`, languages: { en: `${SITE_URL}/en/category/${slug}/`, hi: `${SITE_URL}/hi/category/${slug}/` } },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string }
  const t = getDict(lang)
  const { products, categories } = await getCatalogue()
  const c = categories.find((x) => x.id === slug)
  if (!c) notFound()
  const items = products.filter((p) => p.category_id === c.id)
  const render = imageKey(`renders/cat-${c.id}`) ? `/img/renders/cat-${c.id}` : null
  const main = lang === 'hi' ? c.name_hi : c.name_en
  const other = lang === 'hi' ? c.name_en : c.name_hi
  const idx = categories.findIndex((x) => x.id === c.id)
  const fallback = render ? (
    <Picture src={render} alt="" sizes="100vw" className="absolute inset-x-0 bottom-0 block h-full" imgClassName="object-cover object-bottom" />
  ) : (
    <div className="absolute bottom-0 right-[6%] h-[85%] w-[38%] max-w-[20rem]">
      <Pouch nameEn={c.name_en} nameHi={c.name_hi} colour={c.colour} className="!bg-transparent" />
    </div>
  )
  return (
    <>
      <section className="relative overflow-hidden" style={{ background: `color-mix(in oklab, ${c.colour} 13%, var(--color-paper))` }}>
        <div className="wrap relative z-10 pb-36 pt-10 sm:pb-44 sm:pt-16">
          <nav aria-label="Breadcrumb" className="meta">
            <Link href={`/${lang}/shop/`} className="hover:text-ink">
              {t.shop.title}
            </Link>{' '}
            / <span className="tnum">{String(idx + 1).padStart(2, '0')}</span>
          </nav>
          <h1 className={`display-xl mt-4 max-w-[12ch] ${lang === 'hi' ? 'deva' : ''}`}>{main}</h1>
          <p className="display-m mt-2" style={{ color: c.colour }} lang={lang === 'hi' ? 'en' : 'hi'}>
            {other}
          </p>
          <p className="meta mt-6">{t.shop.productsCount.replace('{n}', String(items.length))}</p>
        </div>
        {c.pour_kind ? <MiniPour kind={c.pour_kind} pieceScale={1.5} className="pointer-events-auto absolute inset-0 z-[5]" fallback={fallback} /> : fallback}
      </section>
      <div className="wrap pt-6">
        <ShopBrowser products={items} categories={categories} fixedCategory={c.id} />
        <div className="mt-20">
          <p className="meta mb-3">{t.nav.categories}</p>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((x) => x.id !== c.id)
              .map((x) => (
                <Link key={x.id} href={`/${lang}/category/${x.id}/`} className="chip">
                  {lang === 'hi' ? x.name_hi : x.name_en}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
