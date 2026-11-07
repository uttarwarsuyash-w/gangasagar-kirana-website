import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCatalogue, getProduct, startingPrice } from '@/lib/catalogue'
import { getDict, LOCALES, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { ProductArt } from '@/components/product/ProductArt'
import { ProductBuy } from '@/components/product/ProductBuy'
import { ProductCard } from '@/components/product/ProductCard'
import { Reviews } from '@/components/product/Reviews'
import { MiniPour } from '@/components/three/MiniPour'
import { JsonLd } from '@/components/content/JsonLd'
import { imageKey } from '@/lib/images'

export async function generateStaticParams() {
  const { products } = await getCatalogue()
  return LOCALES.flatMap((lang) => products.map((p) => ({ lang, slug: p.id })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params
  const p = await getProduct(slug)
  if (!p) return {}
  const name = lang === 'hi' ? p.name_hi : p.name_en
  const title = (lang === 'hi' ? p.seo_title_hi : p.seo_title_en) || name
  const description = (lang === 'hi' ? p.seo_description_hi : p.seo_description_en) || (lang === 'hi' ? p.description_hi : p.description_en) || undefined
  const key = imageKey(p.image_url)
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${lang}/product/${slug}/`, languages: { en: `${SITE_URL}/en/product/${slug}/`, hi: `${SITE_URL}/hi/product/${slug}/` } },
    openGraph: key ? { images: [`/img/${key}-480.webp`] } : undefined,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = (await params) as { lang: Lang; slug: string }
  const t = getDict(lang)
  const { products, categories } = await getCatalogue()
  const product = products.find((p) => p.id === slug)
  if (!product) notFound()
  const cat = categories.find((c) => c.id === product.category_id)!
  const colour = cat.colour
  const name = lang === 'hi' ? product.name_hi : product.name_en
  const other = lang === 'hi' ? product.name_en : product.name_hi
  const desc = lang === 'hi' ? product.description_hi : product.description_en
  const byId = new Map(products.map((p) => [p.id, p]))
  const fbt = (product.frequently_bought ?? []).map((id) => byId.get(id)).filter(Boolean) as typeof products
  const rec = (product.recommended ?? []).map((id) => byId.get(id)).filter(Boolean) as typeof products
  const sameShelf = products.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4)
  const sp = startingPrice(product)
  const verified = product.variants.every((v) => !v.price_is_sample)
  const ld = verified
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name_en,
        alternateName: product.name_hi,
        description: product.description_en,
        category: cat.name_en,
        image: imageKey(product.image_url) ? `${SITE_URL}/img/${imageKey(product.image_url)}-480.webp` : undefined,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: sp?.price,
          offerCount: product.variants.length,
          seller: { '@id': `${SITE_URL}/#store` },
        },
      }
    : null
  const pour = product.pour_kind ?? cat.pour_kind
  const art = (
    <ProductArt image={product.image_url} nameEn={product.name_en} nameHi={product.name_hi} colour={colour} alt={name} sizes="(min-width: 1024px) 45vw, 92vw" priority vt={`p-${product.id}`} />
  )

  return (
    <>
      {ld && <JsonLd data={ld} />}
      <div className="wrap pt-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="meta flex flex-wrap gap-1">
          <Link href={`/${lang}/shop/`} className="hover:text-ink">
            {t.shop.title}
          </Link>
          <span>/</span>
          <Link href={`/${lang}/category/${cat.id}/`} className="hover:text-ink">
            {lang === 'hi' ? cat.name_hi : cat.name_en}
          </Link>
        </nav>
        <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* stage */}
          <div className="lg:col-span-6">
            <div className="relative lg:sticky lg:top-28">
              <div className="relative aspect-square overflow-hidden rounded-[2rem]" style={{ background: `color-mix(in oklab, ${colour} 14%, var(--color-paper-2))` }}>
                <div className="absolute inset-[9%] rotate-[-2.5deg] overflow-hidden rounded-[1.4rem] shadow-[0_30px_60px_-30px_rgb(31_26_23/0.6)]">{art}</div>
                {pour && <MiniPour kind={pour} pieceScale={1.35} className="pointer-events-auto absolute inset-0 z-[5]" />}
              </div>
              {product.image_is_placeholder && <p className="hand mt-3 text-[1.05rem] text-muted">{t.common.replaceNote}</p>}
            </div>
          </div>
          {/* buy box */}
          <div className="lg:col-span-6">
            <h1 className={`display-l ${lang === 'hi' ? 'deva' : ''}`}>{name}</h1>
            <p className="display-s mt-2" style={{ color: colour }} lang={lang === 'hi' ? 'en' : 'hi'}>
              {other}
            </p>
            <p className="meta mt-4">{t.sell[product.sell_type]}</p>
            <div className="mt-6">
              <ProductBuy product={product} colour={colour} />
            </div>
            <div className="mt-12 border-t border-line pt-8">
              <h2 className="font-display text-xl font-[650]">{t.product.details}</h2>
              {desc && <p className="mt-3 max-w-[60ch] text-[1.05rem]">{desc}</p>}
              {product.synonyms.length > 0 && (
                <p className="mt-4 text-[0.9rem] text-muted">
                  <span className="font-semibold text-ink">{t.product.alsoCalled}: </span>
                  {product.synonyms.filter((s) => s.length > 2).slice(0, 10).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {[
        { title: t.product.frequentlyBought, items: fbt },
        { title: t.product.recommended, items: rec.length ? rec : fbt.length ? [] : sameShelf },
      ].map((s) =>
        s.items.length ? (
          <section key={s.title} className="wrap mt-24">
            <h2 className="display-s">{s.title}</h2>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
              {s.items.map((p) => (
                <ProductCard key={p.id} product={p} colour={categories.find((c) => c.id === p.category_id)?.colour ?? colour} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <div className="wrap mt-24">
        <Reviews productId={product.id} />
      </div>
    </>
  )
}
