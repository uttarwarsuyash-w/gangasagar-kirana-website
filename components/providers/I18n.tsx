'use client'
import { createContext, useContext } from 'react'
import { fmt, pick, type Lang } from '@/lib/i18n-core'
import type { Messages } from '@/messages/en'

interface Ctx {
  lang: Lang
  t: Messages
}
const I18nCtx = createContext<Ctx | null>(null)

export function I18nProvider({ lang, dict, children }: { lang: Lang; dict: Messages; children: React.ReactNode }) {
  return <I18nCtx.Provider value={{ lang, t: dict }}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  const c = useContext(I18nCtx)
  if (!c) throw new Error('useI18n outside provider')
  return {
    ...c,
    f: fmt,
    p: (obj: object | null | undefined, field: string) => pick(c.lang, obj, field),
    href: (path: string) => `/${c.lang}${path.startsWith('/') ? path : `/${path}`}`,
  }
}
