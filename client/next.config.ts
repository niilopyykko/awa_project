import type { NextConfig } from "next";

const FRONT_HOST =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

const url = new URL(FRONT_HOST);

const protocol = (url.protocol.replace(":", "") || "http") as "http" | "https";

const hostname = url.hostname;

const port = url.port === "" ? undefined : url.port;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol,
        hostname,
        port,
        pathname: "/api/share/**",
      },
    ],
    localPatterns: [
      {
        pathname: '/share/*/file',
      },
    ],
  },
}

export default nextConfig;
