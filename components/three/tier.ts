export type Tier = 'full' | 'lite' | 'still'

/** Three device tiers: full physics (~250 pieces), lighter (~100), or a still image. */
export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'still'
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'still'
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return 'still'
  try {
    const c = document.createElement('canvas')
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'still'
  } catch {
    return 'still'
  }
  const forced = new URLSearchParams(location.search).get('tier')
  if (forced === 'full' || forced === 'lite' || forced === 'still') return forced
  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory || 4
  if (cores <= 2 || mem <= 2) return 'still'
  const coarse = matchMedia('(pointer: coarse)').matches
  if (coarse || cores <= 4 || mem <= 4) return 'lite'
  return 'full'
}
