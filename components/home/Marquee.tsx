import type { Category } from '@/lib/types'

/** Slow marquee of category names, alternating English and Hindi. */
export function Marquee({ categories, dark }: { categories: Category[]; dark?: boolean }) {
  const words = categories.flatMap((c) => [c.name_en, c.name_hi])
  const row = (
    <div className="marquee__track" aria-hidden>
      {words.map((w, i) => (
        <span key={i} className={`flex items-center gap-12 whitespace-nowrap font-display text-[clamp(1.8rem,4.2vw,3.6rem)] font-[600] tracking-[-0.02em] ${i % 2 ? 'text-brand' : ''}`} lang={i % 2 ? 'hi' : 'en'}>
          {w}
          <span className={`inline-block h-2.5 w-2.5 rotate-45 ${dark ? 'bg-turmeric' : 'bg-ink'}`} />
        </span>
      ))}
    </div>
  )
  return (
    <div className={`marquee border-y border-line py-5 ${dark ? 'on-ink' : ''}`} style={{ ['--marquee-speed' as string]: '90s' }}>
      {row}
      {row}
    </div>
  )
}
