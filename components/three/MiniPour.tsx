'use client'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { detectTier, type Tier } from './tier'
import type { PourApi } from './PourCanvas'

type CanvasComp = ComponentType<{
  tier: Exclude<Tier, 'still'>
  pointerTarget?: React.RefObject<HTMLElement | null>
  onReady?: (api: PourApi) => void
  className?: string
  pieceScale?: number
}>

/** Pours a handful of 3D pieces into a masthead or product stage when it opens. */
export function MiniPour({ kind, pieceScale = 1.6, className = '', fallback }: { kind: string; pieceScale?: number; className?: string; fallback?: React.ReactNode }) {
  const [tier, setTier] = useState<Tier | null>(null)
  const [Canvas, setCanvas] = useState<CanvasComp | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const tr = detectTier()
    setTier(tr)
    if (tr === 'still') return
    const go = () => import('./PourCanvas').then((m) => setCanvas(() => m.default as unknown as CanvasComp))
    if (document.readyState === 'complete') setTimeout(go, 50)
    else window.addEventListener('load', () => setTimeout(go, 50), { once: true })
  }, [])
  return (
    <div ref={box} className={className || 'relative'}>
      {(tier === 'still' || !Canvas) && fallback}
      {Canvas && tier && tier !== 'still' && (
        <Canvas tier={tier} pieceScale={pieceScale} pointerTarget={box} className="absolute inset-0 h-full w-full" onReady={(a) => setTimeout(() => a.pour(kind), 150)} />
      )}
    </div>
  )
}
