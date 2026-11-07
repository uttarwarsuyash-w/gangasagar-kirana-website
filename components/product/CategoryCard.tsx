import Link from 'next/link'
import type { Category } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import { Picture } from '@/components/ui/Picture'
import { imageKey } from '@/lib/images'
import { Pouch } from './Pouch'

export function CategoryCard({ c, lang, count, index, image }: { c: Category; lang: Lang; count: number; index: number; image?: string | null }) {
  const name = lang === 'hi' ? c.name_hi : c.name_en
  const other = lang === 'hi' ? c.name_en : c.name_hi
  const render = imageKey(`renders/cat-${c.id}`) ? `/img/renders/cat-${c.id}` : image ?? null
  return (
    <Link
      href={`/${lang}/category/${c.id}/`}
      className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[1.6rem] p-4 transition-transform duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 sm:p-5"
      style={{ background: `color-mix(in oklab, ${c.colour} 16%, var(--color-paper-2))` }}
    >
      <span className="text-[0.8rem] font-semibold tnum" style={{ color: c.colour }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="mt-1 font-display text-[1.45rem] font-[650] leading-[1.02] tracking-[-0.025em] sm:text-[1.7rem]" style={{ fontStretch: '86%' }}>
        {name}
      </span>
      <span className="mt-1 text-[0.85rem] text-muted" lang={lang === 'hi' ? 'en' : 'hi'}>
        {other}
      </span>
      <span className="absolute inset-x-0 bottom-0 h-[52%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">
        {render ? (
          <Picture src={render} alt="" sizes="(min-width: 1024px) 20vw, 50vw" className="block h-full w-full" imgClassName="object-cover" />
        ) : (
          <Pouch nameEn={c.name_en} nameHi={c.name_hi} colour={c.colour} className="!bg-transparent" />
        )}
      </span>
      <span className="absolute bottom-4 right-4 rounded-full bg-paper/90 px-2.5 py-1 text-[0.75rem] font-semibold tnum backdrop-blur-sm">{count}</span>
    </Link>
  )
}
