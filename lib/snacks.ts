// Snack "pour kinds": what the 3D pieces look like for each product or category.
// shape -> procedural geometry in components/three/geometries.ts; colours are sampled from
// the store's own close-up photos where one exists.
export type Shape = 'peanut' | 'chana' | 'pea' | 'candy' | 'chikki' | 'popcorn' | 'grain' | 'disc' | 'cube' | 'pearl' | 'flake' | 'cashew' | 'almond' | 'bean' | 'lump'

export interface PourKind {
  shape: Shape
  colours: string[] // base colours (random per piece)
  speckle?: string // dark/light speckle colour painted into vertex colours
  speckleAmount?: number
  size: number // radius in world units (1 unit ~ 1 cm on screen at default zoom)
  roughness?: number
  clearcoat?: number
  translucent?: boolean
}

export const POUR: Record<string, PourKind> = {
  peanut: { shape: 'peanut', colours: ['#b8644a', '#c47358', '#a85a42', '#c9806a'], speckle: '#7a3a2a', speckleAmount: 0.18, size: 0.62, roughness: 0.62 },
  peanut_roasted: { shape: 'peanut', colours: ['#d8a46c', '#c98f58', '#e2b47e'], speckle: '#8a5a32', speckleAmount: 0.25, size: 0.6, roughness: 0.5 },
  peanut_masala: { shape: 'peanut', colours: ['#c4552a', '#b84a22', '#d26a34'], speckle: '#7e2a12', speckleAmount: 0.45, size: 0.66, roughness: 0.85 },
  chana_salted: { shape: 'chana', colours: ['#5b4e46', '#6a5b52', '#4c423c'], speckle: '#e8dccb', speckleAmount: 0.42, size: 0.5, roughness: 0.9 },
  chana_plain: { shape: 'chana', colours: ['#8a5a32', '#9a6a3c', '#7a4c2a'], speckle: '#e6c48e', speckleAmount: 0.5, size: 0.5, roughness: 0.7 },
  chana_kabuli: { shape: 'chana', colours: ['#e2c48f', '#d8b780', '#ead2a2'], speckle: '#c49a62', speckleAmount: 0.15, size: 0.55, roughness: 0.6 },
  chana_kala: { shape: 'chana', colours: ['#5a3a26', '#6b4630', '#4a2e1e'], speckle: '#3a2216', speckleAmount: 0.2, size: 0.42, roughness: 0.7 },
  pea_green: { shape: 'pea', colours: ['#79a83a', '#6b9a2e', '#8cbb48', '#5f8f2a'], speckle: '#3f6a1c', speckleAmount: 0.3, size: 0.42, roughness: 0.55, clearcoat: 0.3 },
  pea_green_dry: { shape: 'pea', colours: ['#8ea05a', '#7f9450', '#9aab66'], speckle: '#5c6a34', speckleAmount: 0.15, size: 0.36, roughness: 0.8 },
  pea_yellow: { shape: 'pea', colours: ['#d9b44a', '#e3c25c', '#ccaa40'], speckle: '#a8822a', speckleAmount: 0.2, size: 0.42, roughness: 0.75 },
  pea_white: { shape: 'pea', colours: ['#ece2c8', '#e2d6b8', '#f2ead4'], speckle: '#c8b890', speckleAmount: 0.12, size: 0.38, roughness: 0.8 },
  pea_black: { shape: 'pea', colours: ['#2a2420', '#3a302a', '#221c18'], speckle: '#5a4c42', speckleAmount: 0.15, size: 0.26, roughness: 0.4, clearcoat: 0.4 },
  maize: { shape: 'pea', colours: ['#f0b52a', '#e8a51e', '#f4c240'], speckle: '#c27a12', speckleAmount: 0.15, size: 0.33, roughness: 0.35, clearcoat: 0.5 },
  millet: { shape: 'pearl', colours: ['#cfc0a0', '#bfae8a', '#d8cbb0'], size: 0.17, roughness: 0.85 },
  kurmura: { shape: 'grain', colours: ['#f4ead4', '#efe2c4', '#f8f0dc'], size: 0.45, roughness: 0.95 },
  rice: { shape: 'grain', colours: ['#f6f2e8', '#efe9da', '#fbf8f0'], size: 0.3, roughness: 0.4, translucent: true },
  wheat: { shape: 'grain', colours: ['#c8924a', '#b98242', '#d2a05a'], speckle: '#8a5a2a', speckleAmount: 0.2, size: 0.32, roughness: 0.7 },
  poha: { shape: 'flake', colours: ['#f2ead8', '#ece0c8', '#f6f0e2'], size: 0.42, roughness: 0.9 },
  dal_toor: { shape: 'disc', colours: ['#e7b52c', '#dca624', '#efc240'], size: 0.3, roughness: 0.6 },
  dal_moong: { shape: 'disc', colours: ['#e9cf5a', '#e2c64c', '#efd86c'], size: 0.24, roughness: 0.6 },
  dal_masoor: { shape: 'disc', colours: ['#e0753a', '#d86a30', '#e8844a'], size: 0.24, roughness: 0.55 },
  dal_urad: { shape: 'disc', colours: ['#f2ece0', '#ebe3d4', '#f6f2ea'], size: 0.26, roughness: 0.7 },
  moong_whole: { shape: 'bean', colours: ['#4f7a2a', '#5a8a32', '#466e24'], speckle: '#2e4a16', speckleAmount: 0.15, size: 0.24, roughness: 0.5 },
  moong_whole_brown: { shape: 'bean', colours: ['#8a6a42', '#7a5c38', '#9a7a4e'], size: 0.22, roughness: 0.6 },
  masoor_whole: { shape: 'disc', colours: ['#7a5a3a', '#6a4c30', '#8a6a46'], size: 0.24, roughness: 0.6 },
  rajma: { shape: 'bean', colours: ['#7a1e22', '#8a2a2a', '#6a181c'], speckle: '#4a0e10', speckleAmount: 0.15, size: 0.5, roughness: 0.35, clearcoat: 0.5 },
  chawli: { shape: 'bean', colours: ['#efe6d2', '#e8dcc4'], speckle: '#1f1a17', speckleAmount: 0.06, size: 0.38, roughness: 0.6 },
  sugar: { shape: 'cube', colours: ['#fbfaf6', '#f3f1ea', '#ffffff'], size: 0.2, roughness: 0.25, translucent: true },
  mishri: { shape: 'cube', colours: ['#f2eee2', '#ece6d4', '#f8f4ea'], size: 0.5, roughness: 0.15, translucent: true, clearcoat: 0.8 },
  jaggery: { shape: 'lump', colours: ['#a8641e', '#b8742a', '#94561a'], speckle: '#6a3a10', speckleAmount: 0.3, size: 0.7, roughness: 0.75 },
  sabudana: { shape: 'pearl', colours: ['#f6f4ee', '#efece4', '#fbfaf6'], size: 0.22, roughness: 0.3, translucent: true },
  cashew: { shape: 'cashew', colours: ['#ecd7ac', '#e4cc9c', '#f2e0b8'], speckle: '#c9a870', speckleAmount: 0.15, size: 0.62, roughness: 0.55 },
  almond: { shape: 'almond', colours: ['#a8683c', '#9a5e34', '#b47444'], speckle: '#6e3e1e', speckleAmount: 0.35, size: 0.6, roughness: 0.75 },
  raisin: { shape: 'lump', colours: ['#a8762a', '#94641e', '#b8862e'], speckle: '#5a3a10', speckleAmount: 0.3, size: 0.32, roughness: 0.4, clearcoat: 0.6 },
  popcorn: { shape: 'popcorn', colours: ['#fbf3dc', '#f6ebcc', '#fff8e6'], speckle: '#e8c46a', speckleAmount: 0.12, size: 0.68, roughness: 0.95 },
  orange_candy: { shape: 'candy', colours: ['#f2701e', '#ee6418', '#f6822e'], size: 0.62, roughness: 0.2, clearcoat: 1, translucent: true },
  chikki: { shape: 'chikki', colours: ['#7e4519', '#8a4f1e', '#733e16'], speckle: '#e2b57a', speckleAmount: 0.5, size: 0.95, roughness: 0.3, clearcoat: 0.8 },
}

/** The homepage hero row: the seven products the store photographed. */
export const HERO_SNACKS = [
  { product: 'raw-peanuts', kind: 'peanut', en: 'Peanuts', hi: 'मूंगफली', image: '/img/products/01-peanuts' },
  { product: 'roasted-chana-with-salt', kind: 'chana_salted', en: 'Salted chana', hi: 'नमकीन चने', image: '/img/products/02-roasted-chana-with-salt' },
  { product: 'roasted-chana-without-salt', kind: 'chana_plain', en: 'Roasted chana', hi: 'भुने चने', image: '/img/products/03-roasted-chana-without-salt' },
  { product: 'masala-green-peas', kind: 'pea_green', en: 'Green peas', hi: 'हरे मटर', image: '/img/products/04-masala-green-peas' },
  { product: 'roasted-yellow-peas', kind: 'pea_yellow', en: 'Yellow peas', hi: 'पीले मटर', image: '/img/products/05-roasted-yellow-peas' },
  { product: 'orange-candy', kind: 'orange_candy', en: 'Orange candy', hi: 'ऑरेंज कैंडी', image: '/img/products/06-orange-candy' },
  { product: 'rk-peanut-chikki', kind: 'chikki', en: 'Chikki', hi: 'चिक्की', image: '/img/products/07-rk-peanut-chikki' },
] as const

export function pourColour(kind: string | null | undefined) {
  return (kind && POUR[kind]?.colours[0]) || '#c9a37a'
}
