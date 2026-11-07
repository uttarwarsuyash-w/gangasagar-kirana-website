'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Package, Boxes, ShoppingBag, FileText, Users, Inbox, Star, Tag, Image as ImageIcon, Newspaper, HelpCircle, Type, Settings, BarChart3, Rocket, Menu, X, ExternalLink } from 'lucide-react'
import { I18nProvider } from '@/components/providers/I18n'
import { LiveProvider } from '@/components/providers/Live'
import { SessionProvider, useSession } from '@/components/providers/Session'
import { ToastProvider } from '@/components/ui/Toast'
import { DemoSignIn } from '@/components/layout/DemoSignIn'
import { Mark } from '@/components/brand/Mark'
import { getDict } from '@/lib/i18n'
import { GoogleG } from '@/components/checkout/Checkout'
import { getBackend } from '@/lib/backend'
import { IS_DEMO } from '@/lib/backend/config'

const NAV = [
  { href: '/admin/', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders/', label: 'Orders', icon: ShoppingBag, badge: 'new_orders' },
  { href: '/admin/quotations/', label: 'Quotations', icon: FileText, badge: 'quotation_requests' },
  { href: '/admin/products/', label: 'Products', icon: Package },
  { href: '/admin/inventory/', label: 'Inventory', icon: Boxes },
  { href: '/admin/customers/', label: 'Customers', icon: Users },
  { href: '/admin/enquiries/', label: 'Enquiries', icon: Inbox, badge: 'new_enquiries' },
  { href: '/admin/reviews/', label: 'Reviews', icon: Star, badge: 'pending_reviews' },
  { href: '/admin/offers/', label: 'Offers', icon: Tag },
  { href: '/admin/gallery/', label: 'Gallery', icon: ImageIcon },
  { href: '/admin/blog/', label: 'Blog', icon: Newspaper },
  { href: '/admin/faq/', label: 'FAQ', icon: HelpCircle },
  { href: '/admin/content/', label: 'Site content', icon: Type },
  { href: '/admin/settings/', label: 'Settings', icon: Settings },
  { href: '/admin/reports/', label: 'Reports', icon: BarChart3 },
  { href: '/admin/publish/', label: 'Publish & go live', icon: Rocket },
] as const

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider lang="en" dict={getDict('en')}>
      <ToastProvider>
        <LiveProvider>
          <SessionProvider eager>
            <Gate>{children}</Gate>
            <DemoSignIn />
          </SessionProvider>
        </LiveProvider>
      </ToastProvider>
    </I18nProvider>
  )
}

function Gate({ children }: { children: React.ReactNode }) {
  const s = useSession()
  if (!s.checked || s.loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Mark className="h-14 w-14 animate-pulse" />
      </div>
    )
  if (!s.user || !s.profile?.is_admin)
    return (
      <div className="grid min-h-screen place-items-center bg-paper-2 p-6">
        <div className="w-full max-w-md rounded-[1.75rem] bg-paper p-8 shadow-xl">
          <Mark className="h-12 w-12" />
          <h1 className="mt-6 font-display text-3xl font-[650]">Gangasagar admin</h1>
          {s.user ? (
            <>
              <p className="mt-3 text-muted">
                <strong className="text-ink">{s.user.email}</strong> is not on the admin list. Sign in with an admin Google account.
              </p>
              <button className="btn btn-ghost mt-6" onClick={() => s.signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-muted">Only the two admin Google accounts can open this area.</p>
              <button className="btn btn-ink btn-lg mt-6 w-full" onClick={() => s.signIn('/admin/')}>
                <GoogleG /> Continue with Google
              </button>
            </>
          )}
          <a href="/en/" className="link-u mt-6 inline-block text-[0.9rem]">
            Back to the website
          </a>
        </div>
      </div>
    )
  return <Frame>{children}</Frame>
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const s = useSession()
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<Record<string, number> & { store_mode?: string }>({})
  useEffect(() => {
    setOpen(false)
    getBackend()
      .then((b) => b.rpc('admin_dashboard'))
      .then(setCounts)
      .catch(() => {})
  }, [pathname])
  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.href === '/admin/' ? pathname === '/admin' || pathname === '/admin/' : pathname.startsWith(n.href)
        const c = 'badge' in n ? counts[n.badge] : 0
        const Icon = n.icon
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[0.93rem] transition ${active ? 'bg-paper text-ink' : 'text-paper/75 hover:bg-paper/10 hover:text-paper'}`}
          >
            <Icon className="h-[1.05rem] w-[1.05rem]" />
            <span className="flex-1">{n.label}</span>
            {c ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[0.72rem] font-bold text-white">{c}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
  return (
    <div className="min-h-screen bg-paper-2 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="on-ink sticky top-0 hidden h-screen flex-col gap-6 overflow-y-auto p-4 lg:flex">
        <Link href="/admin/" className="flex items-center gap-2.5 px-2 pt-2">
          <Mark className="h-9 w-9 text-paper" />
          <span className="font-display text-lg font-[650] leading-tight">
            Gangasagar
            <span className="block text-[0.75rem] font-normal text-paper/60">Admin</span>
          </span>
        </Link>
        {nav}
        <div className="mt-auto space-y-3 px-2 pb-2 text-[0.82rem] text-paper/60">
          <p>
            Store mode:{' '}
            <span className={`font-semibold ${counts.store_mode === 'live' ? 'text-leaf-light' : 'text-turmeric'}`}>{counts.store_mode === 'live' ? 'Live' : 'Preview'}</span>
            {IS_DEMO && <span className="block text-turmeric">Demo database (in this browser)</span>}
          </p>
          <a href="/en/" target="_blank" className="flex items-center gap-1.5 hover:text-paper">
            View website <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="break-all">{s.user?.email}</p>
          <button className="underline hover:text-paper" onClick={() => s.signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <header className="on-ink sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden">
        <Link href="/admin/" className="flex items-center gap-2">
          <Mark className="h-8 w-8 text-paper" />
          <span className="font-display font-[650]">Admin</span>
        </Link>
        <button className="icon-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>
      {open && <div className="on-ink fixed inset-x-0 top-14 z-40 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4 lg:hidden">{nav}</div>}
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  )
}
