import { NextResponse } from 'next/server';
import { DomainService } from '@/services/vercel/domainService';
import { addDomainDTOSchema } from './addDomainDTOSchema';
import { domainModel } from "@/models/vendor/Domain";
import { vendorModel } from "@/models/vendor/Vendor";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";

const domainService = new DomainService();

export async function POST(req) {

    const vendor_db = await vendorDbConnect()
    const Domain = domainModel(vendor_db);
    const VendorModel = vendorModel(vendor_db)

    try {
        const requestBody = await req.json();
       
        const { subdomain, domain, shopId  } = addDomainDTOSchema.parse(requestBody);
        const fullDomain = `${subdomain}.${domain}`;

        if (!shopId) throw new Error('shopId is required');

        const vercelResponse = await domainService.addVercelSubdomain(fullDomain);
        
        if (!vercelResponse.verified && vercelResponse.verification) {
            const txtResult = await domainService.addTxtRecord(fullDomain, vercelResponse);
            console.log('TXT record status:', txtResult.exists ? 'exists' : 'created');
        }

        const cloudflareResponse = await domainService.addCloudflareRecord(fullDomain);

        const verification = await domainService.verifyDomain(fullDomain);

        await Domain.create({
            domain: fullDomain,
            shop: shopId,
            isActive: verification.verified,
        });

        await VendorModel.findOneAndUpdate(
            { referenceId: shopId },
            { $addToSet: { domains: fullDomain } },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            domain: fullDomain,
            vercel: {
                id: vercelResponse.id,
                name: vercelResponse.name
            },
            cloudflare: {
                id: cloudflareResponse.id,
                type: cloudflareResponse.type
            },
            verified: verification.verified,
            message: 'Domain successfully configured'
        });

    } catch (error) {
        console.log('Domain configuration error:', error);

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
                error: error.message.includes('Verification failed')
                    ? 'Domain verification failed. Please check your DNS settings.'
                    : error.message,
                type: error.type || 'domain_configuration_error'
            },
            { status: error.statusCode || 500 }
        );
    }
}



