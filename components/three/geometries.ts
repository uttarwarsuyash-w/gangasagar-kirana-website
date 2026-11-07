// Procedural snack models, built in code (no downloaded models).
// Every geometry is unit-sized (fits a sphere of radius ~1) and carries vertex colours used as a
// speckle/pattern mask; the per-piece base colour comes from instanceColor.
import { BufferAttribute, BufferGeometry, Color, IcosahedronGeometry, SphereGeometry, BoxGeometry, CylinderGeometry, TorusGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { PourKind, Shape } from '@/lib/snacks'

// --- small deterministic noise ------------------------------------------------
function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}
function smooth(t: number) {
  return t * t * (3 - 2 * t)
}
function noise3(x: number, y: number, z: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z)
  const fx = smooth(x - ix),
    fy = smooth(y - iy),
    fz = smooth(z - iz)
  let v = 0
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let c = 0; c < 2; c++) {
        const w = (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz)
        v += w * hash3(ix + a, iy + b, iz + c)
      }
  return v * 2 - 1
}
function fbm(x: number, y: number, z: number) {
  return noise3(x, y, z) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.1
}

type Deform = (v: Vector3, n: Vector3) => void

function deform(geo: BufferGeometry, fn: Deform) {
  const pos = geo.getAttribute('position') as BufferAttribute
  const v = new Vector3()
  const n = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.copy(v).normalize()
    fn(v, n)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

/** Paint vertex colours: white = base colour, tinted = speckle. */
function paint(geo: BufferGeometry, kind: PourKind, mask: (v: Vector3) => number) {
  const pos = geo.getAttribute('position') as BufferAttribute
  const cols = new Float32Array(pos.count * 3)
  const base = new Color(kind.colours[0])
  const sp = new Color(kind.speckle ?? kind.colours[0])
  // ratio so that (vertex * instance) ~= speckle colour where mask = 1
  const ratio = new Color(Math.min(2, sp.r / Math.max(0.05, base.r)), Math.min(2, sp.g / Math.max(0.05, base.g)), Math.min(2, sp.b / Math.max(0.05, base.b)))
  const v = new Vector3()
  const amt = kind.speckleAmount ?? 0
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const m = Math.max(0, Math.min(1, mask(v) * amt * 2))
    const shade = 0.92 + hash3(v.x * 9, v.y * 9, v.z * 9) * 0.12
    cols[i * 3] = (1 + (ratio.r - 1) * m) * shade
    cols[i * 3 + 1] = (1 + (ratio.g - 1) * m) * shade
    cols[i * 3 + 2] = (1 + (ratio.b - 1) * m) * shade
  }
  geo.setAttribute('color', new BufferAttribute(cols, 3))
  return geo
}

const speckle = (f: number, t: number) => (v: Vector3) => (noise3(v.x * f, v.y * f, v.z * f) > t ? 1 : 0)
const blotch = (f: number) => (v: Vector3) => smooth(Math.max(0, Math.min(1, fbm(v.x * f, v.y * f, v.z * f) * 1.6 + 0.3)))

// --- shapes --------------------------------------------------------------------
function peanut(k: PourKind) {
  const g = new SphereGeometry(1, 28, 16)
  deform(g, (v) => {
    const x = v.x * 1.6
    const waist = 1 - 0.2 * Math.exp(-(x * x) / 0.12)
    const lobes = 1 + 0.06 * Math.cos(x * 2.6)
    const ridge = 1 + 0.025 * Math.cos(Math.atan2(v.z, v.y) * 9)
    const bump = 1 + fbm(v.x * 3, v.y * 3, v.z * 3) * 0.05
    v.set(x * 0.62, v.y * 0.62 * waist * lobes * ridge * bump, v.z * 0.6 * waist * lobes * ridge * bump)
    // one half slightly bigger and a little bend
    if (v.x > 0) v.multiplyScalar(1.04)
    v.y += 0.06 * Math.cos(v.x * 1.4)
  })
  return paint(g, k, (v) => Math.max(speckle(7, 0.35)(v), blotch(2.2)(v) * 0.5))
}

function chana(k: PourKind) {
  const g = new IcosahedronGeometry(1, 4)
  const beakDir = new Vector3(0.55, 0.75, 0.35).normalize()
  deform(g, (v, n) => {
    const lump = 1 + fbm(v.x * 2.2, v.y * 2.2, v.z * 2.2) * 0.16
    const d = Math.max(0, n.dot(beakDir))
    const beak = 1 + 0.32 * Math.pow(d, 12)
    const cleft = 1 - 0.06 * Math.exp(-((n.z * 6) ** 2))
    v.multiplyScalar(0.92 * lump * beak * cleft)
  })
  return paint(g, k, blotch(2.6))
}

function pea(k: PourKind) {
  const g = new IcosahedronGeometry(1, 3)
  deform(g, (v) => {
    const wrinkle = 1 + fbm(v.x * 3.5, v.y * 3.5, v.z * 3.5) * 0.07
    const dent = 1 - 0.08 * Math.exp(-((v.y - 0.9) ** 2) * 8)
    v.multiplyScalar(wrinkle * dent)
  })
  return paint(g, k, (v) => speckle(6, 0.45)(v) * 0.6 + blotch(3)(v) * 0.3)
}

function pearl(k: PourKind) {
  const g = new IcosahedronGeometry(1, 2)
  deform(g, (v) => v.multiplyScalar(1 + fbm(v.x * 2, v.y * 2, v.z * 2) * 0.05))
  return paint(g, k, () => 0)
}

function candy(k: PourKind) {
  // Orange-slice candy: a thick disc with a rounded rim and segment grooves.
  const g = new CylinderGeometry(1, 1, 0.42, 40, 4, false)
  deform(g, (v) => {
    const rr = Math.hypot(v.x, v.z)
    const a = Math.atan2(v.z, v.x)
    const edge = Math.max(0, rr - 0.82) / 0.18
    const round = Math.sqrt(Math.max(0, 1 - edge * edge * 0.55))
    const groove = rr > 0.15 && rr < 0.85 ? 0.035 * Math.pow(Math.abs(Math.cos(a * 4)), 18) : 0
    v.y = v.y * round - Math.sign(v.y) * groove
    v.x *= 0.95
    v.z *= 0.95
  })
  return paint(g, k, () => 0)
}

function chikki(k: PourKind) {
  const g = new BoxGeometry(2, 0.42, 1.25, 16, 3, 10)
  deform(g, (v) => {
    // rounded corners
    const ax = Math.max(0, Math.abs(v.x) - 0.82),
      az = Math.max(0, Math.abs(v.z) - 0.45)
    const c = Math.hypot(ax, az)
    if (c > 0.18) {
      const s = 0.18 / c
      v.x = Math.sign(v.x) * (Math.min(Math.abs(v.x), 0.82) + ax * s)
      v.z = Math.sign(v.z) * (Math.min(Math.abs(v.z), 0.45) + az * s)
    }
    // peanut halves studding the top and bottom: smooth rounded bumps
    const nb = noise3(v.x * 2.6 + 3, 0.5, v.z * 2.6)
    const bump = smooth(Math.max(0, Math.min(1, (nb - 0.05) * 2.2))) * 0.12
    if (Math.abs(v.y) > 0.15) v.y += Math.sign(v.y) * bump
  })
  return paint(g, k, (v) => smooth(Math.max(0, Math.min(1, (noise3(v.x * 2.6 + 3, 0.5, v.z * 2.6) - 0.05) * 2.2))))
}

function popcorn(k: PourKind) {
  const parts: BufferGeometry[] = []
  const offs = [
    [0, 0, 0, 0.62],
    [0.5, 0.25, 0.1, 0.48],
    [-0.42, 0.3, -0.15, 0.5],
    [0.1, -0.35, 0.4, 0.45],
    [-0.2, 0.1, 0.5, 0.42],
    [0.25, 0.45, -0.4, 0.4],
  ]
  for (const [x, y, z, r] of offs) {
    const s = new IcosahedronGeometry(r, 2)
    deform(s, (v) => v.multiplyScalar(1 + fbm(v.x * 4 + x * 10, v.y * 4, v.z * 4) * 0.22))
    s.translate(x, y, z)
    s.deleteAttribute('uv')
    parts.push(s)
  }
  const g = mergeGeometries(parts)!
  g.computeVertexNormals()
  return paint(g, k, speckle(5, 0.55))
}

function grain(k: PourKind) {
  const g = new SphereGeometry(1, 18, 10)
  deform(g, (v) => {
    v.x *= 1.0
    v.y *= 0.36
    v.z *= 0.32
    v.y += 0.05 * Math.cos(v.x * 1.5)
  })
  return paint(g, k, (v) => speckle(8, 0.5)(v) * 0.5)
}

function flake(k: PourKind) {
  const g = new CylinderGeometry(1, 1, 0.1, 18, 1)
  deform(g, (v) => {
    const a = Math.atan2(v.z, v.x)
    const rr = 0.75 + fbm(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0.3) * 0.35
    const d = Math.hypot(v.x, v.z)
    if (d > 0.01) {
      v.x *= rr
      v.z *= rr * 0.8
    }
    v.y += 0.12 * Math.sin(v.x * 2)
  })
  return paint(g, k, () => 0)
}

function disc(k: PourKind) {
  // split dal: a lens, flat on one face
  const g = new SphereGeometry(1, 20, 10)
  deform(g, (v) => {
    v.y = v.y > 0 ? v.y * 0.42 : v.y * 0.08
    v.multiplyScalar(1 + fbm(v.x * 3, v.y * 3, v.z * 3) * 0.04)
  })
  return paint(g, k, () => 0)
}

function cube(k: PourKind) {
  const g = new BoxGeometry(1.5, 1.5, 1.5, 4, 4, 4)
  deform(g, (v) => {
    const r = v.clone().normalize().multiplyScalar(1.05)
    v.lerp(r, 0.14)
    v.multiplyScalar(1 + fbm(v.x * 5, v.y * 5, v.z * 5) * 0.03)
  })
  return paint(g, k, () => 0)
}

function bean(k: PourKind) {
  const g = new SphereGeometry(1, 20, 12)
  deform(g, (v) => {
    v.x *= 1.0
    v.y *= 0.62
    v.z *= 0.55
    v.y -= 0.12 * Math.cos(v.x * 1.6) // kidney curve
  })
  return paint(g, k, speckle(7, 0.4))
}

function cashew(k: PourKind) {
  const g = new TorusGeometry(0.62, 0.34, 12, 18, Math.PI * 1.15)
  g.rotateZ(-Math.PI * 0.08)
  deform(g, (v) => {
    v.z *= 0.85
    v.multiplyScalar(1 + fbm(v.x * 3, v.y * 3, v.z * 3) * 0.04)
  })
  g.center()
  return paint(g, k, blotch(2))
}

function almond(k: PourKind) {
  const g = new SphereGeometry(1, 22, 12)
  deform(g, (v) => {
    const t = (v.x + 1) / 2 // 0..1 along length
    const taper = Math.sin(Math.PI * Math.pow(t, 0.8))
    v.y *= 0.62 * taper + 0.04
    v.z *= 0.3 * taper + 0.03
    v.multiplyScalar(1 + fbm(v.x * 6, v.y * 6, v.z * 6) * 0.05)
  })
  return paint(g, k, (v) => (Math.sin(v.x * 30 + noise3(v.x * 4, v.y * 4, v.z * 4) * 6) > 0.4 ? 1 : 0))
}

function lump(k: PourKind) {
  const g = new IcosahedronGeometry(1, 3)
  deform(g, (v) => v.multiplyScalar(0.85 + fbm(v.x * 1.8, v.y * 1.8, v.z * 1.8) * 0.35))
  return paint(g, k, blotch(3))
}

const BUILDERS: Record<Shape, (k: PourKind) => BufferGeometry> = {
  peanut,
  chana,
  pea,
  candy,
  chikki,
  popcorn,
  grain,
  disc,
  cube,
  pearl,
  flake,
  cashew,
  almond,
  bean,
  lump,
}

const cache = new Map<string, BufferGeometry>()
export function geometryFor(kindName: string, kind: PourKind) {
  let g = cache.get(kindName)
  if (!g) {
    g = BUILDERS[kind.shape](kind)
    g.computeBoundingSphere()
    cache.set(kindName, g)
  }
  return g
}

/** Shapes that should come to rest lying flat. */
export const FLAT_SHAPES = new Set<Shape>(['chikki', 'candy', 'disc', 'flake', 'cashew', 'almond'])
