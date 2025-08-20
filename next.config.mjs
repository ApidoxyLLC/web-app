/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    async rewrites() {
        return [
            {
                source: '/api/auth/callback/:path*',
                destination: '/api/v1/auth/callback/:path*',
            }
        ];
    },
    images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/v1/image/**',
      },
    ],
  },
};

export default nextConfig;
