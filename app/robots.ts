import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

// While the store is in preview mode the HTML pages also carry <meta name="robots" content="noindex">
// (set live by the site), and the build adds it when STORE_MODE=preview.
export default function robots(): MetadataRoute.Robots {
  const preview = (process.env.STORE_MODE ?? 'preview') === 'preview'
  return {
    rules: preview ? [{ userAgent: '*', disallow: '/' }] : [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/en/account/', '/hi/account/', '/en/checkout/', '/hi/checkout/', '/auth/'] }],
    sitemap: preview ? undefined : `${SITE_URL}/sitemap.xml`,
  }
}
