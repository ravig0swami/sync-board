/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode to avoid double-rendering issues with canvas
  reactStrictMode: false,

  // Output configuration for production deployment
  // When 'standalone', Next.js creates a self-contained build with copied node_modules
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  // Asset prefix - useful when serving behind a reverse proxy
  // assetPrefix: '',

  // Disable powered-by header for security
  poweredByHeader: false,

  // Configure headers for better security and CORS
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
