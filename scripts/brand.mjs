// Renders favicon and app icons from the mark. Run once: node scripts/brand.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const root = path.resolve(import.meta.dirname, '..')
const mark = (stroke, wave, pan, bg, pad = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${48 + 2 * pad} ${48 + 2 * pad}">
${bg ? `<rect x="${-pad}" y="${-pad}" width="${48 + 2 * pad}" height="${48 + 2 * pad}" rx="${(48 + 2 * pad) * 0.22}" fill="${bg}"/>` : ''}
<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B949"/><stop offset="1" stop-color="#A8771C"/></linearGradient></defs>
<g fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"><circle cx="24" cy="5.4" r="2.2"/><path d="M24 7.6 L7.6 25 M24 7.6 L40.4 25"/></g>
<path d="M10.2 25 C13.2 20.8 17 16.6 22.4 15.7 C27.8 14.8 32 17.6 33.4 21.8 C31.4 19.9 28.2 19.7 26.8 21.8 C26 23 26.3 24.3 27 25 Z M28.8 25 C31.2 23.5 34.4 23.3 37.2 25 Z" fill="${wave}"/>
<path d="M4.4 25 H43.6 A19.6 12.5 0 0 1 4.4 25 Z" fill="${pan}"/>
<path d="M4.4 25 H43.6" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/></svg>`

const colour = mark('#1F1A17', '#B3263A', 'url(#b)', null)
const badge = mark('#FFFDF9', '#FFFDF9', 'url(#b)', '#B3263A', 8)
const mono = mark('#1F1A17', '#1F1A17', '#1F1A17', null)
fs.writeFileSync(path.join(root, 'brand/mark.svg'), colour)
fs.writeFileSync(path.join(root, 'brand/mark-badge.svg'), badge)
fs.writeFileSync(path.join(root, 'brand/mark-mono.svg'), mono)
fs.writeFileSync(path.join(root, 'public/favicon.svg'), badge)
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  await sharp(Buffer.from(badge)).resize(size, size).png().toFile(path.join(root, 'public', name))
}
await sharp(Buffer.from(colour)).resize(1024, 1024).png().toFile(path.join(root, 'brand/mark-1024.png'))
await sharp(Buffer.from(mono)).resize(1024, 1024).png().toFile(path.join(root, 'brand/mark-mono-1024.png'))
console.log('brand assets written')
