import type { NextConfig } from "next";

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'localhost:3001';

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
};

export default nextConfig;
