/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  async rewrites() {
    return [
      {
        source: "/villastangsel/:path*",
        destination: "http://localhost:3001/:path*"
      },
      {
        source: "/industristangsel/:path*",
        destination: "http://localhost:3002/:path*"
      }
    ];
  }
};
module.exports = nextConfig;
