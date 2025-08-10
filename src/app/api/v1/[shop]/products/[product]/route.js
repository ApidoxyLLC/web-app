import { vendorModel } from "@/models/vendor/Vendor";
import { productModel } from "@/models/shop/product/Product";
import { dbConnect } from "@/lib/mongodb/db";
import { decrypt } from "@/lib/encryption/cryptoEncryption";
import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import config from "../../../../../../../config";
import securityHeaders from "../../../utils/securityHeaders";
import mongoose from "mongoose";
import getAuthenticatedUser from "../../../auth/utils/getAuthenticatedUser";
import hasProductWritePermission from "./hasProductWritePermission";

const apiResponse = (data, status = 200, headers = {}) => {
    const response = NextResponse.json(data, { status });
    Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
};


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


export async function DELETE(request, { params }) {
    // --- Rate Limiting ---
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||  request.headers.get('x-real-ip') ||  request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed)  return NextResponse.json( { success: false, error: 'Too many requests. Please try again later.' }, { status: 429, headers: {  'Retry-After': retryAfter.toString(),  ...securityHeaders  } } );
  
    // Authentication
    const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
    if (!authenticated) return NextResponse.json({ success: false, error: authError || 'Not authenticated' }, { status: 401, headers: securityHeaders });

  try {
    const { shop: shopReferenceId, product: productId } = params;

    // Validate params
    if (!shopReferenceId || !productId) return NextResponse.json( { success: false, error: 'Shop reference and product ID are required' }, { status: 400, headers: securityHeaders });

    // Connect to Vendor DB
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: shopReferenceId })
                               .select("+_id +dbInfo +secrets +expirations +ownerId")
                               .lean();
    if (!vendor) return NextResponse.json({ success: false, error: 'Shop not found' },  { status: 404, headers: securityHeaders });
    if (!hasProductWritePermission(vendor, data.userId)) return NextResponse.json( { success: false, error: 'Authorization failed' },  { status: 403, headers: securityHeaders });
    
    // Connect to Shop DB
    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                     options: { secret: config.vendorDbUriEncryptionKey }  });
    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const Product = productModel(shop_db);
    const Image = imageModel(shop_db);
    const session = await shop_db.startSession();

    try {
      let productTitle;
      await session.withTransaction(async () => {
        // Get product with all necessary data
        const product = await Product.findOne({ _id: productId })
                                     .select('title gallery variants')
        
        if (!product) throw new Error('Product not found');
        productTitle = product.title;

        // Delete all product images
        const imagesToDelete = [];

        // Add main gallery images
        if (product.gallery && product.gallery.length > 0) imagesToDelete.push(...product.gallery.map(img => img.name));

        // Add variant images if they exist
        if (product.variants && product.variants.length > 0) product.variants.forEach(variant => (variant.images && variant.images.length > 0) && imagesToDelete.push(...variant.images));
        

        // Delete all images from storage and database
        if (imagesToDelete.length > 0) {
            const images = await Image.find({ fileName: { $in: imagesToDelete },
                                                folder: 'products'              }).session(session);

            if (images.length === 0) return;

            // Step 1: delete from storage in parallel
            const deleteResults = await Promise.all(
                    images.map(image => deleteImage({ bucketId: image.bucketId,
                                                      fileName: image.fileName,
                                                        fileId: image.fileId }).then(res => ({ res, image }))
                )
            );

            // Step 2: validate results
            const failed = deleteResults.find(({ res, image }) =>
                !res.success || res.data?.fileId !== image.fileId
            );
            if (failed) throw new Error(`Failed to delete image ${failed.image.fileName} from storage`);
                // Step 3: delete DB docs in parallel
            await Image.deleteMany({ _id: { $in: images.map(img => img._id) }}).session(session);
            }

        // Delete digital assets if product is digital
        // if (product.productFormat === 'digital' && product.digitalAssets) {
        //   // Add logic here to delete digital assets from storage
        //   // This would depend on your digital asset storage system
        // }

        // Finally delete the product
        const { deletedCount } = await Product.deleteOne({ _id: productId }).session(session);
        if (deletedCount === 0) throw new Error('Product not found');
      });

      const response = NextResponse.json(
        { 
          success: true, 
          message: 'Product deleted successfully',
          data: { id: productId, title: productTitle } 
        },
        { status: 200 }
      );
      
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
      
    } catch (error) {
      console.error("Transaction error:", error);
      return NextResponse.json(
        { 
          success: false,  
          error: error.message || 'Internal Server Error',
          ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }) 
        }, 
        { status: 500, headers: securityHeaders }
      );
    } finally { 
      await session.endSession(); 
    }
    
  } catch (error) {
    console.error("Error deleting product:", error);
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

