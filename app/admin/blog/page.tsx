import { ContentCrud } from '@/components/admin/pages/ContentCrud'

export const metadata = { title: 'Blog' }

export default function Page() {
  return <ContentCrud kind="blog" />
}
