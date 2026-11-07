'use client'
import { useEffect, useRef } from 'react'
import { PourScene } from './scene'
import type { Tier } from './tier'

export interface PourApi {
  pour: (kind: string) => void
  sweepAndPour: (kind: string) => void
  enableTilt: () => void
}

interface Props {
  tier: Exclude<Tier, 'still'>
  initialKind?: string
  /** Element that receives pointer moves (cursor pushes the pile). Defaults to the canvas parent. */
  pointerTarget?: React.RefObject<HTMLElement | null>
  onReady?: (api: PourApi) => void
  className?: string
  floorInset?: number
  pieceScale?: number
  idleSway?: boolean
}

export default function PourCanvas({ tier, initialKind, pointerTarget, onReady, className, floorInset, pieceScale, idleSway }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const qs = new URLSearchParams(location.search)
    const scene = new PourScene(c, { tier, floorInset, pieceScale: Number(qs.get('scale')) || pieceScale, idleSway: idleSway && tier === 'full' && !qs.get('poster') })
    let degraded = false
    scene.onSlow = () => {
      if (degraded) return
      degraded = true
      // Too slow for this device: lower the resolution (keeps the effect, saves the frame rate).
      scene.lowerQuality()
    }
    const parent = c.parentElement!
    const ro = new ResizeObserver(() => scene.resize(parent.clientWidth, parent.clientHeight))
    ro.observe(parent)
    scene.resize(parent.clientWidth, parent.clientHeight)
    // ?poster=<kind>&scale=<n>: settle a pile instantly and expose a PNG (used by scripts/posters.mjs).
    const q = new URLSearchParams(location.search)
    const poster = q.get('poster')
    if (poster) {
      const w = window as unknown as { __gsPoster?: string }
      scene.pour(poster, { initial: true, full: true, count: Number(q.get('count')) || undefined })
      scene.settle(9)
      w.__gsPoster = scene.snapshot()
    } else if (initialKind) scene.pour(initialKind, { initial: true })

    const io = new IntersectionObserver(([e]) => scene.setVisible(e.isIntersecting), { threshold: 0 })
    io.observe(c)
    const onVis = () => scene.setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)

    const target = pointerTarget?.current ?? parent
    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 2 - 1
      const y = -(((e.clientY - r.top) / r.height) * 2 - 1)
      // Phones: only a real swipe pushes (pointer down); desktop: the cursor itself pushes.
      const active = e.pointerType === 'mouse' ? true : e.buttons > 0 || e.pressure > 0
      scene.setPointer(x, y, active)
    }
    const leave = () => scene.setPointer(0, 0, false)
    target.addEventListener('pointermove', move, { passive: true })
    target.addEventListener('pointerdown', move, { passive: true })
    target.addEventListener('pointerleave', leave)
    target.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && leave())
    target.addEventListener('pointercancel', leave)

    let tiltOn = false
    const orient = (e: DeviceOrientationEvent) => scene.setTilt(((e.gamma ?? 0) / 45) * 22)

    onReady?.({
      pour: (k) => scene.pour(k),
      sweepAndPour: (k) => {
        scene.sweep()
        setTimeout(() => scene.pour(k), 120)
      },
      enableTilt: () => {
        if (tiltOn || !('DeviceOrientationEvent' in window)) return
        tiltOn = true
        const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
        const start = () => window.addEventListener('deviceorientation', orient)
        if (typeof D.requestPermission === 'function') D.requestPermission().then((s) => s === 'granted' && start()).catch(() => {})
        else start()
      },
    })

    return () => {
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerdown', move)
      target.removeEventListener('pointerleave', leave)
      window.removeEventListener('deviceorientation', orient)
      scene.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier])

  return <canvas ref={canvas} className={className} aria-hidden />
}
