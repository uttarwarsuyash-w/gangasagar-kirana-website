'use client'
import { Star, PenLine } from 'lucide-react'
import { useI18n } from '@/components/providers/I18n'
import { useLive } from '@/components/providers/Live'

export function ReviewLinks() {
  const { t } = useI18n()
  const { google_reviews } = useLive().settings
  return (
    <>
      <a href={google_reviews.read_url} target="_blank" rel="noopener" className="btn btn-ink">
        <Star className="h-5 w-5" /> {t.home.readReviews}
      </a>
      <a href={google_reviews.write_url} target="_blank" rel="noopener" className="btn btn-ghost">
        <PenLine className="h-5 w-5" /> {t.home.writeReview}
      </a>
    </>
  )
}
