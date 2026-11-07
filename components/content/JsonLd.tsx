import { SITE, SITE_URL } from '@/lib/site'
import type { Lang } from '@/lib/i18n'

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

/** GroceryStore structured data with verified facts only (no ratings, no GSTIN). */
export function storeJsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    '@id': `${SITE_URL}/#store`,
    name: lang === 'hi' ? SITE.name_hi : SITE.name_en,
    alternateName: lang === 'hi' ? SITE.name_en : SITE.name_hi,
    slogan: SITE.tagline_en,
    url: `${SITE_URL}/${lang}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}/img/shop/interior-960.webp`,
    telephone: `+91${SITE.phones.main}`,
    email: SITE.emails[0],
    foundingDate: String(SITE.established),
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.locality,
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      postalCode: SITE.pincode,
      addressCountry: 'IN',
    },
    hasMap: SITE.mapsUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: SITE.hours.open,
        closes: SITE.hours.close,
      },
    ],
    sameAs: [SITE.instagram],
    founder: { '@type': 'Person', name: SITE.owner.name_en },
    areaServed: { '@type': 'City', name: 'Nanded' },
    paymentAccepted: 'Cash, UPI',
    currenciesAccepted: 'INR',
  }
}
