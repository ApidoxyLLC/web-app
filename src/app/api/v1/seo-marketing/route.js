import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
// import { userModel } from "@/models/auth/user";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
import { googleTagManagerDTOSchema,facebookPixelDTOSchema } from "./seoMarketingDTOSchema";

export async function POST(request) {
    // ✅ Rate limiting
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        request.headers.get("host") ||
        "";
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429, headers: { "Retry-After": retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();
        const { type } = body;

        let parsed;
        let providerType;

        // ✅ Validate input
        if (type === "google_tag_manager") {
            parsed = googleTagManagerDTOSchema.safeParse(body);
            providerType = "gtm";
        } else if (type === "facebook_pixel") {
            parsed = facebookPixelDTOSchema.safeParse(body);
            providerType = "facebookPixel";
        } else {
            return NextResponse.json(
                { error: "Unsupported provider type" },
                { status: 400 }
            );
        }

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", issues: parsed.error.flatten() },
                { status: 422 }
            );
        }

        //  Authentication
        const { authenticated, error: authError, data } =
            await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json(
                { error: authError || "Not authorized" },
                { status: 401 }
            );
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
                // const user = await User.findOne({ referenceId: "cmda0m1db0000so9whatqavpx" })
                //     .select('referenceId _id name email phone role isEmailVerified')
                // console.log(user)
                // const data = {
                //     sessionId: "cmdags8700000649w6qyzu8xx",
                //     userReferenceId: user.referenceId,
                //     userId: user?._id,
                //     name: user.name,
                //     email: user.email,
                //     phone: user.phone,
                //     role: user.role,
                //     isVerified: user.isEmailVerified || user.isPhoneVerified,
                // }
        
                /** 
                 * fake Authentication for test purpose only 
                 * *******************************************
                 * *********FAKE AUTHENTICATION END********* *
                 * *******************************************
                **/

        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return NextResponse.json(
                { error: "Invalid user ID format" },
                { status: 400 }
            );
        }

        const { type: _type, shop: referenceId, ...inputs } = parsed.data;

        const auth_db = await authDbConnect();
        const vendor_db = await vendorDbConnect();
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        const pipeline = [
            {
                $set: {
                    [providerType]: {
                        $mergeObjects: [
                            { $ifNull: [`$${providerType}`, {}] },
                            inputs,
                        ],
                    },
                },
            },
        ];

        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: {
                                $in: ["w:tracking", "w:shop"],
                            },
                        },
                    },
                },
            ],
        };

        const [updatedVendor, updatedShop] = await Promise.all([
            Vendor.updateOne(permissionFilter, pipeline),
            Shop.updateOne(permissionFilter, pipeline),
        ]);

        if (updatedVendor.matchedCount === 0 && updatedShop.matchedCount === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Shop not found or you don't have permission",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: `${providerType} updated successfully` },
            { status: 200 }
        );
    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to update tracking provider",
                stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}
