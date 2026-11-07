import type { Metadata } from 'next'
import { getDict, isLang, type Lang } from '@/lib/i18n'
import { SITE_URL } from '@/lib/site'
import { WholesaleBuilder } from '@/components/account/WholesaleBuilder'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const t = getDict(isLang(lang) ? lang : 'en')
  return {
    title: t.wholesale.title,
    description:
      lang === 'hi'
        ? 'नांदेड़ में थोक नाश्ता और राशन सप्लायर: 20 किलो या ज़्यादा पर थोक दाम माँगें, दुकान व्हाट्सऐप पर कोटेशन भेजती है।'
        : 'Wholesale snacks and staples supplier in Nanded: request a wholesale price for 20 kg or more and get a quotation on WhatsApp.',
    alternates: { canonical: `${SITE_URL}/${lang}/wholesale/`, languages: { en: `${SITE_URL}/en/wholesale/`, hi: `${SITE_URL}/hi/wholesale/` } },
  }
}

export default async function Wholesale({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = (await params) as { lang: Lang }
  const t = getDict(lang)
  return (
    <>
      <section className="on-ink relative overflow-hidden">
        <div className="jute pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
        <div className="wrap relative grid gap-10 pb-20 pt-14 md:grid-cols-12 md:pt-20">
          <div className="md:col-span-7">
            <p className="display-xl text-turmeric tnum" aria-hidden>
              20<span className="text-[0.4em]"> {lang === 'hi' ? 'किलो' : 'kg'}+</span>
            </p>
            <h1 className="display-l mt-4">{t.wholesale.title}</h1>
            <p className="lede mt-6 text-paper/80">{t.wholesale.lede}</p>
            <p className="mt-4 max-w-[52ch] text-paper/60">{t.wholesale.who}</p>
          </div>
          <ol className="space-y-6 self-end md:col-span-5">
            {t.wholesale.how.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="section-no !text-turmeric">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[1.05rem]">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="wrap pt-14">
        <WholesaleBuilder />
      </div>
    </>
  )
}
