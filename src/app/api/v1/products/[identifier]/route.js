import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { headers } from "next/headers";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { dbConnect } from "@/lib/mongodb/db";
import { shopModel } from "@/models/auth/Shop";
import { productModel } from "@/models/shop/product/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { isValidObjectId } from "mongoose";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";


export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {


  const          ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.headers["x-real-ip"] || request.socket?.remoteAddress || "";
  const referenceId = request.headers.get("x-vendor-identifier");
  const        host = request.headers.get("host");

  if (!referenceId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400 });

  const { data: vendor, dbUri, dbName } = await getInfrastructure({ referenceId, host })
  if(!vendor) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { allowed, retryAfter } = await applyRateLimit({ key: `${vendor.id}:${ip}` });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." },{ status: 429, headers: { "Retry-After": retryAfter.toString() } });
  
  const { identifier } = await params;
  console.log(vendor)
  try {
    const    shop = await dbConnect({ dbKey: dbName, dbUri });
    const ProductModel = productModel(shop);

    // Get product with full details
    let product 
    if (isValidObjectId(identifier)){
        product = await ProductModel.findById(identifier)
                                    .select("slug title description tags gallery otherMediaContents price thumbnail options details category hasVariants isAvailable warranty status approvalStatus productFormat weight weightUnit hasFreeShipment sellWithOutStock digitalAssets brand shipping ratings isFeatured variants inventory reviews reservations publishedAt metadata")
                                    .lean();

      }
    else {
        product = await ProductModel.findOne({ slug: identifier })
                                    .select("slug title description tags gallery otherMediaContents price thumbnail options details category hasVariants isAvailable warranty status approvalStatus productFormat weight weightUnit hasFreeShipment sellWithOutStock digitalAssets brand shipping ratings isFeatured variants inventory reviews reservations publishedAt metadata")
                                    .lean();
      }


    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });


    // Transform product for response
    const transformedProduct = {
      id: product._id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      status: product.status,
      approvalStatus: product.approvalStatus,
      isFeatured: product.isFeatured,
      hasVariants: product.hasVariants,
      publishedAt: product.publishedAt,
      thumbnail: product.thumbnail,
      gallery: product.gallery,
      otherMediaContents: product.otherMediaContents,
      price: {
        base: product.price.base,
        currency: product.price.currency,
        compareAt: product.price.compareAt,
        cost: product.price.cost,
        discount: product.price.discount,
        minPrice: product.price.minPrice,
        maxPrice: product.price.maxPrice
      },
      category: product.category,
      brand: product.brand,
      // vendor: product.vendor,
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
      ...((product.productFormat && product.productFormat == 'digital') && 
          {
              digitalAssets: product.digitalAssets?.map(asset => ({ name: asset.name,
                                                                     url: asset.url,
                                                                mimeType: asset.mimeType,
                                                             accessLimit: asset.accessLimit,
                                                                  expiry: asset.expiry        }))
          }),
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
  const { slug: productId } = params;
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
