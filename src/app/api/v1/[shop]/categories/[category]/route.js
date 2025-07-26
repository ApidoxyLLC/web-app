import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import config from "../../../../../../config";
import securityHeaders from "../../utils/securityHeaders";
import { categoryModel } from '@/models/shop/product/Category';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { vendorModel } from '@/models/vendor/Vendor';
import { dbConnect } from '@/lib/mongodb/db';

export async function GET(request, { params }) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getCategory' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

  try {
    const { shop: shopReferenceId, category: categoryId } = await params;
    
    if (!shopReferenceId || !categoryId) {
      return NextResponse.json({ success: false, error: 'Shop reference and category ID are required' }, { status: 400, headers: securityHeaders });
    }

    // Validate categoryId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID format' }, { status: 400, headers: securityHeaders });
    }

    // Connect to vendor DB and get shop info
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: shopReferenceId })
                             .select("+_id +dbInfo +secrets +expirations")
                             .lean();

    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404, headers: securityHeaders });
    }

    // Connect to shop database
    const dbUri = await decrypt({ 
      cipherText: vendor.dbInfo.dbUri,
      options: { secret: config.vendorDbUriEncryptionKey }
    });
    
    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const Category = categoryModel(shop_db);

    // Parse query parameters for optional data inclusion
    const { searchParams } = new URL(request.url);
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const includeAncestors = searchParams.get('includeAncestors') === 'true';
    const includeParent = searchParams.get('includeParent') === 'true';
    const includeProductsCount = searchParams.get('includeProductsCount') === 'true';

    // Build aggregation pipeline
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(categoryId) } },
      { $limit: 1 },
      ...(includeParent ? [{
        $lookup: {
          from: 'categories',
          localField: 'parent',
          foreignField: '_id',
          as: 'parentData',
          pipeline: [
            { $project: { title: 1, slug: 1, isActive: 1, level: 1 } }
          ]
        }
      }] : []),
      ...(includeChildren ? [{
        $lookup: {
          from: 'categories',
          localField: 'children',
          foreignField: '_id',
          as: 'childrenData',
          pipeline: [
            { $sort: { title: 1 } },
            { $project: { title: 1, slug: 1, isActive: 1, level: 1 } }
          ]
        }
      }] : []),
      ...(includeAncestors ? [{
        $lookup: {
          from: 'categories',
          localField: 'ancestors',
          foreignField: '_id',
          as: 'ancestorsData',
          pipeline: [
            { $sort: { level: 1 } },
            { $project: { title: 1, slug: 1, level: 1 } }
          ]
        }
      }] : []),
      ...(includeProductsCount ? [{
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categories',
          as: 'productsCountData',
          pipeline: [
            { $match: { status: 'active' } },
            { $count: 'count' }
          ]
        }
      }] : []),
      { $project: {
        title: 1,
        slug: 1,
        description: 1,
        image: 1,
        isActive: 1,
        level: 1,
        parent: 1,
        ancestors: 1,
        children: 1,
        metaTitle: 1,
        metaDescription: 1,
        keywords: 1,
        createdAt: 1,
        updatedAt: 1,
        ...(includeParent && { parentData: { $arrayElemAt: ['$parentData', 0] } }),
        ...(includeChildren && { childrenData: 1 }),
        ...(includeAncestors && { ancestorsData: 1 }),
        ...(includeProductsCount && { productsCount: { $arrayElemAt: ['$productsCountData.count', 0] } })
      }}
    ];

    // Execute aggregation
    const [category] = await Category.aggregate(pipeline);

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404, headers: securityHeaders });
    }

    // Transform category for response
    const transformedCategory = {
      id: category._id,
      title: category.title,
      slug: category.slug,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
      level: category.level,
      parent: category.parent,
      ancestors: category.ancestors,
      children: category.children,
      metaTitle: category.metaTitle,
      metaDescription: category.metaDescription,
      keywords: category.keywords,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      ...(includeParent && { parent: category.parentData }),
      ...(includeChildren && { children: category.childrenData }),
      ...(includeAncestors && { ancestors: category.ancestorsData }),
      ...(includeProductsCount && { productsCount: category.productsCount || 0 })
    };

    // Return response
    const response = NextResponse.json({
      success: true,
      data: transformedCategory
    });

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      { status: 500, headers: securityHeaders }
    );
  }
}