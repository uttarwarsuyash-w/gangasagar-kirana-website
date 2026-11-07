'use client'
import { useEffect } from 'react'

/** Lenis smooth scrolling on desktop pointer devices, off for reduced motion and touch. */
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null
    let id = 0
    import('lenis').then(({ default: Lenis }) => {
      lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9 })
      ;(window as unknown as { __lenis: unknown }).__lenis = lenis
      const loop = (t: number) => {
        lenis?.raf(t)
        id = requestAnimationFrame(loop)
      }
      id = requestAnimationFrame(loop)
    })
    return () => {
      cancelAnimationFrame(id)
      lenis?.destroy()
    }
  }, [])
  return null
}
