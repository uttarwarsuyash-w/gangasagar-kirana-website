'use client'
// One editor for offers, gallery photos, blog posts and FAQs: create, edit, schedule, publish, delete.
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { getBackend } from '@/lib/backend'
import { dateShort } from '@/lib/format'
import { useAction, PageHead, Badge, Loading, Empty, Panel, Field, ConfirmButton, ImageUpload } from '../ui'

type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'markdown' | 'slug' | 'url'; hi?: boolean; required?: boolean; hint?: string }
  | { key: string; label: string; type: 'select'; options: [string, string][] }
  | { key: string; label: string; type: 'datetime' | 'number' | 'bool' }
  | { key: string; label: string; type: 'image'; bucket: 'products' | 'gallery' | 'content' }
  | { key: string; label: string; type: 'tags'; hint?: string }

interface Config {
  table: 'offers' | 'gallery_items' | 'posts' | 'faqs'
  title: string
  sub: string
  columns: string
  publishKey: 'is_published'
  titleOf: (r: Row) => string
  subOf?: (r: Row) => string
  order: [string, 'asc' | 'desc']
  fields: FieldDef[]
  blank: () => Row
  viewUrl?: (r: Row) => string | null
}
type Row = Record<string, unknown> & { id?: string }

export const CONFIGS: Record<string, Config> = {
  offers: {
    table: 'offers',
    title: 'Offers',
    sub: 'Festival deals, combos and bulk offers. Set start and end dates; an offer shows only while it is published and within its dates.',
    columns: 'id,kind,title_en,title_hi,body_en,body_hi,image_url,link_url,starts_at,ends_at,is_published,sort',
    publishKey: 'is_published',
    titleOf: (r) => String(r.title_en ?? ''),
    subOf: (r) => `${r.kind}${r.ends_at ? ` · until ${dateShort(String(r.ends_at))}` : ''}`,
    order: ['sort', 'asc'],
    fields: [
      { key: 'kind', label: 'Type', type: 'select', options: [['festival', 'Festival'], ['combo', 'Combo'], ['bulk', 'Bulk'], ['general', 'General']] },
      { key: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { key: 'title_hi', label: 'Title (Hindi)', type: 'text', hi: true, required: true },
      { key: 'body_en', label: 'Details (English)', type: 'textarea' },
      { key: 'body_hi', label: 'Details (Hindi)', type: 'textarea', hi: true },
      { key: 'image_url', label: 'Photo', type: 'image', bucket: 'content' },
      { key: 'link_url', label: 'Button link (optional)', type: 'url', hint: 'For example /en/category/dry-fruits/' },
      { key: 'starts_at', label: 'Starts', type: 'datetime' },
      { key: 'ends_at', label: 'Ends', type: 'datetime' },
      { key: 'sort', label: 'Order', type: 'number' },
    ],
    blank: () => ({ kind: 'festival', title_en: '', title_hi: '', body_en: '', body_hi: '', image_url: null, link_url: null, starts_at: null, ends_at: null, is_published: false, sort: 0 }),
    viewUrl: () => '/en/offers/',
  },
  gallery: {
    table: 'gallery_items',
    title: 'Gallery',
    sub: 'Photos shown on the Gallery page, grouped into albums. The store’s own photos are always shown; add more here.',
    columns: 'id,album,image_url,caption_en,caption_hi,source,is_placeholder,is_published,sort',
    publishKey: 'is_published',
    titleOf: (r) => String(r.caption_en || r.album),
    subOf: (r) => `${r.album} · ${r.source}${r.is_placeholder ? ' · placeholder' : ''}`,
    order: ['sort', 'asc'],
    fields: [
      { key: 'image_url', label: 'Photo', type: 'image', bucket: 'gallery' },
      { key: 'album', label: 'Album', type: 'select', options: [['store', 'Store'], ['products', 'Products'], ['history', 'History']] },
      { key: 'caption_en', label: 'Caption (English)', type: 'text' },
      { key: 'caption_hi', label: 'Caption (Hindi)', type: 'text', hi: true },
      { key: 'source', label: 'Source', type: 'select', options: [['store', 'Store photo'], ['generated', 'Generated'], ['stock', 'Stock'], ['render', '3D render'], ['illustration', 'Illustration']] },
      { key: 'is_placeholder', label: 'Placeholder (replace with a real photo later)', type: 'bool' },
      { key: 'sort', label: 'Order', type: 'number' },
    ],
    blank: () => ({ album: 'store', image_url: '', caption_en: '', caption_hi: '', source: 'store', is_placeholder: false, is_published: true, sort: 0 }),
    viewUrl: () => '/en/gallery/',
  },
  blog: {
    table: 'posts',
    title: 'Blog',
    sub: 'News and updates. Write with a blank line between paragraphs; start a line with ## for a heading. New posts get their own page after you Publish.',
    columns: 'id,slug,title_en,title_hi,excerpt_en,excerpt_hi,body_en,body_hi,cover_url,seo_title_en,seo_title_hi,seo_description_en,seo_description_hi,is_published,published_at',
    publishKey: 'is_published',
    titleOf: (r) => String(r.title_en ?? ''),
    subOf: (r) => `/${r.slug}/${r.published_at ? ` · ${dateShort(String(r.published_at))}` : ''}`,
    order: ['published_at', 'desc'],
    fields: [
      { key: 'slug', label: 'Web address (lowercase, dashes)', type: 'slug', required: true },
      { key: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { key: 'title_hi', label: 'Title (Hindi)', type: 'text', hi: true, required: true },
      { key: 'excerpt_en', label: 'Summary (English)', type: 'textarea' },
      { key: 'excerpt_hi', label: 'Summary (Hindi)', type: 'textarea', hi: true },
      { key: 'body_en', label: 'Article (English)', type: 'markdown' },
      { key: 'body_hi', label: 'Article (Hindi)', type: 'markdown', hi: true },
      { key: 'cover_url', label: 'Cover photo', type: 'image', bucket: 'content' },
      { key: 'published_at', label: 'Publish date', type: 'datetime' },
      { key: 'seo_title_en', label: 'Search title (English)', type: 'text' },
      { key: 'seo_title_hi', label: 'Search title (Hindi)', type: 'text', hi: true },
      { key: 'seo_description_en', label: 'Search description (English)', type: 'textarea' },
      { key: 'seo_description_hi', label: 'Search description (Hindi)', type: 'textarea', hi: true },
    ],
    blank: () => ({ slug: '', title_en: '', title_hi: '', excerpt_en: '', excerpt_hi: '', body_en: '', body_hi: '', cover_url: null, is_published: false, published_at: new Date().toISOString() }),
    viewUrl: (r) => (r.slug ? `/en/blog/${r.slug}/` : null),
  },
  faq: {
    table: 'faqs',
    title: 'FAQ',
    sub: 'Questions and answers for the FAQ page and the help pop-up. Keywords help the pop-up find the right answer.',
    columns: 'id,topic,q_en,q_hi,a_en,a_hi,keywords,is_published,sort',
    publishKey: 'is_published',
    titleOf: (r) => String(r.q_en ?? ''),
    subOf: (r) => String(r.topic),
    order: ['sort', 'asc'],
    fields: [
      { key: 'topic', label: 'Topic', type: 'select', options: [['orders', 'Orders'], ['delivery', 'Delivery'], ['payment', 'Payment'], ['wholesale', 'Wholesale'], ['products', 'Products'], ['account', 'Account'], ['general', 'General']] },
      { key: 'q_en', label: 'Question (English)', type: 'text', required: true },
      { key: 'q_hi', label: 'Question (Hindi)', type: 'text', hi: true, required: true },
      { key: 'a_en', label: 'Answer (English)', type: 'textarea', required: true },
      { key: 'a_hi', label: 'Answer (Hindi)', type: 'textarea', hi: true, required: true },
      { key: 'keywords', label: 'Keywords', type: 'tags', hint: 'Words people might type, separated by spaces' },
      { key: 'sort', label: 'Order', type: 'number' },
    ],
    blank: () => ({ topic: 'general', q_en: '', q_hi: '', a_en: '', a_hi: '', keywords: [], is_published: false, sort: 0 }),
    viewUrl: () => '/en/faq/',
  },
}

export function ContentCrud({ kind }: { kind: keyof typeof CONFIGS }) {
  const cfg = CONFIGS[kind]
  const [rows, setRows] = useState<Row[] | null>(null)
  const [edit, setEdit] = useState<Row | null>(null)
  const { busy, run } = useAction()
  const load = () => getBackend().then((b) => b.select<Row>(cfg.table, cfg.columns, { order: cfg.order })).then(setRows)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  async function save(publish?: boolean) {
    if (!edit) return
    const row: Row = { ...edit }
    if (publish !== undefined) row[cfg.publishKey] = publish
    for (const f of cfg.fields) {
      if (f.type === 'datetime') row[f.key] = row[f.key] ? new Date(String(row[f.key])).toISOString() : null
      if (f.type === 'number') row[f.key] = Number(row[f.key] ?? 0)
      if ((f.type === 'text' || f.type === 'textarea' || f.type === 'url') && row[f.key] === '') row[f.key] = null
    }
    const ok = await run(async () => {
      const b = await getBackend()
      const { id, ...rest } = row
      if (id) await b.update(cfg.table, rest, { eq: { id } })
      else await b.insert(cfg.table, [rest])
      return true
    }, publish === true ? 'Published' : publish === false ? 'Unpublished' : 'Saved')
    if (ok) {
      setEdit(null)
      load()
    }
  }
  async function del(r: Row) {
    await run(async () => {
      const b = await getBackend()
      await b.remove(cfg.table, { eq: { id: r.id } })
      setEdit(null)
      load()
    }, 'Deleted')
  }
  const toInput = (v: unknown) => (v ? new Date(String(v)).toISOString().slice(0, 16) : '')

  return (
    <div>
      <PageHead
        title={cfg.title}
        sub={cfg.sub}
        actions={
          <button className="btn btn-ink btn-sm" onClick={() => setEdit(cfg.blank())}>
            <Plus className="h-4 w-4" /> New
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          {!rows ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty>Nothing here yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id}>
                  <button className={`w-full rounded-2xl bg-white p-4 text-left shadow-[inset_0_0_0_1px_var(--color-line)] hover:shadow-[inset_0_0_0_2px_var(--color-ink)] ${edit?.id === r.id ? 'shadow-[inset_0_0_0_2px_var(--color-brand)]' : ''}`} onClick={() => setEdit(r)}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{cfg.titleOf(r) || '(untitled)'}</span>
                      <Badge tone={r[cfg.publishKey] ? 'leaf' : 'neutral'}>{r[cfg.publishKey] ? 'published' : 'draft'}</Badge>
                    </span>
                    {cfg.subOf && <span className="mt-1 block text-[0.85rem] text-muted">{cfg.subOf(r)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="xl:col-span-3">
          {edit ? (
            <Panel title={edit.id ? 'Edit' : 'New'}>
              <div className="grid gap-4">
                {cfg.fields.map((f) => {
                  const v = edit[f.key]
                  const set = (val: unknown) => setEdit({ ...edit, [f.key]: val })
                  if (f.type === 'image') return <ImageUpload key={f.key} label={f.label} bucket={f.bucket} value={(v as string) || null} onChange={set} />
                  if (f.type === 'bool')
                    return (
                      <label key={f.key} className="flex items-center gap-2">
                        <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" /> {f.label}
                      </label>
                    )
                  if (f.type === 'select')
                    return (
                      <Field key={f.key} label={f.label}>
                        <select className="input" value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
                          {f.options.map(([val, lab]) => (
                            <option key={val} value={val}>
                              {lab}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )
                  if (f.type === 'datetime')
                    return (
                      <Field key={f.key} label={f.label}>
                        <input type="datetime-local" className="input" value={toInput(v)} onChange={(e) => set(e.target.value || null)} />
                      </Field>
                    )
                  if (f.type === 'number')
                    return (
                      <Field key={f.key} label={f.label}>
                        <input type="number" className="input" value={Number(v ?? 0)} onChange={(e) => set(Number(e.target.value))} />
                      </Field>
                    )
                  if (f.type === 'tags')
                    return (
                      <Field key={f.key} label={f.label} hint={f.hint}>
                        <input className="input" value={((v as string[]) ?? []).join(' ')} onChange={(e) => set(e.target.value.split(/\s+/).filter(Boolean))} />
                      </Field>
                    )
                  const hi = 'hi' in f && f.hi
                  const hint = 'hint' in f ? f.hint : undefined
                  return (
                    <Field key={f.key} label={f.label} hint={hint}>
                      {f.type === 'textarea' || f.type === 'markdown' ? (
                        <textarea className={`input ${f.type === 'markdown' ? '!min-h-64 font-mono text-[0.9rem]' : ''}`} lang={hi ? 'hi' : undefined} value={String(v ?? '')} onChange={(e) => set(e.target.value)} />
                      ) : (
                        <input
                          className="input"
                          lang={hi ? 'hi' : undefined}
                          value={String(v ?? '')}
                          onChange={(e) => set(f.type === 'slug' ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') : e.target.value)}
                          required={'required' in f && f.required}
                        />
                      )}
                    </Field>
                  )
                })}
                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  <button className="btn btn-ink btn-sm" onClick={() => save()} disabled={busy}>
                    Save
                  </button>
                  {edit[cfg.publishKey] ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => save(false)} disabled={busy}>
                      Unpublish
                    </button>
                  ) : (
                    <button className="btn btn-brand btn-sm" onClick={() => save(true)} disabled={busy}>
                      Save and publish
                    </button>
                  )}
                  {edit.id && cfg.viewUrl?.(edit) && (
                    <a href={cfg.viewUrl(edit)!} target="_blank" className="btn btn-ghost btn-sm">
                      View on site
                    </a>
                  )}
                  {edit.id && <ConfirmButton onConfirm={() => del(edit)} />}
                </div>
              </div>
            </Panel>
          ) : (
            <Empty>Choose an item to edit, or create a new one.</Empty>
          )}
        </div>
      </div>
    </div>
  )
}
