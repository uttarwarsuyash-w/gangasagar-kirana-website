'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { Picture } from '@/components/ui/Picture'
import { Kinetic } from './Kinetic'
import { inr } from '@/lib/format'
import { detectTier, type Tier } from '@/components/three/tier'
import type { PourApi } from '@/components/three/PourCanvas'

export interface HeroSnack {
  product: string
  kind: string
  en: string
  hi: string
  image: string
  variant: string
  price: number
  sale_price: number | null
  perKg: boolean
  label_en: string
  label_hi: string
  poster: string | null
}

type CanvasComp = ComponentType<{
  tier: Exclude<Tier, 'still'>
  initialKind?: string
  pointerTarget?: React.RefObject<HTMLElement | null>
  onReady?: (api: PourApi) => void
  className?: string
  idleSway?: boolean
}>

export function Hero({ snacks, poster }: { snacks: HeroSnack[]; poster: string | null }) {
  const { t, lang, f, href } = useI18n()
  const live = useLive()
  const [active, setActive] = useState<number | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)
  const [Canvas, setCanvas] = useState<CanvasComp | null>(null)
  const [ready, setReady] = useState(false)
  const api = useRef<PourApi | null>(null)
  const section = useRef<HTMLElement>(null)

  // Load the 3D code only after the page has painted.
  useEffect(() => {
    const tr = detectTier()
    setTier(tr)
    if (tr === 'still') return
    const go = () =>
      import('@/components/three/PourCanvas').then((m) => setCanvas(() => m.default as unknown as CanvasComp))
    if (document.readyState === 'complete') setTimeout(go, 60)
    else window.addEventListener('load', () => setTimeout(go, 60), { once: true })
  }, [])

  const snack = active == null ? null : snacks[active]

  function tap(i: number) {
    if (i === active) {
      api.current?.sweepAndPour(snacks[i].kind)
      return
    }
    setActive(i)
    api.current?.enableTilt()
    api.current?.sweepAndPour(snacks[i].kind)
  }

  const price = snack ? live.priceOf(snack.variant, { price: snack.price, sale_price: snack.sale_price }) : null
  const headlineEn = snack ? snack.en : null
  const still = tier === 'still'
  const stillPoster = snack?.poster ?? poster

  return (
    <section ref={section} className="relative isolate flex min-h-[calc(100svh-4.25rem)] flex-col overflow-hidden sm:min-h-[calc(100svh-4.75rem)]" aria-labelledby="hero-title">
      {/* Still image for reduced motion / weak devices, and as the poster while 3D loads */}
      {(still || !ready) && stillPoster && (
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[52%] transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`} aria-hidden>
          <Picture src={stillPoster} alt="" sizes="100vw" priority fit="cover" className="block h-full w-full" imgClassName="object-bottom" />
        </div>
      )}
      {Canvas && tier && tier !== 'still' && (
        <div className={`pointer-events-none absolute inset-0 z-[5] transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
          <Canvas
            tier={tier}
            initialKind={snacks[0]?.kind}
            pointerTarget={section}
            idleSway
            className="h-full w-full"
            onReady={(a) => {
              api.current = a
              requestAnimationFrame(() => setReady(true))
            }}
          />
        </div>
      )}

      <div className="wrap relative z-0 pt-[clamp(1.5rem,6vh,4rem)]">
        <div className="flex items-start justify-between gap-6">
          <p className="meta max-w-[22ch]">{t.home.eyebrow}</p>
          <p className="hand -rotate-3 text-[1.05rem] text-brand sm:text-[1.25rem]">
            {lang === 'hi' ? 'से 2005' : 'since 2005'}
          </p>
        </div>
        <h1 id="hero-title" className="sr-only">
          {lang === 'hi' ? 'गंगासागर किराणा स्टोअर्स, नांदेड़' : 'Gangasagar Kirana Stores, Nanded'}
        </h1>
        {headlineEn == null ? (
          <Kinetic as="p" text={t.home.headline} className={`display-l mt-4 max-w-[13ch] ${lang === 'hi' ? 'deva' : ''}`} />
        ) : (
          <div className="mt-3">
            <Kinetic as="p" text={lang === 'hi' ? snack!.hi : headlineEn} className={`display-xl whitespace-nowrap ${lang === 'hi' ? 'deva' : ''}`} />
            <Kinetic as="p" text={lang === 'hi' ? headlineEn : snack!.hi} delay={120} perWord className={`display-m mt-1 whitespace-nowrap text-brand ${lang === 'hi' ? '' : 'deva'}`} />
          </div>
        )}
      </div>

      {/* Floating product card */}
      {snack && price && (
        <aside
          key={snack.product}
          className="gs-float-card absolute right-[max(1.125rem,5vw)] z-20 w-[min(17rem,46vw)] rotate-[3deg] rounded-[1.4rem] bg-paper p-2.5 shadow-[0_30px_60px_-24px_rgb(31_26_23/0.55)] max-sm:bottom-[8.5rem] max-sm:w-[11.5rem] sm:top-[24%]"
          aria-live="polite"
        >
          <div className="aspect-square overflow-hidden rounded-[1rem] bg-paper-2">
            <Picture src={snack.image} alt={lang === 'hi' ? snack.hi : snack.en} sizes="272px" />
          </div>
          <div className="px-1.5 pb-1.5 pt-3">
            <p className="text-[0.8rem] text-muted">{t.home.startingAt}</p>
            <p className="kraft-tag mt-1 text-[1.15rem]">
              <span className="tnum">{inr(price.unit)}</span>
              <span className="text-[0.85rem]">{snack.perKg ? `/ ${t.common.kg}` : `/ ${lang === 'hi' ? snack.label_hi : snack.label_en}`}</span>
            </p>
            <Link href={href(`/product/${snack.product}/`)} className="btn btn-ink btn-sm mt-3 w-full" data-morph>
              {f(t.home.shopThis, { name: lang === 'hi' ? snack.hi : snack.en })}
            </Link>
          </div>
        </aside>
      )}

      {/* Snack row */}
      <div className="wrap relative z-20 mt-auto pb-5 pt-10">
        <p className="hand mb-2 flex items-end gap-2 text-[1.15rem] text-ink/80" aria-hidden>
          <span className="-rotate-2">{t.home.tapHint}</span>
          <svg width="34" height="26" viewBox="0 0 34 26" className="mb-[-6px] text-brand">
            <path d="M2 4c10-2 20 2 24 14m0 0 3-7m-3 7-7-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </p>
        <div className="no-scrollbar -mx-[clamp(1.125rem,4vw,3.5rem)] flex gap-2 overflow-x-auto px-[clamp(1.125rem,4vw,3.5rem)] pb-1" role="group" aria-label={t.home.pourPrompt}>
          {snacks.map((s, i) => (
            <button
              key={s.product}
              onClick={() => tap(i)}
              aria-pressed={active === i}
              className="chip shrink-0 bg-paper/80 !pl-1.5 backdrop-blur-sm aria-pressed:!bg-ink aria-pressed:!text-paper"
            >
              <span className="h-7 w-7 overflow-hidden rounded-full bg-paper-2">
                <Picture src={s.image} alt="" sizes="28px" />
              </span>
              {lang === 'hi' ? s.hi : s.en}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
