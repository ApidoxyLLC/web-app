import { NextResponse } from 'next/server';
import { DomainService } from '@/services/vercel/domainService';
import { addDomainDTOSchema } from './addDomainDTOSchema';

const domainService = new DomainService();

export async function POST(req) {
    try {
        const requestBody = await req.json();

        const { subdomain, domain } = addDomainDTOSchema.parse(requestBody);

        const fullDomain = `${subdomain}.${domain}`;

        const vercelResponse = await domainService.addVercelSubdomain(fullDomain);

        const cloudflareResponse = await domainService.addCloudflareRecord(fullDomain);

        const verification = await domainService.verifyDomain(fullDomain);

        return NextResponse.json({
            success: true,
            domain: fullDomain,
            vercel: vercelResponse,
            cloudflare: cloudflareResponse,
            verified: verification.verified
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: error.message,
                details: error.response?.data || null
            },
            { status: error.statusCode || 500 }
        );
    }
}