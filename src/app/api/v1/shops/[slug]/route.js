import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { vendorModel } from "@/models/vendor/Vendor";
import { patchShopSchema } from "./patchShopDTOSchema";
import { userModel } from "@/models/auth/User";


export async function GET(request, { params }) {
  const { slug } = await params
  // Rate Limit
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.ip || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: "getShopDetail" });
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const { authenticated, data } = await getAuthenticatedUser(request);
    if (!authenticated) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const db = await authDbConnect();
    const vendor_db = await vendorDbConnect();
    const Shop = shopModel(db);
    const Vendor = vendorModel(vendor_db)

    // Find the shop by slug or referenceId, with access check
    const shop = await Shop.findOne({
      $or: [{ slug: slug },
      { referenceId: slug }
      ]
    }).select("-__v");
    if (shop) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    console.log(shop)
    const vendor = await Vendor.findOne({ _id: shop._id })
      .select("-__v -_id");

    console.log(vendor)
    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const resultData = {
      id: shop.referenceId,
      email: shop.email,
      phone: shop.phone,
      country: shop.country,
      industry: shop.industry,
      businessName: shop.businessName,
      location: shop.location,
      slug: shop.slug,
      activeApps: shop.activeApps,
      web: shop.web,
      android: shop.android,
      ios: shop.ios,
      primaryDomain: vendor.primaryDomain,
      domains: vendor.domains,
      facebookDataFeed: vendor.facebookDataFeed,
      socialLinks: vendor.socialLinks,
    }

    return NextResponse.json({ success: true, data: resultData }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      error: error.message || "Failed to retrieve shop",
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}


export async function PATCH(request, { params }) {
  const { slug } = await params;

  try {
    // const { authenticated, data: user } = await getAuthenticatedUser(request);
    // if (!authenticated) 
    //   return NextResponse.json({ error: "Not authorized" }, { status: 401 });


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

    const authDb = await authDbConnect()
    const User = userModel(authDb);
    const user = await User.findOne({ referenceId: "cmda0m1db0000so9whatqavpx" })
      .select('referenceId _id name email phone role isEmailVerified')
    console.log(user)
    const userData = {
      sessionId: "cmdags8700000649w6qyzu8xx",
      userReferenceId: user.referenceId,
      userId: user?._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isEmailVerified || user.isPhoneVerified,
    }

    /** 
     * fake Authentication for test purpose only 
     * *******************************************
     * *********FAKE AUTHENTICATION END********* *
     * *******************************************
    **/





    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchShopSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });
    }

    const db = await authDbConnect();
    const vendor_db = await vendorDbConnect();

    const Shop = shopModel(db);
    const Vendor = vendorModel(vendor_db);

    const shop = await Shop.findOne({
      $or: [{ slug }, { referenceId: slug }]
    });

    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const vendor = await Vendor.findOne({ _id: shop._id });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });



    // // Check ownership
    if (userData?.userId.toString() !== vendor.ownerId?.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = parsed.data;

    // Update shop fields if they exist in schema
    Object.keys(data).forEach(key => {
      if (key in shop.toObject()) {
        shop[key] = data[key];
      } else if (key in vendor.toObject()) {
        vendor[key] = data[key];
      }
    });

    await shop.save();
    await vendor.save();

    return NextResponse.json({ success: true, message: "Shop updated successfully" });

  } catch (error) {
    return NextResponse.json({
      error: error.message || "Failed to update shop",
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }, { status: 500 });
  }
}