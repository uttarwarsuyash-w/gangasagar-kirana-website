'use client'
// Excel export/import of the whole catalogue in the same format as seed/catalogue.xlsx,
// so the owners can fix hundreds of prices in a spreadsheet and upload it back.
import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { getBackend } from '@/lib/backend'
import { Dialog } from '@/components/ui/Dialog'
import { useAction, download } from '../ui'
import { loadCatalogue } from './Products'

const COLUMNS = ['product_id', 'category_id', 'name_en', 'name_hi', 'variant_id', 'variant_en', 'variant_hi', 'sell_type', 'unit_weight_g', 'price', 'sale_price', 'price_is_sample', 'stock', 'stock_is_sample', 'hidden', 'synonyms', 'description_en', 'description_hi'] as const

interface Summary {
  rows?: number
  created_products: number
  updated_products: number
  created_variants: number
  updated_variants: number
  stock_changes: number
  errors: { row: number; variant_id: string; error: string }[]
}

export function ExcelTools({ onDone }: { onDone: () => void }) {
  const { busy, run } = useAction()
  const [preview, setPreview] = useState<{ rows: Record<string, unknown>[]; summary: Summary; name: string } | null>(null)

  async function exportXlsx() {
    await run(async () => {
      const ExcelJS = (await import('exceljs')).default
      const b = await getBackend()
      const [{ products, variants }, inv] = await Promise.all([loadCatalogue(), b.rpc<{ variant_id: string; stock: number; stock_is_sample: boolean }[]>('admin_inventory')])
      const stock = new Map(inv.map((i) => [i.variant_id, i]))
      const pmap = new Map(products.map((p) => [p.id, p]))
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Catalogue', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] })
      ws.addRow([...COLUMNS])
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3263A' } }
      for (const v of variants) {
        const p = pmap.get(v.product_id)
        if (!p) continue
        const s = stock.get(v.id)
        ws.addRow([p.id, p.category_id, p.name_en, p.name_hi, v.id, v.label_en, v.label_hi, p.sell_type, v.unit_weight_g, v.price, v.sale_price ?? '', v.price_is_sample ? 'yes' : 'no', s?.stock ?? '', s?.stock_is_sample ? 'yes' : 'no', v.is_hidden || p.is_hidden ? 'yes' : 'no', p.synonyms.join(' '), p.description_en ?? '', p.description_hi ?? ''])
      }
      ;[24, 16, 26, 24, 30, 18, 18, 10, 12, 10, 10, 14, 10, 14, 8, 40, 60, 60].forEach((w, i) => (ws.getColumn(i + 1).width = w))
      const help = wb.addWorksheet('How to use')
      ;[
        'Change prices, sale prices, stock, names and descriptions. Do not change product_id or variant_id.',
        'When a price is checked, set price_is_sample to no. When stock is counted, set stock_is_sample to no.',
        'hidden = yes hides an item without deleting it. Loose items (sell_type loose) are priced per kg and stock is in grams.',
        'Upload the file in Admin > Products > Import from Excel. You see a preview before anything changes.',
      ].forEach((l) => help.addRow([l]))
      help.getColumn(1).width = 120
      const buf = await wb.xlsx.writeBuffer()
      download(`gangasagar-catalogue-${new Date().toISOString().slice(0, 10)}.xlsx`, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    }, 'Excel file downloaded')
  }

  async function pick(file: File) {
    await run(async () => {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      if (file.name.endsWith('.csv')) throw new Error('Please upload the .xlsx file (Excel), not CSV')
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.getWorksheet('Catalogue') ?? wb.worksheets[0]
      const header = (ws.getRow(1).values as unknown[]).slice(1).map((h) => String(h ?? '').trim())
      if (!header.includes('product_id') || !header.includes('variant_id')) throw new Error('This is not the catalogue file (missing product_id / variant_id columns)')
      const rows: Record<string, unknown>[] = []
      ws.eachRow((row, n) => {
        if (n === 1) return
        const vals = (row.values as unknown[]).slice(1)
        const o: Record<string, unknown> = {}
        header.forEach((h, i) => {
          let v = vals[i]
          if (v && typeof v === 'object' && 'result' in (v as object)) v = (v as { result: unknown }).result
          if (v && typeof v === 'object' && 'text' in (v as object)) v = (v as { text: unknown }).text
          o[h] = v == null ? '' : typeof v === 'number' ? v : String(v).trim()
        })
        if (o.product_id && o.variant_id) rows.push(o)
      })
      const b = await getBackend()
      let summary: Summary | null = null
      try {
        await b.rpc('admin_import_catalogue', { rows, dry_run: true })
      } catch (e) {
        const err = e as { code?: string; detail?: string }
        if (err.code === 'dry_run' && err.detail) summary = JSON.parse(err.detail)
        else throw e
      }
      setPreview({ rows, summary: summary!, name: file.name })
    })
  }

  async function apply() {
    if (!preview) return
    await run(async () => {
      const b = await getBackend()
      await b.rpc('admin_import_catalogue', { rows: preview.rows })
      setPreview(null)
      onDone()
    }, 'Catalogue updated from Excel')
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={exportXlsx} disabled={busy}>
        <Download className="h-4 w-4" /> Export to Excel
      </button>
      <label className="btn btn-ghost btn-sm cursor-pointer">
        <Upload className="h-4 w-4" /> Import from Excel
        <input
          type="file"
          accept=".xlsx"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) pick(f)
          }}
        />
      </label>
      <Dialog open={!!preview} onClose={() => setPreview(null)} title="Check before importing">
        {preview && (
          <div className="px-6 pb-6">
            <p className="text-muted">{preview.name}: {preview.rows.length} rows</p>
            <ul className="mt-4 space-y-1.5">
              <li>New products: <strong>{preview.summary.created_products}</strong></li>
              <li>Products with changed names or text: <strong>{preview.summary.updated_products}</strong></li>
              <li>New prices / pack sizes: <strong>{preview.summary.created_variants}</strong></li>
              <li>Prices and labels updated: <strong>{preview.summary.updated_variants}</strong></li>
              <li>Stock changes (recorded in history): <strong>{preview.summary.stock_changes}</strong></li>
            </ul>
            {preview.summary.errors.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto rounded-xl bg-brand-light p-3 text-[0.9rem]">
                <p className="font-semibold text-brand-dark">{preview.summary.errors.length} row(s) will be skipped:</p>
                <ul className="mt-1 list-disc pl-5">
                  {preview.summary.errors.slice(0, 30).map((e, i) => (
                    <li key={i}>
                      Row {e.row} ({e.variant_id || 'no id'}): {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <button className="btn btn-brand" onClick={apply} disabled={busy}>
                Import now
              </button>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
