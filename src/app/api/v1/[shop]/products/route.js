import { vendorModel } from "@/models/vendor/Vendor";
import { productModel } from "@/models/shop/product/Product";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import config from "../../../../../../config";
import securityHeaders from "../../utils/securityHeaders";


export async function GET(req, { params }) {
    const { shop: shopReferenceId } = await params;

    if(!shopReferenceId)
        return new NextResponse('Invalid request.', { status: 400 });

    const vendor_db = await vendorDbConnect()
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: shopReferenceId })
                               .select("dbInfo bucketInfo secrets expirations primaryDomain domains")
                               .lean()
    if(!vendor) return new NextResponse('Shop not found...', { status: 404 });

    const dbUri = await decrypt({  cipherText: vendor.dbInfo.dbUri,
                                      options: { secret: config.vendorDbUriEncryptionKey } });

    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });

    const ProductModel = productModel(shop_db);
    
    const { searchParams } = new URL(req.url);
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

    if (isNaN(page) || page < 1) 
    return apiResponse({ error: "Invalid page number" }, 400);
  
    if (isNaN(limit) || limit < 1 || limit > 100) 
        return apiResponse({ error: "Limit must be between 1 and 100" }, 400);


    const pipeline = [ { $match: {
                            ...(status && { status }),
                            ...(type && { type }),
                            ...(approvalStatus && { approvalStatus }),
                            ...(hasVariants && { hasVariants: hasVariants === 'true' }),
                            ...(isFeatured && { isFeatured: isFeatured === 'true' }),
                            ...(category && { categories: { $in: [new mongoose.Types.ObjectId(category)] } }),
                            ...((!isNaN(minPrice) || !isNaN(maxPrice)) && { 
                                                                            'price.base': { 
                                                                            ...(!isNaN(minPrice) && { $gte: minPrice }),
                                                                            ...(!isNaN(maxPrice) && { $lte: maxPrice })
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
                        // Facet stage to handle both data and count in one query
                        {
                            $facet: {
                            products: [
                                // Lookup for categories
                                { $lookup: {    from: 'categories',
                                                localField: 'categories',
                                                foreignField: '_id',
                                                as: 'categories',
                                                pipeline: [{ $project: { name: 1, slug: 1 } }]
                                            }
                                },
                                // Lookup for brand
                                {
                                $lookup: {
                                    from: 'brands',
                                    localField: 'brand',
                                    foreignField: '_id',
                                    as: 'brand',
                                    pipeline: [{ $project: { name: 1, logo: 1 } }]
                                }
                                },
                                // Lookup for vendor
                                {  $lookup: {
                                                from: 'vendors',
                                                localField: 'vendor',
                                                foreignField: '_id',
                                                as: 'vendor',
                                                pipeline: [{ $project: { name: 1 } }]
                                            }
                                },
                                // Unwind single-element arrays
                                { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                                { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
                                // Sorting
                                {
                                $sort: {
                                    ...(sortBy === 'price' && { 'price.base': sortOrder === 'asc' ? 1 : -1 }),
                                    ...(sortBy === 'rating' && { 'ratings.average': sortOrder === 'asc' ? 1 : -1 }),
                                    ...(sortBy !== 'price' && sortBy !== 'rating' && { [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                                }
                                },
                                // Pagination
                                { $skip: (page - 1) * limit },
                                { $limit: limit }
                            ],
                            total: [
                                { $count: 'count' }
                            ]
                            }
                        },
                        // Project to reshape the output
                        {
                            $project: {
                            products: 1,
                            total: { $arrayElemAt: ['$total.count', 0] }
                            }
                        }
                        ];

    // Execute the aggregation
    const [result] = await ProductModel.aggregate(pipeline);
    const { products, total } = result;

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
    
    
    // return new NextResponse('Sample request', { status: 200 });

}

const apiResponse = (data, status = 200, headers = {}) => {
  const response = NextResponse.json(data, { status });
  Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};