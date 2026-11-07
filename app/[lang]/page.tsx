import Link from 'next/link'
import type { Metadata } from 'next'
import { getCatalogue, startingPrice } from '@/lib/catalogue'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { HERO_SNACKS } from '@/lib/snacks'
import { imageKey } from '@/lib/images'
import { SITE, SITE_URL, telLink, waLink } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'
import { Hero, type HeroSnack } from '@/components/home/Hero'
import { Marquee } from '@/components/home/Marquee'
import { SectionHead } from '@/components/home/SectionHead'
import { CategoryCard } from '@/components/product/CategoryCard'
import { ProductCard } from '@/components/product/ProductCard'
import { Picture } from '@/components/ui/Picture'
import { OffersStrip } from '@/components/content/OffersStrip'
import { ReviewLinks } from '@/components/content/ReviewLinks'
import { MapEmbed } from '@/components/content/MapEmbed'
import { OpenNow } from '@/components/content/OpenNow'
import { InstagramIcon, WhatsAppIcon } from '@/components/ui/Icons'
import { JsonLd, storeJsonLd } from '@/components/content/JsonLd'
import { Reveal } from '@/components/content/Reveal'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return {
    title: { absolute: t.meta.title },
    description: t.meta.description,
    alternates: { canonical: `${SITE_URL}/${lang}/`, languages: { en: `${SITE_URL}/en/`, hi: `${SITE_URL}/hi/`, 'x-default': `${SITE_URL}/en/` } },
  }
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: l } = await params
  const lang = l as Lang
  const t = getDict(lang)
  const { categories, products } = await getCatalogue()
  const byId = new Map(products.map((p) => [p.id, p]))
  const colourOf = new Map(categories.map((c) => [c.id, c.colour]))

  const heroSnacks: HeroSnack[] = HERO_SNACKS.flatMap((s) => {
    const p = byId.get(s.product)
    if (!p) return []
    const v = p.variants[0]
    const poster = imageKey(`renders/hero-${s.kind}`) ? `/img/renders/hero-${s.kind}` : null
    return [{ ...s, image: p.image_url ?? s.image, variant: v.id, price: v.price, sale_price: v.sale_price, perKg: v.is_loose, label_en: v.label_en, label_hi: v.label_hi, poster }]
  })
  const heroPoster = imageKey('renders/hero-peanut') ? '/img/renders/hero-peanut' : null
  const specials = products.filter((p) => p.is_special && p.image_source === 'store')
  const counts = new Map<string, number>()
  for (const p of products) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1)
  const firstPhoto = new Map<string, string>()
  for (const p of products) if (p.image_url && !firstPhoto.has(p.category_id)) firstPhoto.set(p.category_id, p.image_url)
  const h = (p: string) => `/${lang}${p}`
  const name = (x: { name_en: string; name_hi: string }) => (lang === 'hi' ? x.name_hi : x.name_en)

  return (
    <>
      <JsonLd data={storeJsonLd(lang)} />
      <Hero snacks={heroSnacks} poster={heroPoster} />
      <Marquee categories={categories} />

      {/* 01 categories */}
      <section className="wrap pt-24" aria-labelledby="cats">
        <SectionHead id="cats" no="01" title={t.home.categoriesTitle} lede={t.home.categoriesLede} link={h('/shop/')} linkLabel={t.common.viewAll} />
        <div className="no-scrollbar -mx-[clamp(1.125rem,4vw,3.5rem)] mt-10 flex snap-x gap-3 overflow-x-auto px-[clamp(1.125rem,4vw,3.5rem)] pb-4 sm:gap-4">
          {categories.map((c, i) => (
            <div key={c.id} className="w-[46vw] shrink-0 snap-start sm:w-[15.5rem]">
              <CategoryCard c={c} lang={lang} count={counts.get(c.id) ?? 0} index={i} image={firstPhoto.get(c.id)} />
            </div>
          ))}
        </div>
      </section>

      {/* 02 specials */}
      <section className="wrap pt-28" aria-labelledby="specials">
        <SectionHead id="specials" no="02" title={t.home.specialsTitle} lede={t.home.specialsLede} link={h('/category/specials/')} linkLabel={t.common.viewAll} />
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-8">
          {specials.map((p, i) => (
            <div key={p.id} className={i % 4 === 1 ? 'md:translate-y-10' : i % 4 === 3 ? 'md:translate-y-5' : ''}>
              <ProductCard product={p} colour={colourOf.get(p.category_id) ?? '#B3263A'} tilt={[-2, 1.5, -1, 2.5][i % 4]} />
            </div>
          ))}
        </div>
      </section>

      {/* 03 retail and wholesale */}
      <section className="on-ink mt-36" aria-label={`${t.home.retailTitle} / ${t.home.wholesaleTitle}`}>
        <div className="wrap grid md:grid-cols-2">
          <div className="border-line py-16 md:border-r md:py-24 md:pr-12">
            <p className="section-no !text-turmeric">03</p>
            <p className="display-xl mt-4 tnum" aria-hidden>
              250<span className="text-[0.45em]"> {lang === 'hi' ? 'ग्राम' : 'g'}</span>
            </p>
            <h2 className="display-s mt-6">{t.home.retailTitle}</h2>
            <p className="mt-3 max-w-[40ch] text-paper/75">{t.home.retailBody}</p>
            <Link href={h('/shop/')} className="btn btn-paper mt-8">
              {t.home.retailCta}
            </Link>
          </div>
          <div className="relative overflow-hidden border-t border-line py-16 md:border-t-0 md:py-24 md:pl-12">
            <div className="jute pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
            <p className="display-xl relative mt-8 text-turmeric tnum" aria-hidden>
              20<span className="text-[0.45em]"> {lang === 'hi' ? 'किलो' : 'kg'}+</span>
            </p>
            <h2 className="display-s relative mt-6">{t.home.wholesaleTitle}</h2>
            <p className="relative mt-3 max-w-[44ch] text-paper/75">{t.home.wholesaleBody}</p>
            <Link href={h('/wholesale/')} className="btn btn-brand relative mt-8">
              {t.home.wholesaleCta}
            </Link>
          </div>
        </div>
      </section>

      {/* 04 inside the store */}
      <section className="wrap pt-28" aria-labelledby="inside">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-8">
            <div className="overflow-hidden rounded-[1.75rem]">
              <Picture src="/img/shop/interior" alt={t.home.insideTitle} sizes="(min-width: 768px) 60vw, 100vw" />
            </div>
          </Reveal>
          <div className="md:col-span-4 md:-ml-24 md:mb-10">
            <div className="relative rounded-[1.5rem] bg-paper p-6 shadow-[0_24px_60px_-30px_rgb(31_26_23/0.5)] md:rotate-[-2deg]">
              <p className="section-no">04</p>
              <h2 id="inside" className="display-s mt-2">
                {t.home.insideTitle}
              </h2>
              <p className="mt-3 text-muted">{t.home.insideBody}</p>
              <OpenNow className="mt-4" />
            </div>
          </div>
        </div>
      </section>

      {/* 05 journey preview */}
      <section className="wrap pt-32" aria-labelledby="journey">
        <div className="grid gap-12 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <p className="section-no">05</p>
            <p className="display-l mt-3 tnum" aria-hidden>
              2005 <span className="text-brand">→</span> {lang === 'hi' ? 'आज' : 'today'}
            </p>
            <h2 id="journey" className="display-s mt-6 max-w-[20ch]">
              {t.home.journeyTitle}
            </h2>
            <Link href={h('/journey/')} className="btn btn-ink mt-8">
              {t.home.journeyCta}
            </Link>
          </div>
          <div className="relative h-[26rem] sm:h-[34rem] md:col-span-7">
            {[
              { src: '/img/journey/1-beginning', cls: 'left-0 top-6 w-[62%] -rotate-[5deg]', cap: t.journey.steps[0].title },
              { src: '/img/journey/2-renovated', cls: 'right-0 top-0 w-[58%] rotate-[4deg]', cap: t.journey.steps[1].title },
              { src: '/img/journey/3-today', cls: 'bottom-0 left-[30%] w-[30%] -rotate-[2deg]', cap: t.journey.steps[2].title },
            ].map((x) => (
              <figure key={x.src} className={`absolute rounded-[1.1rem] bg-paper p-2 shadow-[0_24px_50px_-26px_rgb(31_26_23/0.55)] ${x.cls}`}>
                <div className="overflow-hidden rounded-[0.8rem]">
                  <Picture src={x.src} alt={x.cap} sizes="(min-width: 768px) 30vw, 60vw" />
                </div>
                <figcaption className="hand px-1 pt-1.5 text-[1rem]">{x.cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 06 people */}
      <section className="wrap pt-32" aria-labelledby="people">
        <SectionHead id="people" no="06" title={t.home.peopleTitle} link={h('/leadership/')} linkLabel={t.home.peopleCta} />
        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {[
            { img: '/img/leadership/gangadhar', p: SITE.owner, role: t.people.gangadharRole },
            { img: '/img/leadership/laxmikant', p: SITE.head, role: t.people.laxmikantRole },
          ].map((x, i) => (
            <div key={x.img} className={`flex items-center gap-6 ${i === 1 ? 'sm:mt-16' : ''}`}>
              <div className="w-[38%] max-w-[13rem] shrink-0 overflow-hidden rounded-full bg-ink">
                <Picture src={x.img} alt={name(x.p)} sizes="208px" />
              </div>
              <div>
                <h3 className="font-display text-[1.6rem] font-[650] leading-[1.05] tracking-[-0.02em]">{name(x.p)}</h3>
                <p className="mt-1 font-semibold text-brand">{x.role}</p>
                <p className="hand mt-2 text-[1.15rem]">{t.people.experience.replace('{n}', String(x.p.years))}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 07 offers */}
      <section className="wrap pt-32" aria-labelledby="offers">
        <SectionHead id="offers" no="07" title={t.home.offersTitle} link={h('/offers/')} linkLabel={t.common.viewAll} />
        <OffersStrip limit={3} className="mt-10" />
      </section>

      {/* 08 reviews and Instagram */}
      <section className="wrap pt-32" aria-labelledby="reviews">
        <div className="grid gap-6 rounded-[2rem] bg-brand-light p-8 md:grid-cols-12 md:items-center md:p-14">
          <div className="md:col-span-7">
            <p className="section-no">08</p>
            <h2 id="reviews" className="display-m mt-3">
              {t.home.reviewsTitle}
            </h2>
            <p className="mt-4 max-w-[44ch] text-muted">{t.home.reviewsBody}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-5 md:justify-end">
            <ReviewLinks />
            <a href={SITE.instagram} target="_blank" rel="noopener" className="btn btn-ghost">
              <InstagramIcon className="h-5 w-5" /> {t.home.instagram}
            </a>
          </div>
        </div>
      </section>

      {/* 09 visit */}
      <section className="wrap pt-32" aria-labelledby="visit">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="section-no">09</p>
            <h2 id="visit" className="display-m mt-3">
              {t.home.visitTitle}
            </h2>
            <address className="mt-6 text-[1.15rem] not-italic leading-relaxed">{lang === 'hi' ? SITE.address_hi : SITE.address_en}</address>
            <p className="mt-2 text-muted">{t.contact.hoursValue}</p>
            <OpenNow className="mt-3" />
            <div className="mt-8 flex flex-wrap gap-2">
              <a href={SITE.mapsUrl} target="_blank" rel="noopener" className="btn btn-ink">
                {t.home.directions}
              </a>
              <a href={telLink(SITE.phones.main)} className="btn btn-ghost">
                {t.common.call} {phoneDisplay(SITE.phones.main)}
              </a>
              <a href={waLink(SITE.phones.main)} target="_blank" rel="noopener" className="btn btn-ghost">
                <WhatsAppIcon className="h-5 w-5" /> {t.common.whatsapp}
              </a>
            </div>
          </div>
          <div className="md:col-span-7">
            <MapEmbed />
          </div>
        </div>
      </section>
    </>
  )
}
