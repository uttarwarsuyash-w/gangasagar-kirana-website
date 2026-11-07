// "Kraft pouch" product art for items without a photo yet: a paper pouch with the name
// handwritten in English and Hindi, tinted by category. Marked as an illustration in the admin.
interface Props {
  nameEn: string
  nameHi: string
  colour: string
  className?: string
  seed?: string
}

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function Pouch({ nameEn, nameHi, colour, className = '', seed = nameEn }: Props) {
  const h = hash(seed)
  const tilt = ((h % 7) - 3) * 0.8
  const len = nameEn.length
  const size = len > 22 ? 'text-[0.95rem]' : len > 14 ? 'text-[1.1rem]' : 'text-[1.3rem]'
  return (
    <div className={`relative grid h-full w-full place-items-center overflow-hidden ${className}`} style={{ background: `color-mix(in oklab, ${colour} 12%, var(--color-paper-2))` }} aria-hidden>
      <div className="relative aspect-[4/5] w-[62%]" style={{ transform: `rotate(${tilt}deg)` }}>
        <svg viewBox="0 0 160 200" className="absolute inset-0 h-full w-full drop-shadow-[0_14px_18px_rgb(31_26_23/0.18)]">
          <defs>
            <linearGradient id={`k${h}`} x1="0" x2="1">
              <stop offset="0" stopColor="#c99d6b" />
              <stop offset="0.18" stopColor="#dcb886" />
              <stop offset="0.8" stopColor="#d6af7c" />
              <stop offset="1" stopColor="#b98c5c" />
            </linearGradient>
          </defs>
          <path d="M18 30 L142 30 L150 188 Q80 196 10 188 Z" fill={`url(#k${h})`} />
          <path d="M18 30 L142 30 L142 18 L136 24 L130 18 L124 24 L118 18 L112 24 L106 18 L100 24 L94 18 L88 24 L82 18 L76 24 L70 18 L64 24 L58 18 L52 24 L46 18 L40 24 L34 18 L28 24 L22 18 L18 22 Z" fill="#c69a68" />
          <path d="M16 42 Q80 47 144 42" stroke={colour} strokeWidth="3" fill="none" />
          <path d="M40 34 V186 M120 34 V186" stroke="#000" strokeOpacity=".05" strokeWidth="1.2" />
          <rect x="24" y="66" width="112" height="86" rx="6" fill="#fffdf9" />
          <rect x="24" y="66" width="112" height="9" rx="3" fill={colour} />
        </svg>
        <div className="absolute inset-x-[16%] top-[37%] flex h-[39%] flex-col items-center justify-center gap-0.5 text-center text-ink">
          <span className={`hand leading-[1.05] ${size}`}>{nameEn}</span>
          <span className="hand text-[0.95rem] leading-tight text-muted" lang="hi">
            {nameHi}
          </span>
        </div>
      </div>
    </div>
  )
}
