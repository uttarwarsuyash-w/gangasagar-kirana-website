'use client'
// Page transitions: a brand-red curtain with the mark wipes across (~0.5 s); product cards
// morph into the product page with the View Transitions API where supported.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Mark } from '@/components/brand/Mark'

const NavCtx = createContext<(href: string) => void>(() => {})
export const useNavigate = () => useContext(NavCtx)

function reduced() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle')
  const waiters = useRef<((p: string) => void)[]>([])

  useEffect(() => {
    waiters.current.forEach((w) => w(pathname))
    waiters.current = []
  }, [pathname])

  const waitForPath = (target: string) =>
    new Promise<void>((res) => {
      const t = setTimeout(res, 2500)
      waiters.current.push((p) => {
        if (p === target || p === target.replace(/\/$/, '')) {
          clearTimeout(t)
          requestAnimationFrame(() => res())
        }
      })
    })

  const navigate = useCallback(
    async (href: string, morph?: boolean) => {
      const url = new URL(href, location.href)
      const target = url.pathname
      if (reduced()) return router.push(href)
      if (morph && 'startViewTransition' in document) {
        ;(document as Document & { startViewTransition: (cb: () => Promise<void>) => unknown }).startViewTransition(async () => {
          router.push(href)
          await waitForPath(target)
        })
        return
      }
      setPhase('in')
      await new Promise((r) => setTimeout(r, 260))
      router.push(href)
      await waitForPath(target)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      setPhase('out')
      setTimeout(() => setPhase('idle'), 320)
    },
    [router],
  )

  // Intercept same-origin link clicks globally, so every <Link>/<a> gets the transition.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element).closest('a')
      if (!a || a.target || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || /^(mailto|tel|https?:\/\/(?!$))/.test(href)) return
      const url = new URL(href, location.href)
      if (url.origin !== location.origin || url.pathname.startsWith('/admin') !== location.pathname.startsWith('/admin')) return
      if (url.pathname === location.pathname && url.search === location.search) return
      e.preventDefault()
      e.stopPropagation()
      navigate(url.pathname + url.search + url.hash, a.dataset.morph !== undefined)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate])

  return (
    <NavCtx.Provider value={(h) => navigate(h)}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-brand text-paper"
        style={{
          clipPath: phase === 'idle' ? 'inset(0 0 0 100%)' : phase === 'in' ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: phase === 'idle' ? 'none' : 'clip-path .26s cubic-bezier(.76,0,.24,1)',
        }}
      >
        <Mark className="h-20 w-20 text-paper" mono />
      </div>
    </NavCtx.Provider>
  )
}
