// PDF invoice for completed orders: verified business details and confirmed prices only. No GSTIN.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { SITE } from './site'
import type { Order } from '@/components/account/OrderView'

const BRAND = rgb(0.702, 0.149, 0.227)
const INK = rgb(0.122, 0.102, 0.09)
const MUTED = rgb(0.42, 0.37, 0.34)

// Standard PDF fonts cannot draw the rupee sign or Devanagari, so invoices use "Rs." and English names.
const rs = (n: number | string) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const g = (q: number) => (q >= 1000 ? `${q / 1000} kg` : `${q} g`)

export async function buildInvoice(order: Order, opts: { name?: string; fssai?: string | null } = {}) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Invoice ${order.number}`)
  pdf.setAuthor(SITE.name_en)
  const page = pdf.addPage([595.28, 841.89])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { width } = page.getSize()
  let y = 790
  const text = (s: string, x: number, yy: number, o: { size?: number; f?: typeof font; color?: typeof INK } = {}) =>
    page.drawText(s, { x, y: yy, size: o.size ?? 10, font: o.f ?? font, color: o.color ?? INK })
  const right = (s: string, x: number, yy: number, o: { size?: number; f?: typeof font } = {}) => {
    const w = (o.f ?? font).widthOfTextAtSize(s, o.size ?? 10)
    text(s, x - w, yy, o)
  }

  // Mark (one colour)
  page.drawSvgPath('M24 7.6 L7.6 25 M24 7.6 L40.4 25', { x: 48, y: y + 30, scale: 1, borderColor: BRAND, borderWidth: 1.8 })
  page.drawSvgPath('M4.4 25 H43.6 A19.6 12.5 0 0 1 4.4 25 Z', { x: 48, y: y + 30, scale: 1, color: BRAND })
  page.drawSvgPath('M10.2 25 C13.2 20.8 17 16.6 22.4 15.7 C27.8 14.8 32 17.6 33.4 21.8 C31.4 19.9 28.2 19.7 26.8 21.8 C26 23 26.3 24.3 27 25 Z', { x: 48, y: y + 30, scale: 1, color: BRAND })
  text(opts.name || SITE.name_en, 104, y + 10, { size: 18, f: bold })
  text(SITE.address_en, 104, y - 6, { size: 9, color: MUTED })
  text(`Phone ${SITE.phones.main} / ${SITE.phones.support}   ${SITE.emails[0]}`, 104, y - 18, { size: 9, color: MUTED })
  if (opts.fssai) text(`FSSAI ${opts.fssai}`, 104, y - 30, { size: 9, color: MUTED })
  right('INVOICE', width - 48, y + 10, { size: 18, f: bold })
  right(order.number, width - 48, y - 6, { size: 10 })
  right(new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }), width - 48, y - 18, { size: 9 })
  y -= 64
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 0.6, color: MUTED })
  y -= 22
  text('Billed to', 48, y, { size: 9, color: MUTED })
  text(order.customer_name, 48, y - 14, { f: bold })
  text(order.phone, 48, y - 27)
  if (order.address) {
    const a = order.address
    text([a.line1, a.line2].filter(Boolean).join(', ').slice(0, 70), 48, y - 40)
    text([a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ').slice(0, 70), 48, y - 53)
  }
  text('Delivery', 330, y, { size: 9, color: MUTED })
  text({ delivery: 'Home delivery (Nanded)', pickup: 'Store pickup', courier: 'Courier', transport: 'Transport service' }[order.method], 330, y - 14)
  text('Payment', 330, y - 33, { size: 9, color: MUTED })
  text(`${{ cash: 'Cash', upi_on_delivery: 'UPI at delivery', upi_prepaid: 'UPI (prepaid)' }[order.payment_method]}${order.payment_status === 'paid' ? ', paid' : ''}`, 330, y - 47)
  if (order.upi_ref) text(`UPI ref ${order.upi_ref}`, 330, y - 60, { size: 9, color: MUTED })
  y -= 90

  // table
  page.drawRectangle({ x: 48, y: y - 6, width: width - 96, height: 22, color: rgb(0.965, 0.945, 0.914) })
  text('Item', 56, y, { f: bold, size: 9 })
  right('Qty', 360, y, { f: bold, size: 9 })
  right('Rate', 450, y, { f: bold, size: 9 })
  right('Amount', width - 56, y, { f: bold, size: 9 })
  y -= 24
  for (const it of order.items) {
    if (y < 140) {
      // simple overflow guard: new page
      const np = pdf.addPage([595.28, 841.89])
      y = 790
      void np
    }
    text(`${it.name_en}${it.is_loose ? '' : ` (${it.variant_en})`}`.slice(0, 60), 56, y, { size: 10 })
    right(it.is_loose ? g(it.quantity) : String(it.quantity), 360, y)
    right(it.is_loose ? `${rs(it.unit_price)}/kg` : rs(it.unit_price), 450, y)
    right(rs(it.line_total), width - 56, y)
    y -= 18
  }
  page.drawLine({ start: { x: 300, y: y + 6 }, end: { x: width - 48, y: y + 6 }, thickness: 0.6, color: MUTED })
  y -= 10
  const tot = (k: string, v: string, b = false) => {
    text(k, 330, y, { f: b ? bold : font, size: b ? 12 : 10 })
    right(v, width - 56, y, { f: b ? bold : font, size: b ? 12 : 10 })
    y -= b ? 22 : 16
  }
  tot('Subtotal', rs(order.subtotal))
  tot('Delivery', Number(order.delivery_fee) === 0 ? 'Free' : rs(order.delivery_fee))
  tot('Total', rs(order.total), true)
  if (order.is_test) text('TEST ORDER (store preview mode). Not a valid invoice.', 48, y - 10, { f: bold, color: BRAND })

  text('Thank you for shopping with us. For any problem with your order, call or WhatsApp ' + SITE.phones.main + '.', 48, 70, { size: 9, color: MUTED })
  text(`${SITE.name_en}, ${SITE.address_en}`, 48, 56, { size: 8, color: MUTED })
  return pdf.save()
}

export async function downloadInvoice(order: Order) {
  let name: string | undefined
  let fssai: string | null = null
  try {
    const { getBackend } = await import('./backend')
    const b = await getBackend()
    const s = await b.rpc<Record<string, { name?: string; fssai?: string | null }>>('public_settings')
    name = s.invoice?.name
    fssai = s.invoice?.fssai ?? null
  } catch {}
  const bytes = await buildInvoice(order, { name, fssai })
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-${order.number}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
