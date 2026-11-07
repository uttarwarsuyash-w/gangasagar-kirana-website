import Link from 'next/link'
import type { Lang, Messages } from '@/lib/i18n'
import { SITE, telLink, waLink } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'
import { Mark } from '@/components/brand/Mark'
import { InstagramIcon, WhatsAppIcon } from '@/components/ui/Icons'
import type { Category } from '@/lib/types'

export function Footer({ lang, t, categories }: { lang: Lang; t: Messages; categories: Category[] }) {
  const h = (p: string) => `/${lang}${p}`
  const name = (c: Category) => (lang === 'hi' ? c.name_hi : c.name_en)
  return (
    <footer className="on-ink relative mt-28 overflow-hidden">
      <div className="wrap grid gap-12 pb-10 pt-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Mark className="h-14 w-14 text-paper" />
          <p className="display-s mt-6 max-w-[16ch]">{t.footer.tagline}</p>
          <p className="mt-6 text-paper/75">{lang === 'hi' ? SITE.address_hi : SITE.address_en}</p>
          <p className="mt-1 text-paper/75">{t.contact.hoursValue}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={telLink(SITE.phones.main)} className="btn btn-paper btn-sm">
              {t.common.call} {phoneDisplay(SITE.phones.main)}
            </a>
            <a href={waLink(SITE.phones.main)} className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
              <WhatsAppIcon className="h-4 w-4" /> {t.common.whatsapp}
            </a>
            <a href={SITE.instagram} className="btn btn-ghost btn-sm" target="_blank" rel="noopener" aria-label={t.home.instagram}>
              <InstagramIcon className="h-4 w-4" /> Instagram
            </a>
          </div>
        </div>
        <FooterCol title={t.footer.shop} className="md:col-span-3">
          {categories.slice(0, 8).map((c) => (
            <li key={c.id}>
              <Link href={h(`/category/${c.id}/`)}>{name(c)}</Link>
            </li>
          ))}
          <li>
            <Link href={h('/shop/')} className="font-semibold text-turmeric">
              {t.common.viewAll}
            </Link>
          </li>
        </FooterCol>
        <FooterCol title={t.footer.store} className="md:col-span-2">
          <li><Link href={h('/wholesale/')}>{t.nav.wholesale}</Link></li>
          <li><Link href={h('/offers/')}>{t.nav.offers}</Link></li>
          <li><Link href={h('/journey/')}>{t.nav.journey}</Link></li>
          <li><Link href={h('/leadership/')}>{t.nav.people}</Link></li>
          <li><Link href={h('/gallery/')}>{t.nav.gallery}</Link></li>
          <li><Link href={h('/blog/')}>{t.nav.blog}</Link></li>
        </FooterCol>
        <FooterCol title={t.footer.help} className="md:col-span-3">
          <li><Link href={h('/contact/')}>{t.nav.contact}</Link></li>
          <li><Link href={h('/faq/')}>{t.nav.faq}</Link></li>
          <li><Link href={h('/account/')}>{t.nav.account}</Link></li>
          <li><Link href={h('/terms/')}>{t.footer.terms}</Link></li>
          <li><Link href={h('/privacy/')}>{t.footer.privacy}</Link></li>
          <li><Link href={h('/shipping/')}>{t.footer.shipping}</Link></li>
          {SITE.emails.map((e) => (
            <li key={e}>
              <a href={`mailto:${e}`} className="break-all">{e}</a>
            </li>
          ))}
        </FooterCol>
      </div>
      <div className="wrap flex flex-wrap items-center justify-between gap-3 border-t border-line py-5 text-[0.85rem] text-paper/60">
        <p>© {new Date().getFullYear()} {t.footer.rights}</p>
        <Link href={`/${lang === 'en' ? 'hi' : 'en'}/`} className="hover:text-paper" lang={lang === 'en' ? 'hi' : 'en'}>
          {t.nav.switchLang}
        </Link>
      </div>
      <p aria-hidden className="pointer-events-none -mb-[0.2em] select-none whitespace-nowrap pl-[2vw] font-display text-[23vw] font-[700] leading-[0.78] tracking-[-0.06em] text-paper/[0.07]" style={{ fontStretch: '75%' }}>
        Gangasagar
      </p>
    </footer>
  )
}

function FooterCol({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className="meta mb-4">{title}</h2>
      <ul className="space-y-2.5 text-[0.95rem] [&_a:hover]:text-turmeric">{children}</ul>
    </div>
  )
}
