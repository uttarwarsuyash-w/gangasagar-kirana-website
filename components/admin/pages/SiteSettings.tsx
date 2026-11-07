'use client'
import { useEffect, useMemo, useState } from 'react'
import { getBackend } from '@/lib/backend'
import { baseDictionaries } from '@/lib/i18n'
import { POLICIES } from '@/content/policies'
import { useAction, PageHead, Panel, Field, Loading, ImageUpload, Badge } from '../ui'

// ---------------------------------------------------------------- Site content & translations
type Flat = Record<string, string>
function flatten(o: unknown, prefix = '', out: Flat = {}): Flat {
  if (typeof o === 'string') out[prefix] = o
  else if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
  return out
}

export function SiteContent() {
  const [tab, setTab] = useState<'policies' | 'texts'>('texts')
  return (
    <div>
      <PageHead title="Site content" sub="Change website texts in English and Hindi, and the policy pages. Changes go live after you press Publish." />
      <div className="mb-6 flex gap-2">
        <button className="chip" aria-pressed={tab === 'texts'} onClick={() => setTab('texts')}>
          Texts and translations
        </button>
        <button className="chip" aria-pressed={tab === 'policies'} onClick={() => setTab('policies')}>
          Policy pages
        </button>
      </div>
      {tab === 'texts' ? <Texts /> : <Policies />}
    </div>
  )
}

function Texts() {
  const base = useMemo(() => ({ en: flatten(baseDictionaries.en), hi: flatten(baseDictionaries.hi) }), [])
  const [over, setOver] = useState<{ en: Flat; hi: Flat } | null>(null)
  const [q, setQ] = useState('')
  const { busy, run } = useAction()
  useEffect(() => {
    getBackend()
      .then((b) => b.select<{ key: string; value: Flat }>('content', 'key,value', { in: ['key', ['i18n.en', 'i18n.hi']] }))
      .then((rows) => setOver({ en: rows.find((r) => r.key === 'i18n.en')?.value ?? {}, hi: rows.find((r) => r.key === 'i18n.hi')?.value ?? {} }))
  }, [])
  if (!over) return <Loading />
  const keys = Object.keys(base.en).filter((k) => k !== 'langName')
  const n = q.trim().toLowerCase()
  const shown = keys.filter((k) => !n || k.toLowerCase().includes(n) || base.en[k].toLowerCase().includes(n) || (base.hi[k] ?? '').includes(q) || (over.en[k] ?? '').toLowerCase().includes(n)).slice(0, 80)
  async function save() {
    await run(async () => {
      const b = await getBackend()
      const clean = (f: Flat) => Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()))
      await b.insert('content', [{ key: 'i18n.en', value: clean(over!.en) }, { key: 'i18n.hi', value: clean(over!.hi) }], 'key')
    }, 'Texts saved. Press Publish to put them on the website.')
  }
  const changed = Object.keys(over.en).length + Object.keys(over.hi).length
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Find a text" className="w-80">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. delivery, headline, थैली" />
        </Field>
        <button className="btn btn-brand" onClick={save} disabled={busy}>
          Save texts
        </button>
        {changed > 0 && <Badge tone="turmeric">{changed} changed</Badge>}
      </div>
      <p className="mb-4 text-[0.9rem] text-muted">Leave a box empty to keep the original text. Words in {'{braces}'} are filled in by the website; keep them.</p>
      <div className="space-y-3">
        {shown.map((k) => (
          <div key={k} className="grid gap-2 rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--color-line)] md:grid-cols-2">
            <p className="text-[0.75rem] font-semibold text-muted md:col-span-2">{k}</p>
            <Field label={`English: ${base.en[k]}`}>
              <input className="input" value={over.en[k] ?? ''} placeholder={base.en[k]} onChange={(e) => setOver({ ...over, en: { ...over.en, [k]: e.target.value } })} />
            </Field>
            <Field label={`Hindi: ${base.hi[k] ?? ''}`}>
              <input className="input" lang="hi" value={over.hi[k] ?? ''} placeholder={base.hi[k]} onChange={(e) => setOver({ ...over, hi: { ...over.hi, [k]: e.target.value } })} />
            </Field>
          </div>
        ))}
        {shown.length === 80 && <p className="text-muted">Showing the first 80. Search to find others.</p>}
      </div>
    </div>
  )
}

function Policies() {
  const [key, setKey] = useState<keyof typeof POLICIES>('terms')
  const [val, setVal] = useState<{ title_en: string; title_hi: string; en: string; hi: string } | null>(null)
  const { busy, run } = useAction()
  useEffect(() => {
    setVal(null)
    getBackend()
      .then((b) => b.select<{ value: typeof val }>('content', 'value', { eq: { key: `policy.${key}` } }))
      .then((r) => setVal({ ...(POLICIES[key] as unknown as NonNullable<typeof val>), ...(r[0]?.value ?? {}) }))
  }, [key])
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(POLICIES) as (keyof typeof POLICIES)[]).map((k) => (
          <button key={k} className="chip" aria-pressed={key === k} onClick={() => setKey(k)}>
            {POLICIES[k].title_en}
          </button>
        ))}
        <Badge tone="turmeric">To be reviewed by the owners before launch</Badge>
      </div>
      {!val ? (
        <Loading />
      ) : (
        <Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Title (English)">
              <input className="input" value={val.title_en} onChange={(e) => setVal({ ...val, title_en: e.target.value })} />
            </Field>
            <Field label="Title (Hindi)">
              <input className="input" lang="hi" value={val.title_hi} onChange={(e) => setVal({ ...val, title_hi: e.target.value })} />
            </Field>
            <Field label="Text (English)" hint="Blank line between paragraphs; ## for a heading; - for a list">
              <textarea className="input !min-h-[28rem] font-mono text-[0.85rem]" value={val.en} onChange={(e) => setVal({ ...val, en: e.target.value })} />
            </Field>
            <Field label="Text (Hindi)">
              <textarea className="input !min-h-[28rem] font-mono text-[0.85rem]" lang="hi" value={val.hi} onChange={(e) => setVal({ ...val, hi: e.target.value })} />
            </Field>
          </div>
          <button
            className="btn btn-brand mt-4"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const b = await getBackend()
                await b.insert('content', [{ key: `policy.${key}`, value: val }], 'key')
              }, 'Policy saved. Press Publish to update the website.')
            }
          >
            Save policy
          </button>
        </Panel>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Settings
type S = Record<string, any>
export function SettingsAdmin() {
  const [s, setS] = useState<S | null>(null)
  const { busy, run } = useAction()
  useEffect(() => {
    getBackend()
      .then((b) => b.select<{ key: string; value: unknown }>('settings', 'key,value'))
      .then((rows) => setS(Object.fromEntries(rows.map((r) => [r.key, r.value]))))
  }, [])
  if (!s) return <Loading />
  const set = (k: string, v: unknown) => setS({ ...s, [k]: v })
  const setIn = (k: string, f: string, v: unknown) => setS({ ...s, [k]: { ...(s[k] ?? {}), [f]: v } })
  const num = (k: string, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input type="number" min={0} className="input" value={Number(s[k] ?? 0)} onChange={(e) => set(k, Number(e.target.value))} />
    </Field>
  )
  async function save() {
    await run(async () => {
      const b = await getBackend()
      const PRIVATE = new Set(['turnstile_required', 'last_publish'])
      const rows = Object.entries(s!)
        .filter(([k]) => k !== 'last_publish' && k !== 'store_mode')
        .map(([key, value]) => ({ key, value, is_public: !PRIVATE.has(key) }))
      await b.insert('settings', rows, 'key')
    }, 'Settings saved. Prices and delivery rules apply at once; business details update after Publish.')
  }
  const pins: string[] = Array.isArray(s.delivery_pincodes) ? s.delivery_pincodes : []
  return (
    <div>
      <PageHead
        title="Settings"
        sub="Store details, payment, delivery rules and quantities."
        actions={
          <button className="btn btn-brand btn-sm" onClick={save} disabled={busy}>
            Save settings
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="UPI payment (outside Nanded)">
          <div className="grid gap-3">
            <Field label="UPI ID" hint="For example gangasagar@okaxis">
              <input className="input" value={s.upi?.id ?? ''} onChange={(e) => setIn('upi', 'id', e.target.value.trim())} />
            </Field>
            <Field label="Name shown in UPI apps">
              <input className="input" value={s.upi?.payee ?? ''} onChange={(e) => setIn('upi', 'payee', e.target.value)} />
            </Field>
            <ImageUpload label="UPI QR code" bucket="content" value={s.upi?.qr_url || null} onChange={(url) => setIn('upi', 'qr_url', url)} />
          </div>
        </Panel>
        <Panel title="Nanded delivery">
          <Field label="Delivery pincodes" hint="Separate with commas. Home delivery is offered only to these.">
            <input className="input" value={pins.join(', ')} onChange={(e) => set('delivery_pincodes', e.target.value.split(/[,\s]+/).filter((x) => /^\d{6}$/.test(x)))} />
          </Field>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {num('free_delivery_min_value', 'Free delivery from (₹)')}
            {num('heavy_weight_g', 'Heavy order from (grams)', '2000 = 2 kg')}
            {num('fee_heavy', 'Fee for heavy orders (₹)')}
            {num('fee_light', 'Fee for light orders (₹)')}
          </div>
        </Panel>
        <Panel title="Outside Nanded and bulk">
          <div className="grid grid-cols-2 gap-3">
            {num('outside_flat_fee', 'Courier / transport fee (₹)')}
            {num('bulk_threshold_g', 'Bulk / quotation from (grams)', '20000 = 20 kg')}
          </div>
        </Panel>
        <Panel title="Quantities for loose items">
          <div className="grid grid-cols-3 gap-3">
            {num('loose_min_g', 'Minimum (g)')}
            {num('loose_step_g', 'Step (g)')}
            {num('custom_min_g', 'Custom request from (g)')}
          </div>
          <p className="mt-2 text-[0.85rem] text-muted">Each product can override these in Products.</p>
        </Panel>
        <Panel title="Phones and email">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Main number (chatbot sends here)">
              <input className="input" value={s.phones?.main ?? ''} onChange={(e) => setIn('phones', 'main', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </Field>
            <Field label="Support number">
              <input className="input" value={s.phones?.support ?? ''} onChange={(e) => setIn('phones', 'support', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </Field>
            <Field label="Owner's public number">
              <input className="input" value={s.phones?.owner ?? ''} onChange={(e) => setIn('phones', 'owner', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </Field>
            <Field label="Emails (comma separated)">
              <input className="input" value={(s.emails ?? []).join(', ')} onChange={(e) => set('emails', e.target.value.split(/[,\s]+/).filter(Boolean))} />
            </Field>
          </div>
        </Panel>
        <Panel title="Address, hours and links">
          <div className="grid gap-3">
            <Field label="Address (English)">
              <input className="input" value={s.address?.line_en ?? ''} onChange={(e) => setIn('address', 'line_en', e.target.value)} />
            </Field>
            <Field label="Address (Hindi)">
              <input className="input" lang="hi" value={s.address?.line_hi ?? ''} onChange={(e) => setIn('address', 'line_hi', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opens">
                <input type="time" className="input" value={s.hours?.open ?? '08:00'} onChange={(e) => setIn('hours', 'open', e.target.value)} />
              </Field>
              <Field label="Closes">
                <input type="time" className="input" value={s.hours?.close ?? '20:00'} onChange={(e) => setIn('hours', 'close', e.target.value)} />
              </Field>
            </div>
            <Field label="Google Maps link">
              <input className="input" value={s.address?.maps_url ?? ''} onChange={(e) => setIn('address', 'maps_url', e.target.value)} />
            </Field>
            <Field label="Instagram">
              <input className="input" value={s.social?.instagram ?? ''} onChange={(e) => setIn('social', 'instagram', e.target.value)} />
            </Field>
            <Field label="Google reviews: read link">
              <input className="input" value={s.google_reviews?.read_url ?? ''} onChange={(e) => setIn('google_reviews', 'read_url', e.target.value)} />
            </Field>
            <Field label="Google reviews: write-a-review link" hint="From your Google Business Profile: Ask for reviews > copy link">
              <input className="input" value={s.google_reviews?.write_url ?? ''} onChange={(e) => setIn('google_reviews', 'write_url', e.target.value)} />
            </Field>
          </div>
        </Panel>
        <Panel title="Invoices">
          <div className="grid gap-3">
            <Field label="Name printed on invoices">
              <input className="input" value={s.invoice?.name ?? ''} onChange={(e) => setIn('invoice', 'name', e.target.value)} />
            </Field>
            <Field label="FSSAI number (optional)" hint="Leave empty if the store has none. GSTIN is never printed.">
              <input className="input" value={s.invoice?.fssai ?? ''} onChange={(e) => setIn('invoice', 'fssai', e.target.value.trim() || null)} />
            </Field>
          </div>
        </Panel>
        <Panel title="Homepage sections">
          <div className="grid grid-cols-2 gap-2">
            {['offers', 'reviews', 'instagram', 'journey', 'leadership', 'gallery', 'blog'].map((k) => (
              <label key={k} className="flex items-center gap-2 capitalize">
                <input type="checkbox" checked={s.sections?.[k] !== false} onChange={(e) => setIn('sections', k, e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" /> {k}
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Spam protection">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={s.turnstile_required === true} onChange={(e) => set('turnstile_required', e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" />
            <span>
              Require the Cloudflare Turnstile check on public forms.
              <span className="block text-[0.85rem] text-muted">Turn on only after SETUP.md step 7 (Turnstile keys), or forms will stop working.</span>
            </span>
          </label>
        </Panel>
      </div>
    </div>
  )
}
