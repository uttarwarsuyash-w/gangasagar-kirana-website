'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, User, Menu } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useCart } from '@/components/providers/Cart'
import { useSession } from '@/components/providers/Session'
import { useLive } from '@/components/providers/Live'
import { Lockup } from '@/components/brand/Mark'
import { BagIcon } from '@/components/ui/Icons'
import { switchPath, otherLang } from '@/lib/i18n'
import { SearchDialog } from './SearchDialog'
import { MobileMenu } from './MobileMenu'

export function Header({ overlay = false }: { overlay?: boolean }) {
  const { lang, t, href } = useI18n()
  const cart = useCart()
  const { user } = useSession()
  const { settings } = useLive()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [search, setSearch] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !(e.target as HTMLElement).closest('input,textarea,select')) {
        e.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const links = [
    { href: '/shop/', label: t.nav.shop },
    { href: '/wholesale/', label: t.nav.wholesale },
    { href: '/journey/', label: t.nav.journey },
    { href: '/contact/', label: t.nav.contact },
  ]
  const fill = Math.min(1, cart.weight / 5000)
  const solid = scrolled || !overlay

  return (
    <>
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[80] rounded-full bg-ink px-4 py-2 text-paper">
        {t.nav.skip}
      </a>
      {settings.store_mode === 'preview' && (
        <div className="relative z-[61] bg-brand px-4 py-1.5 text-center text-[0.8125rem] font-medium leading-snug text-white">{t.common.previewBanner}</div>
      )}
      <header
        className={`sticky top-0 z-[60] transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
          solid ? 'bg-paper/88 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="wrap flex h-[4.25rem] items-center gap-3 sm:h-[4.75rem]">
          <Link href={href('/')} className="shrink-0 rounded-xl" aria-label={`${t.nav.home}: Gangasagar Kirana Stores`}>
            <Lockup compact />
          </Link>
          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = pathname.startsWith(href(l.href))
              return (
                <Link
                  key={l.href}
                  href={href(l.href)}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-3.5 py-2 text-[0.95rem] lowercase transition-colors hover:bg-ink/6 ${active ? 'font-semibold text-brand' : ''}`}
                  lang={lang}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-0.5 lg:ml-3">
            <button className="icon-btn" onClick={() => setSearch(true)} aria-label={t.nav.search}>
              <Search className="h-[1.3rem] w-[1.3rem]" />
            </button>
            <Link
              href={switchPath(pathname, otherLang(lang))}
              hrefLang={otherLang(lang)}
              lang={otherLang(lang)}
              aria-label={t.nav.switchLangLabel}
              className="hidden h-11 items-center rounded-full px-3 text-[0.95rem] font-semibold hover:bg-ink/6 sm:inline-flex"
              data-no-transition
            >
              {t.nav.switchLang}
            </Link>
            <Link href={href('/account/')} className="icon-btn hidden sm:inline-grid" aria-label={user ? t.nav.account : t.nav.signIn}>
              <User className="h-[1.3rem] w-[1.3rem]" />
            </Link>
            <button
              id="bag-button"
              className="relative inline-flex h-11 items-center gap-1.5 rounded-full px-2.5 hover:bg-ink/6"
              onClick={() => cart.setOpen(true)}
              aria-label={`${t.nav.cart}: ${cart.count}`}
            >
              <BagIcon className="h-[1.6rem] w-[1.6rem]" fill={fill} />
              <span className="min-w-[1ch] text-[0.95rem] font-semibold tnum" aria-hidden>
                {cart.count}
              </span>
            </button>
            <button className="icon-btn lg:hidden" onClick={() => setMenu(true)} aria-label={t.nav.menu} aria-expanded={menu}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>
      <SearchDialog open={search} onClose={() => setSearch(false)} />
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
    </>
  )
}
