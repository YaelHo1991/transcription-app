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
  
  // Production optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Optimize bundle size
  productionBrowserSourceMaps: false, // Disable source maps in production
  
  // Force dynamic rendering for all pages
  experimental: {
    // Optimize for production
    optimizeCss: true,
  },
  
  // Ensure port 3002 is used
  env: {
    PORT: '3002',
  },
  
  // Webpack optimization for production
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig