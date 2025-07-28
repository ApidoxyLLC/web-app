import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
// import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { userModel } from "@/models/auth/user";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
// import { marketingDTOSchema } from "./seoMarketingDTOSchema";


export async function GET(request, { params }) {

    // Rate Limit
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getShop' });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), } });


    try {
        const { searchParams } = new URL(request.url);
        const { shop: shopReferenceId } = await params;

         if (!shopReferenceId) 
              return NextResponse.json({ success: false, error: 'Shop reference is required' }, { status: 400, headers: securityHeaders });

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

        const auth_db = await authDbConnect();
        const vendor_db = await vendorDbConnect();
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["r:tracking", "r:shop", "w:tracking", "w:shop"] },
                        },
                    },
                },
            ],
        };

        // Check in both collections
        const [vendorData, shopData] = await Promise.all([
            Vendor.findOne(permissionFilter, "marketing"),
            Shop.findOne(permissionFilter, "marketing"),
        ]);

        const marketing =
            vendorData?.marketing || shopData?.marketing || null;

        if (!marketing) {
            return NextResponse.json(
                { success: false, message: "Marketing data not found or no permission" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, marketing },
            { status: 200 }
        );
    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to retrieve marketing provider data" },
            { status: 500 }
        );
    }
}