// Image pipeline: assets/photos + assets/renders -> public/img (AVIF + WebP at 480/960/1600 px)
// and lib/images.json (dimensions + tiny blur placeholder). Run: npm run images
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const OUT = path.join(root, 'public/img')
const WIDTHS = [480, 960, 1600]

// key -> { src, crop?: [left, top, width, height], alt source info }
const JOBS = {
  'products/01-peanuts': { src: 'photos/products/01-peanuts-square.jpg', source: 'store' },
  'products/02-roasted-chana-with-salt': { src: 'photos/products/02-roasted-chana-with-salt-square.jpg', source: 'store' },
  'products/03-roasted-chana-without-salt': { src: 'photos/products/03-roasted-chana-without-salt-square.jpg', source: 'store' },
  'products/04-masala-green-peas': { src: 'photos/products/04-masala-green-peas-square.jpg', source: 'store' },
  'products/05-roasted-yellow-peas': { src: 'photos/products/05-roasted-yellow-peas-square.jpg', source: 'store' },
  'products/06-orange-candy': { src: 'photos/products/06-orange-candy-square.jpg', source: 'store' },
  'products/07-rk-peanut-chikki': { src: 'photos/products/07-rk-peanut-chikki-square.jpg', source: 'store' },
  'leadership/gangadhar': { src: 'photos/leadership/gangadhar-nivrutti-uttarwar.jpg', source: 'store' },
  'leadership/laxmikant': { src: 'photos/leadership/laxmikant-uttarwar.jpg', source: 'store' },
  'shop/interior': { src: 'photos/shop/shop-interior.png', source: 'store' },
  'journey/1-beginning': { src: 'photos/shop-history/1-the-beginning.jpg', source: 'store' },
  'journey/2-renovated': { src: 'photos/shop-history/2-renovated.png', source: 'store' },
  // Cropped above the parked car: removes the camera watermark, the number plate and passers-by.
  'journey/3-today': { src: 'photos/shop-history/3-today.webp', crop: [0, 150, 459, 608], source: 'store' },
}

for (const f of fs.existsSync(path.join(root, 'assets/renders')) ? fs.readdirSync(path.join(root, 'assets/renders')) : []) {
  if (/\.(png|jpg|webp)$/.test(f)) JOBS[`renders/${f.replace(/\.\w+$/, '')}`] = { src: `renders/${f}`, source: 'render' }
}

const manifest = {}
let total = 0
for (const [key, job] of Object.entries(JOBS)) {
  let img = sharp(path.join(root, 'assets', job.src)).rotate()
  if (job.crop) {
    const [left, top, width, height] = job.crop
    img = img.extract({ left, top, width, height })
  }
  const buf = await img.toBuffer()
  const meta = await sharp(buf).metadata()
  const widths = WIDTHS.filter((w) => w < meta.width).concat(meta.width <= 1600 ? [meta.width] : [])
  const uniq = [...new Set(widths.map((w) => Math.min(w, 1600)))].sort((a, b) => a - b)
  fs.mkdirSync(path.join(OUT, path.dirname(key)), { recursive: true })
  for (const w of uniq) {
    const base = sharp(buf).resize({ width: w, withoutEnlargement: true })
    const avif = await base.clone().avif({ quality: 52, effort: 5 }).toBuffer()
    const webp = await base.clone().webp({ quality: 74 }).toBuffer()
    fs.writeFileSync(path.join(OUT, `${key}-${w}.avif`), avif)
    fs.writeFileSync(path.join(OUT, `${key}-${w}.webp`), webp)
    total += avif.length + webp.length
  }
  const blur = await sharp(buf).resize(16).webp({ quality: 40 }).toBuffer()
  manifest[key] = {
    w: meta.width,
    h: meta.height,
    widths: uniq,
    blur: `data:image/webp;base64,${blur.toString('base64')}`,
    source: job.source,
  }
}
fs.writeFileSync(path.join(root, 'lib/images.json'), JSON.stringify(manifest, null, 1))
console.log(`images: ${Object.keys(manifest).length} sources, ${(total / 1024).toFixed(0)} KB written`)
