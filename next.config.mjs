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
    domains: ["i.ibb.co",'i.pinimg.com'],
  },
};

export default nextConfig;
