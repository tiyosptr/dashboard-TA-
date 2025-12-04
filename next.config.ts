/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

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
