import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
import { userModel } from "@/models/auth/user";

export async function GET(request, { params }) {

    console.log("hello*****")
    // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getMarketing' });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const referenceId = pathSegments[pathSegments.indexOf('v1') + 1];
        console.log(referenceId)
        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }
        // Authenticate user
        // const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        // if (!authenticated) {
        //     return NextResponse.json(
        //         { error: authError || "Not authorized" },
        //         { status: 401 }
        //     );
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
        const data = {
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

        // Connect to databases
        const auth_db = await authDbConnect();
        const vendor_db = await vendorDbConnect();
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        // Permission filter (read permissions)
        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["r:tracking", "r:shop"] }
                        }
                    }
                }
            ]
        };

        console.log(permissionFilter)

        // Query both collections
        const [vendorData, shopData] = await Promise.all([
            Vendor.findOne(permissionFilter, "marketing"),
            Shop.findOne(permissionFilter, "marketing")
        ]);


        console.log(vendorData)
        console.log(shopData)

        // Combine results
        const marketingData = {
            googleTagManager: vendorData?.marketing?.googleTagManager ||
                shopData?.marketing?.googleTagManager,
            facebookPixel: vendorData?.marketing?.facebookPixel ||
                shopData?.marketing?.facebookPixel 
        };

        console.log(marketingData)

        if (!marketingData.googleTagManager && !marketingData.facebookPixel) {
            return NextResponse.json(
                { success: false, message: "No marketing data found or no permission" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: marketingData
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("GET Marketing Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to retrieve marketing data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}