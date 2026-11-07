// Custom kirana icons (Lucide covers the generic ones).
type P = { className?: string; fill?: number }

/** Cloth bag (thaili). `fill` 0..1 shows how full the bag is. */
export function BagIcon({ className, fill = 0 }: P) {
  const h = Math.max(0, Math.min(1, fill)) * 13
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <defs>
        <clipPath id="bag-clip">
          <path d="M5.2 8.5h13.6l-1 11.3a1.6 1.6 0 0 1-1.6 1.5H7.8a1.6 1.6 0 0 1-1.6-1.5z" />
        </clipPath>
      </defs>
      <rect x="4" y={21.4 - h} width="16" height={h} fill="var(--color-turmeric)" clipPath="url(#bag-clip)" style={{ transition: 'y .5s cubic-bezier(.16,1,.3,1), height .5s cubic-bezier(.16,1,.3,1)' }} />
      <path d="M5.2 8.5h13.6l-1 11.3a1.6 1.6 0 0 1-1.6 1.5H7.8a1.6 1.6 0 0 1-1.6-1.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.6 8.5V7a3.4 3.4 0 0 1 6.8 0v1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.6 8.5h14.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function ScaleIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v17M7 20h10M4 7h16" />
      <path d="M4 7l-2.5 6a3 3 0 0 0 5 0z M20 7l-2.5 6a3 3 0 0 0 5 0z" />
    </svg>
  )
}

export function SackIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3.5h8l-1.5 3c3.5 2 5 5.5 5 9 0 3-2 5-5 5h-5c-3 0-5-2-5-5 0-3.5 1.5-7 5-9z" />
      <path d="M9.5 6.5h5" />
    </svg>
  )
}

export function WhatsAppIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.2z" />
    </svg>
  )
}

export function InstagramIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
