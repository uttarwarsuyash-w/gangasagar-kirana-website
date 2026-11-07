// Gangasagar mark: a brass weighing-scale pan holding a wave ("where the Ganga meets the sea").
interface Props {
  className?: string
  mono?: boolean
  title?: string
}

export function Mark({ className, mono, title }: Props) {
  const id = 'gs-brass'
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {!mono && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9B949" />
            <stop offset="1" stopColor="#A8771C" />
          </linearGradient>
        </defs>
      )}
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="24" cy="5.4" r="2.2" />
        <path d="M24 7.6 L7.6 25 M24 7.6 L40.4 25" />
      </g>
      <path
        d="M10.2 25 C13.2 20.8 17 16.6 22.4 15.7 C27.8 14.8 32 17.6 33.4 21.8 C31.4 19.9 28.2 19.7 26.8 21.8 C26 23 26.3 24.3 27 25 Z M28.8 25 C31.2 23.5 34.4 23.3 37.2 25 Z"
        fill={mono ? 'currentColor' : 'var(--color-brand, #B3263A)'}
      />
      <path d="M4.4 25 H43.6 A19.6 12.5 0 0 1 4.4 25 Z" fill={mono ? 'currentColor' : `url(#${id})`} />
      <path d="M4.4 25 H43.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function Lockup({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <Mark className={compact ? 'h-9 w-9' : 'h-11 w-11'} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.78rem] font-semibold tracking-normal text-brand" lang="hi">
          गंगासागर
        </span>
        <span className="font-display text-[1.32rem] font-[680] tracking-[-0.03em]" style={{ fontStretch: '82%' }}>
          Gangasagar
        </span>
        {!compact && <span className="mt-0.5 text-[0.7rem] font-medium tracking-[0.02em] text-muted">kirana stores</span>}
      </span>
    </span>
  )
}
