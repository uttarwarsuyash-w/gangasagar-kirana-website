// The pour scene: three.js renderer + instanced snack pieces + the Pile physics.
// Imperative on purpose: one canvas, a few instanced meshes, no per-frame React work.
import {
  NeutralToneMapping,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Pile } from './physics'
import { geometryFor, FLAT_SHAPES } from './geometries'
import { POUR, type PourKind, type Shape } from '@/lib/snacks'
import type { Tier } from './tier'

const COLLIDE: Partial<Record<Shape, number>> = { peanut: 0.78, chikki: 0.62, candy: 0.8, grain: 0.45, flake: 0.55, disc: 0.62, almond: 0.6, cashew: 0.75, bean: 0.65 }

interface Batch {
  id: number
  kind: string
  def: PourKind
  mesh: InstancedMesh
  renderScale: number
  used: number
  capacity: number
  seen?: Uint8Array
}

export interface SceneOptions {
  tier: Tier
  /** Pile sits at the bottom of the canvas; set >0 to leave room (fraction of height) */
  floorInset?: number
  pieceScale?: number
  idleSway?: boolean
}

export class PourScene {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(30, 1, 1, 200)
  private group = new Group()
  private pile = new Pile()
  private batches = new Map<number, Batch>()
  private nextBatch = 1
  private raf = 0
  private last = 0
  private acc = 0
  private halfW = 10
  private halfH = 10
  private shadowPlane: Mesh
  private running = false
  private visible = true
  private quietFrames = 0
  private pointer = { x: 0, y: 0, active: false, t: 0 }
  private tmpM = new Matrix4()
  private tmpQ = new Quaternion()
  private tmpP = new Vector3()
  private tmpS = new Vector3()
  private fpsSamples: number[] = []
  onSlow?: () => void

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: SceneOptions,
  ) {
    const full = opts.tier === 'full'
    this.renderer = new WebGLRenderer({ canvas, antialias: full, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: new URLSearchParams(location.search).has('poster') })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, full ? 2 : 1.25))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NeutralToneMapping
    this.renderer.toneMappingExposure = 0.95
    this.renderer.shadowMap.enabled = full
    this.renderer.shadowMap.type = PCFShadowMap

    const pmrem = new PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.35
    pmrem.dispose()

    this.scene.add(new HemisphereLight('#fff6ea', '#6a4a30', 0.7))
    const key = new DirectionalLight('#fff1dc', 2.6)
    key.position.set(-10, 18, 14)
    key.castShadow = full
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -30
    key.shadow.camera.right = 30
    key.shadow.camera.top = 20
    key.shadow.camera.bottom = -20
    key.shadow.bias = -0.0008
    key.shadow.radius = 4
    this.scene.add(key)
    const fill = new DirectionalLight('#e8eefc', 0.5)
    fill.position.set(12, 4, 10)
    this.scene.add(fill)

    this.shadowPlane = new Mesh(new PlaneGeometry(200, 60), new ShadowMaterial({ opacity: 0.1 }))
    this.shadowPlane.rotation.x = -Math.PI / 2
    this.shadowPlane.receiveShadow = true
    this.scene.add(this.shadowPlane)

    this.camera.position.set(0, 3, 46)
    this.camera.lookAt(0, 0, 0)
    this.scene.add(this.group)
  }

  resize(w: number, h: number) {
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const dist = this.camera.position.z
    this.halfH = Math.tan((this.camera.fov * Math.PI) / 360) * dist
    this.halfW = this.halfH * this.camera.aspect
    const inset = (this.opts.floorInset ?? 0) * this.halfH * 2
    this.pile.bounds = {
      floor: -this.halfH + 0.25 + inset,
      left: -this.halfW * 0.99,
      right: this.halfW * 0.99,
      depth: 2.4,
      top: this.halfH + 2,
    }
    this.shadowPlane.position.y = this.pile.bounds.floor
    this.wake()
  }

  /** Scale pieces to the canvas so a phone and a laptop both look full but not buried. */
  private pieceScale() {
    if (this.opts.pieceScale) return this.opts.pieceScale
    const narrow = this.halfW < this.halfH
    return narrow ? 0.95 : 1.1
  }

  private countFor(def: PourKind) {
    const base = this.opts.tier === 'full' ? 250 : 100
    const narrow = this.halfW < this.halfH ? 0.75 : 1
    const sizeFactor = Math.min(1.6, Math.pow(0.6 / def.size, 1.6))
    return Math.max(18, Math.min(base, Math.round(base * sizeFactor * narrow)))
  }

  private material(def: PourKind) {
    return new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: def.roughness ?? 0.6,
      metalness: 0,
      clearcoat: def.clearcoat ?? 0,
      clearcoatRoughness: 0.25,
      sheen: def.translucent ? 0.4 : 0,
      sheenColor: new Color(def.colours[0]),
      emissive: def.translucent ? new Color(def.colours[0]).multiplyScalar(0.12) : new Color(0),
    })
  }

  /** Pour a snack. `initial` places a small pile that is already settling (first load). */
  pour(kindName: string, opts: { initial?: boolean; count?: number; full?: boolean } = {}) {
    const def = POUR[kindName] ?? POUR.peanut
    const n = opts.count ?? (opts.initial && !opts.full ? Math.round(this.countFor(def) * 0.55) : this.countFor(def))
    const geo = geometryFor(kindName, def)
    const mesh = new InstancedMesh(geo, this.material(def), n)
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    mesh.castShadow = this.opts.tier === 'full'
    mesh.receiveShadow = this.opts.tier === 'full'
    mesh.frustumCulled = false
    const id = this.nextBatch++
    const scale = def.size * this.pieceScale()
    const batch: Batch = { id, kind: kindName, def, mesh, renderScale: scale, used: n, capacity: n }
    const col = new Color()
    for (let i = 0; i < n; i++) {
      col.set(def.colours[i % def.colours.length])
      mesh.setColorAt(i, col)
    }
    this.group.add(mesh)
    this.batches.set(id, batch)

    const r = scale * (COLLIDE[def.shape] ?? 0.92)
    const { left, right, floor, top } = this.pile.bounds
    const width = right - left
    const flat = FLAT_SHAPES.has(def.shape)
    if (opts.initial) {
      for (let i = 0; i < n; i++) {
        const x = left + r + Math.random() * (width - 2 * r)
        const y = floor + r + Math.random() * 5
        this.pile.add(x, y, (Math.random() - 0.5) * 3, r, id, i, i % def.colours.length, { flat, delay: Math.random() * 0.4, vy: -2 })
      }
    } else {
      // Pour from one to three spouts near the top, like tipping a sack.
      const spouts = width > 30 ? 3 : width > 18 ? 2 : 1
      const xs = Array.from({ length: spouts }, (_, s) => left + width * ((s + 0.5) / spouts) + (Math.random() - 0.5) * width * 0.12)
      const duration = 1.1
      for (let i = 0; i < n; i++) {
        const s = i % spouts
        const spread = 0.8 + Math.random() * 1.6
        const x = Math.min(right - r, Math.max(left + r, xs[s] + (Math.random() - 0.5) * spread * 2))
        const y = top + Math.random() * 2
        this.pile.add(x, y, (Math.random() - 0.5) * 3.5, r, id, i, i % def.colours.length, {
          flat,
          delay: (i / n) * duration + Math.random() * 0.05,
          vy: -10 - Math.random() * 6,
          vx: (Math.random() - 0.5) * 6,
        })
      }
    }
    this.writeMatrices()
    this.wake()
  }

  sweep() {
    this.pile.sweep()
    this.wake()
  }

  setPointer(ndcX: number, ndcY: number, active: boolean) {
    const now = performance.now()
    const x = ndcX * this.halfW
    const y = ndcY * this.halfH
    const dt = Math.max(0.008, (now - this.pointer.t) / 1000)
    const p = this.pile.pusher
    if (active && p.active) {
      p.vx = Math.max(-60, Math.min(60, (x - p.x) / dt))
      p.vy = Math.max(-60, Math.min(60, (y - p.y) / dt))
    } else {
      p.vx = 0
      p.vy = 0
    }
    p.x = x
    p.y = y
    p.r = 1.6 + this.pieceScale()
    p.active = active
    this.pointer.t = now
    if (active) this.wake()
  }

  setTilt(gx: number) {
    this.pile.gx = Math.max(-25, Math.min(25, gx))
    if (Math.abs(gx) > 2) {
      for (let i = 0; i < this.pile.n; i++) this.pile.sleep[i] = 0
      this.wake()
    }
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v) this.wake()
  }

  private wake() {
    this.quietFrames = 0
    if (!this.running && this.visible) {
      this.running = true
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  private frame = (now: number) => {
    const dt = Math.min(1 / 30, (now - this.last) / 1000)
    this.last = now
    if (dt > 0) {
      this.fpsSamples.push(dt)
      if (this.fpsSamples.length === 90) {
        const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / 90
        if (avg > 1 / 38) this.onSlow?.()
        this.fpsSamples = []
      }
    }
    this.acc += dt
    const h = 1 / 120
    let steps = 0
    while (this.acc >= h && steps < 4) {
      this.pile.step(h)
      this.acc -= h
      steps++
    }
    if (steps === 4) this.acc = 0
    this.cleanup()
    this.writeMatrices()
    if (this.opts.idleSway) {
      const t = now / 1000
      this.group.rotation.y = Math.sin(t * 0.32) * 0.035
      this.group.rotation.x = Math.sin(t * 0.21) * 0.015
    }
    this.renderer.render(this.scene, this.camera)

    const settled = this.pile.allAsleep() && !this.pile.pusher.active
    this.quietFrames = settled ? this.quietFrames + 1 : 0
    // Keep rendering for the idle sway (full tier only); otherwise stop once everything rests.
    if (!this.visible || (this.quietFrames > 30 && !this.opts.idleSway)) {
      this.running = false
      return
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private cleanup() {
    const { right, floor } = this.pile.bounds
    let removed = false
    const pile = this.pile
    pile.removeWhere((i) => {
      const gone = pile.leaving[i] === 1 && (pile.px[i] > right + 6 || pile.py[i] < floor - 12)
      if (gone) {
        const b = this.batches.get(pile.batch[i])
        if (b) b.used--
        removed = true
      }
      return gone
    })
    if (removed) {
      for (const [id, b] of this.batches) {
        if (b.used <= 0) {
          this.group.remove(b.mesh)
          b.mesh.dispose()
          ;(b.mesh.material as MeshPhysicalMaterial).dispose()
          this.batches.delete(id)
        }
      }
    }
  }

  private hidden = new Matrix4().makeScale(0, 0, 0)

  private writeMatrices() {
    const pile = this.pile
    for (const b of this.batches.values()) {
      if (!b.seen) b.seen = new Uint8Array(b.capacity)
      else b.seen.fill(0)
    }
    for (let i = 0; i < pile.n; i++) {
      const b = this.batches.get(pile.batch[i])
      if (!b) continue
      const s = b.renderScale * pile.scale[i] * (pile.delay[i] > 0 ? 0 : 1)
      this.tmpP.set(pile.px[i], pile.py[i], pile.pz[i])
      this.tmpQ.set(pile.qx[i], pile.qy[i], pile.qz[i], pile.qw[i])
      this.tmpS.set(s, s, s)
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS)
      b.mesh.setMatrixAt(pile.slot[i], this.tmpM)
      b.seen![pile.slot[i]] = 1
    }
    for (const b of this.batches.values()) {
      for (let k = 0; k < b.capacity; k++) if (!b.seen![k]) b.mesh.setMatrixAt(k, this.hidden)
      b.mesh.instanceMatrix.needsUpdate = true
    }
  }

  lowerQuality() {
    this.renderer.setPixelRatio(1)
  }

  /** Render one frame and return a PNG (used to make the reduced-motion poster images). */
  snapshot() {
    this.renderer.render(this.scene, this.camera)
    return this.canvas.toDataURL('image/png')
  }

  /** Run the physics without rendering until the pile rests (for posters/tests). */
  settle(seconds = 6) {
    const h = 1 / 120
    for (let t = 0; t < seconds; t += h) this.pile.step(h)
    this.cleanup()
    this.writeMatrices()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.running = false
    for (const b of this.batches.values()) {
      b.mesh.dispose()
      ;(b.mesh.material as MeshPhysicalMaterial).dispose()
    }
    this.renderer.dispose()
  }
}
