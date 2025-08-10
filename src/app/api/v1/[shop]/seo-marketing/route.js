import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
// import { userModel } from "@/models/auth/user";

export async function GET(request) {
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

        if (!referenceId) {
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
                            permission: { $in: ["r:tracking", "r:shop"] }
                        }
                    }
                }
            ]
        };

        // Query both collections
        const [vendorData, shopData] = await Promise.all([
            Vendor.findOne(permissionFilter).select("marketing").lean(),
            Shop.findOne(permissionFilter).select("marketing").lean()
        ]);

        // Combine results from both collections
        const marketingData = {
            ...(vendorData?.marketing || {}),
            ...(shopData?.marketing || {})
        };

        // If no marketing data exists
        if (Object.keys(marketingData).length === 0) {
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: "Seo marketing not  found"
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    googleTagManager: marketingData.googleTagManager || null,
                    facebookPixel: marketingData.facebookPixel || null
                }
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




export async function DELETE(request) {
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'deleteMarketing' });
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
        const { marketingType } = await request.json();

        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        if (!marketingType || !['googleTagManager', 'facebookPixel'].includes(marketingType)) {
            return NextResponse.json(
                { error: "Valid marketing type is required ('googleTagManager' or 'facebookPixel')" },
                { status: 400 }
            );
        }

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
                            permission: { $in: ["w:marketing", "w:shop"] }
                        }
                    }
                }
            ],
            [`marketing.${marketingType}`]: { $exists: true }
        };

        const updateOperation = {
            $unset: {
                [`marketing.${marketingType}`]: ""
            },
            $set: {
                updatedAt: new Date()
            }
        };

        const [vendorUpdate, shopUpdate] = await Promise.all([
            Vendor.updateOne(permissionFilter, updateOperation),
            Shop.updateOne(permissionFilter, updateOperation)
        ]);

        if (vendorUpdate.modifiedCount === 0 && shopUpdate.modifiedCount === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No matching marketing data found or no permission to delete"
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Marketing data removed successfully",
                removedType: marketingType,
                referenceId: referenceId
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("DELETE Marketing Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to delete marketing data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}