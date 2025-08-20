
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
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import config from "../../../../../../../config";

export async function GET(request, { params }) {
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

    const headerList = await headers();
    const vendorId = headerList.get('x-vendor-identifier');
    if (!vendorId) return NextResponse.json({ error: "Missing vendor identifier" }, { status: 400 });


    const { productId } = await params;
    if (!mongoose.Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Invalid productId" }, { status: 400 });

    try {
        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);
        const vendor = await Vendor.findOne({ referenceId: vendorId }).select("dbInfo").lean();

        if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

        const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri, options: { secret: config.vendorDbUriEncryptionKey } });
        const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });

        const Product = productModel(shop_db);
        const Category = categoryModel(shop_db);

        const product = await Product.findById(productId)
            .populate({ path: 'category', model: Category, select: 'title slug' })
            .lean();

        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        // const transformedProduct = {
        //     id: product._id,
        //     title: product.title,
        //     description: product.description,
        //     price: product.price,
        //     thumbnail: product.thumbnail,
        //     gallery: product.gallery || [],
        //     otherMediaContents: product.otherMediaContents || [],
        //     status: product.status,
        //     approvalStatus: product.approvalStatus,
        //     isFeatured: product.isFeatured,
        //     hasVariants: product.hasVariants,
        //     category: product.category,
        //     tags: product.tags || [],
        //     variants: product.variants?.map(variant => ({
        //         id: variant._id,
        //         options: variant.options,
        //         price: variant.price || product.price,
        //         sku: variant.sku,
        //         inventory: variant.inventory,
        //     })) || [],
        //     inventory: product.inventory || {},
        //     ratings: product.ratings || { average: 0, count: 0 },
        //     weight: product.weight,
        //     weightUnit: product.weightUnit,
        //     hasFreeShipment: product.hasFreeShipment,
        //     sellWithOutStock: product.sellWithOutStock,
        //     createdAt: product.createdAt,
        //     updatedAt: product.updatedAt,
        // };

        return NextResponse.json({ success: true, data: product });

    } catch (error) {
        console.error("Product Details API Error:", error);
        return NextResponse.json({ error: "Failed to fetch product details", details: error.message }, { status: 500 });
    }
}
