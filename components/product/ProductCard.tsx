'use client'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useRef } from 'react'
import type { Product } from '@/lib/types'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { useCart } from '@/components/providers/Cart'
import { useToast } from '@/components/ui/Toast'
import { inr } from '@/lib/format'
import { ProductArt } from './ProductArt'
import { flyToBag } from '@/components/cart/fly'
import { snapOf, defaultLooseQty } from './snap'

interface Props {
  product: Product
  colour: string
  priority?: boolean
  tilt?: number
  size?: 'md' | 'lg'
}

export function ProductCard({ product, colour, priority, tilt = 0, size = 'md' }: Props) {
  const { lang, t, p, href } = useI18n()
  const live = useLive()
  const cart = useCart()
  const toast = useToast()
  const card = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const name = p(product, 'name')
  const other = lang === 'en' ? product.name_hi : product.name_en

  // Starting price with live override
  const first = product.variants[0]
  const cheapest = first?.is_loose
    ? first
    : product.variants.reduce((a, b) => (live.priceOf(b.id, b).unit < live.priceOf(a.id, a).unit ? b : a), first)
  const pr = cheapest ? live.priceOf(cheapest.id, cheapest) : null
  const avail = cheapest ? (live.availabilityOf(cheapest.id) ?? 'available') : 'out'

  function quickAdd() {
    if (!cheapest) return
    const qty = cheapest.is_loose ? defaultLooseQty(product, live.settings.fees) : 1
    cart.add({ variant_id: cheapest.id, product_id: product.id, quantity: qty, snap: snapOf(product, cheapest, colour) })
    flyToBag(btn.current, product.pour_kind ?? 'peanut')
    toast(`${t.common.added}: ${name}`)
  }

  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !card.current) return
    const r = card.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.current.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`)
    card.current.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`)
  }
  function onLeave() {
    card.current?.style.setProperty('--rx', '0deg')
    card.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="group relative" style={{ ['--tilt' as string]: `${tilt}deg` }}>
      <div
        ref={card}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-paper-2 transition-transform duration-300 ease-out [transform:perspective(900px)_rotate(var(--tilt))_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        <Link href={href(`/product/${product.id}/`)} className="absolute inset-0" data-morph={product.id} aria-label={name}>
          <ProductArt
            image={product.image_url}
            nameEn={product.name_en}
            nameHi={product.name_hi}
            colour={colour}
            alt={name}
            sizes={size === 'lg' ? '(min-width: 1024px) 30vw, 70vw' : '(min-width: 1024px) 20vw, 45vw'}
            priority={priority}
            vt={`p-${product.id}`}
            className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
        </Link>
        {avail !== 'available' && (
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${avail === 'out' ? 'bg-ink text-paper' : 'bg-turmeric text-ink'}`}>
            {t.availability[avail]}
          </span>
        )}
        <button
          ref={btn}
          onClick={quickAdd}
          disabled={avail === 'out'}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-ink text-paper shadow-[0_8px_20px_-8px_rgb(31_26_23/0.6)] transition hover:scale-105 hover:bg-brand disabled:opacity-40"
          aria-label={`${t.common.addToBag}: ${name}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <Link href={href(`/product/${product.id}/`)} className="mt-3 block" tabIndex={-1}>
        <h3 className={`font-display font-[620] leading-[1.08] tracking-[-0.02em] ${size === 'lg' ? 'text-[1.45rem]' : 'text-[1.12rem]'}`}>{name}</h3>
        <p className="mt-0.5 text-[0.85rem] text-muted" lang={lang === 'en' ? 'hi' : 'en'}>
          {other}
        </p>
      </Link>
      {pr && (
        <p className="mt-1.5 flex items-baseline gap-1.5 text-[0.95rem]">
          {!cheapest.is_loose && product.variants.length > 1 && <span className="text-muted">{t.common.from}</span>}
          <span className="font-semibold tnum">{inr(pr.unit)}</span>
          {pr.sale_price != null && <s className="text-[0.8rem] text-muted">{inr(pr.price)}</s>}
          <span className="text-muted">{cheapest.is_loose ? `/ ${t.common.kg}` : `/ ${p(cheapest, 'label')}`}</span>
        </p>
      )}
    </div>
  )
}
