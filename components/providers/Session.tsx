'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getBackend, type SessionUser } from '@/lib/backend'
import { IS_DEMO } from '@/lib/backend/config'

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  whatsapp_opt_in: boolean
  is_admin: boolean
}

interface Ctx {
  user: SessionUser | null
  profile: Profile | null
  loading: boolean
  /** true once we know whether someone is signed in */
  checked: boolean
  signIn: (next?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  demoPicker: boolean
  closeDemoPicker: () => void
  demoSignIn: (who: 'customer' | 'admin') => Promise<void>
}

const SessionCtx = createContext<Ctx | null>(null)

function hasStoredSession() {
  try {
    if (IS_DEMO) return !!localStorage.getItem('gs-demo-session')
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

export function SessionProvider({ children, eager = false }: { children: React.ReactNode; eager?: boolean }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [demoPicker, setDemoPicker] = useState(false)
  const [pendingNext, setPendingNext] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    const b = await getBackend()
    try {
      setProfile(await b.rpc<Profile>('my_profile'))
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    // Only load the backend if someone may be signed in, or the page needs it (checkout, account, admin).
    if (!eager && !hasStoredSession()) {
      setChecked(true)
      return
    }
    let off = () => {}
    let alive = true
    setLoading(true)
    getBackend().then(async (b) => {
      const u = await b.getUser()
      if (!alive) return
      setUser(u)
      if (u) await loadProfile()
      setLoading(false)
      setChecked(true)
      off = b.onAuthChange(async (nu) => {
        setUser(nu)
        if (nu) await loadProfile()
        else setProfile(null)
      })
    })
    return () => {
      alive = false
      off()
    }
  }, [eager, loadProfile])

  const signIn = useCallback(async (next?: string) => {
    const b = await getBackend()
    const target = next ?? location.pathname + location.search
    if (b.mode === 'demo') {
      setPendingNext(target)
      setDemoPicker(true)
      return
    }
    await b.signInWithGoogle(target)
  }, [])

  const demoSignIn = useCallback(
    async (who: 'customer' | 'admin') => {
      const b = await getBackend()
      await b.demoSignIn?.(who)
      setUser(await b.getUser())
      await loadProfile()
      setDemoPicker(false)
      setChecked(true)
      if (pendingNext && pendingNext !== location.pathname + location.search) location.href = pendingNext
    },
    [loadProfile, pendingNext],
  )

  const signOut = useCallback(async () => {
    const b = await getBackend()
    await b.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  return (
    <SessionCtx.Provider
      value={{
        user,
        profile,
        loading,
        checked,
        signIn,
        signOut,
        refreshProfile: loadProfile,
        demoPicker,
        closeDemoPicker: () => setDemoPicker(false),
        demoSignIn,
      }}
    >
      {children}
    </SessionCtx.Provider>
  )
}

export function useSession() {
  const c = useContext(SessionCtx)
  if (!c) throw new Error('useSession outside provider')
  return c
}
