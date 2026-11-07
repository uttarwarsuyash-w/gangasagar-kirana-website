import manifest from './images.json'

export interface ImageInfo {
  w: number
  h: number
  widths: number[]
  blur: string
  source: string
}

const M = manifest as Record<string, ImageInfo>

/** '/img/products/01-peanuts' or 'products/01-peanuts' -> manifest key */
export function imageKey(url: string | null | undefined) {
  if (!url) return null
  const k = url.replace(/^\/img\//, '')
  return M[k] ? k : null
}

export function imageInfo(key: string): ImageInfo | undefined {
  return M[key]
}

export function srcSet(key: string, format: 'avif' | 'webp') {
  const info = M[key]
  return info.widths.map((w) => `/img/${key}-${w}.${format} ${w}w`).join(', ')
}

export function fallbackSrc(key: string) {
  const info = M[key]
  return `/img/${key}-${info.widths[Math.min(1, info.widths.length - 1)]}.webp`
}
