import type { NextConfig } from "next";

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'localhost:3001';
const BACKEND_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: API_HOST.split(':')[0],
        port: API_HOST.split(':')[1] || undefined,
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    return [
      // Public read-only document links should go through the backend handler
      {
        source: '/documents/:shareToken/readonly',
        destination: `${BACKEND_URL}/documents/:shareToken/readonly`,
      },
      // Serve uploaded files through frontend, proxying to backend
      {
        source: '/api/uploads/:id',
        destination: `${BACKEND_URL}/api/uploads/:id`,
      },
    ];
  },
};

export default nextConfig;
