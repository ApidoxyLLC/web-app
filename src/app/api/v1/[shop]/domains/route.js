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
            domains: vendor.domains || []
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


// export async function DELETE(req, { params }) {
//     const vendor_db = await vendorDbConnect();
//     const Vendor = vendorModel(vendor_db);

//     try {
//         const { shopId } = params;
//         const { domain } = await req.json(); 
//         if (!shopId || !domain) {
//             throw new Error('shopId (URL) and domain (body) are required');
//         }

//         if (!mongoose.Types.ObjectId.isValid(shopId)) {
//             throw new Error('Invalid shop ID format');
//         }

//         // Delete from Vercel/Cloudflare first (if needed)
//         // await domainService.deleteVercelDomain(domain);
//         // await domainService.deleteCloudflareRecord(domain);

//         // Update Vendor document
//         const vendor = await Vendor.findByIdAndUpdate(
//             shopId,
//             {
//                 $pull: { domains: domain }, // Remove domain from array
              
//             },
//             { new: true }
//         );

//         if (!vendor) {
//             throw new Error('Vendor not found');
//         }

//         return NextResponse.json({
//             success: true,
//             message: 'Domain deleted successfully',
//             updatedDomains: vendor.domains
//         });

//     } catch (error) {
//         console.error('Domain deletion error:', error);
//         return NextResponse.json(
//             { error: error.message },
//             { status: 500 }
//         );
//     }
// }