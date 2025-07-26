import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { userModel } from "@/models/auth/user";
import smsProviderDTOSchema from "./smsServicesDTOSchema";
import mongoose from "mongoose";

export async function POST(request) {
    console.log("hello*******************************************")
    // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    // Validate input
    let body;
    try {
        body = await request.json();
        const parsed = smsProviderDTOSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", issues: parsed.error.flatten() },
                { status: 422 }
            );
        }

        // Authentication
        // const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        // if (!authenticated) {
        //   return NextResponse.json(
        //     { error: authError || "Not authorized" },
        //     { status: 401 }
        //   );
        // }


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

        // if (!mongoose.Types.ObjectId.isValid(data.userId)) {
        //     return NextResponse.json(
        //         { error: "Invalid user ID format" },
        //         { status: 400 }
        //     );
        // }

        // Proceed with DB update
        const { provider, shop: referenceId, ...inputs } = parsed.data;

        const auth_db = await authDbConnect();
        const vendor_db = await vendorDbConnect();
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        const pipeline = [
            {
                $set: {
                    smsProvider: {
                        $mergeObjects: [
                            { $ifNull: ["$smsProvider", {}] },
                            { [provider]: inputs }
                        ]
                    }
                }
            }
        ];

        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: userData.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(userData.userId),
                            status: "active",
                            permission: { $in: ["w:sms-provider", "w:shop"] }
                        }
                    }
                }
            ]
        };


        console.log("referenceId:", referenceId);
        console.log("userId:", userData.userId);
        console.log("Filter being used:", JSON.stringify(permissionFilter, null, 2));


        const [updatedVendor, updatedShop] = await Promise.all([
            Vendor.updateOne(permissionFilter, pipeline),
            Shop.updateOne(permissionFilter, pipeline)
        ]);

        if (updatedVendor.matchedCount === 0 && updatedShop.matchedCount === 0) {
            return NextResponse.json(
                { success: false, message: "Shop not found or you don't have permission" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: "SMS provider updated successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.log("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to update SMS provider",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
