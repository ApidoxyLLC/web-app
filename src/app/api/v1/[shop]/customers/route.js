import { NextResponse } from 'next/server';
import securityHeaders from '../../utils/securityHeaders';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { dbConnect } from '@/lib/mongodb/db';
import { getVendor } from '@/services/vendor/getVendor';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser'; // if not already imported
import hasCustomerReadAccess from './hasCustomerReadAccess';

export async function GET(request, { params }) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' },{ status: 429, headers: { 'Retry-After': retryAfter.toString() } });


  // Authenticated access only
  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated) 
    return NextResponse.json({ error: error || 'Not authorized' }, { status: 401 });

  try {
    // Get shop reference from params
    const { shop: shopReferenceId } = await params;
    if (!shopReferenceId) return NextResponse.json({ success: false, error: 'Shop reference is required' }, { status: 400, headers: securityHeaders });
    
    // Get vendor by referenceId only (host is not passed)
    const { vendor, dbUri, dbName } = await getVendor({ id: shopReferenceId });

    if (!hasCustomerReadAccess(vendor, data.userId)) 
            return NextResponse.json( { success: false, error: 'Not authorized to read customer data' }, { status: 403, headers: securityHeaders });
            
    const shop_db = await dbConnect({ dbKey: dbName, dbUri });
    const User = userModel(shop_db);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') === 'asc' ? 1 : -1;
    const emailVerified = searchParams.get('emailVerified');
    const phoneVerified = searchParams.get('phoneVerified');

    // Validate pagination
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid page number' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Build query
    const query = { isDeleted: false };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    if (status) query['status.currentStatus'] = status;
    if (role) query.role = role;
    if (searchParams.has('emailVerified')) query.isEmailVerified = emailVerified === 'true';
    if (searchParams.has('phoneVerified')) query.isPhoneVerified = phoneVerified === 'true';

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const users = await User.find(query)
      .select('-verification -security -activeSessions -twoFactor -lock')
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const transformedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      gender: user.gender,
      dob: user.dob,
      bio: user.bio,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      role: user.role,
      status: user.status?.currentStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      theme: user.theme,
      language: user.language,
      timezone: user.timezone,
      currency: user.currency
    }));

    const response = NextResponse.json({
      success: true,
      data: transformedUsers,
      pagination: {
        total,
        totalPages,
        pageSize: limit,
        currentPage: page,
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
    console.error('Error fetching users:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      },
      { status: 500, headers: securityHeaders }
    );
  }
}