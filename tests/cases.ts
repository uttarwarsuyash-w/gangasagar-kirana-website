// Shared rule cases: checked against the TypeScript mirror and the real database.
// [description, subtotal ₹, weight g, zone, expected fees by method, needs quotation]
export const DELIVERY_CASES: [string, number, number, 'nanded' | 'outside', Record<string, number | 'quote'>][] = [
  ['Nanded: ₹499 exactly, light -> free', 499, 600, 'nanded', { delivery: 0, pickup: 0 }],
  ['Nanded: ₹520, 25 kg -> free (any weight)', 520, 25000, 'nanded', { delivery: 0, pickup: 0 }],
  ['Nanded: ₹498.99, 2 kg exactly -> ₹49', 498.99, 2000, 'nanded', { delivery: 49, pickup: 0 }],
  ['Nanded: ₹300, 3.5 kg -> ₹49', 300, 3500, 'nanded', { delivery: 49, pickup: 0 }],
  ['Nanded: ₹300, 1.999 kg -> ₹89', 300, 1999, 'nanded', { delivery: 89, pickup: 0 }],
  ['Nanded: ₹100, 250 g -> ₹89, pickup free', 100, 250, 'nanded', { delivery: 89, pickup: 0 }],
  ['Outside: 1 kg -> ₹179 courier/transport', 150, 1000, 'outside', { courier: 179, transport: 179 }],
  ['Outside: ₹2000, 19.999 kg -> ₹179', 2000, 19999, 'outside', { courier: 179, transport: 179 }],
  ['Outside: 20 kg exactly -> quotation', 2500, 20000, 'outside', { courier: 'quote', transport: 'quote' }],
  ['Outside: 40 kg -> quotation', 5000, 40000, 'outside', { courier: 'quote', transport: 'quote' }],
]

// [description, quantity, rule, expected error]
export const QTY_CASES: [string, number, { is_loose: boolean; min_qty_g?: number | null; step_g?: number | null; max_qty_g?: number | null }, string | null][] = [
  ['loose 250 g ok', 250, { is_loose: true }, null],
  ['loose 1000 g ok', 1000, { is_loose: true }, null],
  ['loose 200 g below minimum', 200, { is_loose: true }, 'below_minimum'],
  ['loose 300 g not a 250 g step', 300, { is_loose: true }, 'bad_step'],
  ['loose custom min 1 kg, step 500: 1500 ok', 1500, { is_loose: true, min_qty_g: 1000, step_g: 500 }, null],
  ['loose custom min 1 kg, step 500: 1250 bad step', 1250, { is_loose: true, min_qty_g: 1000, step_g: 500 }, 'bad_step'],
  ['loose above max', 100250, { is_loose: true }, 'above_maximum'],
  ['pack 3 ok', 3, { is_loose: false }, null],
  ['pack 0 bad', 0, { is_loose: false }, 'bad_quantity'],
  ['pack 1.5 bad', 1.5, { is_loose: false }, 'bad_quantity'],
  ['pack 1000 too many', 1000, { is_loose: false }, 'above_maximum'],
]
