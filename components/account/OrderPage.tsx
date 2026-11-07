'use client'
import { useEffect, useState } from 'react'
import { OrderView } from './OrderView'

/** /order/?id=...&new=1 (static export: the id comes from the query string). */
export function OrderPage() {
  const [q, setQ] = useState<{ id: string; isNew: boolean } | null>(null)
  useEffect(() => {
    const u = new URLSearchParams(location.search)
    setQ({ id: u.get('id') ?? '', isNew: u.get('new') === '1' })
  }, [])
  if (!q) return <div className="skeleton h-96 max-w-4xl" />
  return <OrderView id={q.id} isNew={q.isNew} />
}
