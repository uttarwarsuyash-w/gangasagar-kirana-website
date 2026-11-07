// Tiny external store with localStorage persistence (no dependency).
export function createStore<T>(key: string | null, initial: T) {
  let state = initial
  let loaded = false
  const subs = new Set<() => void>()
  const load = () => {
    if (loaded || typeof window === 'undefined' || !key) return
    loaded = true
    try {
      const raw = localStorage.getItem(key)
      if (raw) state = { ...initial, ...JSON.parse(raw) }
    } catch {}
    window.addEventListener('storage', (e) => {
      if (e.key === key && e.newValue) {
        try {
          state = JSON.parse(e.newValue)
          subs.forEach((s) => s())
        } catch {}
      }
    })
  }
  return {
    get: () => {
      load()
      return state
    },
    getServer: () => initial,
    set(next: T | ((s: T) => T)) {
      load()
      state = typeof next === 'function' ? (next as (s: T) => T)(state) : next
      if (key)
        try {
          localStorage.setItem(key, JSON.stringify(state))
        } catch {}
      subs.forEach((s) => s())
    },
    subscribe(fn: () => void) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}
