import { Picture } from '@/components/ui/Picture'
import { Pouch } from './Pouch'

interface Props {
  image: string | null
  nameEn: string
  nameHi: string
  colour: string
  alt: string
  sizes?: string
  priority?: boolean
  vt?: string
  className?: string
}

export function ProductArt({ image, nameEn, nameHi, colour, alt, sizes, priority, vt, className = '' }: Props) {
  if (image) return <Picture src={image} alt={alt} sizes={sizes} priority={priority} vt={vt} className={`block h-full w-full ${className}`} />
  return (
    <div className={`h-full w-full ${className}`} style={{ viewTransitionName: vt }} role="img" aria-label={alt}>
      <Pouch nameEn={nameEn} nameHi={nameHi} colour={colour} />
    </div>
  )
}
