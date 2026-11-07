'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { useI18n } from '@/components/providers/I18n'
import { switchPath, otherLang } from '@/lib/i18n-core'
import { SITE, telLink, waLink } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'
import { WhatsAppIcon } from '@/components/ui/Icons'

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, href } = useI18n()
  const pathname = usePathname()
  const links = [
    ['/shop/', t.nav.shop],
    ['/wholesale/', t.nav.wholesale],
    ['/offers/', t.nav.offers],
    ['/journey/', t.nav.journey],
    ['/leadership/', t.nav.people],
    ['/gallery/', t.nav.gallery],
    ['/contact/', t.nav.contact],
    ['/faq/', t.nav.faq],
    ['/account/', t.nav.account],
  ]
  return (
    <Dialog open={open} onClose={onClose} title={t.nav.menu} variant="full" closeLabel={t.nav.close} className="on-ink !bg-ink !text-paper">
      <nav className="wrap flex h-full flex-col overflow-y-auto pb-10 pt-4" aria-label="Menu">
        <ul className="space-y-1">
          {links.map(([to, label], i) => (
            <li key={to} style={{ animation: `menu-in .5s ${0.04 * i}s var(--ease-out-expo) both` }}>
              <Link href={href(to)} onClick={onClose} className="display-m block py-1 hover:text-turmeric">
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-4 pt-10">
          <Link href={switchPath(pathname, otherLang(lang))} onClick={onClose} className="btn btn-paper" lang={otherLang(lang)} data-no-transition>
            {t.nav.switchLang}
          </Link>
          <p className="meta">{t.contact.hoursValue}</p>
          <div className="flex flex-wrap gap-2">
            <a href={telLink(SITE.phones.main)} className="btn btn-ghost btn-sm">
              {t.common.call} {phoneDisplay(SITE.phones.main)}
            </a>
            <a href={waLink(SITE.phones.main)} className="btn btn-ghost btn-sm" target="_blank" rel="noopener">
              <WhatsAppIcon className="h-4 w-4" /> {t.common.whatsapp}
            </a>
          </div>
        </div>
      </nav>
      <style>{`@keyframes menu-in{from{opacity:0;transform:translateY(24px)}}`}</style>
    </Dialog>
  )
}
