import type { Metadata } from 'next'
import Link from 'next/link'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE, SITE_URL } from '@/lib/site'
import { JourneyStory } from '@/components/content/JourneyStory'
import { Picture } from '@/components/ui/Picture'
import { Kinetic } from '@/components/home/Kinetic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return { title: t.journey.title, description: t.journey.lede, alternates: { canonical: `${SITE_URL}/${lang}/journey/`, languages: { en: `${SITE_URL}/en/journey/`, hi: `${SITE_URL}/hi/journey/` } } }
}

export default async function Journey({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  const years = new Date().getFullYear() - SITE.established
  return (
    <>
      <header className="wrap pb-10 pt-12 sm:pt-20">
        <Kinetic as="h1" text={t.journey.title} className={`display-xl ${lang === 'hi' ? 'deva' : ''}`} />
        <p className="lede mt-8">{t.journey.lede}</p>
      </header>
      <JourneyStory />
      <section className="wrap grid gap-12 py-24 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="display-xl text-brand tnum">{years}</p>
          <p className="meta mt-2">{t.journey.counterLabel}</p>
        </div>
        <div className="space-y-12 md:col-span-7">
          <div className="grid items-start gap-6 sm:grid-cols-[9rem_1fr]">
            <div className="overflow-hidden rounded-full bg-ink">
              <Picture src="/img/leadership/gangadhar" alt={lang === 'hi' ? SITE.owner.name_hi : SITE.owner.name_en} sizes="144px" />
            </div>
            <div>
              <h2 className="display-s">{t.journey.founderTitle}</h2>
              <p className="mt-3 text-[1.05rem]">{t.journey.founderBody}</p>
            </div>
          </div>
          <div className="grid items-start gap-6 sm:grid-cols-[9rem_1fr]">
            <div className="overflow-hidden rounded-full bg-ink">
              <Picture src="/img/leadership/laxmikant" alt={lang === 'hi' ? SITE.head.name_hi : SITE.head.name_en} sizes="144px" />
            </div>
            <div>
              <h2 className="display-s">{t.journey.growthTitle}</h2>
              <p className="mt-3 text-[1.05rem]">{t.journey.growthBody}</p>
              <Link href={`/${lang}/leadership/`} className="btn btn-ink mt-6">
                {t.home.peopleCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
