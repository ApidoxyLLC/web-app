import { NextResponse } from 'next/server';
import securityHeaders from '@/app/api/utils/securityHeaders';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { dbConnect } from '@/lib/mongodb/db';
import getAuthenticatedUser from '@/app/api/auth/utils/getAuthenticatedUser';
import { getVendor } from '@/services/vendor/getVendor';
import hasCustomerReadAccess from '../customers/hasCustomerReadAccess';
import { orderModel } from '@/models/shop/product/Order';

export async function GET(request, { params }) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') ||request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

  // Authenticate user
  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated)  return NextResponse.json({ error: error || 'Not authorized' }, { status: 401 });

  try {
    // Extract shop reference ID
    const { shop: shopReferenceId } = await params;
    if (!shopReferenceId) return NextResponse.json({ error: 'Shop reference is required' }, { status: 400, headers: securityHeaders });

    // Get vendor info
    const { vendor, dbUri, dbName } = await getVendor({ id: shopReferenceId });
    // if (!hasCustomerReadAccess(vendor, data.userId))
    //   return NextResponse.json({ error: 'Not authorized to access orders' }, { status: 403, headers: securityHeaders });

    // Connect to the vendor's DB
    const shop_db = await dbConnect({ dbKey: dbName, dbUri });
    const Order = orderModel(shop_db);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    // Validation
    if (isNaN(page) || page < 1)
      return NextResponse.json({ error: 'Invalid page number' }, { status: 400, headers: securityHeaders });

    if (isNaN(limit) || limit < 1 || limit > 100)
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400, headers: securityHeaders });

    // Build query
    const query = {};

    if (status) query.orderStatus = status;
    if (userId) query.userId = userId;

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const orders = await Order.find(query)
      .sort({ placedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const transformedOrders = orders.map(order => ({
      id: order._id,
      orderId: order.orderId,
      userId: order.userId,
      cartId: order.cartId,
      items: order.items,
      totals: order.totals,
      discounts: order.discounts,
      shipping: order.shipping,
      payment: order.payment,
      orderStatus: order.orderStatus,
      placedAt: order.placedAt,
      confirmedAt: order.confirmedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      refundedAt: order.refundedAt
    }));

    const response = NextResponse.json({
      success: true,
      data: transformedOrders,
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

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (err) {
    console.error('Error fetching orders:', err);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      },
      { status: 500, headers: securityHeaders }
    );
  }
}