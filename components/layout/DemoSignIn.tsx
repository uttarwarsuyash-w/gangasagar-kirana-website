'use client'
import { Dialog } from '@/components/ui/Dialog'
import { useSession } from '@/components/providers/Session'
import { useI18n } from '@/components/providers/I18n'
import { useState } from 'react'

export function DemoSignIn() {
  const { demoPicker, closeDemoPicker, demoSignIn } = useSession()
  const { t } = useI18n()
  const [busy, setBusy] = useState<string | null>(null)
  const go = async (who: 'customer' | 'admin') => {
    setBusy(who)
    try {
      await demoSignIn(who)
    } finally {
      setBusy(null)
    }
  }
  return (
    <Dialog open={demoPicker} onClose={closeDemoPicker} title={t.auth.demoTitle} closeLabel={t.nav.close}>
      <div className="px-5 pb-6 pt-2 sm:px-6">
        <p className="text-muted">{t.auth.demoBody}</p>
        <div className="mt-5 grid gap-2">
          <button className="btn btn-ink" onClick={() => go('customer')} disabled={!!busy}>
            {busy === 'customer' ? t.auth.signingIn : t.auth.demoCustomer}
          </button>
          <button className="btn btn-ghost" onClick={() => go('admin')} disabled={!!busy}>
            {busy === 'admin' ? t.auth.signingIn : t.auth.demoAdmin}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
