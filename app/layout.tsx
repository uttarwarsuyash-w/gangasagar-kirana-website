import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Gangasagar Kirana Stores, Nanded', template: '%s | Gangasagar Kirana Stores' },
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32' }], apple: '/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#FFFDF9',
  width: 'device-width',
  initialScale: 1,
}

// Single root layout. Hindi pages get lang="hi" on <html> at build time (scripts/postbuild.mjs)
// and on client-side navigation (LangAttr).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/anek-latin-latin-wdth-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/mukta-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
