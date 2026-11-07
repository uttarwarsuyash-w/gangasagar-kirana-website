import type { Lang, Messages } from '@/lib/i18n'
import { Markdown } from '@/lib/md'
import { dateShort } from '@/lib/format'
import { POLICY_UPDATED } from '@/content/policies'

export function PolicyPage({ lang, t, policy }: { lang: Lang; t: Messages; policy: { title_en?: string; title_hi?: string; en: string; hi: string } }) {
  return (
    <div className="wrap grid gap-10 pt-12 sm:pt-20 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <h1 className="display-l lg:sticky lg:top-28">{lang === 'hi' ? policy.title_hi : policy.title_en}</h1>
      </header>
      <div className="lg:col-span-8">
        <p className="meta mb-8">{t.policy.updated.replace('{date}', dateShort(POLICY_UPDATED, lang))}</p>
        <Markdown text={lang === 'hi' ? policy.hi : policy.en} className="prose-gs text-[1.05rem]" />
      </div>
    </div>
  )
}
