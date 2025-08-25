import { NextResponse } from 'next/server';
import { categoryModel } from '@/models/shop/product/Category';
import { categoryDTOSchema } from './categoryDTOSchema';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { vendorModel } from '@/models/vendor/Vendor';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { dbConnect } from '@/lib/mongodb/db';
import { imageModel } from '@/models/vendor/Image';
import getAuthenticatedUser from '../auth/utils/getAuthenticatedUser';
import config from '../../../../../config';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { deleteImage } from '@/services/image/blackblaze';
import { headers } from "next/headers";

const MAX_CATEGORY_DEPTH = parseInt(process.env.MAX_CATEGORY_DEPTH || '5', 10);
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400  }); }

  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'createCategory' });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), } });

  const { authenticated, error, data } = await getAuthenticatedUser(request);
  if (!authenticated)
    return NextResponse.json({ error: "...not authorized" }, { status: 401 });

  const parsed = categoryDTOSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422  });

  try {
    const { shop, slug: inputSlug } = parsed.data;
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);

    const vendor = await Vendor.findOne({ referenceId: shop })
      .select("+_id +dbInfo +secrets +expirations")
      .lean();

    if (!vendor)
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400  });

    if (!vendor.ownerId || data.userId.toString() !== vendor.ownerId.toString())
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 400  });

    const dbUri = await decrypt({
      cipherText: vendor.dbInfo.dbUri,
      options: { secret: config.vendorDbUriEncryptionKey }
    });
    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const Category = categoryModel(shop_db);

    const slugExist = await Category.exists({ slug: inputSlug });
    if (slugExist)
      return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422  });

    // New attach
    let image = null;
    if (parsed.data.image) {
      // if (!parsed.data.imageId) 
      //     return NextResponse.json({ error: "imageId is required when providing an image" }, { status: 400 });
      const ImageModel = imageModel(vendor_db);
      const imageData = await ImageModel.findOne({ fileName: parsed.data.image });
      if (!imageData) return NextResponse.json({ error: "Image not found" }, { status: 404 });

      try {
        const ShopImage = imageModel(shop_db);
        image = await new ShopImage({ ...imageData.toObject() }).save();

        if (!image)
          return NextResponse.json({ error: "Image not found" }, { status: 404 });
        const fileToDelete = await ImageModel.find({
          bucketName: imageData.bucketName,
          folder: imageData.folder,
          _id: { $ne: imageData._id } // not equal
        });
        (async () => {
          try {
            await Promise.all([
              ...fileToDelete.map(item =>
                deleteImage({ bucketId: item.bucketId, fileName: item.fileName, fileId: item.fileId })
              ),
              ImageModel.deleteMany({
                bucketName: imageData.bucketName,
                folder: imageData.folder
              })
            ]);
          } catch (err) {
            console.error("Background deletion failed:", err);
          }
        })();
      } catch (error) {
        return NextResponse.json({ error: "Image transfer error" }, { status: 400 });
      }
    }

    let parent = null
    if (parsed?.data?.parent) {
      parent = await Category.findById(parsed.data.parent).select('ancestors')
      if (!parent)
        return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 422  });
    }

    if (parent && ((parent.level || 0) + 1) > MAX_CATEGORY_DEPTH)
      return NextResponse.json({ success: false, error: `Category depth exceeds maximum allowed (${MAX_CATEGORY_DEPTH})` }, { status: 422  });

    const payload = {
      title: parsed.data.title,
      slug: parsed.data.slug,
      ...(parsed.data.description && { description: parsed.data.description }),
      ...(image && {
        image: {
          _id: image._id,
          imageName: image.fileName
        }
      }),
      ...(parent && {
        parent: parent._id,
        ancestors: [...(parent.ancestors || []), parent._id],
        level: (parent.level || 0) + 1
      }),
      createdBy: vendor.userId
    }

    const session = await shop_db.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const [category] = await Category.create([{ ...payload }], { session });
        if (parent) {
          await Category.updateOne({ _id: parent._id }, { $addToSet: { children: category._id } }, { session });
        }
        return NextResponse.json({ success: true, data: category, message: 'Category created successfully' }, { status: 201 });
      });
      return result;

    } catch (error) {
      console.error("Transaction failed:", error);
      return NextResponse.json({ success: false, error: 'Category creation failed' }, { status: 500 });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Unexpected error during category creation:", error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    }, { status: 500  });
  }
}


export async function GET(request) {
  const ip =
    request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request.headers["x-real-ip"] ||
    request.socket?.remoteAddress ||
    "";

  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": retryAfter.toString()  } }
    );
  }

  try {
    const headerList = await headers();
    const vendorId = headerList.get("x-vendor-identifier");
    const host = headerList.get("host");

    if (!vendorId && !host) {
      return NextResponse.json(
        { error: "Missing vendor identifier or host" },
        { status: 400  }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const searchQuery = searchParams.get("q") || "";
    const status = searchParams.get("status");

    if (isNaN(page) || page < 1)
      return NextResponse.json({ error: "Invalid page number" }, { status: 400  });

    if (isNaN(limit) || limit < 1 || limit > 100)
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400  });

    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);
    const vendor = await Vendor.findOne({ referenceId: vendorId })
      .select("dbInfo bucketInfo secrets expirations primaryDomain domains")
      .lean()
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404  });

    console.log("vendor*****")
    console.log(vendor)

    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri, options: { secret: config.vendorDbUriEncryptionKey } });
    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const Category = categoryModel(shop_db);

    const query = {};
    if (status) query.isActive = status === "active";
    if (searchQuery) query.title = { $regex: searchQuery, $options: "i" };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json(
      {
        success: true,
        data: categories,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          previousPage: hasPreviousPage ? page - 1 : null,
        },
      },
      { status: 200  }
    );
  } catch (error) {
    console.error("Categories API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", details: process.env.NODE_ENV !== "production" ? error.message : undefined },
      { status: 500  }
    );
  }
}





