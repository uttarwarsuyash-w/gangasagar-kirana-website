'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { Lang, Messages } from '@/lib/i18n'
import { I18nProvider } from '@/components/providers/I18n'
import { LiveProvider } from '@/components/providers/Live'
import { SessionProvider } from '@/components/providers/Session'
import { CartProvider } from '@/components/providers/Cart'
import { ToastProvider } from '@/components/ui/Toast'
import { NavigationProvider } from './Navigation'
import { Header } from './Header'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { DemoSignIn } from './DemoSignIn'
import { HelpWidget } from '@/components/content/HelpWidget'
import { SmoothScroll } from './SmoothScroll'

// Pages that always need the database connection (sign-in state, orders).
const EAGER = /\/(checkout|account|order|wholesale|auth)\b/

export function SiteShell({ lang, dict, children, footer }: { lang: Lang; dict: Messages; children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const isHome = pathname === `/${lang}` || pathname === `/${lang}/`
  return (
    <I18nProvider lang={lang} dict={dict}>
      <ToastProvider>
        <LiveProvider>
          <SessionProvider eager={EAGER.test(pathname)}>
            <CartProvider>
              <NavigationProvider>
                <SmoothScroll />
                <Header overlay={isHome} />
                <main id="main" tabIndex={-1} className="outline-none">
                  {children}
                </main>
                {footer}
                <CartDrawer />
                <DemoSignIn />
                <HelpWidget />
              </NavigationProvider>
            </CartProvider>
          </SessionProvider>
        </LiveProvider>
      </ToastProvider>
    </I18nProvider>
  )
}
