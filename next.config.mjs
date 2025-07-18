/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    async rewrites() {
        return [
            {
                source: '/api/auth/:path*',
                destination: '/api/v1/auth/:path*',
            },
        ];
    },
};

export default nextConfig;
