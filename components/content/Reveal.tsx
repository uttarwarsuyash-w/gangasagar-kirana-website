'use client'
import { useEffect, useRef, useState } from 'react'

/** Image reveal mask: the frame wipes open once when it scrolls into view. */
export function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{ clipPath: shown ? 'inset(0 0 0 0 round 1.75rem)' : 'inset(12% 8% 12% 8% round 1.75rem)', transition: 'clip-path 1.1s var(--ease-out-expo)' }}>
      {children}
    </div>
  )
}
