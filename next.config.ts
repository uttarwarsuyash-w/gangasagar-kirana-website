import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { viewTransition: true },
}

export default config
