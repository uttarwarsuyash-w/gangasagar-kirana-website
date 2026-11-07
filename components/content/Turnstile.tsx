'use client'
import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '@/lib/backend/config'

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void }
  }
}

/** Cloudflare Turnstile spam check; renders nothing until a site key is configured. */
export function Turnstile({ onToken, lang }: { onToken: (t: string) => void; lang: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return
    let id: string | undefined
    const render = () => {
      if (ref.current && window.turnstile) id = window.turnstile.render(ref.current, { sitekey: TURNSTILE_SITE_KEY, language: lang, callback: onToken, appearance: 'interaction-only' })
    }
    if (window.turnstile) render()
    else {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = render
      document.head.appendChild(s)
    }
    return () => {
      if (id) window.turnstile?.remove(id)
    }
  }, [onToken, lang])
  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={ref} className="min-h-0" />
}
