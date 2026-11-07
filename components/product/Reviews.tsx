'use client'
import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useSession } from '@/components/providers/Session'
import { getBackend, errorCode } from '@/lib/backend'
import { IS_DEMO, DEMO_READY_KEY } from '@/lib/backend/config'
import { dateShort } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

interface R {
  count: number
  average: number | null
  items: { id: string; author: string; rating: number; body: string | null; verified: boolean; at: string }[]
}

export function Reviews({ productId }: { productId: string }) {
  const { t, lang, f } = useI18n()
  const { user, signIn } = useSession()
  const toast = useToast()
  const [data, setData] = useState<R | null>(null)
  const [writing, setWriting] = useState(false)
  const [rating, setRating] = useState(5)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let demoCold = false
    if (IS_DEMO) {
      try {
        demoCold = localStorage.getItem(DEMO_READY_KEY) !== '1'
      } catch {}
    }
    if (demoCold) return setData({ count: 0, average: null, items: [] })
    getBackend()
      .then((b) => b.rpc<R>('product_reviews', { product_id: productId }))
      .then(setData)
      .catch(() => setData({ count: 0, average: null, items: [] }))
  }, [productId])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const body = String(new FormData(e.currentTarget).get('body') || '')
    setBusy(true)
    try {
      const b = await getBackend()
      await b.rpc('submit_review', { product_id: productId, rating, body })
      toast(t.product.reviewSent)
      setWriting(false)
    } catch (x) {
      toast(errorCode(x), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="reviews-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-h" className="display-s">
            {t.product.reviews}
          </h2>
          {data && data.count > 0 && (
            <p className="mt-1 text-muted">
              <Stars n={Math.round(data.average ?? 0)} /> {data.average} · {data.count}
            </p>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => (user ? setWriting(true) : signIn())}>
          {t.product.writeReview}
        </button>
      </div>
      {writing && (
        <form onSubmit={submit} className="mt-6 grid max-w-xl gap-4 rounded-[1.4rem] bg-paper-2 p-5">
          <fieldset>
            <legend className="mb-2 font-semibold">{t.product.yourRating}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
                  <Star className={`h-8 w-8 peer-focus-visible:outline peer-focus-visible:outline-2 ${n <= rating ? 'fill-turmeric text-turmeric' : 'text-ink/30'}`} aria-hidden />
                  <span className="sr-only">{f(t.product.stars, { n })}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>{t.product.yourReview}</span>
            <textarea name="body" maxLength={1500} className="input" />
          </label>
          <div className="flex gap-2">
            <button className="btn btn-ink" disabled={busy}>
              {t.common.send}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setWriting(false)}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}
      {data == null ? (
        <div className="skeleton mt-6 h-24 max-w-xl" />
      ) : data.items.length === 0 ? (
        <div className="mt-6 max-w-xl rounded-[1.4rem] border-2 border-dashed border-line p-6">
          <p className="font-semibold">{t.product.noReviews}</p>
          <p className="mt-1 text-muted">{t.product.noReviewsBody}</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {data.items.map((r) => (
            <li key={r.id} className="rounded-[1.4rem] bg-paper-2 p-5">
              <Stars n={r.rating} />
              {r.body && <p className="mt-2">{r.body}</p>}
              <p className="mt-3 text-[0.85rem] text-muted">
                {r.author} · {dateShort(r.at, lang)}
                {r.verified && <span className="ml-2 font-semibold text-leaf">{t.product.verified}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex align-[-3px]" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= n ? 'fill-turmeric text-turmeric' : 'text-ink/25'}`} aria-hidden />
      ))}
    </span>
  )
}
