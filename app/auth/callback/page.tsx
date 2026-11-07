'use client'
import { useEffect, useState } from 'react'
import { getBackend } from '@/lib/backend'
import { Mark } from '@/components/brand/Mark'

/** Google sign-in returns here; supabase-js finishes the PKCE exchange, then we go back. */
export default function AuthCallback() {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const u = new URL(location.href)
    const next = u.searchParams.get('next') || '/en/account/'
    const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/en/account/'
    let tries = 0
    getBackend().then(async (b) => {
      const tick = async () => {
        const user = await b.getUser()
        if (user) return location.replace(safe)
        if (++tries > 30) return setFailed(true)
        setTimeout(tick, 200)
      }
      tick()
    })
  }, [])
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <Mark className="mx-auto h-16 w-16" />
        <p className="mt-6 font-display text-2xl font-[650]">{failed ? 'Sign-in did not finish. Try again.' : 'Signing you in…'}</p>
        <p className="mt-1 text-muted" lang="hi">
          {failed ? 'साइन-इन पूरा नहीं हुआ। फिर कोशिश करें।' : 'साइन इन हो रहा है…'}
        </p>
        {failed && (
          <a href="/en/account/" className="btn btn-ink mt-6">
            Back
          </a>
        )}
      </div>
    </main>
  )
}
