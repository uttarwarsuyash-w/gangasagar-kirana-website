// Client-safe helpers (no dictionaries). Dictionaries live in lib/i18n.ts (server/admin only).
export const LOCALES = ['en', 'hi'] as const
export type Lang = (typeof LOCALES)[number]
export const DEFAULT_LANG: Lang = 'en'

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x)
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
