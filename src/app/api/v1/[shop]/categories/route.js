import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import config from "../../../../../../config";
import { categoryModel } from '@/models/shop/product/Category';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { vendorModel } from '@/models/vendor/Vendor';
import { dbConnect } from '@/lib/mongodb/db';


const MAX_CATEGORY_DEPTH = 5; // Define your max depth

 


export async function GET(request, { params }) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getCategories' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

    /**
     * public data authentication is not required 
     */
    // Authentication
    //   const { authenticated, error, data } = await getAuthenticatedUser(request);
    //   if (!authenticated) 
    //     return NextResponse.json({ error: error || "Not authorized" }, { status: 401 });


  try {
    // Get shop reference from query params
    const { searchParams } = new URL(request.url);
    const { shop: shopReferenceId } = await params;
    console.log(shopReferenceId)
    // const shop = searchParams.get('shop');
    
    if (!shopReferenceId) 
      return NextResponse.json({ success: false, error: 'Shop reference is required' }, { status: 400  });

    // Connect to vendor DB and get shop info
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: shopReferenceId })
                               .select("+_id +dbInfo +secrets +expirations")
                               .lean();

    if (!vendor) 
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404  });

    // Connect to shop database
    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                     options: { secret: config.vendorDbUriEncryptionKey }       });
    
    const          shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const         Category = categoryModel(shop_db);
    
    const             page = parseInt(searchParams.get('page') || '1', 10);
    const            limit = parseInt(searchParams.get('limit') || '20', 10);
    const      searchQuery = searchParams.get('q') || '';
    const         isActive = searchParams.get('isActive');
    const         parentId = searchParams.get('parent');
    const            level = searchParams.get('level');
    const  includeChildren = searchParams.get('includeChildren') === 'true';
    const includeAncestors = searchParams.get('includeAncestors') === 'true';
    const           sortBy = searchParams.get('sortBy') || 'title';
    const        sortOrder = searchParams.get('sortOrder') || 'asc';

    // Validate pagination
    if (isNaN(page) || page < 1) 
      return NextResponse.json({ success: false, error: 'Invalid page number' }, { status: 400  } );
    

    if (isNaN(limit) || limit < 1 || limit > 100) 
      return NextResponse.json({ success: false, error: 'Limit must be between 1 and 100' }, { status: 400  });
    

    // Build match conditions
    const matchConditions = {   ...(searchQuery && {  $or: [ {       title: { $regex: searchQuery, $options: 'i' } },
                                                             { description: { $regex: searchQuery, $options: 'i' } },
                                                             {        slug: { $regex: searchQuery, $options: 'i' } }           ]
                                                }),
                                ...(isActive !== null && { isActive: isActive === 'true' }),
                                ...(parentId && mongoose.Types.ObjectId.isValid(parentId) 
                                        ? { parent: new mongoose.Types.ObjectId(parentId) }
                                        : parentId === 'null' || parentId === 'root' 
                                            ? { parent: null } 
                                            : {}),
                                ...(level && !isNaN(level) && { level: parseInt(level) })
                            };

    // Build aggregation pipeline
    const pipeline = [  { $match: matchConditions },
                        {
                            $facet: {
                            categories: [
                                            { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
                                            { $skip: (page - 1) * limit },
                                            { $limit: limit },
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
                                            ...(includeAncestors ? [{   $lookup: {
                                                                            from: 'categories',
                                                                            localField: 'ancestors',
                                                                            foreignField: '_id',
                                                                            as: 'ancestorsData',
                                                                            pipeline: [
                                                                                        { $sort: { level: 1 } },
                                                                                        { $project: { title: 1, slug: 1, level: 1 } }
                                                                                    ]
                                                                        }
                                                                }] : [])
                                        ],
                            total: [{ $count: 'count' }]
                            }
                        },
                        {
                            $project: {
                            categories: 1,
                            total: { $arrayElemAt: ['$total.count', 0] }
                            }
                        }
                    ];

    // Execute aggregation
    const [result] = await Category.aggregate(pipeline);
    const { categories = [], total = 0 } = result;

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Transform categories for response
    const transformedCategories = categories.map(category => ({
      id: category._id,
      title: category.title,
      slug: category.slug,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
      level: category.level,
      parent: category.parent,
      ...(includeChildren && { children: category.childrenData }),
      ...(includeAncestors && { ancestors: category.ancestorsData }),
      metaTitle: category.metaTitle,
      metaDescription: category.metaDescription,
      keywords: category.keywords,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));

    // Return standard response
    const response = NextResponse.json({
      success: true,
      data: transformedCategories,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null
      }
    });


    return response;

  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}