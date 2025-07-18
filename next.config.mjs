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
};

export default nextConfig;
