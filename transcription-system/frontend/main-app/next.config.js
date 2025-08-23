/** @type {import('next').NextConfig} */
const nextConfig = {
  // Completely ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable image optimization (simpler for deployment)
  images: {
    unoptimized: true,
  },
  
  // Disable static exports and prerendering
  output: 'standalone',
  
  // Force dynamic rendering for all pages
  experimental: {
    // Disable static generation
    isrMemoryCacheSize: 0,
  },
  
  // Ensure port 3002 is used
  env: {
    PORT: '3002',
  },
}

module.exports = nextConfig