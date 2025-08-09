import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
// import { userModel } from "@/models/auth/user";
import { smsProviderDTOSchema, emailProviderDTOSchema } from "./smsAndEmailServicesDTOSchema";
import mongoose from "mongoose";

export async function POST(request) {
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

        const { provider } = body;

        let parsed;
        let providerType;
        if (["bulk_sms_bd", "alpha_net_bd", "adn_diginet_bd"].includes(provider)) {
            parsed = smsProviderDTOSchema.safeParse(body);
            providerType = "smsProvider";
        } 
        else if (provider === "smtp") {
            parsed = emailProviderDTOSchema.safeParse(body);
            providerType = "emailProvider";
        } 
        else {
            return NextResponse.json(
                { error: "Unsupported provider" },
                { status: 400 }
            );
        }

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", issues: parsed.error.flatten()},
                { status: 422 }
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

        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return NextResponse.json(
                { error: "Invalid user ID format" },
                { status: 400 }
            );
        }

        const { provider: _provider, shop: referenceId, ...inputs } = parsed.data;

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
                            {
                                [_provider]: {
                                    ...inputs,
                                    updatedAt: new Date()
                                }
}
                        ]
                    }
                }
            }
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
                            permission: { $in: ["w:sms-provider", "w:email-provider", "w:shop"] }
                        }
                    }
                }
            ]
        };

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
            { success: true, message: `${providerType} updated successfully` },
            { status: 200 }
        );

    } catch (error) {
        console.log("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to update provider",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
