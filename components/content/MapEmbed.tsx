'use client'
import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { SITE } from '@/lib/site'

/** Google Map loads only when asked (privacy and page speed). */
export function MapEmbed({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const [on, setOn] = useState(false)
  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-paper-2 md:aspect-[16/11] ${className}`}>
      {on ? (
        <iframe title={t.contact.mapTitle} src={SITE.mapsEmbed} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <button onClick={() => setOn(true)} className="group absolute inset-0 grid place-items-center text-left" aria-label={`${t.contact.loadMap}. ${t.contact.mapNote}`}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <rect width="400" height="300" fill="#efe7da" />
            <g stroke="#fffdf9" strokeWidth="10" fill="none" strokeLinecap="round">
              <path d="M-20 210 C 80 190, 160 230, 260 180 S 380 120, 430 140" />
              <path d="M120 -20 C 140 80, 110 160, 150 320" />
              <path d="M300 -20 C 280 90, 320 200, 290 320" />
            </g>
            <g stroke="#fffdf9" strokeWidth="4" fill="none">
              <path d="M-20 90 L 430 70" />
              <path d="M-20 260 L 430 280" />
              <path d="M40 -20 L 70 320" />
              <path d="M220 -20 L 210 320" />
            </g>
            <path d="M-20 130 C 60 150, 120 120, 200 140 S 330 170, 430 150" stroke="#cfe0e4" strokeWidth="14" fill="none" />
          </svg>
          <span className="relative flex flex-col items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg transition group-hover:scale-110">
              <MapPin className="h-7 w-7" />
            </span>
            <span className="rounded-full bg-paper px-4 py-2 font-semibold shadow">{t.contact.loadMap}</span>
            <span className="text-[0.8rem] text-muted">{t.contact.mapNote}</span>
          </span>
        </button>
      )}
    </div>
  )
}
