'use client'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { Picture } from '@/components/ui/Picture'
import { getBackend } from '@/lib/backend'
import { IS_DEMO, DEMO_READY_KEY } from '@/lib/backend/config'

export interface GalleryItem {
  id: string
  album: string
  image_url: string
  caption_en: string | null
  caption_hi: string | null
  source: string
  is_placeholder?: boolean
}

export function Gallery({ initial }: { initial: GalleryItem[] }) {
  const { t, p } = useI18n()
  const [items, setItems] = useState(initial)
  const [album, setAlbum] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    if (IS_DEMO) {
      try {
        if (localStorage.getItem(DEMO_READY_KEY) !== '1') return
      } catch {
        return
      }
    }
    getBackend()
      .then((b) => b.select<GalleryItem & { is_published: boolean }>('gallery_items', 'id,album,image_url,caption_en,caption_hi,source,is_placeholder,is_published', { order: ['sort', 'asc'] }))
      .then((rows) => {
        const extra = rows.filter((r) => r.is_published)
        if (extra.length) setItems([...initial, ...extra])
      })
      .catch(() => {})
  }, [initial])

  const albums = Array.from(new Set(items.map((i) => i.album)))
  const list = album ? items.filter((i) => i.album === album) : items

  useEffect(() => {
    if (open == null) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((o) => (o == null ? o : (o + 1) % list.length))
      if (e.key === 'ArrowLeft') setOpen((o) => (o == null ? o : (o - 1 + list.length) % list.length))
    }
    window.addEventListener('keydown', k)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      document.documentElement.style.overflow = ''
    }
  }, [open, list.length])

  const label = (a: string) => t.gallery.albums[a as keyof typeof t.gallery.albums] ?? a
  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={t.gallery.title}>
        <button className="chip" aria-pressed={!album} onClick={() => setAlbum('')}>
          {t.gallery.all}
        </button>
        {albums.map((a) => (
          <button key={a} className="chip" aria-pressed={album === a} onClick={() => setAlbum(a)}>
            {label(a)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-muted">{t.gallery.empty}</p>
      ) : (
        <ul className="columns-2 gap-4 md:columns-3 [&>li]:mb-4">
          {list.map((it, i) => (
            <li key={it.id} className="break-inside-avoid">
              <button className="group block w-full overflow-hidden rounded-[1.25rem] bg-paper-2 text-left" onClick={() => setOpen(i)} aria-label={p(it, 'caption') || label(it.album)}>
                <Picture src={it.image_url} alt={p(it, 'caption')} sizes="(min-width: 768px) 30vw, 46vw" imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
              </button>
              {p(it, 'caption') && <p className="hand mt-1.5 px-1 text-[1rem] text-muted">{p(it, 'caption')}</p>}
            </li>
          ))}
        </ul>
      )}
      {open != null && list[open] && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/95 p-4" role="dialog" aria-modal="true" aria-label={p(list[open], 'caption') || t.gallery.title} onClick={() => setOpen(null)}>
          <div className="relative max-h-[86vh] max-w-[min(1100px,94vw)]" onClick={(e) => e.stopPropagation()}>
            <Picture src={list[open].image_url} alt={p(list[open], 'caption')} sizes="94vw" fit="contain" imgClassName="max-h-[80vh] w-auto rounded-xl" />
            {p(list[open], 'caption') && <p className="hand mt-3 text-center text-[1.15rem] text-paper">{p(list[open], 'caption')}</p>}
          </div>
          <button className="icon-btn absolute right-4 top-4 bg-paper text-ink" onClick={() => setOpen(null)} aria-label={t.gallery.close} autoFocus>
            <X className="h-5 w-5" />
          </button>
          <button className="icon-btn absolute left-3 top-1/2 -translate-y-1/2 bg-paper text-ink" onClick={(e) => (e.stopPropagation(), setOpen((open - 1 + list.length) % list.length))} aria-label={t.gallery.prev}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="icon-btn absolute right-3 top-1/2 -translate-y-1/2 bg-paper text-ink" onClick={(e) => (e.stopPropagation(), setOpen((open + 1) % list.length))} aria-label={t.gallery.next}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}
