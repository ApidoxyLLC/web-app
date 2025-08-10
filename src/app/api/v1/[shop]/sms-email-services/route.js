import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
// import { userModel } from "@/models/auth/user";

export async function GET(request, { params }) {
    // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getSmsEmail' });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        const { shop: referenceId } = params;
        console.log("Shop Reference ID:", referenceId);

        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
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


        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json(
                { error: authError || "Not authorized" },
                { status: 401 }
            );
        }

        const [auth_db, vendor_db] = await Promise.all([
            authDbConnect(),
            vendorDbConnect()
        ]);

        const [Shop, Vendor] = [
            shopModel(auth_db),
            vendorModel(vendor_db)
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
                            permission: { $in: ["r:sms-provider", "r:email-provider", "r:shop"] }
                        }
                    }
                }
            ]
        };

        console.log("Permission Filter:", permissionFilter);

        const [vendorData, shopData] = await Promise.all([
            Vendor.findOne(permissionFilter).select("smsProvider emailProvider").lean(),
            Shop.findOne(permissionFilter).select("smsProvider emailProvider").lean()
        ]);

        console.log("Vendor Data:", vendorData);
        console.log("Shop Data:", shopData);

        const providers = {
            smsProvider: vendorData?.smsProvider || shopData?.smsProvider || null,
            emailProvider: vendorData?.emailProvider || shopData?.emailProvider || null
        };

        if (!providers.smsProvider && !providers.emailProvider) {
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: "No SMS/Email provider configuration found"
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: providers
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("GET SMS/Email Services Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to retrieve provider data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}


 


export async function DELETE(request) {

    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'deleteSmsProvider' });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        
    //   const referenceId = params.shop;
        // const { shop: referenceId } =await params;
        const { providerName, shop: referenceId  } = await request.json(); 
        console.log("data kjoi",providerName, referenceId)
        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        if (!providerName || typeof providerName !== 'string') {
            return NextResponse.json(
                { error: "Valid provider name is required (e.g., 'bulk_sms_bd')" },
                { status: 400 }
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
        // const user = await User.findOne({ referenceId: "cmdwxn2sg0000o09w6morw1mv" })
        //     .select('referenceId _id name email phone role isEmailVerified')
        // console.log(user)
        // const data = {
        //     // sessionId: "cmdags8700000649w6qyzu8xx",
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



        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json(
                { error: authError || "Not authorized" },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return NextResponse.json(
                { error: "Invalid user ID format" },
                { status: 400 }
            );
        }

        const [auth_db, vendor_db] = await Promise.all([
            authDbConnect(),
            vendorDbConnect()
        ]);

        const [Shop, Vendor] = [
            shopModel(auth_db),
            vendorModel(vendor_db)
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
                            permission: { $in: ["w:sms-provider", "w:shop"] }
                        }
                    }
                }
            ],
            [`smsProvider.${providerName}`]: { $exists: true } 
        };

        const updateOperation = {
            $unset: {
                [`smsProvider.${providerName}`]: ""
            },
            $set: {
                updatedAt: new Date()
            }
        };

        const [vendorUpdate, shopUpdate] = await Promise.all([
            Vendor.updateOne(permissionFilter, updateOperation),
            Shop.updateOne(permissionFilter, updateOperation)
        ]);

        if (vendorUpdate.matchedCount === 0 && shopUpdate.matchedCount === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "SMS provider not found or no permission to delete"
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "SMS provider removed successfully",
                removedProvider: providerName,
                referenceId: referenceId
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("DELETE SMS Provider Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to delete SMS provider",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}