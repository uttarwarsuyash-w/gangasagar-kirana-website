'use client'
import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import type { Product } from '@/lib/types'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { useCart } from '@/components/providers/Cart'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { QtyStepper } from '@/components/cart/QtyStepper'
import { ScalePicker } from './ScalePicker'
import { flyToBag } from '@/components/cart/fly'
import { snapOf, defaultLooseQty } from './snap'
import { grams, inr } from '@/lib/format'
import { lineTotal } from '@/lib/commerce/rules'
import { SITE, SITE_URL, waLink } from '@/lib/site'
import { WhatsAppIcon } from '@/components/ui/Icons'
import { getBackend, errorCode } from '@/lib/backend'
import { CustomQuantity } from './CustomQuantity'

export function ProductBuy({ product, colour }: { product: Product; colour: string }) {
  const { t, lang, p, f } = useI18n()
  const live = useLive()
  const cart = useCart()
  const toast = useToast()
  const { user, signIn } = useSession()
  const fees = live.settings.fees
  const loose = product.sell_type === 'loose'
  const [vid, setVid] = useState(product.variants[0].id)
  const v = product.variants.find((x) => x.id === vid) ?? product.variants[0]
  const min = loose ? (product.min_qty_g ?? fees.loose_min_g) : 1
  const step = loose ? (product.step_g ?? fees.loose_step_g) : 1
  const max = loose ? (product.max_qty_g ?? 100000) : 999
  const [qty, setQty] = useState(loose ? defaultLooseQty(product, fees) : 1)
  const [stone, setStone] = useState<string | null>(loose ? null : v.id)
  const [wish, setWish] = useState(false)
  const addBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!user) return
    getBackend()
      .then((b) => b.select('wishlist', 'product_id', { eq: { product_id: product.id } }))
      .then((r) => setWish(r.length > 0))
      .catch(() => {})
  }, [user, product.id])

  const pr = live.priceOf(v.id, v)
  const avail = live.availabilityOf(v.id) ?? 'available'
  const total = lineTotal(pr.unit, qty, v.is_loose)
  const weighable = product.sell_type === 'loose' || product.sell_type === 'packed'

  const stones = loose
    ? product.pack_sizes_g.filter((g) => g >= min && g <= max && (g - min) % step === 0).map((g) => ({ key: String(g), grams: g, label: grams(g, lang) }))
    : product.sell_type === 'packed'
      ? product.variants.map((x) => ({ key: x.id, grams: x.unit_weight_g, label: p(x, 'label') }))
      : []

  function chooseStone(key: string) {
    if (loose) {
      setStone(key)
      setQty(Number(key))
    } else {
      setVid(key)
      setStone(key)
      setQty(1)
    }
  }

  function add() {
    cart.add({ variant_id: v.id, product_id: product.id, quantity: qty, snap: snapOf(product, v, colour) })
    flyToBag(addBtn.current, product.pour_kind ?? (loose ? 'peanut' : 'chikki'))
    toast(`${t.common.added}: ${p(product, 'name')} (${loose ? grams(qty, lang) : `${qty} × ${p(v, 'label')}`})`)
  }

  async function toggleWish() {
    if (!user) return signIn()
    const b = await getBackend()
    try {
      if (wish) await b.remove('wishlist', { eq: { product_id: product.id } })
      else await b.insert('wishlist', [{ product_id: product.id }])
      setWish(!wish)
    } catch (e) {
      toast(errorCode(e), 'error')
    }
  }

  const qtyText = loose ? grams(qty, lang) : `${qty} × ${p(v, 'label')}`
  const waMsg = f(t.product.enquireMessage, { name: product.name_en, qty: qtyText, url: `${SITE_URL}/${lang}/product/${product.id}/` })

  return (
    <div>
      {/* price */}
      <div className="flex flex-wrap items-end gap-3">
        <p className="kraft-tag text-[1.6rem]">
          <span className="tnum">{inr(pr.unit)}</span>
          <span className="text-[1rem]">/ {loose ? t.common.kg : p(v, 'label')}</span>
        </p>
        {pr.sale_price != null && <s className="pb-1 text-muted">{inr(pr.price)}</s>}
        <Availability a={avail} />
      </div>
      {v.price_is_sample && <p className="mt-2 text-[0.85rem] text-muted">{t.product.sampleNote}</p>}

      {/* scale */}
      {weighable && (
        <div className="mt-6 rounded-[1.6rem] bg-paper-2 px-3 pb-4 pt-2 sm:px-6">
          <ScalePicker value={qty} isLoose={loose} unitWeight={v.unit_weight_g} stones={stones} activeStone={stone} onStone={chooseStone} pourKind={product.pour_kind} colour={colour} />
        </div>
      )}

      {/* accessible controls */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {loose ? (
          stones.length > 0 && (
            <label className="field">
              <span>{t.product.quickWeights}</span>
              <select className="input" value={stones.some((s) => s.grams === qty) ? String(qty) : ''} onChange={(e) => e.target.value && chooseStone(e.target.value)}>
                <option value="">{grams(qty, lang)}</option>
                {stones.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : product.variants.length > 1 ? (
          <label className="field">
            <span>{t.product.packSize}</span>
            <select className="input" value={v.id} onChange={(e) => chooseStone(e.target.value)}>
              {product.variants.map((x) => (
                <option key={x.id} value={x.id}>
                  {p(x, 'label')} · {inr(live.priceOf(x.id, x).unit)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="field">
            <span>{t.product.packSize}</span>
            <p className="flex min-h-12 items-center font-semibold">{p(v, 'label')}</p>
          </div>
        )}
        <div className="field">
          <span id="qty-label">{loose ? t.product.weight : t.product.packs}</span>
          <QtyStepper value={qty} isLoose={loose} min={min} step={step} max={max} onChange={setQty} label={loose ? t.product.weight : t.product.packs} />
        </div>
      </div>
      {loose && <p className="mt-3 text-[0.85rem] text-muted">{t.product.priceNote}</p>}

      {/* total + add */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className="text-[0.85rem] text-muted">{t.product.total}</p>
          <p className="font-display text-[2rem] font-[650] leading-none tnum" aria-live="polite">
            {inr(total)}
          </p>
        </div>
        <button className="icon-btn !h-14 !w-14 shadow-[inset_0_0_0_1.5px_var(--color-line)]" onClick={toggleWish} aria-pressed={wish} aria-label={wish ? t.product.wishlistRemove : t.product.wishlistAdd}>
          <Heart className={`h-5 w-5 ${wish ? 'fill-brand text-brand' : ''}`} />
        </button>
        <button ref={addBtn} className="btn btn-brand btn-lg min-w-[12rem]" onClick={add} disabled={avail === 'out'}>
          {t.common.addToBag}
        </button>
      </div>
      {avail === 'out' && <p className="mt-3 font-semibold text-brand">{t.product.outOfStock}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <a href={waLink(SITE.phones.main, waMsg)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
          <WhatsAppIcon className="h-4 w-4" /> {t.product.enquire}
        </a>
      </div>

      {loose && <CustomQuantity product={product} />}
    </div>
  )
}

export function Availability({ a }: { a: 'available' | 'limited' | 'out' }) {
  const { t } = useI18n()
  const cls = a === 'available' ? 'bg-leaf-light text-leaf' : a === 'limited' ? 'bg-turmeric/20 text-turmeric-dark' : 'bg-ink/8 text-ink'
  const dot = a === 'available' ? 'bg-leaf' : a === 'limited' ? 'bg-turmeric' : 'bg-ink/40'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.85rem] font-semibold ${cls}`}>
      <span className={`status-dot ${dot}`} />
      {t.availability[a]}
    </span>
  )
}
