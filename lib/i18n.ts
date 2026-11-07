import en, { type Messages } from '@/messages/en'
import hi from '@/messages/hi'

// To add Marathi later: create messages/mr.ts (typed as Messages), add 'mr' here,
// and add name_mr / description_mr columns (the pick() helper falls back to English).
export const LOCALES = ['en', 'hi'] as const
export type Lang = (typeof LOCALES)[number]
export const DEFAULT_LANG: Lang = 'en'

import remote from '@/content/remote.json'

// Admin text overrides (Admin > Site content > Translations), baked in at build time.
// Stored as flat maps like { "home.headline": "..." } under content keys i18n.en / i18n.hi.
function applyOverrides(base: Messages, flat: Record<string, string> | undefined): Messages {
  if (!flat) return base
  const copy = JSON.parse(JSON.stringify(base))
  for (const [path, value] of Object.entries(flat)) {
    if (typeof value !== 'string' || !value.trim()) continue
    const parts = path.split('.')
    let o = copy
    for (const k of parts.slice(0, -1)) o = o?.[k]
    if (o && typeof o[parts[parts.length - 1]] === 'string') o[parts[parts.length - 1]] = value
  }
  return copy
}
const C = (remote as { content: Record<string, Record<string, string>> }).content ?? {}
export const dictionaries: Record<Lang, Messages> = { en: applyOverrides(en, C['i18n.en']), hi: applyOverrides(hi, C['i18n.hi']) }
export const baseDictionaries: Record<Lang, Messages> = { en, hi }
export type { Messages }

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x)
}

export function getDict(lang: Lang): Messages {
  return dictionaries[lang] ?? en
}

/** Replace {name} placeholders. */
export function fmt(str: string, vars: Record<string, string | number> = {}) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

/** Pick a localized database field: pick(lang, product, 'name') -> product.name_hi or name_en. */
export function pick(lang: Lang, obj: object | null | undefined, field: string): string {
  if (!obj) return ''
  const o = obj as Record<string, unknown>
  const v = o[`${field}_${lang}`] ?? o[`${field}_en`]
  return typeof v === 'string' ? v : ''
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'hi' : 'en'
}

/** Same page in the other language: /en/shop/ -> /hi/shop/ */
export function switchPath(pathname: string, to: Lang) {
  const parts = pathname.split('/')
  if (isLang(parts[1])) parts[1] = to
  else parts.splice(1, 0, to)
  return parts.join('/') || `/${to}/`
}
