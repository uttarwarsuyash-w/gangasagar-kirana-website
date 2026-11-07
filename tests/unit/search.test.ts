import { describe, it, expect } from 'vitest'
import seed from '@/seed/catalogue.json'
import { buildIndex, search, type SearchDoc } from '@/lib/search'

const docs: SearchDoc[] = (seed as any).products.map((p: any) => ({ id: p.id, c: p.category_id, en: p.name_en, hi: p.name_hi, s: p.synonyms.join(' '), img: null, p: null, k: false }))
const idx = buildIndex(docs)
const top = (q: string) => search(idx, q, 5).map((d) => d.id)

describe('search', () => {
  it('finds peanuts in English, Hindi, Marathi and Hinglish', () => {
    for (const q of ['peanuts', 'मूंगफली', 'shengdana', 'moongfali', 'mungphali', 'शेंगदाणे']) expect(top(q)).toContain('raw-peanuts')
  })
  it('finds toor dal by arhar and tur', () => {
    expect(top('arhar')[0]).toBe('toor-dal')
    expect(top('tur dal')[0]).toBe('toor-dal')
  })
  it('finds roasted chana by phutane', () => {
    expect(top('phutane')).toContain('roasted-chana-with-salt')
  })
  it('handles Devanagari without nukta', () => {
    expect(top('चीनी')[0]).toBe('sugar')
  })
  it('returns nothing for gibberish', () => {
    expect(top('qwxz')).toEqual([])
  })
})
