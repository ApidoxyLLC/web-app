import { vendorModel } from "@/models/vendor/Vendor";
import { productModel } from "@/models/shop/product/Product";
import { dbConnect } from "@/lib/mongodb/db";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import config from "../../../../../../../config";
import securityHeaders from "../../../utils/securityHeaders";
import mongoose from "mongoose";

export async function GET(req, { params }) {
    try {
        const { shop: shopReferenceId, product: productId } = await params;

        if (!shopReferenceId || !productId) 
            return apiResponse({ error: "Invalid request parameters" }, 400);
        
        // Validate productId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) 
            return apiResponse({ error: "Invalid product ID format" }, 400);
        
        // Connect to vendor DB
        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);
        
        const vendor = await Vendor.findOne({ referenceId: shopReferenceId })
                                   .select("dbInfo bucketInfo secrets expirations primaryDomain domains")
                                   .lean();
            
        if (!vendor) 
            return apiResponse({ error: "Shop not found" }, 404);

        // Decrypt DB URI
        const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                         options: { secret: config.vendorDbUriEncryptionKey }       });

        // Connect to shop DB
        const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
        const Product = productModel(shop_db);
        
        // Build aggregation pipeline to get single product with all details
        const pipeline = [ { $match: { _id: new mongoose.Types.ObjectId(productId) } },
                           { $limit: 1 },
                           { $lookup: {         from: 'categories',
                                          localField: 'categories',
                                        foreignField: '_id',
                                                  as: 'categories',
                                            pipeline: [{ $project: { name: 1, slug: 1, description: 1 } }]
                                        }},
                            // { $lookup: {
                            //     from: 'brands',
                            //     localField: 'brand',
                            //     foreignField: '_id',
                            //     as: 'brand',
                            //     pipeline: [{ $project: { name: 1, logo: 1, description: 1 } }]
                            // }},
                           { $lookup: {         from: 'vendors',
                                          localField: 'vendor',
                                        foreignField: '_id',
                                                  as: 'vendor',
                                            pipeline: [{ $project: { name: 1, contactInfo: 1 } }]
                                        }},
                            // { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                            { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
                            { $project: {
                                title: 1,
                                slug: 1,
                                description: 1,
                                price: 1,
                                thumbnail: 1,
                                gallery: 1,
                                status: 1,
                                type: 1,
                                approvalStatus: 1,
                                isFeatured: 1,
                                hasVariants: 1,
                                categories: 1,
                                brand: 1,
                                tags: 1,
                                variants: 1,
                                ratings: 1,
                                specifications: 1,
                                shippingInfo: 1,
                                returnPolicy: 1,
                                warranty: 1,
                                seo: 1,
                                createdAt: 1,
                                updatedAt: 1
                            }}
                        ];

        const [product] = await Product.aggregate(pipeline);

        if (!product) {
            return apiResponse({ error: "Product not found" }, 404);
        }

        // Transform product data
        const transformedProduct = {
            id: product._id,
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
            specifications: product.specifications,
            shippingInfo: product.shippingInfo,
            returnPolicy: product.returnPolicy,
            warranty: product.warranty,
            seo: product.seo,
            // createdAt: product.createdAt,
            // updatedAt: product.updatedAt
        };

        return apiResponse({
            success: true,
            data: transformedProduct
        });

    } catch (error) {
        console.error('Error in single product route:', error);
        return apiResponse({ error: "Internal server error" }, 500);
    }
}

const apiResponse = (data, status = 200, headers = {}) => {
    const response = NextResponse.json(data, { status });
    Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
};