/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled strict mode to prevent double-invoke of useEffect (which causes WebSocket errors in dev)
  reactStrictMode: false,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'chart.js',
      'react-chartjs-2',
      'lucide-react',
    ],
  },

  // Turbopack config (required for Next.js 16)
  turbopack: {
    // Empty config to silence the warning
    // Turbopack handles optimization automatically
  },
};

export default nextConfig;
