'use client'
import { useState } from 'react'
import type { Product } from '@/lib/types'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'
import { useSession } from '@/components/providers/Session'
import { submitEnquiry } from '@/lib/enquiry'
import { errorCode } from '@/lib/backend'
import { Turnstile } from '@/components/content/Turnstile'
import { SITE } from '@/lib/site'

export function CustomQuantity({ product }: { product: Product }) {
  const { t, lang, f } = useI18n()
  const { fees } = useLive().settings
  const { profile } = useSession()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [token, setToken] = useState<string>()

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    setErr(null)
    try {
      await submitEnquiry(
        {
          kind: 'custom_quantity',
          product_id: product.id,
          quantity_g: Number(fd.get('qty')),
          name: String(fd.get('name') || ''),
          phone: String(fd.get('phone') || ''),
          message: String(fd.get('message') || ''),
        },
        token,
      )
      setDone(true)
    } catch (x) {
      const code = errorCode(x)
      setErr(t.contact.errors[code as keyof typeof t.contact.errors] ?? f(t.contact.errors.generic, { phone: SITE.phones.main }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 rounded-[1.4rem] border border-line p-5">
      <button className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <span className="block font-semibold">{t.product.customTitle}</span>
          <span className="block text-[0.9rem] text-muted">{t.product.customBody}</span>
        </span>
        <span className="text-2xl leading-none">{open ? '−' : '+'}</span>
      </button>
      {open &&
        (done ? (
          <p className="mt-4 rounded-xl bg-leaf-light p-4 font-semibold text-leaf" role="status">
            {t.contact.sent}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>{t.product.customQty}</span>
              <input name="qty" type="number" inputMode="numeric" min={fees.custom_min_g} step={50} required defaultValue={fees.custom_min_g * 2} className="input" />
            </label>
            <label className="field">
              <span>{t.contact.name}</span>
              <input name="name" required minLength={2} maxLength={80} defaultValue={profile?.full_name ?? ''} className="input" autoComplete="name" />
            </label>
            <label className="field">
              <span>{t.contact.phone}</span>
              <input name="phone" required pattern="[6-9][0-9]{9}" inputMode="numeric" maxLength={10} defaultValue={profile?.phone ?? ''} className="input" autoComplete="tel-national" />
            </label>
            <label className="field">
              <span>
                {t.contact.message} <span className="font-normal text-muted">({t.common.optional})</span>
              </span>
              <input name="message" maxLength={500} className="input" />
            </label>
            <div className="sm:col-span-2">
              <Turnstile onToken={setToken} lang={lang} />
              {err && (
                <p className="field-error mb-2" role="alert">
                  {err}
                </p>
              )}
              <button className="btn btn-ink" disabled={busy}>
                {busy ? t.common.loading : t.product.customCta}
              </button>
            </div>
          </form>
        ))}
    </div>
  )
}
