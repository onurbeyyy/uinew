import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export', // Vercel kullanılacaksa bu satır kapalı kalmalı
  reactStrictMode: false, // Sürükle-bırak kütüphanesi için kapatıldı

  // API Proxy - Backend URL'ini gizler
  async rewrites() {
    const backendUrl = process.env.API_URL || 'https://apicanlimenu.online';
    return [
      {
        // /backend-api/api/Customer/... → backend/api/Customer/...
        source: '/backend-api/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  images: {
    unoptimized: true, // Vercel Image Optimization kapatıldı (ücretsiz limit aşımı önlendi)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'apicanlimenu.online',
        pathname: '/Uploads/**',
      },
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
  // Turbopack config (webpack used for Safari compatibility)
  turbopack: {},
  // Webpack config (production obfuscation için)
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
    }
    return config;
  },
};

export default nextConfig;
