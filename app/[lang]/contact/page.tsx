import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE, SITE_URL, telLink, waLink } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'
import { MapEmbed } from '@/components/content/MapEmbed'
import { OpenNow } from '@/components/content/OpenNow'
import { ContactForm } from '@/components/content/ContactForm'
import { WhatsAppIcon, InstagramIcon } from '@/components/ui/Icons'
import { Picture } from '@/components/ui/Picture'
import { JsonLd, storeJsonLd } from '@/components/content/JsonLd'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return {
    title: t.contact.title,
    description: lang === 'hi' ? 'गंगासागर किराणा स्टोअर्स, गोकुल नगर, नांदेड़ 431602। हर दिन सुबह 8 से रात 8। फ़ोन 9403951524।' : 'Gangasagar Kirana Stores, Gokul Nagar, Nanded 431602. Open 8 AM to 8 PM every day. Phone 9403951524.',
    alternates: { canonical: `${SITE_URL}/${lang}/contact/`, languages: { en: `${SITE_URL}/en/contact/`, hi: `${SITE_URL}/hi/contact/` } },
  }
}

export default async function Contact({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  const lines = [
    { label: t.contact.mainLine, phone: SITE.phones.main },
    { label: t.contact.supportLine, phone: SITE.phones.support },
    { label: t.contact.ownerLine, phone: SITE.phones.owner },
  ]
  return (
    <>
      <JsonLd data={storeJsonLd(lang)} />
      <div className="wrap pt-12 sm:pt-20">
        <h1 className="display-xl max-w-[10ch]">{t.contact.title}</h1>
        <p className="lede mt-6">{t.contact.lede}</p>
        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-5">
            <section>
              <h2 className="meta mb-3">{t.contact.address}</h2>
              <address className="text-[1.25rem] not-italic leading-snug">{lang === 'hi' ? SITE.address_hi : SITE.address_en}</address>
              <a href={SITE.mapsUrl} target="_blank" rel="noopener" className="btn btn-ink btn-sm mt-4">
                {t.home.directions}
              </a>
            </section>
            <section>
              <h2 className="meta mb-3">{t.contact.hours}</h2>
              <p className="text-[1.1rem]">{t.contact.hoursValue}</p>
              <OpenNow className="mt-2" />
            </section>
            <section>
              <h2 className="meta mb-3">{t.contact.phones}</h2>
              <ul className="divide-y divide-line border-y border-line">
                {lines.map((l) => (
                  <li key={l.phone} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <span>
                      <span className="block text-[0.9rem] text-muted">{l.label}</span>
                      <span className="font-display text-2xl font-[650] tnum">{phoneDisplay(l.phone)}</span>
                    </span>
                    <span className="flex gap-2">
                      <a href={telLink(l.phone)} className="btn btn-ghost btn-sm">
                        {t.common.call}
                      </a>
                      <a href={waLink(l.phone)} target="_blank" rel="noopener" className="btn btn-ink btn-sm" aria-label={`${t.common.whatsapp} ${phoneDisplay(l.phone)}`}>
                        <WhatsAppIcon className="h-4 w-4" /> {t.common.whatsapp}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="meta mb-3">{t.contact.emails}</h2>
              {SITE.emails.map((e) => (
                <p key={e}>
                  <a href={`mailto:${e}`} className="link-u break-all">
                    {e}
                  </a>
                </p>
              ))}
              <a href={SITE.instagram} target="_blank" rel="noopener" className="btn btn-ghost btn-sm mt-5">
                <InstagramIcon className="h-4 w-4" /> {SITE.instagramHandle}
              </a>
            </section>
          </div>
          <div className="space-y-10 lg:col-span-7">
            <MapEmbed />
            <div className="rounded-[1.75rem] bg-paper-2 p-6 sm:p-8">
              <h2 className="display-s">{t.contact.formTitle}</h2>
              <p className="mb-6 mt-2 text-muted">{t.contact.formBody}</p>
              <ContactForm />
            </div>
            <div className="overflow-hidden rounded-[1.75rem]">
              <Picture src="/img/shop/interior" alt={t.home.insideTitle} sizes="(min-width: 1024px) 55vw, 92vw" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
