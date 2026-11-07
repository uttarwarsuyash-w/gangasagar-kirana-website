import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE, SITE_URL, telLink, waLink } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'
import { Picture } from '@/components/ui/Picture'
import { WhatsAppIcon } from '@/components/ui/Icons'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return { title: t.people.title, alternates: { canonical: `${SITE_URL}/${lang}/leadership/`, languages: { en: `${SITE_URL}/en/leadership/`, hi: `${SITE_URL}/hi/leadership/` } } }
}

export default async function Leadership({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  const people = [
    { img: '/img/leadership/gangadhar', p: SITE.owner, role: t.people.gangadharRole, phone: SITE.phones.owner, body: t.journey.founderBody },
    { img: '/img/leadership/laxmikant', p: SITE.head, role: t.people.laxmikantRole, phone: SITE.phones.main, body: t.journey.growthBody },
  ]
  return (
    <>
      <section className="on-ink">
        <div className="wrap pb-16 pt-14 sm:pt-20">
          <h1 className="display-xl max-w-[12ch]">{t.people.title}</h1>
          <p className="lede mt-6 text-paper/75">{t.people.lede}</p>
          <div className="mt-16 grid gap-16 md:grid-cols-2">
            {people.map((x, i) => {
              const name = lang === 'hi' ? x.p.name_hi : x.p.name_en
              return (
                <article key={x.img} className={i === 1 ? 'md:mt-24' : ''}>
                  <div className="relative mx-auto max-w-[24rem]">
                    <div className="overflow-hidden rounded-full">
                      <Picture src={x.img} alt={name} sizes="(min-width: 768px) 384px, 80vw" />
                    </div>
                    <p className="hand absolute -right-2 bottom-6 rotate-[-6deg] rounded-lg bg-turmeric px-3 py-1 text-[1.15rem] text-ink">{t.people.experience.replace('{n}', String(x.p.years))}</p>
                  </div>
                  <h2 className="display-m mt-8">{name}</h2>
                  <p className="mt-2 text-[1.1rem] font-semibold text-turmeric">{x.role}</p>
                  <p className="mt-4 max-w-[46ch] text-paper/75">{x.body}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <a href={telLink(x.phone)} className="btn btn-paper btn-sm">
                      {t.common.call} {phoneDisplay(x.phone)}
                    </a>
                    <a href={waLink(x.phone)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                      <WhatsAppIcon className="h-4 w-4" /> {t.common.whatsapp}
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
