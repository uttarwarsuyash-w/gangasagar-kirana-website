// Minimal static server for the built site (out/), mimicking Cloudflare Pages:
// /path/ -> /path/index.html, unknown -> 404.html. Usage: node scripts/serve.mjs [port]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../out')
const port = Number(process.argv[2] || 4321)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.gz': 'application/gzip', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' }
http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.join(root, p)
    if (!file.startsWith(root)) return res.writeHead(403).end()
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html'
    if (!fs.existsSync(file)) {
      if (!p.endsWith('/') && fs.existsSync(path.join(root, p, 'index.html'))) return res.writeHead(308, { Location: p + '/' }).end()
      res.writeHead(404, { 'Content-Type': types['.html'] })
      return fs.createReadStream(path.join(root, '404.html')).pipe(res)
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, () => console.log(`serving out/ on http://localhost:${port}`))
