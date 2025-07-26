import config from './config.js';

export async function addCustomDomainToNetlify({ domain, txtRecordValue = null }) {
    const controller = new AbortController();
    const timeout = 10000; // 10 seconds
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const url = `https://api.netlify.com/api/v1/sites/${config.siteId}`;

    const payload = {
        custom_domain: domain,
        // ...(txtRecordValue && { txt_record_value: txtRecordValue }),
    };

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP Error ${response.status}: ${text}`);
        }

        const data = await response.json();

        console.log(`Successfully set domain: ${domain}`);

        if (data.pending_domain?.verification_dns) {
            const v = data.pending_domain.verification_dns;
            console.log('DNS Verification needed:');
            console.log(`- Type: ${v.type}`);
            console.log(`- Name: ${v.name}`);
            console.log(`- Value: ${v.value}`);
        }

        return {
            success: true,
            result: data,
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        console.error(`Failed to set domain: ${domain}`, error.message);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
