'use client'
// Weighing-scale quantity picker (taraazu). Under the drawing it is an ordinary, accessible
// stepper + select: the scale only mirrors their state.
import { useEffect, useRef, useState } from 'react'
import { grams } from '@/lib/format'
import { useI18n } from '@/components/providers/I18n'
import { POUR } from '@/lib/snacks'

interface Stone {
  key: string
  grams: number
  label: string
}

interface Props {
  /** current quantity in grams (loose) or number of packs */
  value: number
  isLoose: boolean
  /** grams per pack for packed items; 1000 for loose */
  unitWeight: number
  stones: Stone[]
  activeStone: string | null
  onStone: (key: string) => void
  pourKind: string | null
  /** product colour for packs */
  colour: string
}

export function ScalePicker({ value, isLoose, unitWeight, stones, activeStone, onStone, pourKind, colour }: Props) {
  const { lang } = useI18n()
  const weight = isLoose ? value : value * unitWeight
  const stone = stones.find((s) => s.key === activeStone)
  const counter = isLoose ? (stone?.grams ?? 0) : unitWeight * value // packed: pans balance (the stone is the pack)
  const diff = weight - counter
  const angle = isLoose ? Math.max(-11, Math.min(11, (diff / Math.max(1000, weight || 1)) * 11)) : 0
  const def = POUR[pourKind ?? ''] ?? null

  // Piece count in the pan: one piece per 250 g (or one pack per pack), capped for drawing.
  const pieces = isLoose ? Math.min(28, Math.round(value / 250) * 2) : Math.min(8, value)
  const prev = useRef(pieces)
  const [fresh, setFresh] = useState(0)
  useEffect(() => {
    if (pieces > prev.current) setFresh(pieces - prev.current)
    prev.current = pieces
    const t = setTimeout(() => setFresh(0), 700)
    return () => clearTimeout(t)
  }, [pieces])

  const readout = isLoose ? grams(value, lang) : grams(weight, lang)
  const c = def?.colours ?? [colour]

  return (
    <div className="relative select-none" aria-hidden>
      <svg viewBox="0 0 360 230" className="w-full">
        <defs>
          <linearGradient id="brass2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efc560" />
            <stop offset="0.55" stopColor="#c99a34" />
            <stop offset="1" stopColor="#8f6514" />
          </linearGradient>
          <linearGradient id="brassH" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a8771c" />
            <stop offset="0.5" stopColor="#f2cf72" />
            <stop offset="1" stopColor="#a8771c" />
          </linearGradient>
        </defs>
        {/* stand */}
        <rect x="174" y="40" width="12" height="160" rx="4" fill="url(#brassH)" />
        <path d="M120 214 Q180 190 240 214 Z" fill="url(#brass2)" />
        <rect x="112" y="212" width="136" height="9" rx="4.5" fill="#8f6514" />
        {/* LCD readout on the stand */}
        <rect x="140" y="120" width="80" height="34" rx="7" fill="#1f1a17" />
        <rect x="145" y="125" width="70" height="24" rx="4" fill="#2d3a24" />
        <text x="180" y="142.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#d9f27a" style={{ fontFeatureSettings: '"tnum"', fontFamily: 'var(--font-display)' }}>
          {readout}
        </text>
        {/* beam + pans rotate around the pivot */}
        <g style={{ transform: `rotate(${-angle}deg)`, transformOrigin: '180px 44px', transition: 'transform .9s cubic-bezier(.34,1.56,.64,1)' }}>
          <rect x="40" y="40" width="280" height="8" rx="4" fill="url(#brass2)" />
          <circle cx="180" cy="44" r="10" fill="url(#brass2)" stroke="#8f6514" strokeWidth="2" />
          <path d="M180 26 l-7 12 h14 z" fill="#8f6514" />
          {/* left pan (goods) */}
          <Pan x={62} angle={angle}>
            {Array.from({ length: pieces }).map((_, i) => {
              const row = Math.floor(i / 7)
              const col = i % 7
              const px = -30 + col * 10 + (row % 2) * 5
              const py = -6 - row * 7
              const isNew = i >= pieces - fresh
              return isLoose ? (
                <ellipse
                  key={i}
                  cx={px}
                  cy={py}
                  rx={def?.shape === 'grain' ? 6 : 5.4}
                  ry={def?.shape === 'grain' ? 2.4 : 4.6}
                  fill={c[i % c.length]}
                  stroke="rgb(0 0 0 / .18)"
                  strokeWidth=".6"
                  style={isNew ? { animation: `drop-in .55s ${(i - (pieces - fresh)) * 40}ms cubic-bezier(.34,1.56,.64,1) both` } : undefined}
                />
              ) : (
                <rect
                  key={i}
                  x={-30 + (i % 4) * 15}
                  y={-20 - Math.floor(i / 4) * 16}
                  width="14"
                  height="16"
                  rx="2"
                  fill="#d6af7c"
                  stroke={colour}
                  strokeWidth="1.5"
                  style={isNew ? { animation: 'drop-in .55s cubic-bezier(.34,1.56,.64,1) both' } : undefined}
                />
              )
            })}
          </Pan>
          {/* right pan (weight stones) */}
          <Pan x={298} angle={angle}>
            {isLoose && stone && (
              <g style={{ animation: 'drop-in .5s cubic-bezier(.34,1.56,.64,1) both' }} key={stone.key}>
                <path d="M-18 -2 h36 l-6 -22 h-24 z" fill="#4a4540" />
                <rect x="-6" y="-30" width="12" height="7" rx="3" fill="#4a4540" />
                <text x="0" y="-8" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fffdf9">
                  {stone.label}
                </text>
              </g>
            )}
            {!isLoose && (
              <g>
                <path d="M-18 -2 h36 l-6 -22 h-24 z" fill="#4a4540" />
                <text x="0" y="-8" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fffdf9">
                  {grams(weight, lang)}
                </text>
              </g>
            )}
          </Pan>
        </g>
      </svg>
      {/* stones to tap (also reachable through the select below) */}
      {stones.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2" aria-hidden>
          {stones.map((s) => (
            <button
              key={s.key}
              tabIndex={-1}
              onClick={() => onStone(s.key)}
              className={`relative grid h-11 min-w-14 place-items-center rounded-t-[0.9rem] rounded-b-md px-3 text-[0.8rem] font-bold transition ${
                activeStone === s.key ? 'bg-ink text-paper' : 'bg-[#e7e1d8] text-ink hover:bg-[#d9d1c5]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes drop-in{from{transform:translateY(-60px);opacity:0}}`}</style>
    </div>
  )
}

function Pan({ x, angle, children }: { x: number; angle: number; children: React.ReactNode }) {
  // pans hang vertically: counter-rotate so they stay level while the beam tilts
  return (
    <g transform={`translate(${x} 44)`}>
      <g style={{ transform: `rotate(${angle}deg)`, transition: 'transform .9s cubic-bezier(.34,1.56,.64,1)' }}>
        <path d="M0 0 L-38 92 M0 0 L38 92" stroke="#8f6514" strokeWidth="1.6" />
        <g transform="translate(0 96)">
          {children}
          <path d="M-46 -4 H46 A46 18 0 0 1 -46 -4 Z" fill="url(#brass2)" />
          <path d="M-46 -4 H46" stroke="#8f6514" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </g>
  )
}
