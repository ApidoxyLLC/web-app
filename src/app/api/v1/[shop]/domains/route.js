import { NextResponse } from 'next/server';
import { vendorModel } from "@/models/vendor/Vendor";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser';

export async function GET(request, { params }) {
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);

    try {

 const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') ||request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

  // Authenticate user
  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated)  return NextResponse.json({ error: error || 'Not authorized' }, { status: 401 });
        const { shop } = await params;

        if (!shop) {
            throw new Error('shop parameter is required in the URL path');
        }

        const vendor = await Vendor.findOne({ referenceId: shop }).select('domains -_id').lean();

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return NextResponse.json({
            success: true,
            data: {
                domains: vendor.domains || []
            }
        });

    } catch (error) {
        console.error('Error fetching domains:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message
            },
            { status: error.statusCode || 500 }
        );
    }
}


export async function DELETE(req) {
    const vendor_db = await vendorDbConnect();
    const Domain = domainModel(vendor_db);
    const VendorModel = vendorModel(vendor_db);

    try {
        const { searchParams } = new URL(req.url);
        const domainId = searchParams.get('domainId');
        const shopId = searchParams.get('shopId');

        if (!domainId || !shopId) {
            throw new Error('Both domainId and shopId query parameters are required');
        }

        if (!mongoose.Types.ObjectId.isValid(domainId) || !mongoose.Types.ObjectId.isValid(shopId)) {
            throw new Error('Invalid ID format');
        }

        const domain = await Domain.findOne({
            _id: new mongoose.Types.ObjectId(domainId),
            shop: new mongoose.Types.ObjectId(shopId)
        });

        if (!domain) {
            throw new Error('Domain not found or does not belong to this shop');
        }

        // Delete from Vercel
        const vercelResponse = await domainService.deleteVercelDomain(domain.domain);

        // Delete from Cloudflare (if applicable)
        const cloudflareResponse = await domainService.deleteCloudflareRecord(domain.domain);

        // Remove from MongoDB
        await Domain.deleteOne({ _id: domain._id });

        // Update vendor's domains array
        await VendorModel.findByIdAndUpdate(
            shopId,
            { $pull: { domains: domain.domain } },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            message: 'Domain successfully deleted',
            vercel: vercelResponse,
            cloudflare: cloudflareResponse
        });

    } catch (error) {
        console.error('Domain deletion error:', error);
        return NextResponse.json(
            {
                error: error.message,
                type: error.type || 'domain_deletion_error'
            },
            { status: error.statusCode || 500 }
        );
    }
}