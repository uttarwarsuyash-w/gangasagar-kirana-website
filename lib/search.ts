// Instant product search in English, Hindi and common transliterations (Hinglish/Marathi).
export interface SearchDoc {
  id: string
  c: string // category id
  en: string
  hi: string
  s: string // synonyms joined
  img: string | null
  p: number | null // starting price
  k: boolean // per kg
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/़/g, '') // nukta
    .replace(/ँ/g, 'ं') // chandrabindu -> anusvara
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Loose romanization so "moongphali", "mungfali", "mumfali" land together.
export function phonetic(s: string) {
  return normalize(s)
    .replace(/ph/g, 'f')
    .replace(/ee|ii/g, 'i')
    .replace(/oo|uu/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/sh/g, 's')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/n(?=[gkcjtdpb])/g, 'm')
}

interface Indexed extends SearchDoc {
  hay: string
  ph: string
}

export function buildIndex(docs: SearchDoc[]): Indexed[] {
  return docs.map((d) => {
    const hay = normalize(`${d.en} ${d.hi} ${d.s} ${d.id.replace(/-/g, ' ')}`)
    return { ...d, hay, ph: phonetic(hay) }
  })
}

export function search(index: Indexed[], q: string, limit = 50): SearchDoc[] {
  const nq = normalize(q)
  if (!nq) return []
  const terms = nq.split(' ')
  const pterms = terms.map(phonetic)
  const scored: [number, Indexed][] = []
  for (const d of index) {
    let score = 0
    let all = true
    terms.forEach((t, i) => {
      const words = d.hay.split(' ')
      if (normalize(d.en).startsWith(t) || normalize(d.hi).startsWith(t)) score += 12
      else if (words.some((w) => w === t)) score += 9
      else if (words.some((w) => w.startsWith(t))) score += 6
      else if (d.hay.includes(t)) score += 3
      else if (pterms[i].length > 2 && d.ph.includes(pterms[i])) score += 2
      else all = false
    })
    if (all && score > 0) scored.push([score, d])
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].en.localeCompare(b[1].en))
    .slice(0, limit)
    .map(([, d]) => ({ id: d.id, c: d.c, en: d.en, hi: d.hi, s: d.s, img: d.img, p: d.p, k: d.k }))
}
