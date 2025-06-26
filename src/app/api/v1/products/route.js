import mongoose from "mongoose";
import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { productModel } from "@/models/shop/product/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import rateLimit from "@/app/utils/rateLimit";
import { headers } from "next/headers";
import { authOptions } from "../auth/[...nextauth]/option";
import { productDTOSchema } from './productDTOSchema';
import { getToken } from 'next-auth/jwt';
import { userModel } from '@/models/auth/User';
import slugify from 'slugify';
import securityHeaders from "../utils/securityHeaders";

export const dynamic = 'force-dynamic'; // Ensure dynamic fetching

// Helper for API responses
const apiResponse = (data, status = 200, headers = {}) => {
  const response = NextResponse.json(data, { status });
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

// Rate limiter configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max users per minute
});

export async function GET(request) {
  // Get client IP for rate limiting
  const headerList = headers();
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             headerList.get('x-real-ip') || 'unknown_ip';

  // Rate limiting
  try { await limiter.check(ip, 30); }
  catch { return apiResponse( { error: "Too many requests" }, 429, { 'Retry-After': '60' } ) }

  // Get vendor identification
  const vendorId = headerList.get('x-vendor-identifier');
  const host = headerList.get('host');
  
  if (!vendorId && !host) 
    return apiResponse( { error: "Missing vendor identifier or host" }, 400 );

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const           page = parseInt(searchParams.get('page') || '1', 10);
  const          limit = parseInt(searchParams.get('limit') || '20', 10);
  const         sortBy = searchParams.get('sortBy') || 'createdAt';
  const      sortOrder = searchParams.get('sortOrder') || 'desc';
  const       category = searchParams.get('category');
  const       minPrice = parseFloat(searchParams.get('minPrice'));
  const       maxPrice = parseFloat(searchParams.get('maxPrice'));
  const    searchQuery = searchParams.get('q') || '';
  const         status = searchParams.get('status') || 'active';
  const           type = searchParams.get('type');
  const    hasVariants = searchParams.get('hasVariants');
  const     isFeatured = searchParams.get('isFeatured');
  const approvalStatus = searchParams.get('approvalStatus');

  // Validate parameters
  if (isNaN(page) || page < 1) 
    return apiResponse({ error: "Invalid page number" }, 400);
  
  if (isNaN(limit) || limit < 1 || limit > 100) 
    return apiResponse({ error: "Limit must be between 1 and 100" }, 400);

  try {
    // Connect to auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Get shop configuration
    const shop = await ShopModel.findOne({ 
      $or: [ 
        { vendorId }, 
        { domains: { $elemMatch: { domain: host } } } 
      ]
    }).select('+dbInfo.uri +dbInfo.prefix').lean();
    
    if (!shop) return apiResponse({ error: "Shop not found" }, 404);    

    // Decrypt DB URI
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) 
      return apiResponse({ error: "Server configuration error" }, 500);
    
    const dbUri = await decrypt({ 
      cipherText: shop.dbInfo.uri,
      options: { secret: DB_URI_ENCRYPTION_KEY } 
    });

    // Connect to vendor DB
    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const ProductModel = productModel(vendor_db);

    // Build query
    const query = {};
    
    // Status filter
    if (status) query.status = status;
    
    // Type filter
    if (type) query.type = type;
    
    // Approval status filter
    if (approvalStatus) query.approvalStatus = approvalStatus;
    
    // Variants filter
    if (hasVariants) query.hasVariants = hasVariants === 'true';
    
    // Featured filter
    if (isFeatured) query.isFeatured = isFeatured === 'true';

    // Category filter
    if (category) {
      query.categories = { $in: [new mongoose.Types.ObjectId(category)] };
    }

    // Price range filter
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      query['price.base'] = {};
      if (!isNaN(minPrice)) query['price.base'].$gte = minPrice;
      if (!isNaN(maxPrice)) query['price.base'].$lte = maxPrice;
    }

    // Search query
    if (searchQuery) { 
      query.$or = [ { title: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } },
                    { tags: { $in: [new RegExp(searchQuery, 'i')] } },
                    { 'variants.sku': { $regex: searchQuery, $options: 'i' } }  ];
    }

    // Sorting
    const sortOptions = {};
    if (sortBy === 'price') {
      sortOptions['price.base'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'rating') {
      sortOptions['ratings.average'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query with pagination
    const [products, total] = await Promise.all([
      ProductModel.find(query)
        .populate('categories', 'name slug')
        .populate('brand', 'name logo')
        .populate('vendor', 'name')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      
      ProductModel.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Transform products for response
    const transformedProducts = products.map(product => ({
      id: product._id,
      productId: product.productId,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: {
        base: product.price.base,
        currency: product.price.currency,
        discount: product.price.discount,
        compareAt: product.price.compareAt
      },
      thumbnail: product.thumbnail,
      gallery: product.gallery,
      status: product.status,
      type: product.type,
      approvalStatus: product.approvalStatus,
      isFeatured: product.isFeatured,
      hasVariants: product.hasVariants,
      categories: product.categories,
      brand: product.brand,
      tags: product.tags,
      variants: product.variants?.map(variant => ({
        id: variant._id,
        title: variant.title,
        price: variant.price || product.price,
        sku: variant.sku,
        inventory: variant.inventory,
        options: variant.options
      })),
      ratings: product.ratings,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    return apiResponse({
      success: true,
      data: transformedProducts,
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

  } catch (error) {
    console.error(`Products API Error: ${error.message}`);
    return apiResponse(
      { error: "Failed to fetch products", details: error.message },
      500
    );
  }
}


export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 'unknown_ip';
  const fingerprint = request.headers.get('x-fingerprint') || null;

  let body;
  try { body = await request.json() } 
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders });}

  // Validate input with Zod
  const parsed = productDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({  success: false, error: "Validation failed", details: parsed.error.flatten()}, { status: 422, headers: securityHeaders });
  
  const { vendorId } = parsed.data;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.session || !mongoose.Types.ObjectId.isValid(token.session) || !token.fingerprint || token.fingerprint != fingerprint) 
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 401, headers: securityHeaders });
  

  const auth_db = await authDbConnect();
  const User = userModel(auth_db);
  const ShopModel = shopModel(auth_db);

  const user = await User.findOne({ activeSessions: new mongoose.Types.ObjectId(token?.session), isDeleted: false })
                         .select('+_id +activeSessions +shops').lean();
  if (!user) 
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 400, headers: securityHeaders })

  const shop = await ShopModel.findOne({ vendorId })
                              .select("+_id "+
                                      "+dbInfo +dbInfo.uri +dbInfo.prefix " +
                                      "+keys.ACCESS_TOKEN_SECRET "+
                                      "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES")
                              .lean();

  if (!shop) 
    return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404, headers: securityHeaders });

  if (!user?.shops.some(id => id.equals(shop._id))) 
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403, headers: securityHeaders });

  const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
  if (!DB_URI_ENCRYPTION_KEY) {
    console.log(" missing DB_URI_ENCRYPTION_KEY")
    return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500, headers: securityHeaders });
  }

  const dbUri = await decrypt({   cipherText: shop.dbInfo.uri, 
                                     options: { secret: DB_URI_ENCRYPTION_KEY } });

  const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
  const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
  const ProductModel = productModel(vendor_db);

  const session = await vendor_db.startSession();
  session.startTransaction();

  try {
    const { 
      title, description, tags, gallery, otherMediaContents,
      price, thumbnail, options, details,  categories,
      hasVariants, isAvailable, warranty, status, approvalStatus, 
      productFormat, digitalAssets, brand, shipping, variants, slug } = parsed.data;


      const     slugExist = await ProductModel.exists({ slug });
      if (slugExist)
        return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

    // Validate categories exist
    if (categories && categories.length > 0) {
      const categoryCount = await vendor_db.model('Category').countDocuments({ 
        _id: { $in: categories } 
      });
      if (categoryCount !== categories.length) {
        throw new Error("One or more categories not found");
      }
    }

    const newProduct = new ProductModel({ title, slug, description, tags, gallery,
                                          otherMediaContents, price, thumbnail, options,
                                          details, categories, hasVariants, isAvailable,
                                          warranty, status, approvalStatus, productFormat,
                                          digitalAssets, brand, shipping, variants });

    const savedProduct = await newProduct.save({ session });

    // Update shop's products reference
    await ShopModel.updateOne(
      { _id: shop._id },
      { $addToSet: { products: savedProduct._id } }
    );

    await session.commitTransaction();
    session.endSession();

    const response = NextResponse.json(
      { 
        success: true, 
        data: savedProduct.toObject(), 
        message: "Product created successfully" 
      },
      { status: 201 }
    );

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    const errorMsg = err.code === 11000
      ? "A product with similar attributes already exists"
      : err.message || "Something went wrong";

    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400, headers: securityHeaders }
    );
  } finally {
    session.endSession();
  }
}

// export async function POST(request) {
//   let body;
//   try { body = await request.json(); } 
//   catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
//   // Rate limiting
//   const headerList = headers();
//   const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
//              headerList.get('x-real-ip') || 'unknown_ip';

//   const limiter = rateLimit({
//     interval: 60 * 1000, // 1 minute
//     uniqueTokenPerInterval: 100 // Max 100 requests per minute
//   });

//   try { await limiter.check(ip, 10); } 
//   catch { return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { 'Retry-After': '60' } }) }

//   const vendorId = headerList.get('x-vendor-identifier');
//   const host = headerList.get('host');
  
//   if (!vendorId && !host) 
//     return apiResponse( { error: "Missing vendor identifier or host" }, 400 );


//   try {
//     const parsed = registerDTOSchema.safeParse(body);

//     if (!parsed.success) 
//       return NextResponse.json({ error: "Invalid data", details: parsed.error.errors}, { status: 422 });
    

//     // Connect to auth database to get shop info
//     const auth_db = await authDbConnect();
//     const ShopModel = shopModel(auth_db);

//     // Get shop configuration
//     const shop = await ShopModel.findOne({ $or: [ { vendorId }, { "domains": { $elemMatch: { domain: host } } }]})
//                                 .select("+_id "+
//                                         "+dbInfo +dbInfo.uri +dbInfo.prefix "+
//                                         "+maxSessionAllowed "+
//                                         "+keys +keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET " +
//                                         "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES +timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES" 
//                                       ).lean();
//     if (!shop) {
//       return NextResponse.json({ error: "Shop not found" }, { status: 404 });
//     }

//     // Decrypt DB URI
//     const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
//     if (!DB_URI_ENCRYPTION_KEY) 
//       return NextResponse.json({ error: "Server configuration error" }, { status: 500 });    
    
//     const dbUri = await decrypt({cipherText: shop.dbInfo.uri,
//                                     options: { secret: DB_URI_ENCRYPTION_KEY }  });

//     // Connect to vendor DB
//     const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
//     const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
//     const ProductModel = productModel(vendor_db);

//     // Generate slug if not provided
//     const validatedData = parsed.data;
//     if (!validatedData.slug) {
//       validatedData.slug = validatedData.title.toLowerCase()
//                                               .replace(/[^\w\s-]/g, '')
//                                               .replace(/\s+/g, '-')
//                                               .replace(/--+/g, '-')
//                                               .trim();
//     }

//     // Process variants if provided
//     if (validatedData.variants && validatedData.variants.length > 0) {
//       validatedData.hasVariants = true;
//       validatedData.variants = validatedData.variants.map(variant => ({
//         ...variant,
//         inventory: {
//           stock: variant.inventory?.stock || 0,
//           status: variant.inventory?.stock > 0 ? 'in-stock' : 'out-of-stock'
//         },
//         isAvailable: variant.inventory?.stock > 0 || false,
//         taxable: variant.taxable !== false
//       }));
//     } else {
//       // Set default inventory for simple product
//       validatedData.isAvailable = validatedData.price.base > 0;
//     }

//     // Set default values
//     validatedData.productId = cuid();
//     validatedData.vendor = new mongoose.Types.ObjectId(shop.vendorId);
//     validatedData.status = validatedData.status || 'draft';
//     validatedData.type = validatedData.type || 'physical';
//     validatedData.approvalStatus = 'pending';
    
//     if (validatedData.status === 'active' && !validatedData.publishedAt) 
//       validatedData.publishedAt = new Date();
    

//     // Create product
//     const newProduct = new ProductModel(validatedData);
//     const savedProduct = await newProduct.save();

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Product created successfully",
//         product: {
//           id: savedProduct._id,
//           productId: savedProduct.productId,
//           title: savedProduct.title,
//           slug: savedProduct.slug,
//           status: savedProduct.status,
//           thumbnail: savedProduct.thumbnail,
//           price: savedProduct.price,
//           type: savedProduct.type,
//           createdAt: savedProduct.createdAt,
//         }
//       },
//       { status: 201 }
//     );

//   } catch (error) {
//     console.error("Product creation error:", error);
    
//     let errorMessage = "Failed to create product";
//     let statusCode = 500;

//     if (error instanceof mongoose.Error.ValidationError) {
//       errorMessage = "Validation error";
//       statusCode = 400;
//     } else if (error.code === 11000) {
//       errorMessage = "Product with this title or slug already exists";
//       statusCode = 409;
//     } else if (error instanceof z.ZodError) {
//       errorMessage = "Invalid data format";
//       statusCode = 422;
//     }

//     return NextResponse.json(
//       { error: errorMessage, details: error.message },
//       { status: statusCode }
//     );
//   }
// }
