export default {
    vercel: {
        token: process.env.VERCEL_TOKEN,
        projectId: process.env.VERCEL_PROJECT_ID,
        // teamId: process.env.VERCEL_TEAM_ID, 
        cnameTarget: 'cname.vercel-dns.com' 
    },
    cloudflare: {
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        apiKey: process.env.CLOUDFLARE_API_KEY,
        email: process.env.CLOUDFLARE_EMAIL
    }
};