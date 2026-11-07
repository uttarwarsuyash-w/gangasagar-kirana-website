import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gangasagar Kirana Stores',
    short_name: 'Gangasagar',
    description: 'Kirana store and wholesale supplier in Gokul Nagar, Nanded.',
    start_url: '/en/',
    display: 'standalone',
    background_color: '#FFFDF9',
    theme_color: '#B3263A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
