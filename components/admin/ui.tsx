'use client'
import { useCallback, useEffect, useState } from 'react'
import { getBackend, errorCode } from '@/lib/backend'
import { useToast } from '@/components/ui/Toast'
import { imageKey, fallbackSrc } from '@/lib/images'

export function useAdminRpc<T>(fn: string, p: object = {}, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(p)
  const load = useCallback(() => {
    getBackend()
      .then((b) => b.rpc<T>(fn, JSON.parse(key)))
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => setError(errorCode(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, key, ...deps])
  useEffect(load, [load])
  return { data, error, reload: load }
}

export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setBusy(true)
    try {
      const r = await fn()
      if (success) toast(success)
      return r
    } catch (e) {
      toast(`Not saved: ${humanError(errorCode(e))}`, 'error')
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

const ERRORS: Record<string, string> = {
  not_admin: 'this account is not an admin',
  payment_not_verified: 'record the UPI payment first (outside-Nanded orders are prepaid)',
  status_must_move_forward: 'status can only move forward',
  order_closed: 'this order is already delivered or cancelled',
  stock_below_zero: 'stock cannot go below zero',
  sample_prices_remain: 'some visible products still have sample prices',
  bad_valid_until: 'choose a valid-until date from today onwards',
  bad_shipping: 'enter shipping in rupees (0 or more)',
  no_pending_request: 'there is no open cancellation request',
  file_too_large: 'the photo is larger than 2 MB',
}
export function humanError(code: string) {
  if (ERRORS[code]) return ERRORS[code]
  if (/duplicate key/.test(code)) return 'an item with this id already exists'
  if (/violates check constraint/.test(code)) return 'a value is not allowed (check the fields)'
  if (/permission denied|row-level security/.test(code)) return 'not allowed for this account'
  return code
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2.4rem] font-[650] leading-none tracking-[-0.03em] sm:text-[3rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-[60ch] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'brand' | 'leaf' | 'turmeric' }) {
  const c = tone === 'brand' ? 'text-brand' : tone === 'leaf' ? 'text-leaf' : tone === 'turmeric' ? 'text-turmeric-dark' : ''
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <p className="text-[0.85rem] text-muted">{label}</p>
      <p className={`mt-1 font-display text-[2rem] font-[650] leading-none tnum ${c}`}>{value}</p>
      {hint && <p className="mt-2 text-[0.8rem] text-muted">{hint}</p>}
    </div>
  )
}

export function Panel({ title, children, actions, className = '' }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-[inset_0_0_0_1px_var(--color-line)] ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-[650]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'leaf' | 'turmeric' | 'ink' }) {
  const t = {
    neutral: 'bg-paper-2 text-ink',
    brand: 'bg-brand-light text-brand-dark',
    leaf: 'bg-leaf-light text-leaf',
    turmeric: 'bg-turmeric/20 text-turmeric-dark',
    ink: 'bg-ink text-paper',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${t}`}>{children}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-muted">{children}</div>
}

export function Loading() {
  return <div className="skeleton h-48" />
}

/** Delete-style button that asks for confirmation inline (no browser dialogs). */
export function ConfirmButton({ onConfirm, children, label = 'Delete', className = 'btn btn-ghost btn-sm' }: { onConfirm: () => void; children?: React.ReactNode; label?: string; className?: string }) {
  const [ask, setAsk] = useState(false)
  useEffect(() => {
    if (!ask) return
    const t = setTimeout(() => setAsk(false), 5000)
    return () => clearTimeout(t)
  }, [ask])
  return ask ? (
    <span className="inline-flex items-center gap-2" role="group" aria-label="Confirm">
      <span className="text-[0.85rem] font-semibold text-brand">Sure?</span>
      <button
        type="button"
        className="btn btn-brand btn-sm"
        onClick={() => {
          setAsk(false)
          onConfirm()
        }}
      >
        Yes, {label.toLowerCase()}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsk(false)}>
        No
      </button>
    </span>
  ) : (
    <button type="button" className={className} onClick={() => setAsk(true)}>
      {children ?? label}
    </button>
  )
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`border-b border-line px-3 py-2.5 text-left text-[0.8rem] font-semibold text-muted ${className}`}>{children}</th>
}
export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3 py-2.5 align-middle ${className}`}>{children}</td>
}
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
      <table className="w-full min-w-[640px] border-collapse text-[0.92rem]">{children}</table>
    </div>
  )
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function download(name: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Compress a photo in the browser before upload (max 1600 px, WebP). */
export async function compressImage(file: File, max = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('not_an_image')
  if (file.type === 'image/svg+xml') return file
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('compress_failed'))), 'image/webp', 0.82))
}

export function ImageUpload({ value, onChange, bucket, label = 'Photo' }: { value: string | null; onChange: (url: string) => void; bucket: 'products' | 'gallery' | 'content'; label?: string }) {
  const { busy, run } = useAction()
  return (
    <div className="field">
      <span>{label}</span>
      <div className="flex items-center gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper-2 text-[0.75rem] text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={imageKey(value) ? fallbackSrc(imageKey(value)!) : value} alt="" className="h-full w-full object-cover" /> : 'No photo'}
        </div>
        <label className="btn btn-ghost btn-sm cursor-pointer">
          {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              const url = await run(async () => {
                const blob = await compressImage(f)
                const b = await getBackend()
                return b.upload(bucket, blob, f.name.replace(/\.\w+$/, '.webp'))
              }, 'Photo uploaded')
              if (url) onChange(url)
            }}
          />
        </label>
      </div>
    </div>
  )
}
