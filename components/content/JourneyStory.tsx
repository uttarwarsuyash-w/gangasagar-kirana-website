'use client'
// Our Journey scroll story: the three photos of the same shop are pinned while you scroll and each
// wipes into the next with a clip-path reveal. No years are shown for the photos (none are known).
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/providers/I18n'
import { Picture } from '@/components/ui/Picture'

const PHOTOS = ['/img/journey/1-beginning', '/img/journey/2-renovated', '/img/journey/3-today']

export function JourneyStory() {
  const { t, lang } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [p, setP] = useState(0) // 0..1 progress through the pinned section
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const r = matchMedia('(prefers-reduced-motion: reduce)').matches
    setReduced(r)
    if (r) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const total = el.offsetHeight - window.innerHeight
        setP(Math.max(0, Math.min(1, -rect.top / Math.max(1, total))))
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  const steps = t.journey.steps
  if (reduced)
    return (
      <div className="wrap grid gap-16 py-16">
        {PHOTOS.map((src, i) => (
          <figure key={src} className="grid items-center gap-8 md:grid-cols-12">
            <div className={`overflow-hidden rounded-[1.6rem] ${i === 2 ? 'mx-auto w-[60%] max-w-xs md:col-span-4' : 'md:col-span-7'}`}>
              <Picture src={src} alt={steps[i].title} sizes="(min-width: 768px) 55vw, 90vw" />
            </div>
            <figcaption className="md:col-span-5">
              <p className="section-no">{String(i + 1).padStart(2, '0')}</p>
              <p className="display-s mt-2">{steps[i].title}</p>
              <p className="mt-2 text-muted">{steps[i].body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    )

  // Each photo owns a third of the scroll; the next one wipes in during the last 35% of the previous third.
  const seg = (i: number) => Math.max(0, Math.min(1, (p * 3 - i + 0.35) / 0.35))
  const active = Math.min(2, Math.floor(p * 3 + 0.0001))
  return (
    <div ref={ref} className="relative" style={{ height: '320vh' }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="wrap grid w-full items-center gap-8 md:grid-cols-12">
          <div className="relative md:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-ink">
              {PHOTOS.map((src, i) => {
                const reveal = i === 0 ? 1 : seg(i)
                return (
                  <div
                    key={src}
                    className="absolute inset-0"
                    style={{ clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)`, zIndex: i, transform: `scale(${1.08 - reveal * 0.08})` }}
                    aria-hidden={i !== active}
                  >
                    {i === 2 ? (
                      <div className="grid h-full place-items-center bg-[#2a2420]">
                        <div className="h-[86%] rotate-[2.5deg] overflow-hidden rounded-[1.1rem] border-[6px] border-paper shadow-2xl" style={{ aspectRatio: '459/608' }}>
                          <Picture src={src} alt={steps[i].title} sizes="40vw" />
                        </div>
                      </div>
                    ) : (
                      <Picture src={src} alt={steps[i].title} sizes="(min-width: 768px) 55vw, 90vw" className="block h-full w-full" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="md:col-span-5">
            <p className="display-l tnum" aria-hidden>
              2005
            </p>
            <div className="mt-3 flex items-center gap-3" aria-hidden>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-brand" style={{ width: `${p * 100}%` }} />
              </div>
              <span className="font-display text-2xl font-[650] text-brand">{lang === 'hi' ? 'आज' : 'today'}</span>
            </div>
            <div className="relative mt-10 min-h-[9rem]">
              {steps.map((s, i) => (
                <div key={i} className="absolute inset-0 transition-all duration-500" style={{ opacity: active === i ? 1 : 0, transform: `translateY(${active === i ? 0 : active > i ? -16 : 16}px)` }} aria-hidden={active !== i}>
                  <p className="section-no">{String(i + 1).padStart(2, '0')} / 03</p>
                  <p className="display-s mt-2">{s.title}</p>
                  <p className="mt-2 max-w-[38ch] text-[1.05rem] text-muted">{s.body}</p>
                </div>
              ))}
            </div>
            <p className="hand mt-6 text-muted">{t.journey.scroll} ↓</p>
          </div>
        </div>
      </div>
    </div>
  )
}
