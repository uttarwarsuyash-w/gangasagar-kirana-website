// Verified business facts from the brief (section 2). Admins can override them in Settings;
// the static build uses these values, live pages read the settings table.
export const SITE = {
  name_en: 'Gangasagar Kirana Stores',
  name_hi: 'गंगासागर किराणा स्टोअर्स',
  short_hi: 'गंगासागर',
  tagline_en: 'Built on Trust, Serving Every Need.',
  established: 2005,
  address_en: 'Gokul Nagar, Nanded, Maharashtra 431602, India',
  address_hi: 'गोकुल नगर, नांदेड़, महाराष्ट्र 431602, भारत',
  locality: 'Gokul Nagar',
  city: 'Nanded',
  region: 'Maharashtra',
  pincode: '431602',
  mapsUrl: 'https://maps.app.goo.gl/mzZXA5a35tAJ3oyj6',
  mapsEmbed: 'https://www.google.com/maps?q=Gangasagar+Kirana+Stores,+Gokul+Nagar,+Nanded+431602&output=embed',
  hours: { open: '08:00', close: '20:00' },
  phones: { main: '9403951524', support: '9372188080', owner: '9272103080' },
  emails: ['uttarwarsuyash@gmail.com', 'lguttarwar1974.11@gmail.com'],
  instagram: 'https://www.instagram.com/gangasagar_kirana_stores',
  instagramHandle: '@gangasagar_kirana_stores',
  owner: { name_en: 'Gangadhar Nivrutti Uttarwar', name_hi: 'गंगाधर निवृत्ति उत्तरवार', years: 53 },
  head: { name_en: 'Laxmikant Uttarwar', name_hi: 'लक्ष्मीकांत उत्तरवार', years: 28 },
} as const

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gangasagar.pages.dev').replace(/\/$/, '')

export function waLink(phone: string, text?: string) {
  return `https://wa.me/91${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
export function telLink(phone: string) {
  return `tel:+91${phone}`
}

/** Is the store open right now (Asia/Kolkata)? */
export function isOpenNow(now = new Date(), hours: { open: string; close: string } = SITE.hours) {
  const t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(now)
  return t >= hours.open && t < hours.close
}
