import config from './config';

export class DomainService {
    // Add subdomain to Vercel
    async addVercelSubdomain(fullDomain) {
        const response = await fetch(
            `https://api.vercel.com/v10/projects/${config.vercel.projectId}/domains`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.vercel.token}`
                },
                body: JSON.stringify({
                    name: fullDomain,
                    redirect: null,
                    // ...(config.vercel.teamId && { teamId: config.vercel.teamId })
                })
            }
        );

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Vercel domain addition failed');
        }
        return data;
    }

    // Add CNAME record to Cloudflare
    async addCloudflareRecord(fullDomain) {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/dns_records`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Email': config.cloudflare.email,
                    'X-Auth-Key': config.cloudflare.apiKey
                },
                body: JSON.stringify({
                    type: 'CNAME',
                    name: fullDomain,
                    content: config.vercel.cnameTarget, // e.g., 'cname.vercel-dns.com'
                    ttl: 1, // Auto TTL
                    proxied: true
                })
            }
        );

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.errors.map(e => e.message).join(', '));
        }
        return data.result;
    }

    // Verify domain ownership
    async verifyDomain(fullDomain) {
        const response = await fetch(
            `https://api.vercel.com/v10/projects/${config.vercel.projectId}/domains/${fullDomain}/verify`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.vercel.token}`
                }
            }
        );
        return await response.json();
    }
}