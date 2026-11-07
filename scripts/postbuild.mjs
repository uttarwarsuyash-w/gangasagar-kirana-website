// After `next build`: set <html lang="hi"> on Hindi pages and add noindex while in preview mode.
import fs from 'node:fs'
import path from 'node:path'

const out = path.resolve(import.meta.dirname, '../out')
let remoteMode
try {
  remoteMode = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../content/remote.json'), 'utf8')).settings?.store_mode
} catch {}
const preview = (process.env.STORE_MODE ?? remoteMode ?? 'preview') === 'preview'
let n = 0
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f.endsWith('.html')) {
      let html = fs.readFileSync(p, 'utf8')
      const rel = path.relative(out, p)
      if (rel.startsWith('hi' + path.sep)) html = html.replace('<html lang="en"', '<html lang="hi"')
      if (preview && !html.includes('name="robots"')) html = html.replace('<head>', '<head><meta name="robots" content="noindex, nofollow"/>')
      fs.writeFileSync(p, html)
      n++
    }
  }
}
walk(out)
console.log(`postbuild: ${n} pages processed${preview ? ' (preview: noindex)' : ''}`)
