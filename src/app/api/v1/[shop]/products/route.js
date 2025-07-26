import { vendorModel } from "@/models/vendor/Vendor";
import { productModel } from "@/models/shop/product/Product";
import { dbConnect } from "@/lib/mongodb/db";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import config from "../../../../../../config";
import securityHeaders from "../../utils/securityHeaders";
import mongoose from "mongoose";

export async function GET(req, { params }) {
    try {
        const { shop: shopReferenceId } = await params;

        if (!shopReferenceId) {
            return apiResponse({ error: "Invalid request" }, 400);
        }

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
                                         options: { secret: config.vendorDbUriEncryptionKey }        });

        // Connect to shop DB
        const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
        const Product = productModel(shop_db);
        
        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const category = searchParams.get('category');
        const minPrice = parseFloat(searchParams.get('minPrice'));
        const maxPrice = parseFloat(searchParams.get('maxPrice'));
        const searchQuery = searchParams.get('q') || '';
        const status = searchParams.get('status') || 'active';
        const type = searchParams.get('type');
        const hasVariants = searchParams.get('hasVariants');
        const isFeatured = searchParams.get('isFeatured');
        const approvalStatus = searchParams.get('approvalStatus');

        // Validate pagination parameters
        if (isNaN(page) || page < 1) {
            return apiResponse({ error: "Invalid page number" }, 400);
        }
        
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return apiResponse({ error: "Limit must be between 1 and 100" }, 400);
        }

        const validMin = !isNaN(minPrice);
        const validMax = !isNaN(maxPrice);

        // Build aggregation pipeline
        const pipeline = [
            { 
                $match: {
                    ...(status && { status }),
                    ...(type && { type }),
                    ...(approvalStatus && { approvalStatus }),
                    ...(typeof hasVariants === 'string' && { hasVariants: hasVariants === 'true' }),
                    ...(isFeatured && { isFeatured: isFeatured === 'true' }),
                    ...(category && { categories: { $in: [new mongoose.Types.ObjectId(category)] } }),
                    ...((validMin || validMax) && { 
                        'price.base': { 
                            ...(validMin && { $gte: minPrice }),
                            ...(validMax && { $lte: maxPrice })  
                        }
                    }),
                    ...(searchQuery && { 
                        $or: [
                            { title: { $regex: searchQuery, $options: 'i' } },
                            { description: { $regex: searchQuery, $options: 'i' } },
                            { tags: { $in: [new RegExp(searchQuery, 'i')] } },
                            { 'variants.sku': { $regex: searchQuery, $options: 'i' } }
                        ]
                    })
                }
            },
            {
                $facet: {
                    products: [
                        { $lookup: { 
                            from: 'categories',
                            localField: 'categories',
                            foreignField: '_id',
                            as: 'categories',
                            pipeline: [{ $project: { name: 1, slug: 1 } }]
                        }},
                        { $lookup: {
                            from: 'brands',
                            localField: 'brand',
                            foreignField: '_id',
                            as: 'brand',
                            pipeline: [{ $project: { name: 1, logo: 1 } }]
                        }},
                        { $lookup: {
                            from: 'vendors',
                            localField: 'vendor',
                            foreignField: '_id',
                            as: 'vendor',
                            pipeline: [{ $project: { name: 1 } }]
                        }},
                        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
                        {
                            $sort: {
                                ...(sortBy === 'price' && { 'price.base': sortOrder === 'asc' ? 1 : -1 }),
                                ...(sortBy === 'rating' && { 'ratings.average': sortOrder === 'asc' ? 1 : -1 }),
                                ...(sortBy !== 'price' && sortBy !== 'rating' && { [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                            }
                        },
                        { $skip: (page - 1) * limit },
                        { $limit: limit }
                    ],
                    total: [{ $count: 'count' }]
                }
            },
            {
                $project: {
                    products: 1,
                    total: { $arrayElemAt: ['$total.count', 0] }
                }
            }
        ];

        // Execute the aggregation
        const [result] = await Product.aggregate(pipeline);
        const { products = [], total = 0 } = result || {};

        // Calculate pagination values
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        // Transform products
        const transformedProducts = products.map(product => ({              id: product._id,
                                                                         title: product.title,
                                                                          slug: product.slug,
                                                                   description: product.description,
                                                                         price: {      base: product.price.base,
                                                                                   currency: product.price.currency,
                                                                                   discount: product.price.discount,
                                                                                  compareAt: product.price.compareAt     },
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
        console.error('Error in product route:', error);
        return apiResponse({ error: "Internal server error" }, 500);
    }
}

const apiResponse = (data, status = 200, headers = {}) => {
    const response = NextResponse.json(data, { status });
    Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
};