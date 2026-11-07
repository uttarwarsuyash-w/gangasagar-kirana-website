'use client'
import { createContext, useCallback, useContext, useState } from 'react'
import { Check, AlertCircle, X } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface T {
  id: number
  kind: Kind
  text: string
}
const ToastCtx = createContext<(text: string, kind?: Kind) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<T[]>([])
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random()
    setList((l) => [...l.slice(-2), { id, kind, text }])
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4">
        {list.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-[0.95rem] shadow-[0_12px_40px_-12px_rgb(31_26_23/0.45)] ${
              t.kind === 'error' ? 'bg-brand text-white' : 'bg-ink text-paper'
            }`}
            style={{ animation: 'toast-in .35s var(--ease-out-expo)' }}
          >
            {t.kind === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-turmeric" />}
            <span className="flex-1">{t.text}</span>
            <button className="-mr-1 opacity-70 hover:opacity-100" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(12px) scale(.97)}}`}</style>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
