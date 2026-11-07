import { imageKey, imageInfo, srcSet, fallbackSrc } from '@/lib/images'

interface Props {
  src: string | null | undefined
  alt: string
  sizes?: string
  className?: string
  imgClassName?: string
  priority?: boolean
  style?: React.CSSProperties
  fit?: 'cover' | 'contain'
  vt?: string // view-transition-name
}

/** Responsive AVIF/WebP with a blurred placeholder and fixed dimensions (no layout shift). */
export function Picture({ src, alt, sizes = '100vw', className, imgClassName = '', priority, style, fit = 'cover', vt }: Props) {
  const key = imageKey(src)
  if (!key) {
    if (!src) return null
    // Uploaded image (Supabase Storage) or data URL in demo mode.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${imgClassName} ${className ?? ''}`} loading={priority ? 'eager' : 'lazy'} decoding="async" style={{ ...style, viewTransitionName: vt }} />
    )
  }
  const info = imageInfo(key)!
  return (
    <picture className={className} style={style}>
      <source type="image/avif" srcSet={srcSet(key, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(key, 'webp')} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fallbackSrc(key)}
        alt={alt}
        width={info.w}
        height={info.h}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${imgClassName}`}
        style={{ backgroundImage: `url(${info.blur})`, backgroundSize: 'cover', viewTransitionName: vt }}
      />
    </picture>
  )
}
