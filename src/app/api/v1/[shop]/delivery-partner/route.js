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
        console.log("hello*****")
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
                            permission: { $in: ["r:delivery-partner", "r:shop"] }
                        }
                    }
                }
            ]
        };

        const [vendorData, shopData] = await Promise.all([
            Vendor.findOne(permissionFilter).select("deliveryPartner").lean(),
            Shop.findOne(permissionFilter).select("deliveryPartner").lean()
        ]);

        const deliveryPartners = {
            ...(vendorData?.deliveryPartner || {}),
            ...(shopData?.deliveryPartner || {})
        };

        if (Object.keys(deliveryPartners).length === 0) {
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: "No delivery partner found"
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: deliveryPartners
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("GET Delivery Partner Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to retrieve delivery partner data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}




export async function DELETE(request) {
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
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const referenceId = pathSegments[pathSegments.indexOf('v1') + 1];
        const { deliveryPartnerName } = await request.json(); 
        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        if (!deliveryPartnerName) {
            return NextResponse.json(
                { error: "Delivery partner name is required (e.g., 'steadfast')" }, // Updated error message
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
                            permission: { $in: ["w:delivery-partner", "w:shop"] }
                        }
                    }
                }
            ],
            [`deliveryPartner.${deliveryPartnerName}`]: { $exists: true } 
        };

        const [vendorExists, shopExists] = await Promise.all([
            Vendor.findOne(permissionFilter),
            Shop.findOne(permissionFilter)
        ]);

        if (!vendorExists && !shopExists) {
            return NextResponse.json(
                {
                    error: "Not authorized, resource not found, or delivery partner doesn't exist",
                    details: `Delivery partner '${deliveryPartnerName}' not found or you don't have permission`
                },
                { status: 404 }
            );
        }

        const updateOperation = {
            $unset: {
                [`deliveryPartner.${deliveryPartnerName}`]: ""
            },
            $set: {
                updatedAt: new Date()
            }
        };

        const updatePromises = [];
        if (vendorExists) {
            updatePromises.push(
                Vendor.updateOne(
                    { referenceId },
                    updateOperation
                )
            );
        }
        if (shopExists) {
            updatePromises.push(
                Shop.updateOne(
                    { referenceId },
                    updateOperation
                )
            );
        }

        await Promise.all(updatePromises);

        return NextResponse.json(
            {
                success: true,
                message: "Delivery partner removed successfully",
                removedPartner: deliveryPartnerName,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("DELETE Delivery Partner Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to delete delivery partner",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}