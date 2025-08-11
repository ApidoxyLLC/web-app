import config from './config';
import axios from 'axios';

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


    async deleteVercelDomain(domain) {
        
        console.log(domain)
        try {
            const response = await axios.delete(
                `https://api.vercel.com/v9/projects/${config.vercel.projectId}/domains/${domain}?teamId=${config.vercel.teamId}`,
                {
                    headers: {
                        Authorization: `Bearer ${config.vercel.token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.log('Vercel domain deletion error:', error.response?.data || error.message,domain);
            throw new Error(
                error.response?.data?.error?.message || 'Failed to delete Vercel domain',
                { cause: error }
            );
        }
    }


    async deleteCloudflareRecord(domain) {
        try {
            const cfConfig = config.cloudflare;
            // Step 1: Get all DNS records for the domain
            const recordsResponse = await axios.get(
                `https://api.cloudflare.com/client/v4/zones/${cfConfig.zoneId}/dns_records?name=${domain}`,
                {
                    headers: {
                        'X-Auth-Email': cfConfig.email,
                        'X-Auth-Key': cfConfig.apiKey,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const records = recordsResponse.data.result;

            // Step 2: Delete all records
            const deletePromises = records.map(record =>
                axios.delete(
                    `https://api.cloudflare.com/client/v4/zones/${cfConfig.zoneId}/dns_records/${record.id}`,
                    {
                        headers: {
                            'X-Auth-Email': cfConfig.email,
                            'X-Auth-Key': cfConfig.apiKey,
                        },
                    }
                )
            );

            await Promise.all(deletePromises);

            return {
                success: true,
                deletedRecords: records.length,
            };
        } catch (error) {
            console.error('Cloudflare record deletion error:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.errors?.[0]?.message || 'Failed to delete Cloudflare records',
                { cause: error }
            );
        }
    }

    async deleteCloudflareTxtRecord(domain) {
        try {
            const cfConfig = config.cloudflare;
            // Get all TXT records for the domain
            const recordsResponse = await axios.get(
                `https://api.cloudflare.com/client/v4/zones/${cfConfig.zoneId}/dns_records?type=TXT&name=${domain}`,
                {
                    headers: {
                        'X-Auth-Email': cfConfig.email,
                        'X-Auth-Key': cfConfig.apiKey,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const txtRecords = recordsResponse.data.result;

            // Delete all TXT records
            const deletePromises = txtRecords.map(record =>
                axios.delete(
                    `https://api.cloudflare.com/client/v4/zones/${cfConfig.zoneId}/dns_records/${record.id}`,
                    {
                        headers: {
                            'X-Auth-Email': cfConfig.email,
                            'X-Auth-Key': cfConfig.apiKey,
                        },
                    }
                )
            );

            await Promise.all(deletePromises);

            return {
                success: true,
                deletedTxtRecords: txtRecords.length,
            };
        } catch (error) {
            console.error('Cloudflare TXT record deletion error:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.errors?.[0]?.message || 'Failed to delete Cloudflare TXT records',
                { cause: error }
            );
        }
    }

    
   
}
