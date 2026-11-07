import en, { type Messages } from '@/messages/en'
import hi from '@/messages/hi'
import type { Lang } from './i18n-core'
export * from './i18n-core'
export type { Messages }

// To add Marathi later: create messages/mr.ts (typed as Messages), add 'mr' to LOCALES in
// i18n-core.ts, and add name_mr / description_mr columns (pick() falls back to English).
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


export function getDict(lang: Lang): Messages {
  return dictionaries[lang] ?? dictionaries.en
}
