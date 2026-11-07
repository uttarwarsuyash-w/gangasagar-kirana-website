// Fly-to-cart: throws 3-5 little snack pieces in an arc from a button into the bag icon.
import { POUR } from '@/lib/snacks'

function prefersReduced() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pieceSvg(kind: string, colour: string) {
  const shape = POUR[kind]?.shape ?? 'pea'
  const path =
    shape === 'peanut'
      ? '<path d="M3 10c0-4 3-6 6-5 2 .7 3 .6 5-.4 3-1.5 7 0 7 4.4 0 4.4-4 6-7 4.6-2-1-3-1-5-.2C6 15 3 14 3 10z"/>'
      : shape === 'candy'
        ? '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/>'
        : shape === 'chikki'
          ? '<rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="8" cy="11" r="2" fill="#e8c48a"/><circle cx="15" cy="13" r="2" fill="#e8c48a"/>'
          : shape === 'grain'
            ? '<ellipse cx="12" cy="12" rx="9" ry="4"/>'
            : shape === 'cube'
              ? '<rect x="5" y="5" width="14" height="14" rx="2"/>'
              : '<circle cx="12" cy="12" r="8"/>'
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${colour}">${path}</svg>`
}

export function flyToBag(from: Element | null, kind: string | null) {
  if (!from || prefersReduced()) return bump()
  const target = document.getElementById('bag-button')
  if (!target) return
  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const def = POUR[kind ?? ''] ?? POUR.peanut
  const n = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div')
    const size = 14 + Math.random() * 8
    el.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;z-index:95;pointer-events:none;will-change:transform`
    el.innerHTML = pieceSvg(kind ?? 'peanut', def.colours[i % def.colours.length])
    document.body.appendChild(el)
    const x0 = a.left + a.width / 2 - size / 2 + (Math.random() - 0.5) * 24
    const y0 = a.top + a.height / 2 - size / 2
    const x1 = b.left + b.width / 2 - size / 2
    const y1 = b.top + b.height / 2 - size / 2
    const apexY = Math.min(y0, y1) - 80 - Math.random() * 80
    const midX = (x0 + x1) / 2 + (Math.random() - 0.5) * 60
    const rot = (Math.random() - 0.5) * 720
    el.animate(
      [
        { transform: `translate(${x0}px,${y0}px) rotate(0deg) scale(1)`, opacity: 1 },
        { transform: `translate(${midX}px,${apexY}px) rotate(${rot / 2}deg) scale(1.1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x1}px,${y1}px) rotate(${rot}deg) scale(.5)`, opacity: 0.9 },
      ],
      { duration: 650 + i * 70, delay: i * 55, easing: 'cubic-bezier(.33,0,.2,1)', fill: 'forwards' },
    ).onfinish = () => {
      el.remove()
      if (i === n - 1) bump()
    }
  }
}

function bump() {
  const target = document.getElementById('bag-button')
  target?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18) rotate(-6deg)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' })
}
