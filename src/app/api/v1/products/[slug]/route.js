import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { headers } from "next/headers";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { productModel } from "@/models/shop/products/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { productId } = params;

  // Get client IP for rate limiting
  const headerList = headers();
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             headerList.get('x-real-ip') || 'unknown_ip';

  // Rate limiting
  // try { await limiter.check(ip, 30); }
  // catch { return NextResponse.json( { error: "Too many requests" }, { status: 429, headers: { 'Retry-After': '60' } } );}

  // Get vendor identification
  const vendorId = headerList.get('x-vendor-identifier');
  const host = headerList.get('host');
  
  if (!vendorId && !host) 
    return NextResponse.json( { error: "Missing vendor identifier or host" }, { status: 400 } );
  

  // Validate product ID
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) 
    return NextResponse.json( { error: "Invalid product ID" }, { status: 400 });
  

  try {
    // Connect to auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);

    const shop = await ShopModel.findOne({ $or: [{ vendorId }, { domains: { $elemMatch: { domain: host } } }] }).select('+dbInfo.uri +dbInfo.prefix').lean();
    
    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 })

    // Decrypt DB URI
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) 
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    
    
    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri,
                                     options: { secret: DB_URI_ENCRYPTION_KEY }  });

    // Connect to vendor DB
    const   shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const    vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const ProductModel = productModel(vendor_db);

    // Get product with full details
    const product = await ProductModel.findById(productId)
                                      .populate('categories', 'name slug')
                                      .populate('brand', 'name logo slug')
                                      .populate('vendor', 'name businessName')
                                      .lean();

    if (!product) 
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (vendorId && product.vendor.toString() !== vendorId) 
      return NextResponse.json({ error: "Unauthorized access to product" }, { status: 403 } );
    

    // Transform product for response
    const transformedProduct = {
      id: product._id,
      productId: product.productId,
      title: product.title,
      slug: product.slug,
      description: product.description,
      type: product.type,
      status: product.status,
      approvalStatus: product.approvalStatus,
      isFeatured: product.isFeatured,
      hasVariants: product.hasVariants,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      publishedAt: product.publishedAt,
      thumbnail: product.thumbnail,
      gallery: product.gallery,
      otherMedia: product.otherMedia,
      price: {
        base: product.price.base,
        currency: product.price.currency,
        compareAt: product.price.compareAt,
        cost: product.price.cost,
        discount: product.price.discount,
        minPrice: product.price.minPrice,
        maxPrice: product.price.maxPrice
      },
      categories: product.categories,
      brand: product.brand,
      vendor: product.vendor,
      tags: product.tags,
      options: product.options,
      details: product.details,
      shipping: product.shipping,
      ratings: product.ratings,
      warranty: product.warranty,
      variants: product.variants?.map(variant => ({
        id: variant._id,
        title: variant.title,
        options: variant.options,
        price: variant.price || product.price,
        sku: variant.sku,
        barcode: variant.barcode,
        weight: variant.weight,
        inventory: variant.inventory,
        isAvailable: variant.isAvailable,
        taxable: variant.taxable,
        requiresShipping: variant.requiresShipping
      })),
      digitalAssets: product.digitalAssets?.map(asset => ({
        name: asset.name,
        url: asset.url,
        mimeType: asset.mimeType,
        accessLimit: asset.accessLimit,
        expiry: asset.expiry
      })),
      productUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/products/${product.slug}`
    };

    return NextResponse.json({ success: true, data: transformedProduct });

  } catch (error) {
    console.error(`Product details API Error: ${error.message}`);
    return NextResponse.json(
      { 
        error: "Failed to fetch product details",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const updates = await request.json();

  const headerList = headers();
  const vendorId = headerList.get('x-vendor-identifier');
  const host = headerList.get('host');

  if (!vendorId && !host)
    return NextResponse.json({ error: "Missing vendor identifier or host" }, { status: 400 });

  if (!productId || !mongoose.Types.ObjectId.isValid(productId))
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

  try {
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);

    const shop = await ShopModel.findOne({
      $or: [
        { vendorId },
        { domains: { $elemMatch: { domain: host } } }
      ]
    }).select('+dbInfo.uri +dbInfo.prefix').lean();

    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY)
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const dbUri = await decrypt({
      cipherText: shop.dbInfo.uri,
      options: { secret: DB_URI_ENCRYPTION_KEY }
    });

    const shopDbName = `${shop.dbInfo.prefix}${shop._id}`;
    const vendor_db = await dbConnect({ dbKey: shopDbName, dbUri });
    const ProductModel = productModel(vendor_db);

    const product = await ProductModel.findById(productId).lean();
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    if (vendorId && product.vendor.toString() !== vendorId)
      return NextResponse.json({ error: "Unauthorized access to product" }, { status: 403 });

    await ProductModel.updateOne({ _id: productId }, { $set: updates });

    return NextResponse.json({ success: true, message: "Product updated successfully." });

  } catch (error) {
    console.error(`Product update API Error: ${error.message}`);
    return NextResponse.json({ error: "Failed to update product", details: error.message }, { status: 500 });
  }
}
