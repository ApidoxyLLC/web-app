import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
// import { userModel } from "@/models/auth/user";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";

export async function GET(request, { params }) {
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

    try {
        const { shop } = params; 
        console.log({ params })
        console.log(shop)
        if (!shop) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
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


        const auth_db = await authDbConnect();
        const vendor_db = await vendorDbConnect();
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        const permissionFilter = {
            referenceId: shop,
            $or: [
                { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["r:sms-provider", "r:email-provider", "r:shop"] }
                        }
                    }
                }
            ]
        };

        const [vendorData, shopData] = await Promise.all([
            Vendor.findOne(permissionFilter, "smsProvider emailProvider"),
            Shop.findOne(permissionFilter, "smsProvider emailProvider")
        ]);

        const providers = {
            smsProvider: vendorData?.smsProvider || shopData?.smsProvider || null,
            emailProvider: vendorData?.emailProvider || shopData?.emailProvider || null
        };

        if (!providers.smsProvider && !providers.emailProvider) {
            return NextResponse.json(
                { success: false, message: "No provider data found or no permission" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: providers },
            { status: 200 }
        );

    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to retrieve provider data" },
            { status: 500 }
        );
    }
}