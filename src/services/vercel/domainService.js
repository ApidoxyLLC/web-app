import config from './config';

export class DomainService {
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
                    ...(config.vercel.teamId && { teamId: config.vercel.teamId })
                })
            }
        );

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Vercel domain addition failed');
        }
        return data;
    }

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
                    content: config.vercel.cnameTarget,
                    ttl: 1,
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

    async addTxtRecord(fullDomain, vercelResponse) {
        const verification = vercelResponse.verification?.find(v => v.type === 'TXT');

        if (!verification) {
            throw new Error('No TXT verification record required for this domain');
        }

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
                    type: 'TXT',
                    name: verification.domain.replace(`.${fullDomain}`, ''), 
                    content: verification.value,
                    ttl: 1,
                    proxied: false
                })
            }
        );

        const data = await response.json();

        if (!data.success) {
            if (data.errors.some(e => e.code === 81053)) {
                return { exists: true, record: data.result };
            }
            throw new Error(`Cloudflare TXT creation failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        return {
            success: true,
            record: data.result,
            verificationData: verification
        };
    }

    async verifyDomain(fullDomain, maxRetries = 3) {
        let retries = 0;
        let lastError;

        while (retries < maxRetries) {
            try {
                const response = await fetch(
                    `https://api.vercel.com/v10/projects/${config.vercel.projectId}/domains/${fullDomain}/verify`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${config.vercel.token}`
                        }
                    }
                );

                const data = await response.json();
                if (data.verified) {
                    return data;
                }
                lastError = data.verification?.reason || 'Unknown error';
            } catch (error) {
                lastError = error.message;
            }

            retries++;
            if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        throw new Error(`Verification failed after ${maxRetries} attempts: ${lastError}`);
    }
}