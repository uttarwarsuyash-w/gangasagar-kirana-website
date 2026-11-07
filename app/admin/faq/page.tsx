import { ContentCrud } from '@/components/admin/pages/ContentCrud'

export const metadata = { title: 'FAQ' }

export default function Page() {
  return <ContentCrud kind="faq" />
}
