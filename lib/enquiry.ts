import { getBackend } from './backend'
import { TURNSTILE_SITE_KEY } from './backend/config'

export interface EnquiryInput {
  kind: 'contact' | 'product' | 'custom_quantity' | 'wholesale'
  name: string
  phone?: string
  email?: string
  message?: string
  product_id?: string
  quantity_g?: number
}

/** Sends a public form. With Turnstile configured it goes through the verifying Edge Function. */
export async function submitEnquiry(input: EnquiryInput, turnstileToken?: string) {
  const b = await getBackend()
  if (TURNSTILE_SITE_KEY && b.mode === 'supabase') return b.invoke('submit-enquiry', { ...input, token: turnstileToken })
  return b.rpc('submit_enquiry', input)
}
