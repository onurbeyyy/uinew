import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export', // Vercel kullanılacaksa bu satır kapalı kalmalı
  reactStrictMode: false, // Sürükle-bırak kütüphanesi için kapatıldı
  images: {
    // unoptimized: true, // Vercel'de Image Optimization çalışır
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'canlimenu.online',
        pathname: '/Uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Turbopack config (Next.js 16 default)
  turbopack: {},
  // Webpack config (production obfuscation için)
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      console.log('🔒 Production build - obfuscation hazır');
    }
    return config;
  },
};

export default nextConfig;
