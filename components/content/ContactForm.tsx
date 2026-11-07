'use client'
import { useState } from 'react'
import { useI18n } from '@/components/providers/I18n'
import { useSession } from '@/components/providers/Session'
import { submitEnquiry } from '@/lib/enquiry'
import { errorCode } from '@/lib/backend'
import { Turnstile } from './Turnstile'
import { SITE } from '@/lib/site'
import { phoneDisplay } from '@/lib/format'

export function ContactForm() {
  const { t, f, lang } = useI18n()
  const { profile, user } = useSession()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [token, setToken] = useState<string>()

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const phone = String(fd.get('phone') || '').replace(/\D/g, '')
    const email = String(fd.get('email') || '').trim()
    if (!phone && !email) return setErr(t.contact.errors.phone_or_email_required)
    setBusy(true)
    setErr(null)
    try {
      await submitEnquiry({ kind: 'contact', name: String(fd.get('name') || ''), phone: phone || undefined, email: email || undefined, message: String(fd.get('message') || '') }, token)
      setDone(true)
    } catch (x) {
      const c = errorCode(x)
      setErr(t.contact.errors[c as keyof typeof t.contact.errors] ?? f(t.contact.errors.generic, { phone: phoneDisplay(SITE.phones.main) }))
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div className="rounded-[1.6rem] bg-leaf-light p-8" role="status">
        <p className="display-s text-leaf">{t.contact.sent}</p>
      </div>
    )
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="field sm:col-span-2">
        <span>{t.contact.name}</span>
        <input name="name" className="input" required minLength={2} maxLength={80} autoComplete="name" defaultValue={profile?.full_name ?? ''} />
      </label>
      <label className="field">
        <span>{t.contact.phone}</span>
        <input name="phone" className="input" inputMode="numeric" maxLength={10} autoComplete="tel-national" defaultValue={profile?.phone ?? ''} />
      </label>
      <label className="field">
        <span>{t.contact.email}</span>
        <input name="email" type="email" className="input" autoComplete="email" defaultValue={user?.email ?? ''} />
      </label>
      <p className="field-hint sm:col-span-2">{t.contact.phoneOrEmail}</p>
      <label className="field sm:col-span-2">
        <span>{t.contact.message}</span>
        <textarea name="message" className="input" required maxLength={2000} />
      </label>
      <div className="sm:col-span-2">
        <Turnstile onToken={setToken} lang={lang} />
        {err && (
          <p className="field-error mb-3" role="alert">
            {err}
          </p>
        )}
        <button className="btn btn-ink btn-lg" disabled={busy}>
          {busy ? t.common.loading : t.contact.send}
        </button>
      </div>
    </form>
  )
}
