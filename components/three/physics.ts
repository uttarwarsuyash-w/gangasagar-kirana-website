// Lightweight snack physics: spheres fall, bounce, roll and pile up in a shallow tray.
// No dependencies; ~250 pieces at 60 fps on a mid-range phone. Rotation is integrated from
// rolling contact so pieces tumble believably even though collisions use spheres.

export interface Bounds {
  floor: number // y of the floor
  left: number
  right: number
  depth: number // tray half-depth in z
  top: number // spawn height
}

export interface Pusher {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  active: boolean
}

const MAX = 600

export class Pile {
  n = 0
  px = new Float32Array(MAX)
  py = new Float32Array(MAX)
  pz = new Float32Array(MAX)
  vx = new Float32Array(MAX)
  vy = new Float32Array(MAX)
  vz = new Float32Array(MAX)
  r = new Float32Array(MAX)
  // quaternion
  qx = new Float32Array(MAX)
  qy = new Float32Array(MAX)
  qz = new Float32Array(MAX)
  qw = new Float32Array(MAX)
  // angular velocity
  wx = new Float32Array(MAX)
  wy = new Float32Array(MAX)
  wz = new Float32Array(MAX)
  scale = new Float32Array(MAX)
  batch = new Int16Array(MAX) // which instanced mesh / colour batch a piece belongs to
  slot = new Int16Array(MAX) // index inside that batch
  colour = new Uint8Array(MAX) // colour variant index
  leaving = new Uint8Array(MAX)
  sleep = new Uint16Array(MAX) // frames below rest threshold
  flat = new Uint8Array(MAX) // settle lying flat (slabs, discs)
  delay = new Float32Array(MAX) // seconds until it starts falling (staggered pour)

  gravity = -38
  restitution = 0.22
  friction = 0.12
  gx = 0 // sideways gravity from phone tilt

  bounds: Bounds = { floor: -10, left: -18, right: 18, depth: 2.6, top: 14 }
  pusher: Pusher = { x: 0, y: 0, vx: 0, vy: 0, r: 2.2, active: false }

  private grid = new Map<number, number[]>()

  add(x: number, y: number, z: number, radius: number, batch: number, slot: number, colour: number, opts: { flat?: boolean; delay?: number; vx?: number; vy?: number } = {}) {
    if (this.n >= MAX) return -1
    const i = this.n++
    this.px[i] = x
    this.py[i] = y
    this.pz[i] = z
    this.vx[i] = opts.vx ?? (Math.random() - 0.5) * 2
    this.vy[i] = opts.vy ?? -Math.random() * 4
    this.vz[i] = (Math.random() - 0.5) * 1.5
    this.r[i] = radius
    // random orientation
    const u1 = Math.random(),
      u2 = Math.random(),
      u3 = Math.random()
    const s1 = Math.sqrt(1 - u1),
      s2 = Math.sqrt(u1)
    this.qx[i] = s1 * Math.sin(2 * Math.PI * u2)
    this.qy[i] = s1 * Math.cos(2 * Math.PI * u2)
    this.qz[i] = s2 * Math.sin(2 * Math.PI * u3)
    this.qw[i] = s2 * Math.cos(2 * Math.PI * u3)
    this.wx[i] = (Math.random() - 0.5) * 10
    this.wy[i] = (Math.random() - 0.5) * 10
    this.wz[i] = (Math.random() - 0.5) * 10
    this.scale[i] = 0.85 + Math.random() * 0.3
    this.batch[i] = batch
    this.slot[i] = slot
    this.colour[i] = colour
    this.leaving[i] = 0
    this.sleep[i] = 0
    this.flat[i] = opts.flat ? 1 : 0
    this.delay[i] = opts.delay ?? 0
    return i
  }

  /** Remove pieces matching predicate; compacts arrays and returns removed batch/slot pairs. */
  removeWhere(pred: (i: number) => boolean) {
    let w = 0
    for (let i = 0; i < this.n; i++) {
      if (pred(i)) continue
      if (w !== i) this.copy(i, w)
      w++
    }
    this.n = w
  }

  private copy(a: number, b: number) {
    for (const k of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'r', 'qx', 'qy', 'qz', 'qw', 'wx', 'wy', 'wz', 'scale', 'batch', 'slot', 'colour', 'leaving', 'sleep', 'flat', 'delay'] as const) {
      ;(this[k] as Float32Array)[b] = (this[k] as Float32Array)[a]
    }
  }

  /** Send every current piece flying off to the right; they no longer collide with the new pile. */
  sweep() {
    for (let i = 0; i < this.n; i++) {
      this.leaving[i] = 1
      this.sleep[i] = 0
      this.delay[i] = Math.random() * 0.15
      this.vx[i] = 26 + Math.random() * 22 + (this.px[i] - this.bounds.left) * 0.4
      this.vy[i] = 8 + Math.random() * 12
      this.wz[i] = -12 - Math.random() * 10
    }
  }

  private key(cx: number, cy: number, cz: number) {
    return ((cx + 512) << 20) | ((cy + 512) << 10) | (cz + 512)
  }

  step(dt: number) {
    const { floor, left, right, depth } = this.bounds
    const n = this.n
    const g = this.gravity
    let cell = 0.1
    for (let i = 0; i < n; i++) if (this.r[i] * this.scale[i] > cell) cell = this.r[i] * this.scale[i]
    cell *= 2
    const p = this.pusher

    // integrate
    for (let i = 0; i < n; i++) {
      if (this.delay[i] > 0) {
        this.delay[i] -= dt
        continue
      }
      if (this.sleep[i] > 40 && !this.leaving[i]) continue
      this.vy[i] += g * dt
      this.vx[i] += this.gx * dt
      this.px[i] += this.vx[i] * dt
      this.py[i] += this.vy[i] * dt
      this.pz[i] += this.vz[i] * dt
      // air drag
      this.vx[i] *= 0.999
      this.vz[i] *= 0.995
    }

    // floor and walls
    for (let i = 0; i < n; i++) {
      if (this.leaving[i] || this.delay[i] > 0) continue
      const r = this.r[i] * this.scale[i]
      if (this.py[i] < floor + r) {
        this.py[i] = floor + r
        if (this.vy[i] < 0) this.vy[i] = -this.vy[i] * this.restitution
        if (Math.abs(this.vy[i]) < 0.6) this.vy[i] = 0
        this.vx[i] *= 1 - this.friction
        this.vz[i] *= 1 - this.friction
        // rolling: w = n x v / r with n = +y  => (vz, 0, -vx) / r
        this.wx[i] += (this.vz[i] / r - this.wx[i]) * 0.5
        this.wz[i] += (-this.vx[i] / r - this.wz[i]) * 0.5
        this.wy[i] *= 0.8
      }
      if (this.px[i] < left + r) {
        this.px[i] = left + r
        this.vx[i] = Math.abs(this.vx[i]) * 0.3
      } else if (this.px[i] > right - r) {
        this.px[i] = right - r
        this.vx[i] = -Math.abs(this.vx[i]) * 0.3
      }
      if (this.pz[i] < -depth + r) {
        this.pz[i] = -depth + r
        this.vz[i] = Math.abs(this.vz[i]) * 0.3
      } else if (this.pz[i] > depth - r) {
        this.pz[i] = depth - r
        this.vz[i] = -Math.abs(this.vz[i]) * 0.3
      }
    }

    // spatial hash
    this.grid.clear()
    for (let i = 0; i < n; i++) {
      if (this.leaving[i] || this.delay[i] > 0) continue
      const k = this.key(Math.floor(this.px[i] / cell), Math.floor(this.py[i] / cell), Math.floor(this.pz[i] / cell))
      const list = this.grid.get(k)
      if (list) list.push(i)
      else this.grid.set(k, [i])
    }

    // pairwise contacts (each pair once: neighbour cells with higher key or same cell j>i)
    for (let i = 0; i < n; i++) {
      if (this.leaving[i] || this.delay[i] > 0) continue
      const cx = Math.floor(this.px[i] / cell),
        cy = Math.floor(this.py[i] / cell),
        cz = Math.floor(this.pz[i] / cell)
      const ri = this.r[i] * this.scale[i]
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const list = this.grid.get(this.key(cx + dx, cy + dy, cz + dz))
            if (!list) continue
            for (const j of list) {
              if (j <= i) continue
              const rj = this.r[j] * this.scale[j]
              const ex = this.px[j] - this.px[i],
                ey = this.py[j] - this.py[i],
                ez = this.pz[j] - this.pz[i]
              const d2 = ex * ex + ey * ey + ez * ez
              const rr = ri + rj
              if (d2 >= rr * rr || d2 < 1e-8) continue
              const d = Math.sqrt(d2)
              const nx = ex / d,
                ny = ey / d,
                nz = ez / d
              const pen = (rr - d) * 0.5
              const si = this.sleep[i] > 40 ? 0.15 : 1
              const sj = this.sleep[j] > 40 ? 0.15 : 1
              const tot = si + sj
              this.px[i] -= nx * pen * (2 * si / tot)
              this.py[i] -= ny * pen * (2 * si / tot)
              this.pz[i] -= nz * pen * (2 * si / tot)
              this.px[j] += nx * pen * (2 * sj / tot)
              this.py[j] += ny * pen * (2 * sj / tot)
              this.pz[j] += nz * pen * (2 * sj / tot)
              const rvx = this.vx[j] - this.vx[i],
                rvy = this.vy[j] - this.vy[i],
                rvz = this.vz[j] - this.vz[i]
              const vn = rvx * nx + rvy * ny + rvz * nz
              if (vn < 0) {
                const jimp = (-(1 + this.restitution) * vn) / 2
                this.vx[i] -= jimp * nx
                this.vy[i] -= jimp * ny
                this.vz[i] -= jimp * nz
                this.vx[j] += jimp * nx
                this.vy[j] += jimp * ny
                this.vz[j] += jimp * nz
                // tangential friction
                const tx = rvx - vn * nx,
                  ty = rvy - vn * ny,
                  tz = rvz - vn * nz
                const f = 0.08
                this.vx[i] += tx * f
                this.vy[i] += ty * f
                this.vz[i] += tz * f
                this.vx[j] -= tx * f
                this.vy[j] -= ty * f
                this.vz[j] -= tz * f
                if (Math.abs(vn) > 2.5) {
                  this.sleep[i] = 0
                  this.sleep[j] = 0
                }
              }
            }
          }
    }

    // cursor / finger pusher
    if (p.active) {
      for (let i = 0; i < n; i++) {
        if (this.leaving[i] || this.delay[i] > 0) continue
        const r = this.r[i] * this.scale[i] + p.r
        const ex = this.px[i] - p.x,
          ey = this.py[i] - p.y
        const d2 = ex * ex + ey * ey
        if (d2 > r * r || d2 < 1e-6) continue
        const d = Math.sqrt(d2)
        const nx = ex / d,
          ny = ey / d
        const pen = r - d
        this.px[i] += nx * pen * 0.6
        this.py[i] += ny * pen * 0.6
        this.vx[i] += nx * pen * 6 + p.vx * 0.35
        this.vy[i] += Math.max(0, ny * pen * 6 + p.vy * 0.35)
        this.wz[i] += (Math.random() - 0.5) * 8
        this.sleep[i] = 0
      }
    }

    // rotation + sleep bookkeeping
    for (let i = 0; i < n; i++) {
      if (this.delay[i] > 0) continue
      let wx = this.wx[i],
        wy = this.wy[i],
        wz = this.wz[i]
      if (!this.leaving[i]) {
        wx *= 0.985
        wy *= 0.985
        wz *= 0.985
      }
      const speed2 = this.vx[i] ** 2 + this.vy[i] ** 2 + this.vz[i] ** 2
      if (!this.leaving[i] && speed2 < 0.25) {
        this.sleep[i] = Math.min(60000, this.sleep[i] + 1)
        wx *= 0.85
        wy *= 0.85
        wz *= 0.85
        if (this.flat[i]) this.settleFlat(i, 0.08)
      } else if (!this.leaving[i]) this.sleep[i] = 0
      this.wx[i] = wx
      this.wy[i] = wy
      this.wz[i] = wz
      const ang = Math.sqrt(wx * wx + wy * wy + wz * wz)
      if (ang > 1e-4) {
        const h = (ang * dt) / 2
        const s = Math.sin(h) / ang
        const dx = wx * s,
          dy = wy * s,
          dz = wz * s,
          dw = Math.cos(h)
        const x = this.qx[i],
          y = this.qy[i],
          z = this.qz[i],
          w = this.qw[i]
        this.qx[i] = dw * x + dx * w + dy * z - dz * y
        this.qy[i] = dw * y - dx * z + dy * w + dz * x
        this.qz[i] = dw * z + dx * y - dy * x + dz * w
        this.qw[i] = dw * w - dx * x - dy * y - dz * z
        const l = Math.hypot(this.qx[i], this.qy[i], this.qz[i], this.qw[i])
        this.qx[i] /= l
        this.qy[i] /= l
        this.qz[i] /= l
        this.qw[i] /= l
      }
    }
  }

  /** Slerp-ish nudge so slabs and discs come to rest lying flat (local y up). */
  private settleFlat(i: number, k: number) {
    // rotate local up (0,1,0) toward world up
    const x = this.qx[i],
      y = this.qy[i],
      z = this.qz[i],
      w = this.qw[i]
    const ux = 2 * (x * y - w * z),
      uy = 1 - 2 * (x * x + z * z),
      uz = 2 * (y * z + w * x)
    const sign = uy >= 0 ? 1 : -1 // either face down is fine
    const ax = -uz * sign,
      az = ux * sign // axis = up x target
    const s = Math.hypot(ax, az)
    if (s < 1e-4) return
    const ang = Math.asin(Math.min(1, s)) * k
    const h = ang / 2
    const sh = Math.sin(h) / s
    const dx = ax * sh,
      dz = az * sh,
      dw = Math.cos(h)
    this.qx[i] = dw * x + dx * w - dz * y
    this.qy[i] = dw * y - dx * z + dz * x
    this.qz[i] = dw * z + dx * y + dz * w
    this.qw[i] = dw * w - dx * x - dz * z
  }

  allAsleep() {
    for (let i = 0; i < this.n; i++) if (this.leaving[i] || this.sleep[i] < 40 || this.delay[i] > 0) return false
    return true
  }
}
