import mongoose from "mongoose";
import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { productModel } from "@/models/shop/product/Product";
import { categoryModel } from "@/models/shop/product/Category";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { headers } from "next/headers";
import productDTOSchema from "./productDTOSchema";
import { getToken } from 'next-auth/jwt';
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import securityHeaders from "../utils/securityHeaders";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import config from "../../../../../config";

export const dynamic = 'force-dynamic'; // Ensure dynamic fetching

// Helper for API responses
const apiResponse = (data, status = 200, headers = {}) => {
  const response = NextResponse.json(data, { status });
  Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

export async function GET(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});
  
  // Get client IP for rate limiting
  const headerList = headers();

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

    const vendor_db = await vendorDbConnect()
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: vendorId })
                                .select("dbInfo bucketInfo secrets expirations primaryDomain domains")
                                .lean()


    const dbUri = await decrypt({  cipherText: vendor.dbInfo.dbUri,
                                        options: { secret: config.vendorDbUriEncryptionKey } 
                                      });

    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });

    const ProductModel = productModel(shop_db);

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
      // productId: product.productId,
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
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});

  // const fingerprint = request.headers.get('x-fingerprint') || null;

  let body;
  console.log(body)
  try { body = await request.json() } 
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders });}
  console.log(body)
  // Validate input with Zod
  const parsed = productDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({  success: false, error: "Data validation failed", details: parsed.error.flatten()}, { status: 422, headers: securityHeaders });
  
  const { authenticated, error, data } = await getAuthenticatedUser(request);
    if(!authenticated) 
        return NextResponse.json({ error: "...not authorized" }, { status: 401 });

  const { shop: shopId } = parsed.data;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // const   auth_db = await authDbConnect();
  const vendor_db = await vendorDbConnect();
  const    Vendor = vendorModel(vendor_db)
  // const      Shop = shopModel(auth_db);

  const vendor = await Vendor.findOne({ referenceId: shopId })
                             .select( "+_id +ownerId +dbInfo +secrets +expirations")
                             .lean();

  if (!vendor) 
    return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404, headers: securityHeaders });

  console.log(data)
  console.log(vendor)
  if (vendor.ownerId.toString() != data.userId.toString()) 
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403, headers: securityHeaders });

  const dbUri = await decrypt({   cipherText: vendor.dbInfo.dbUri, 
                                     options: { secret: config.vendorDbUriEncryptionKey } });

  const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
  const Product = productModel(shop_db);


  try {
    const { 
      title, description, tags, images, isPhysical, weight, weightUnit, 
      category,
      price, compareAtPrice, costPerItem, profit,  margin, 
      sellWithOutStock, sku, barcode, 
      isFreeShiping, variants

    } = parsed.data;


      // const slugExist = await Product.exists({ slug: title.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-')  });
      // if (slugExist)
      //   return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422, headers: securityHeaders } );

    // Validate categories exist
    
    if (category && category !== 'all') {
  const Category = categoryModel(shop_db);
  const categoryExists = await Category.exists({ _id: category });
  if (!categoryExists)
    return NextResponse.json({ success: false, error: "Category not found" }, { status: 404, headers: securityHeaders });
}

    const newProduct = new Product({  title, 
                                      //  slug: title.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-')  , 
                                description, tags, 
                                    gallery: images,
                              productFormat: isPhysical ? 'physical' : 'digital',
                                     weight,
                                 weightUnit,
                                   category,
                                      price: {
                                                base: price,
                                                compareAt: compareAtPrice,
                                                cost: costPerItem,
                                                 profit: profit,
                                                 margin: margin, 
                                              },
                           sellWithOutStock,
                                  inventory: { sku, barcode },
                            hasFreeShipment: isFreeShiping, 
                                   variants,
                                    });

    const savedProduct = await newProduct.save();



    const response = NextResponse.json(
      { success: true, data: savedProduct, message: "Product created successfully" }, { status: 201 });

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (err) {


    const errorMsg = err.code === 11000
      ? "A product with similar attributes already exists"
      : err.message || "Something went wrong";

    return NextResponse.json( { success: false, error: errorMsg }, { status: 400, headers: securityHeaders }); } 
  // finally {
  //   session.endSession();
  // }
}

export async function PATCH(request) {
  const ip =
    request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request.headers["x-real-ip"] ||
    request.socket?.remoteAddress ||
    "";
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed)
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": retryAfter.toString() },
      }
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400, headers: securityHeaders }
    );
  }

  const parsed = productUpdateDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        success: false,
        error: "Data validation failed",
        details: parsed.error.flatten(),
      },
      { status: 422, headers: securityHeaders }
    );

  const { productId, shop: shopId, ...updateData } = parsed.data;

  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated)
    return NextResponse.json({ error: "...not authorized" }, { status: 401 });

  const auth_db = await authDbConnect();
  const vendor_db = await vendorDbConnect();
  const Vendor = vendorModel(vendor_db);
  const Shop = shopModel(auth_db);

  const vendor = await Vendor.findOne({ referenceId: shopId })
    .select("+_id +ownerId +dbInfo +secrets +expirations")
    .lean();

  if (!vendor)
    return NextResponse.json(
      { success: false, error: "Shop not found" },
      { status: 404, headers: securityHeaders }
    );

  if (vendor.ownerId.toString() !== data.userId.toString())
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403, headers: securityHeaders }
    );

  const dbUri = await decrypt({
    cipherText: vendor.dbInfo.dbUri,
    options: { secret: config.vendorDbUriEncryptionKey },
  });

  const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
  const Product = productModel(shop_db);

  try {
    const product = await Product.findOneAndUpdate(
      { _id: productId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product)
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404, headers: securityHeaders }
      );

    const response = NextResponse.json(
      {
        success: true,
        data: product,
        message: "Product updated successfully",
      },
      { status: 200 }
    );

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (err) {
    const errorMsg =
      err.code === 11000
        ? "A product with similar attributes already exists"
        : err.message || "Something went wrong";

    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400, headers: securityHeaders }
    );
  }
}


  /** 
   * fake Authentication for test purpose only 
   * *******************************************
   * *****REMOVE THIS BLOCK IN PRODUCTION***** *
   * *******************************************
   * *              ***
   * *              ***
   * *            *******
   * *             *****
   * *              *** 
   * *               *           
   * */

  // const authDb = await authDbConnect()
  // const User = userModel(authDb);
  // const user = await User.findOne({ referenceId: "cmda6hrqs0000vwlll4qhy7vw" })
  //                        .select('referenceId _id name email phone role isEmailVerified')
  // const data = { sessionId: "686f81d0f3fc7099705e44d7",
  //          userReferenceId: user.referenceId,
  //                   userId: user._id,
  //                     name: user.name,
  //                    email: user.email,
  //                    phone: user.phone,
  //                     role: user.role,
  //               isVerified: user.isEmailVerified || user.isPhoneVerified,
  //               }
  
  /** 
   * fake Authentication for test purpose only 
   * *******************************************
   * *********FAKE AUTHENTICATION END********* *
   * *******************************************
  **/

