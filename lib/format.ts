import type { Lang } from './i18n'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/** ₹1,23,456 or ₹33.25 (Indian digit grouping, paise only when present). */
export function inr(n: number | string | null | undefined) {
  const v = Number(n ?? 0)
  return '₹' + (Number.isInteger(v) ? inrFmt.format(v) : inrFmt2.format(v))
}

export function grams(g: number, lang: Lang = 'en') {
  if (g >= 1000) {
    const kg = Math.round((g / 1000) * 1000) / 1000
    return `${kg.toLocaleString('en-IN')} ${lang === 'hi' ? 'किलो' : 'kg'}`
  }
  return `${g} ${lang === 'hi' ? 'ग्राम' : 'g'}`
}

export function dateShort(d: string | Date, lang: Lang = 'en') {
  return new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

export function dateTime(d: string | Date, lang: Lang = 'en') {
  return new Date(d).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

export function phoneDisplay(p: string) {
  return p.replace(/^(\d{5})(\d{5})$/, '$1 $2')
}
