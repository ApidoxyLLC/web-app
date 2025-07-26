import { NextResponse } from 'next/server';
import { addCustomDomainToNetlify } from '@/services/netlify/addNetlifyCustomDomain';
import { addDNSRecord } from '@/services/cloudflare/addDNSRecord'; 
import { addDomainDTOSchema } from './addDomainDTOSchema';

export async function POST(request) {
    try {
        const body = await request.json();

        const parsed = addDomainDTOSchema.parse(body);
        const { domain } = parsed;

        const netlifyResult = await addCustomDomainToNetlify({ domain });

        if (netlifyResult.pending_domain?.verification_dns) {
            const v = netlifyResult.pending_domain.verification_dns;
            await addDNSRecord({
                domain: v.name,
                type: 'TXT',
                content: v.value,
                proxied: false,
            });
        }


        const targetDomain = netlifyResult.custom_domain || netlifyResult.domain_alias || domain;

        await addDNSRecord({
            domain,
            type: 'CNAME',
            content: targetDomain,
            proxied: true,
        });

        return NextResponse.json({ success: true, netlifyResult }, { status: 200 });
    } catch (err) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ error: err.errors }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
