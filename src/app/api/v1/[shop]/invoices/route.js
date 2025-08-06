import { NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser';
import { InvoiceModel } from '@/models/subscription/Invoice';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';

export async function GET(request, { params }) {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

    // Authenticate user
    const { authenticated, error, data } = await getAuthenticatedUser(request);
    if (!authenticated) return NextResponse.json({ error: error || 'Not authorized' }, { status: 401 });

    try {
        const { shop: shopReferenceId } = await params;
        if (!shopReferenceId) return NextResponse.json({ error: 'Shop reference is required' }, { status: 400 });

        // Connect to the vendor's DB
        const vendor_db = await vendorDbConnect();
        const Invoice = InvoiceModel(vendor_db);
        const query = {
            shopReferenceId: shopReferenceId
        };


        // Parse query params
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const status = searchParams.get('status');
        const paymentMethod = searchParams.get('paymentMethod');
        // const userId = searchParams.get('userId');

        // Validation
        if (isNaN(page) || page < 1)
            return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });

        if (isNaN(limit) || limit < 1 || limit > 100)
            return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });


        if (status) query.status = status;
        if (paymentMethod) query.paymentMethod = paymentMethod;
        // if (userId) query.userId = userId;
        const invoices = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        console.log(invoices)

        const total = await Invoice.countDocuments(query);
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;



        const transformedInvoices = invoices.map(invoice => ({
            id: invoice._id,
            invoiceId: invoice._id,
            userId: invoice.userId,
            shopId: invoice.shopId,
            planId: invoice.planId,
            planSlug: invoice.planSlug,
            planDetails: invoice.planDetails,
            amount: invoice.amount,
            currency: invoice.currency,
            billingCycle: invoice.billingCycle,
            validity: invoice.validity,
            status: invoice.status,
            paymentMethod: invoice.paymentMethod,
            paymentGateway: invoice.paymentGateway,
            paymentId: invoice.paymentId,
            paidAt: invoice.paidAt,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt,
            receiptUrl: invoice.receiptUrl
        }));

        const response = NextResponse.json({
            success: true,
            data: transformedInvoices,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                pageSize: limit,
                hasNextPage,
                hasPreviousPage,
                nextPage: hasNextPage ? page + 1 : null,
                previousPage: hasPreviousPage ? page - 1 : null
            }
        });



        return response;
    } catch (err) {
        console.error('Error fetching invoices:', err);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
            },
            { status: 500 }
        );
    }
}